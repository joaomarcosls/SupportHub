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
    primary_user_name VARCHAR(150),
    backup_user_name VARCHAR(150),
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
-- Initial Admin User (Apenas a conta necessária para o primeiro login)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, department, active, avatar_url) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Carlos Silva (Admin)', 'admin@empresa.com.br', '$2b$10$AG4LDTX7q0h8GIzdDqcVku8TKFC2rlOSTv0msGHkkIjjWY8rW20ge', 'ADMIN', 'Coordenação de TI', TRUE, '/avatars/admin.svg')
ON CONFLICT (id) DO NOTHING;

