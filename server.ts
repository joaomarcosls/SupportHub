import express from "express";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import pg from "pg";

const { Pool } = pg;

// Initialize Express App
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security Middlewares: Global Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;");
  next();
});

app.use(express.json({ limit: "2mb" }));

// Middleware de Log de Requisições HTTP (Exibe requisições nos logs do Docker)
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    console.log(`[LOG API ${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Serve Local Avatars Static Directory
const publicAvatarsPath = path.join(process.cwd(), "public", "avatars");
app.use("/avatars", express.static(publicAvatarsPath));

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || "supporthub_db",
  user: process.env.POSTGRES_USER || "supporthub_user",
  password: process.env.POSTGRES_PASSWORD || "SupporthubSecure2026!Pass",
});

// Helper for parameterized SQL queries
async function query(text: string, params?: any[]) {
  return await pool.query(text, params);
}

// Global active session state (simulação de sessão)
let activeUserId = "";

// Helper: Sanitize User (Remove password / password_hash)
function sanitizeUser(u: any) {
  if (!u) return null;
  const { password, password_hash, ...rest } = u;
  return rest;
}

// Security: Email Format Validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password Policy Verification (OWASP Standards: Min 8 chars + Special Char)
function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: "A senha deve conter no mínimo 8 caracteres." };
  }
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  if (!specialCharRegex.test(password)) {
    return { isValid: false, error: "A senha deve conter pelo menos 1 caractere especial (ex: !@#$%^&*)." };
  }
  return { isValid: true };
}

// Simple Rate Limiting for Login Attempts (Anti Brute-Force)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
function checkRateLimit(ipOrEmail: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(ipOrEmail);
  if (!attempt) return true;
  if (now - attempt.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ipOrEmail);
    return true;
  }
  return attempt.count < 5;
}
function recordFailedAttempt(ipOrEmail: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ipOrEmail) || { count: 0, lastAttempt: now };
  attempt.count += 1;
  attempt.lastAttempt = now;
  loginAttempts.set(ipOrEmail, attempt);
}
function resetAttempt(ipOrEmail: string) {
  loginAttempts.delete(ipOrEmail);
}

// Audit Logger Function in PostgreSQL
async function recordAuditLog({
  userId,
  userName,
  userRole,
  module,
  action,
  description,
  details
}: {
  userId?: string;
  userName?: string;
  userRole?: string;
  module: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  description: string;
  details?: Record<string, any>;
}) {
  try {
    let currentUserId = userId || activeUserId;
    let name = userName;
    let role = userRole || 'AGENT';

    if (currentUserId) {
      const uRes = await query("SELECT name, role FROM users WHERE id::text = $1", [currentUserId]);
      if (uRes.rows.length > 0) {
        name = uRes.rows[0].name;
        role = uRes.rows[0].role;
      }
    }

    await query(
      `INSERT INTO historico_auditoria (user_id, user_name, user_role, module, action, description, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        currentUserId || null,
        name || "Sistema",
        role,
        module,
        action,
        description,
        JSON.stringify(details || {})
      ]
    );
  } catch (err) {
    console.error("Erro ao registrar log de auditoria no PostgreSQL:", err);
  }
}

// Initialize Gemini Client lazily if key is available
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Helper to determine local SVG avatar
function getLocalAvatarForRole(role: string): string {
  if (role === "ADMIN") return "/avatars/admin.svg";
  if (role === "TRAINEE") return "/avatars/trainee.svg";
  return "/avatars/agent.svg";
}

