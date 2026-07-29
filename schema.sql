-- =============================================================================
-- SupportHub - Database Schema Model (PostgreSQL Relational DB)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types for Roles & Categories
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'AGENT', 'TRAINEE');

-- -----------------------------------------------------------------------------
-- 1. Table: users
-- -----------------------------------------------------------------------------
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 2. Table: categories
-- -----------------------------------------------------------------------------
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

CREATE INDEX idx_categories_slug ON categories(slug);

-- -----------------------------------------------------------------------------
-- 3. Table: canned_responses (Templates / Respostas Rápidas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    shortcut VARCHAR(50),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Store list of {key, label, defaultValue}
    usage_count INT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canned_responses_category ON canned_responses(category_id);
CREATE INDEX idx_canned_responses_title ON canned_responses(title);

-- -----------------------------------------------------------------------------
-- 4. Table: knowledge_articles (Base de Conhecimento / Wiki)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    content_md TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    views_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kb_articles_category ON knowledge_articles(category_id);
CREATE INDEX idx_kb_articles_slug ON knowledge_articles(slug);

-- Full-Text Search Index on Title & Content for PostgreSQL
CREATE INDEX idx_kb_articles_fts ON knowledge_articles 
USING gin(to_tsvector('portuguese', title || ' ' || content_md));

-- -----------------------------------------------------------------------------
-- 6. Table: cidades (Municípios e Praças de Atendimento)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    code_ibge VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cidades_name ON cidades(name);
CREATE INDEX idx_cidades_uf ON cidades(uf);

-- -----------------------------------------------------------------------------
-- 7. Table: sistemas_links (Catálogo de Links e Sistemas Municipais - Relacionamento N:1)
-- -----------------------------------------------------------------------------
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

CREATE INDEX idx_sistemas_links_city ON sistemas_links(city_id);

-- -----------------------------------------------------------------------------
-- 8. Table: historico_auditoria (Audit Trail com JSONB para detalhes de alteração)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historico_auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(120) NOT NULL,
    user_role user_role_enum NOT NULL DEFAULT 'AGENT',
    module VARCHAR(80) NOT NULL, -- Ex: 'Cidades', 'Links', 'Respostas Rápidas', 'Usuários', 'Autenticação'
    action VARCHAR(20) NOT NULL, -- Ex: 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb, -- JSONB com antes/depois ou detalhes da modificação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auditoria_module ON historico_auditoria(module);
CREATE INDEX idx_auditoria_user ON historico_auditoria(user_id);
CREATE INDEX idx_auditoria_action ON historico_auditoria(action);
CREATE INDEX idx_auditoria_created ON historico_auditoria(created_at);

-- -----------------------------------------------------------------------------
-- Seed Data for Cidades, Links e Auditoria
-- -----------------------------------------------------------------------------
INSERT INTO cidades (id, name, uf, code_ibge, notes) VALUES
('c1111111-1111-1111-1111-111111111111', 'São Paulo', 'SP', '3550308', 'Requer VPN ativa para acesso aos sistemas internos da prefeitura.'),
('c2222222-2222-2222-2222-222222222222', 'Rio de Janeiro', 'RJ', '3304557', 'Acesso via certificado digital A1 obrigatório.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sistemas_links (id, city_id, name, url, category, access_notes, is_active) VALUES
('l1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Portal do Contribuinte (ISS)', 'https://tributario.prefeitura.sp.gov.br', 'Sistema Tributário', 'Usar VPN Corporativa', TRUE),
('l2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Portal do Cidadão e Certidões', 'https://cidadao.prefeitura.sp.gov.br', 'Portal do Cidadão', 'IP liberado na rede interna', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO historico_auditoria (id, user_id, user_name, user_role, module, action, description, details) VALUES
('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Carlos Silva (Admin)', 'ADMIN', 'Cidades', 'CREATE', 'Cadastrou a cidade São Paulo - SP', '{"city": "São Paulo", "uf": "SP", "codeIBGE": "3550308"}'::jsonb),
('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mariana Costa (Agente)', 'AGENT', 'Links', 'CREATE', 'Vinculou o sistema Portal do Contribuinte à cidade São Paulo', '{"link": "Portal do Contribuinte (ISS)", "url": "https://tributario.prefeitura.sp.gov.br"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, slug, color, icon, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Autenticação & Acesso', 'autenticacao-acesso', '#EC4899', 'KeyRound', 'Problemas com senhas, 2FA, permissões e login.'),
('22222222-2222-2222-2222-222222222222', 'Financeiro & Faturamento', 'financeiro-faturamento', '#10B981', 'Receipt', 'Segunda via de boletos, troca de cartão e reembolsos.'),
('33333333-3333-3333-3333-333333333333', 'Infraestrutura & API', 'infraestrutura-api', '#8B5CF6', 'Server', 'Instabilidade no servidor, limites de API e webhooks.'),
('44444444-4444-4444-4444-444444444444', 'Procedimentos Padrão (SOP)', 'procedimentos-padrao', '#F59E0B', 'FileText', 'Scripts de atendimento telefônico, escalonamento N2/N3.')
ON CONFLICT (id) DO NOTHING;

-- Initial Users
INSERT INTO users (id, name, email, password_hash, role, department, active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Carlos Silva (Admin)', 'admin@empresa.com.br', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6LqG3i948f2S79W.', 'ADMIN', 'Coordenação de TI', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mariana Costa (Agente)', 'mariana@empresa.com.br', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6LqG3i948f2S79W.', 'AGENT', 'Suporte N2', TRUE),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Lucas Oliveira (Trainee)', 'lucas@empresa.com.br', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6LqG3i948f2S79W.', 'TRAINEE', 'Suporte N1 (Estágio)', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Canned Responses
INSERT INTO canned_responses (id, title, shortcut, category_id, body, variables, usage_count) VALUES
('r1111111-1111-1111-1111-111111111111', 'Redefinição de Senha e Token de Acesso', '/reset-senha', '11111111-1111-1111-1111-111111111111', 
'Olá {{nome_cliente}}, tudo bem?

Recebemos sua solicitação para redefinição de acesso no sistema {{sistema}}.

Para cadastrar sua nova senha com segurança, acesse o link abaixo (válido por 2 horas):
👉 {{link_redefinicao}}

Caso não tenha solicitado essa alteração, por favor ignore este e-mail.

Atenciosamente,
{{nome_agente}} - Equipe de Suporte Técnico',
'[{"key": "nome_cliente", "label": "Nome do Cliente", "defaultValue": "Cliente"}, {"key": "sistema", "label": "Sistema/Módulo", "defaultValue": "ERP Cloud"}, {"key": "link_redefinicao", "label": "Link de Redefinição", "defaultValue": "https://app.empresa.com.br/reset?token=xyz123"}, {"key": "nome_agente", "label": "Nome do Operador", "defaultValue": "Suporte"}]'::jsonb, 142),

('r2222222-2222-2222-2222-222222222222', 'Envio de 2ª Via de Boleto / Fatura', '/boleto', '22222222-2222-2222-2222-222222222222',
'Prezado(a) {{nome_cliente}},

Conforme solicitado, segue o link para acesso e cópia da linha digitável da fatura com vencimento em {{data_vencimento}}:

📌 Linha Digitável: {{codigo_barras}}
📄 Link do PDF: {{link_boleto}}

Lembramos que pagamentos via PIX são compensados em até 5 minutos!

Qualquer dúvida, estamos à disposição.
Atenciosamente,
{{nome_agente}} - Financeiro e Suporte',
'[{"key": "nome_cliente", "label": "Nome do Cliente", "defaultValue": "Cliente"}, {"key": "data_vencimento", "label": "Data Vencimento", "defaultValue": "10/08/2026"}, {"key": "codigo_barras", "label": "Código PIX/Boleto", "defaultValue": "00190.00009 01234.567809 90000.123457 1 9000000015000"}, {"key": "link_boleto", "label": "URL do PDF", "defaultValue": "https://fatura.empresa.com.br/pdf/8849"}, {"key": "nome_agente", "label": "Nome do Agente", "defaultValue": "Suporte"}]'::jsonb, 98)
ON CONFLICT (id) DO NOTHING;

-- Knowledge Articles
INSERT INTO knowledge_articles (id, title, slug, category_id, content_md, tags, views_count, helpful_count, author_id) VALUES
('k1111111-1111-1111-1111-111111111111', 'Guia de Resolução: Erro 401 Unauthorized na API', 'guia-erro-401-api', '33333333-3333-3333-3333-333333333333',
'# Guia de Resolução: Erro 401 Unauthorized na API

O erro `401 Unauthorized` ocorre quando o cliente tenta acessar um endpoint protegido sem enviar um token de autenticação válido ou quando o token expirou.

---

### 🔍 Passo a Passo para Diagnóstico (Troubleshooting)

1. **Verifique se o Header Bearer está sendo enviado corretamente:**
   ```bash
   curl -X GET "https://api.empresa.com.br/v1/pedidos" \
     -H "Authorization: Bearer <SEU_JWT_TOKEN>"
   ```

2. **Validar expiração do Token JWT:**
   - Acesse o [jwt.io](https://jwt.io) para decodificar o payload.
   - Verifique o campo `exp` (timestamp UNIX). Se for menor que a hora atual UTC, solicite a renovação via endpoint `/api/auth/refresh`.

3. **Verificar IP na Whitelist (Se aplicável):**
   - Clientes Enterprise possuem trava de IP de origem. Verifique no painel Admin se o IP do servidor do cliente consta na lista liberada.

:::info
💡 **Dica Rápida:** Caso o cliente use a integração via Webhook, certifique-se que o header `X-Signature-Secret` confere com o segredo da conta.
:::',
'["API", "JWT", "Erro 401", "Integração"]'::jsonb, 320, 45, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;