// =============================================================================
// DATABASE INITIALIZATION & SCHEMA MIGRATION
// =============================================================================
async function initDatabase() {
  try {
    console.log("🐘 Conectando ao PostgreSQL...");
    
    // Enable UUID extension & create enum types if not exists
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'AGENT', 'TRAINEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(120) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role user_role_enum NOT NULL DEFAULT 'AGENT',
          department VARCHAR(100) DEFAULT 'Suporte N1',
          active BOOLEAN NOT NULL DEFAULT TRUE,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Categories Table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) UNIQUE NOT NULL,
          slug VARCHAR(120) UNIQUE NOT NULL,
          color VARCHAR(20) DEFAULT '#3B82F6',
          icon VARCHAR(50) DEFAULT 'Folder',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Canned Responses Table
    await query(`
      CREATE TABLE IF NOT EXISTS canned_responses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(150) NOT NULL,
          shortcut VARCHAR(50),
          category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          variables JSONB DEFAULT '[]'::jsonb,
          usage_count INT DEFAULT 0,
          is_favorite BOOLEAN DEFAULT FALSE,
          created_by VARCHAR(120),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Knowledge Articles Table
    await query(`
      CREATE TABLE IF NOT EXISTS knowledge_articles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(200) NOT NULL,
          slug VARCHAR(220) UNIQUE NOT NULL,
          category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
          content_md TEXT NOT NULL,
          tags JSONB DEFAULT '[]'::jsonb,
          views_count INT DEFAULT 0,
          helpful_count INT DEFAULT 0,
          author_id UUID REFERENCES users(id) ON DELETE SET NULL,
          author_name VARCHAR(120),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Cidades Table
    await query(`
      CREATE TABLE IF NOT EXISTS cidades (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(150) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          code_ibge VARCHAR(20),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Sistemas Links Table
    await query(`
      CREATE TABLE IF NOT EXISTS sistemas_links (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          city_id UUID NOT NULL REFERENCES cidades(id) ON DELETE CASCADE,
          name VARCHAR(150) NOT NULL,
          url TEXT NOT NULL,
          category VARCHAR(80) DEFAULT 'Sistema Tributário',
          access_notes VARCHAR(255) DEFAULT 'Acesso direto via navegador',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Audit Trail Table
    await query(`
      CREATE TABLE IF NOT EXISTS historico_auditoria (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          user_name VARCHAR(120) NOT NULL,
          user_role user_role_enum NOT NULL DEFAULT 'AGENT',
          module VARCHAR(80) NOT NULL,
          action VARCHAR(20) NOT NULL,
          description TEXT NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. User Scratchpads Table
    await query(`
      CREATE TABLE IF NOT EXISTS user_scratchpads (
          user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          content TEXT DEFAULT '',
          last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migração de Segurança: Atualizar senhas sem hash e avatares externos
    const adminHash = await bcrypt.hash("Admin@123", 10);
    const suporteHash = await bcrypt.hash("Suporte@123", 10);

    // Substituir avatares externos por locais e aplicar Hashing Bcrypt nas contas padrão
    await query(`
      UPDATE users 
      SET avatar_url = '/avatars/admin.svg',
          password_hash = $1 
      WHERE email = 'admin@empresa.com.br' AND (password_hash = 'Admin@123' OR password_hash NOT LIKE '$2%');
    `, [adminHash]);

    await query(`
      UPDATE users 
      SET avatar_url = '/avatars/agent.svg',
          password_hash = $1 
      WHERE email = 'mariana@empresa.com.br' AND (password_hash = 'Suporte@123' OR password_hash NOT LIKE '$2%');
    `, [suporteHash]);

    await query(`
      UPDATE users 
      SET avatar_url = '/avatars/trainee.svg',
          password_hash = $1 
      WHERE email = 'lucas@empresa.com.br' AND (password_hash = 'Suporte@123' OR password_hash NOT LIKE '$2%');
    `, [suporteHash]);

    // Atualizar avatares externos de qualquer outro usuário cadastrado para avatares locais
    await query(`
      UPDATE users
      SET avatar_url = CASE 
        WHEN role = 'ADMIN' THEN '/avatars/admin.svg'
        WHEN role = 'TRAINEE' THEN '/avatars/trainee.svg'
        ELSE '/avatars/agent.svg'
      END
      WHERE avatar_url LIKE 'http%' OR avatar_url IS NULL;
    `);

    // SEED INITIAL ADMIN USER IF USERS TABLE IS EMPTY
    const userCountRes = await query("SELECT COUNT(*) FROM users");
    if (parseInt(userCountRes.rows[0].count, 10) === 0) {
      console.log("🌱 Inicializando usuário Administrador principal (admin@empresa.com.br)...");
      await query(`
        INSERT INTO users (id, name, email, password_hash, role, department, active, avatar_url) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Carlos Silva (Admin)', 'admin@empresa.com.br', $1, 'ADMIN', 'Coordenação de TI', TRUE, '/avatars/admin.svg')
        ON CONFLICT DO NOTHING;
      `, [adminHash]);
    }

    console.log("✅ Banco de dados PostgreSQL limpo, pronto para novas inserções!");
  } catch (err) {
    console.error("❌ Erro ao inicializar o banco de dados PostgreSQL:", err);
  }
}

// =============================================================================
// REST API ENDPOINTS (/api/*) PERSISTIDOS E SEGUROS
// =============================================================================

// --- Informações de Versão do Sistema ---
app.get("/api/version", (req, res) => {
  res.json({
    version: "v1.0.4",
    rawVersion: "1.0.4",
    name: "SupportHub",
    repository: "https://github.com/joaomarcosls/SupportHub",
    releasesUrl: "https://github.com/joaomarcosls/SupportHub/releases"
  });
});

// --- Auth & Session ---
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    if (!authHeader) {
      return res.json({ user: null, activeUserId: "" });
    }

    const token = String(authHeader).trim().replace(/^Bearer\s+/i, "");
    const match = token.match(/^jwt_token_([a-zA-Z0-9-]+)/);
    if (!match) {
      return res.json({ user: null, activeUserId: "" });
    }

    const tokenUserId = match[1];
    const userRes = await query("SELECT * FROM users WHERE id::text = $1 AND active = TRUE", [tokenUserId]);
    const currentUser = userRes.rows[0] ? sanitizeUser(userRes.rows[0]) : null;

    res.json({ user: currentUser, activeUserId: currentUser ? tokenUserId : "" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, userId } = req.body;
    const clientKey = email || userId || req.ip;

    if (!checkRateLimit(clientKey)) {
      return res.status(429).json({ error: "Muitas tentativas incorretas de login. Tente novamente em 15 minutos (Proteção Brute-Force)." });
    }

    let qResult;

    if (userId) {
      qResult = await query("SELECT * FROM users WHERE id::text = $1", [userId]);
    } else if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Formato de e-mail inválido." });
      }
      qResult = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [String(email).trim()]);
    } else {
      return res.status(400).json({ error: "Informe o e-mail ou selecione o operador." });
    }

    const targetUser = qResult.rows[0];

    if (!targetUser) {
      recordFailedAttempt(clientKey);
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    if (!targetUser.active) {
      return res.status(403).json({ error: "Esta conta de usuário está desativada no momento." });
    }

    // Verify password with Bcrypt
    if (password && targetUser.password_hash) {
      let isMatch = false;
      if (targetUser.password_hash.startsWith("$2a$") || targetUser.password_hash.startsWith("$2b$")) {
        isMatch = await bcrypt.compare(password, targetUser.password_hash);
      } else {
        // Fallback para senhas legado
        isMatch = (password === targetUser.password_hash);
        if (isMatch) {
          // Re-hash automático para Bcrypt na primeira autenticação bem sucedida
          const newHash = await bcrypt.hash(password, 10);
          await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, targetUser.id]);
        }
      }

      if (!isMatch) {
        recordFailedAttempt(clientKey);
        return res.status(401).json({ error: "Senha incorreta. Verifique suas credenciais." });
      }
    }

    resetAttempt(clientKey);
    activeUserId = targetUser.id;

    recordAuditLog({
      userId: targetUser.id,
      userName: targetUser.name,
      userRole: targetUser.role,
      module: "Autenticação",
      action: "LOGIN",
      description: `Usuário ${targetUser.name} (${targetUser.email}) realizou login com autenticação Bcrypt`,
      details: { department: targetUser.department, role: targetUser.role }
    });

    res.json({
      token: `jwt_token_${targetUser.id}_${Date.now()}`,
      user: sanitizeUser(targetUser),
      mustChangePassword: false
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro na autenticação." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const userRes = await query("SELECT * FROM users WHERE id::text = $1", [activeUserId]);
    if (userRes.rows[0]) {
      recordAuditLog({
        userId: userRes.rows[0].id,
        userName: userRes.rows[0].name,
        userRole: userRes.rows[0].role,
        module: "Autenticação",
        action: "LOGOUT",
        description: `Usuário ${userRes.rows[0].name} encerrou a sessão`,
        details: { email: userRes.rows[0].email }
      });
    }

    activeUserId = "";
    res.json({ success: true, message: "Sessão encerrada com sucesso." });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao encerrar sessão." });
  }
});

app.post("/api/auth/switch-role", async (req, res) => {
  try {
    const { role } = req.body;
    const qResult = await query("SELECT * FROM users WHERE role = $1 AND active = TRUE LIMIT 1", [role]);
    if (qResult.rows[0]) {
      activeUserId = qResult.rows[0].id;
      return res.json({ success: true, user: sanitizeUser(qResult.rows[0]) });
    }
    res.status(400).json({ error: "Operador com este nível não encontrado." });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao alterar nível de acesso." });
  }
});

app.post("/api/auth/switch-user-id", async (req, res) => {
  try {
    const { userId } = req.body;
    const qResult = await query("SELECT * FROM users WHERE id::text = $1", [userId]);
    if (qResult.rows[0]) {
      activeUserId = qResult.rows[0].id;
      return res.json({ success: true, user: sanitizeUser(qResult.rows[0]) });
    }
    res.status(404).json({ error: "Usuário não encontrado." });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao alterar usuário ativo." });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    let targetUserId = activeUserId;

    if (authHeader) {
      const token = String(authHeader).trim().replace(/^Bearer\s+/i, "");
      const match = token.match(/^jwt_token_([a-zA-Z0-9-]+)/);
      if (match) {
        targetUserId = match[1];
      }
    }

    if (!targetUserId) {
      console.warn("⚠️ Alteração de senha rejeitada: usuário não autenticado (Header ausente ou inválido)");
      return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "A nova senha é obrigatória." });
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.isValid) {
      console.warn(`⚠️ Senha fraca rejeitada: ${policyCheck.error}`);
      return res.status(400).json({ error: policyCheck.error });
    }

    const userRes = await query("SELECT * FROM users WHERE id::text = $1", [targetUserId]);
    const user = userRes.rows[0];

    if (!user) {
      console.error(`❌ Usuário id ${targetUserId} não encontrado para alterar senha`);
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Se informou senha atual, validar com Bcrypt
    if (currentPassword && user.password_hash) {
      let isMatch = false;
      if (user.password_hash.startsWith("$2a$") || user.password_hash.startsWith("$2b$")) {
        isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      } else {
        isMatch = (currentPassword === user.password_hash);
      }

      if (!isMatch) {
        console.warn(`⚠️ Senha atual incorreta para o usuário ${user.email}`);
        return res.status(401).json({ error: "A senha atual informada está incorreta." });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updateRes = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id::text = $2 RETURNING *`,
      [newHash, targetUserId]
    );

    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      module: "Autenticação",
      action: "UPDATE",
      description: `Usuário ${user.name} alterou sua senha de acesso com sucesso com Bcrypt`
    });

    console.log(`✅ Senha alterada com sucesso no PostgreSQL com Hash Bcrypt para o operador: ${user.email}`);

    res.json({ success: true, user: sanitizeUser(updateRes.rows[0]) });
  } catch (err: any) {
    console.error("❌ Erro interno ao alterar senha no server.ts:", err);
    res.status(500).json({ error: "Erro interno do servidor ao atualizar a senha." });
  }
});

// --- Audit Trail ---
app.get("/api/audit-logs", async (req, res) => {
  try {
    const { module, action, search } = req.query;
    let sql = "SELECT id, user_id AS \"userId\", user_name AS \"userName\", user_role AS \"userRole\", module, action, description, details, created_at AS \"timestamp\" FROM historico_auditoria WHERE 1=1";
    const params: any[] = [];

    if (module && module !== "ALL") {
      params.push(module);
      sql += ` AND module = $${params.length}`;
    }

    if (action && action !== "ALL") {
      params.push(action);
      sql += ` AND action = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      sql += ` AND (LOWER(user_name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(module) LIKE $${params.length})`;
    }

    sql += " ORDER BY created_at DESC LIMIT 100";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao consultar histórico de auditoria." });
  }
});

// --- System Stats ---
app.get("/api/stats", async (req, res) => {
  try {
    const [cidadesRes, linksRes, cannedRes, kbRes, catRes, userRes, copyRes] = await Promise.all([
      query("SELECT COUNT(*) FROM cidades"),
      query("SELECT COUNT(*) FROM sistemas_links"),
      query("SELECT COUNT(*) FROM canned_responses"),
      query("SELECT COUNT(*) FROM knowledge_articles"),
      query("SELECT COUNT(*) FROM categories"),
      query("SELECT COUNT(*) FROM users"),
      query("SELECT COALESCE(SUM(usage_count), 0) AS total FROM canned_responses")
    ]);

    res.json({
      totalCities: parseInt(cidadesRes.rows[0].count, 10),
      totalSystemLinks: parseInt(linksRes.rows[0].count, 10),
      totalResponses: parseInt(cannedRes.rows[0].count, 10),
      totalArticles: parseInt(kbRes.rows[0].count, 10),
      totalCategories: parseInt(catRes.rows[0].count, 10),
      totalUsers: parseInt(userRes.rows[0].count, 10),
      totalCopies: parseInt(copyRes.rows[0].total, 10)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao calcular estatísticas." });
  }
});

// --- Users Management (PostgreSQL CRUD + Bcrypt + Local Avatars) ---
app.get("/api/users", async (req, res) => {
  try {
    const uRes = await query("SELECT id, name, email, role, department, active, avatar_url AS \"avatarUrl\", created_at AS \"createdAt\" FROM users ORDER BY created_at DESC");
    res.json(uRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao listar operadores." });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const currentRes = await query("SELECT role FROM users WHERE id::text = $1", [activeUserId]);
    if (currentRes.rows[0]?.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas Administradores podem cadastrar novos operadores." });
    }

    const { name, email, role, department, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: "Nome, e-mail e nível de acesso são obrigatórios." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Formato de e-mail inválido." });
    }

    if (!password) {
      return res.status(400).json({ error: "A senha inicial é obrigatória para cadastrar o operador." });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.isValid) {
      return res.status(400).json({ error: policyCheck.error });
    }

    // Criptografia de Senha com Bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarUrl = getLocalAvatarForRole(role);
    
    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, department, active, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
       RETURNING id, name, email, role, department, active, avatar_url AS "avatarUrl", created_at AS "createdAt"`,
      [crypto.randomUUID(), String(name).trim(), String(email).toLowerCase().trim(), hashedPassword, role, department || "Suporte N1", avatarUrl]
    );

    const newUser = insertRes.rows[0];

    recordAuditLog({
      module: "Usuários",
      action: "CREATE",
      description: `Cadastrou o novo operador ${name} (${email}) com Hash Bcrypt e Avatar Local`,
      details: { name, email, role }
    });

    res.status(201).json(newUser);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado no sistema." });
    }
    console.error("Erro ao cadastrar usuário no PostgreSQL:", err);
    res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const currentRes = await query("SELECT role FROM users WHERE id::text = $1", [activeUserId]);
    if (currentRes.rows[0]?.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas Administradores podem modificar perfis." });
    }

    const { id } = req.params;
    const { name, email, role, department, active, newPassword, password } = req.body;
    const pwdToSet = newPassword || password;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: "Formato de e-mail inválido." });
    }

    if (pwdToSet) {
      const policyCheck = validatePasswordPolicy(pwdToSet);
      if (!policyCheck.isValid) {
        return res.status(400).json({ error: policyCheck.error });
      }
      const hashedPassword = await bcrypt.hash(pwdToSet, 10);
      await query("UPDATE users SET password_hash = $1 WHERE id::text = $2", [hashedPassword, id]);
    }

    const avatarUrl = role ? getLocalAvatarForRole(role) : null;

    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           department = COALESCE($4, department),
           active = COALESCE($5, active),
           avatar_url = COALESCE($6, avatar_url),
           updated_at = NOW()
       WHERE id::text = $7
       RETURNING id, name, email, role, department, active, avatar_url AS "avatarUrl", created_at AS "createdAt"`,
      [name ? String(name).trim() : null, email ? String(email).toLowerCase().trim() : null, role, department, active, avatarUrl, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    recordAuditLog({
      module: "Usuários",
      action: "UPDATE",
      description: `Atualizou o perfil do operador ${updateRes.rows[0].name}`
    });

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao atualizar operador." });
  }
});

app.patch("/api/users/:id/toggle-status", async (req, res) => {
  try {
    const currentRes = await query("SELECT role FROM users WHERE id::text = $1", [activeUserId]);
    if (currentRes.rows[0]?.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas Administradores podem alterar o status." });
    }

    const { id } = req.params;
    const updateRes = await query(
      "UPDATE users SET active = NOT active, updated_at = NOW() WHERE id::text = $1 RETURNING active",
      [id]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });

    res.json({ success: true, active: updateRes.rows[0].active });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao alterar status do operador." });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const currentRes = await query("SELECT role FROM users WHERE id::text = $1", [activeUserId]);
    if (currentRes.rows[0]?.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas Administradores podem excluir usuários." });
    }

    const { id } = req.params;
    if (id === activeUserId) {
      return res.status(400).json({ error: "Você não pode excluir sua própria conta ativa no momento." });
    }

    const delRes = await query("DELETE FROM users WHERE id::text = $1 RETURNING name, email", [id]);
    if (delRes.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado." });

    recordAuditLog({
      module: "Usuários",
      action: "DELETE",
      description: `Excluiu a conta do operador ${delRes.rows[0].name} (${delRes.rows[0].email})`
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao excluir operador." });
  }
});

// --- Categories (PostgreSQL CRUD) ---
app.get("/api/categories", async (req, res) => {
  try {
    const catRes = await query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.color, 
        c.icon, 
        c.description, 
        c.created_at AS "createdAt",
        (
          SELECT COUNT(*) FROM canned_responses r WHERE r.category_id = c.id
        ) + (
          SELECT COUNT(*) FROM knowledge_articles a WHERE a.category_id = c.id
        ) AS "itemCount"
      FROM categories c
      ORDER BY c.name ASC
    `);

    const categories = catRes.rows.map(row => ({
      ...row,
      itemCount: parseInt(row.itemCount, 10) || 0
    }));

    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao consultar categorias." });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, color, icon, description } = req.body;
    if (!name) return res.status(400).json({ error: "O nome da categoria é obrigatório." });

    const slug = String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

    const insertRes = await query(
      `INSERT INTO categories (id, name, slug, color, icon, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, slug, color, icon, description, created_at AS "createdAt"`,
      [crypto.randomUUID(), String(name).trim(), slug, color || "#3B82F6", icon || "Folder", description || ""]
    );

    recordAuditLog({
      module: "Categorias",
      action: "CREATE",
      description: `Cadastrou a nova categoria '${name}'`
    });

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Já existe uma categoria com este nome." });
    }
    res.status(500).json({ error: "Erro ao cadastrar categoria." });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon, description } = req.body;

    // Buscar o nome antigo da categoria antes da atualização para propagação relacional
    const oldCatRes = await query("SELECT name FROM categories WHERE id::text = $1", [id]);
    const oldName = oldCatRes.rows[0]?.name;

    const slug = name ? String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-") : null;

    const updateRes = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           color = COALESCE($3, color),
           icon = COALESCE($4, icon),
           description = COALESCE($5, description),
           updated_at = NOW()
       WHERE id::text = $6
       RETURNING id, name, slug, color, icon, description, created_at AS "createdAt"`,
      [name ? String(name).trim() : null, slug, color, icon, description, id]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Categoria não encontrada." });

    const newName = updateRes.rows[0].name;

    // Atualização relacional em cascata em todos os links de sistemas, modelos e artigos vinculados
    if (oldName && newName && oldName !== newName) {
      await query("UPDATE sistemas_links SET category = $1 WHERE category = $2", [newName, oldName]);
      await query("UPDATE canned_responses SET category = $1 WHERE category = $2", [newName, oldName]);
      await query("UPDATE kb_articles SET category = $1 WHERE category = $2", [newName, oldName]);
      
      recordAuditLog({
        module: "Categorias",
        action: "UPDATE",
        description: `Renomeou a categoria de '${oldName}' para '${newName}' com sincronização relacional em cascata`
      });
    }

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    console.error("Erro ao atualizar categoria:", err);
    res.status(500).json({ error: "Erro ao atualizar categoria." });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const catRes = await query("SELECT name FROM categories WHERE id::text = $1", [id]);
    const catName = catRes.rows[0]?.name;

    if (catName) {
      await query("UPDATE sistemas_links SET category = 'Outros' WHERE category = $1", [catName]);
      await query("UPDATE canned_responses SET category = 'Outros' WHERE category = $1", [catName]);
      await query("UPDATE kb_articles SET category = 'Outros' WHERE category = $1", [catName]);
      
      await query("DELETE FROM categories WHERE id::text = $1", [id]);

      recordAuditLog({
        module: "Categorias",
        action: "DELETE",
        description: `Excluiu a categoria '${catName}' e reatribuiu itens para 'Outros'`
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao excluir categoria:", err);
    res.status(500).json({ error: "Erro ao excluir categoria." });
  }
});

// --- Cities & Links (PostgreSQL CRUD) ---
app.get("/api/cities", async (req, res) => {
  try {
    const { uf, search } = req.query;
    let sql = "SELECT id, name, uf, code_ibge AS \"codeIBGE\", notes, created_at AS \"createdAt\" FROM cidades WHERE 1=1";
    const params: any[] = [];

    if (uf && uf !== "ALL") {
      params.push(String(uf).toUpperCase());
      sql += ` AND uf = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(uf) LIKE $${params.length} OR LOWER(notes) LIKE $${params.length})`;
    }

    sql += " ORDER BY name ASC";
    const citiesRes = await query(sql, params);
    
    // Fetch system links for all returned cities
    const cities = await Promise.all(
      citiesRes.rows.map(async c => {
        const linksRes = await query(
          "SELECT id, city_id AS \"cityId\", name, url, category, access_notes AS \"accessNotes\", is_active AS \"isActive\", created_at AS \"createdAt\" FROM sistemas_links WHERE city_id = $1 ORDER BY name ASC",
          [c.id]
        );
        return {
          ...c,
          linksCount: linksRes.rows.length,
          links: linksRes.rows
        };
      })
    );

    res.json(cities);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao consultar cidades." });
  }
});

app.post("/api/cities", async (req, res) => {
  try {
    const { name, uf, codeIBGE, notes } = req.body;
    if (!name || !uf) return res.status(400).json({ error: "Nome e UF são obrigatórios." });

    const insertRes = await query(
      `INSERT INTO cidades (id, name, uf, code_ibge, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, uf, code_ibge AS "codeIBGE", notes, created_at AS "createdAt"`,
      [crypto.randomUUID(), String(name).trim(), String(uf).toUpperCase().trim(), codeIBGE || "", notes || ""]
    );

    recordAuditLog({
      module: "Cidades",
      action: "CREATE",
      description: `Cadastrou a cidade ${name} - ${uf.toUpperCase()}`
    });

    res.status(201).json({ ...insertRes.rows[0], linksCount: 0, links: [] });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao cadastrar cidade." });
  }
});

app.put("/api/cities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, uf, codeIBGE, notes } = req.body;

    const updateRes = await query(
      `UPDATE cidades
       SET name = COALESCE($1, name),
           uf = COALESCE($2, uf),
           code_ibge = COALESCE($3, code_ibge),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id::text = $5
       RETURNING id, name, uf, code_ibge AS "codeIBGE", notes, created_at AS "createdAt"`,
      [name ? String(name).trim() : null, uf ? String(uf).toUpperCase().trim() : null, codeIBGE, notes, id]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Cidade não encontrada." });

    const linksRes = await query("SELECT * FROM sistemas_links WHERE city_id::text = $1", [id]);
    res.json({ ...updateRes.rows[0], linksCount: linksRes.rows.length, links: linksRes.rows });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao atualizar cidade." });
  }
});

app.delete("/api/cities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM cidades WHERE id::text = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao excluir cidade." });
  }
});

app.post("/api/cities/:cityId/links", async (req, res) => {
  try {
    const { cityId } = req.params;
    const { name, url, category, accessNotes, isActive } = req.body;

    if (!name || !url) return res.status(400).json({ error: "Nome e URL são obrigatórios." });

    const insertRes = await query(
      `INSERT INTO sistemas_links (id, city_id, name, url, category, access_notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, city_id AS "cityId", name, url, category, access_notes AS "accessNotes", is_active AS "isActive", created_at AS "createdAt"`,
      [crypto.randomUUID(), cityId, String(name).trim(), String(url).trim(), category || "Sistema Tributário", accessNotes || "", isActive !== undefined ? isActive : true]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao vincular sistema à cidade." });
  }
});

app.put("/api/cities/links/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;
    const { name, url, category, accessNotes, isActive } = req.body;

    const updateRes = await query(
      `UPDATE sistemas_links
       SET name = COALESCE($1, name),
           url = COALESCE($2, url),
           category = COALESCE($3, category),
           access_notes = COALESCE($4, access_notes),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id::text = $6
       RETURNING id, city_id AS "cityId", name, url, category, access_notes AS "accessNotes", is_active AS "isActive", created_at AS "createdAt"`,
      [name, url, category, accessNotes, isActive, linkId]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Link não encontrado." });

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao atualizar link." });
  }
});

app.delete("/api/cities/links/:linkId", async (req, res) => {
  try {
    const { linkId } = req.params;
    await query("DELETE FROM sistemas_links WHERE id::text = $1", [linkId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao excluir link." });
  }
});

// --- Canned Responses (Templates / Respostas Rápidas) ---
app.get("/api/canned-responses", async (req, res) => {
  try {
    const { categoryId, search } = req.query;
    let sql = `
      SELECT 
        id, 
        title, 
        shortcut, 
        category_id AS "categoryId", 
        body, 
        variables, 
        usage_count AS "usageCount", 
        is_favorite AS "isFavorite", 
        created_by AS "createdBy", 
        created_at AS "createdAt" 
      FROM canned_responses WHERE 1=1
    `;
    const params: any[] = [];

    if (categoryId && categoryId !== "all") {
      params.push(categoryId);
      sql += ` AND category_id::text = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(body) LIKE $${params.length} OR LOWER(shortcut) LIKE $${params.length})`;
    }

    sql += " ORDER BY usage_count DESC, title ASC";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao consultar respostas padrão." });
  }
});

app.post("/api/canned-responses", async (req, res) => {
  try {
    const { title, shortcut, categoryId, body, variables } = req.body;
    if (!title || !categoryId || !body) {
      return res.status(400).json({ error: "Título, categoria e mensagem são obrigatórios." });
    }

    const uRes = await query("SELECT name FROM users WHERE id::text = $1", [activeUserId]);
    const createdBy = uRes.rows[0]?.name || "Suporte";

    const insertRes = await query(
      `INSERT INTO canned_responses (id, title, shortcut, category_id, body, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, shortcut, category_id AS "categoryId", body, variables, usage_count AS "usageCount", is_favorite AS "isFavorite", created_by AS "createdBy", created_at AS "createdAt"`,
      [
        crypto.randomUUID(),
        String(title).trim(),
        shortcut ? (shortcut.startsWith("/") ? shortcut : "/" + shortcut) : null,
        categoryId,
        body,
        JSON.stringify(Array.isArray(variables) ? variables : []),
        createdBy
      ]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao criar modelo de resposta." });
  }
});

app.put("/api/canned-responses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, shortcut, categoryId, body, variables, isFavorite } = req.body;

    const updateRes = await query(
      `UPDATE canned_responses
       SET title = COALESCE($1, title),
           shortcut = COALESCE($2, shortcut),
           category_id = COALESCE($3, category_id),
           body = COALESCE($4, body),
           variables = COALESCE($5, variables),
           is_favorite = COALESCE($6, is_favorite),
           updated_at = NOW()
       WHERE id::text = $7
       RETURNING id, title, shortcut, category_id AS "categoryId", body, variables, usage_count AS "usageCount", is_favorite AS "isFavorite", created_by AS "createdBy", created_at AS "createdAt"`,
      [
        title,
        shortcut ? (shortcut.startsWith("/") ? shortcut : "/" + shortcut) : null,
        categoryId,
        body,
        variables ? JSON.stringify(variables) : null,
        isFavorite,
        id
      ]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Modelo não encontrado." });

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao atualizar modelo." });
  }
});

app.delete("/api/canned-responses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM canned_responses WHERE id::text = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao excluir modelo." });
  }
});

app.post("/api/canned-responses/:id/copy", async (req, res) => {
  try {
    const { id } = req.params;
    const updateRes = await query(
      "UPDATE canned_responses SET usage_count = usage_count + 1 WHERE id::text = $1 RETURNING usage_count AS \"usageCount\"",
      [id]
    );
    if (updateRes.rows.length > 0) {
      res.json({ success: true, usageCount: updateRes.rows[0].usageCount });
    } else {
      res.status(404).json({ error: "Item não encontrado." });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao contabilizar cópia." });
  }
});

// --- Knowledge Base (Wiki / Artigos) ---
app.get("/api/kb/articles", async (req, res) => {
  try {
    const { categoryId, search, tag } = req.query;
    let sql = `
      SELECT 
        id, 
        title, 
        slug, 
        category_id AS "categoryId", 
        content_md AS "contentMd", 
        tags, 
        views_count AS "viewsCount", 
        helpful_count AS "helpfulCount", 
        author_id AS "authorId", 
        author_name AS "authorName", 
        created_at AS "createdAt" 
      FROM knowledge_articles WHERE 1=1
    `;
    const params: any[] = [];

    if (categoryId && categoryId !== "all") {
      params.push(categoryId);
      sql += ` AND category_id::text = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(content_md) LIKE $${params.length})`;
    }

    sql += " ORDER BY created_at DESC";
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao consultar artigos." });
  }
});

app.post("/api/kb/articles", async (req, res) => {
  try {
    const { title, categoryId, contentMd, tags } = req.body;
    if (!title || !categoryId || !contentMd) {
      return res.status(400).json({ error: "Título, categoria e conteúdo Markdown são obrigatórios." });
    }

    const uRes = await query("SELECT name FROM users WHERE id::text = $1", [activeUserId]);
    const authorName = uRes.rows[0]?.name || "Suporte";
    const slug = String(title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

    const insertRes = await query(
      `INSERT INTO knowledge_articles (id, title, slug, category_id, content_md, tags, author_id, author_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, slug, category_id AS "categoryId", content_md AS "contentMd", tags, views_count AS "viewsCount", helpful_count AS "helpfulCount", author_id AS "authorId", author_name AS "authorName", created_at AS "createdAt"`,
      [crypto.randomUUID(), String(title).trim(), slug, categoryId, contentMd, JSON.stringify(Array.isArray(tags) ? tags : []), activeUserId || null, authorName]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao criar artigo na wiki." });
  }
});

app.put("/api/kb/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, categoryId, contentMd, tags } = req.body;
    const slug = title ? String(title).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-") : null;

    const updateRes = await query(
      `UPDATE knowledge_articles
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           category_id = COALESCE($3, category_id),
           content_md = COALESCE($4, content_md),
           tags = COALESCE($5, tags),
           updated_at = NOW()
       WHERE id::text = $6
       RETURNING id, title, slug, category_id AS "categoryId", content_md AS "contentMd", tags, views_count AS "viewsCount", helpful_count AS "helpfulCount", author_id AS "authorId", author_name AS "authorName", created_at AS "createdAt"`,
      [title ? String(title).trim() : null, slug, categoryId, contentMd, tags ? JSON.stringify(tags) : null, id]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: "Artigo não encontrado." });

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao atualizar artigo." });
  }
});

app.delete("/api/kb/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query("DELETE FROM knowledge_articles WHERE id::text = $1", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao excluir artigo." });
  }
});

// --- Scratchpad ---
app.get("/api/scratchpad", async (req, res) => {
  try {
    const padRes = await query(
      "SELECT content, last_saved_at AS \"lastSavedAt\" FROM user_scratchpads WHERE user_id::text = $1",
      [activeUserId]
    );
    if (padRes.rows.length > 0) {
      res.json(padRes.rows[0]);
    } else {
      res.json({ content: "", lastSavedAt: new Date().toISOString() });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao carregar rascunho." });
  }
});

app.put("/api/scratchpad", async (req, res) => {
  try {
    const { content } = req.body;
    const saveRes = await query(
      `INSERT INTO user_scratchpads (user_id, content, last_saved_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET content = EXCLUDED.content, last_saved_at = NOW()
       RETURNING last_saved_at AS "lastSavedAt"`,
      [activeUserId, content || ""]
    );
    res.json({ success: true, lastSavedAt: saveRes.rows[0].lastSavedAt });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao salvar rascunho." });
  }
});

// --- AI Assistant: Gemini ---
app.post("/api/ai/optimize-response", async (req, res) => {
  try {
    const { rawNotes } = req.body;
    if (!rawNotes) return res.status(400).json({ error: "Anotação ou texto bruto não informado." });

    const client = getGeminiClient();
    if (!client) {
      return res.status(503).json({
        error: "Chave da API Gemini não configurada.",
        fallbackText: `Prezado Cliente,\n\nRecebemos suas anotações técnicas:\n"${rawNotes}"\n\nNossa equipe está analisando o caso e retornará em breve.\n\nAtenciosamente,\nSuporte Técnico`
      });
    }

    const prompt = `Você é um especialista em comunicação e Suporte Técnico Sênior. 
Transforme as seguintes notas/anotações técnicas brutas em uma resposta ao cliente extremamente polida, empática, profissional e clara.
Suporte a variáveis no formato {{nome_cliente}}, {{protocolo}}, {{link}}, etc se necessário.

Notas do Atendimento:
${rawNotes}

Retorne diretamente o texto pronto da resposta em português do Brasil, sem saudações extras direcionadas ao operador.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      optimizedText: response.text || "Não foi possível gerar a resposta."
    });
  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    res.status(500).json({
      error: "Erro na geração por IA",
      details: error?.message || "Erro desconhecido"
    });
  }
});

// --- Atualização Automatizada de Sistema para Administradores (1 Clique via GitHub) ---
app.post("/api/admin/system/update", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || (req.headers as any).Authorization;
    let userId = activeUserId;
    if (authHeader) {
      const token = String(authHeader).trim().replace(/^Bearer\s+/i, "");
      const match = token.match(/^jwt_token_([a-zA-Z0-9-]+)/);
      if (match) userId = match[1];
    }

    const currentRes = await query("SELECT role, name FROM users WHERE id::text = $1", [userId]);
    if (currentRes.rows[0]?.role !== "ADMIN") {
      return res.status(403).json({ error: "Apenas Administradores podem disparar a atualização do sistema." });
    }

    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    console.log(`🚀 [ADMIN UPDATE] Iniciando atualização do sistema solicitada por ${currentRes.rows[0].name}...`);

    const { stdout } = await execAsync("git pull origin main");
    console.log("[ADMIN UPDATE RESULT]:", stdout);

    recordAuditLog({
      userId,
      userName: currentRes.rows[0].name,
      userRole: "ADMIN",
      module: "Sistema",
      action: "UPDATE",
      description: `Disparou a atualização automática do sistema via GitHub (${stdout.trim()})`
    });

    res.json({
      success: true,
      message: "Sistema atualizado com sucesso a partir do repositório GitHub!",
      output: stdout.trim()
    });
  } catch (err: any) {
    console.error("Erro ao atualizar sistema via Git:", err);
    res.status(500).json({ error: "Erro ao executar atualização via Git.", details: err?.message || "Verifique se o Git está acessível no servidor." });
  }
});

// Catch-all 404 Handler para rotas de API (Garante resposta JSON e impede retorno de HTML 404)
app.use("/api/*", (req, res) => {
  console.warn(`[404 NOT FOUND] Rota de API não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.originalUrl}` });
});

// =============================================================================
// VITE / PRODUCTION STATIC FILE SERVING
// =============================================================================

async function startServer() {
  // Initialize Database Schema, Migrations & Bcrypt Seed
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SupportHub Server seguro rodando na porta ${PORT}`);
  });
}

startServer();
