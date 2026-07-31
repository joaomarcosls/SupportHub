<div align="center">

# ⚡ SupportHub — Utilitário de Suporte Técnico & Atendimento

**Uma plataforma web robusta, segura e moderna projetada para otimizar o fluxo de trabalho de equipes de Suporte N1, N2, N3 e Coordenação de TI.**

[![React 19](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg?logo=docker)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-V4-38B2AC.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-orange.svg?logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Sobre o Projeto

O **SupportHub** foi desenvolvido para centralizar documentações, scripts de atendimento, atalhos de sistemas municipais/tributários, gestão de permissões e relatórios de auditoria em um único ambiente rápido e intuitivo.

A aplicação conta com arquitetura de micro-serviços em **Docker**, persistência relacional em **PostgreSQL**, inteligência artificial com a **API do Google Gemini** e padrões avançados de segurança **OWASP** (hashing de senhas com Bcrypt e recursos 100% locais).

---

## ✨ Módulos e Funcionalidades

### 🏛️ 1. Catálogo de Cidades & Links Tributários
* **Consulta por UF e Nome**: Filtro instantâneo de municípios atendidos e códigos IBGE.
* **Vínculo de Sistemas**: Cadastro de links para portais de ISS, Nota Fiscal Eletrônica e Certidões.
* **Instruções de Acesso**: Notas de configuração (necessidade de VPN corporativa, IP liberado ou certificado A1).

### ⚡ 2. Respostas Rápidas & Padronizadas (Canned Responses)
* **Substituição Dinâmica de Variáveis**: Preenchimento automático de parâmetros como `{{nome_cliente}}`, `{{protocolo}}` e `{{vencimento}}`.
* **Atalhos Rápidos**: Organização por categorias com atalhos estilo `/reset-senha` ou `/boleto`.
* **Cópia em 1 Clique**: Botão de cópia direta para a área de transferência com métrica de contagem de uso.

### 📚 3. Base de Conhecimento (Wiki Técnica)
* **Documentação em Markdown**: Renderização rica de guias de resolução de problemas, códigos de erro e procedimentos operacionais padrão (SOP).
* **Busca Full-Text & Tags**: Pesquisa por palavras-chave, categorias ou marcadores técnicos.
* **Métricas**: Contador de visualizações e utilidade dos artigos.

### 📝 4. Bloco de Rascunho (Scratchpad)
* **Auto-Save em Tempo Real**: Salvamento automático no banco de dados enquanto o atendente digita.
* **Templates de Atendimento**: Botões para inserção rápida de script de atendimento telefônico, formulário de bug para devs e carimbo de data/hora.

### 👤 5. Gestão de Usuários & Níveis de Acesso (RBAC)
* **Perfis Definidos**:
  * 👑 `ADMIN`: Acesso total a cadastro de operadores, categorias e exclusões.
  * 🛠️ `AGENT`: Permissão para criar e editar cidades, links, artigos e modelos.
  * 🎓 `TRAINEE`: Nível leitura para estagiários em treinamento.
* **Troca de Sessão em Tempo Real**: Recurso de simulação de papéis para testes de permissão.

### 🕵️‍♂️ 6. Trilha de Auditoria (Audit Trail)
* **Histórico Completo**: Registro de todas as ações de criação, alteração, exclusão, login e logout.
* **Detalhamento JSONB**: Visualização estruturada do estado dos dados antes e depois das alterações.

### 🤖 7. Assistente de Inteligência Artificial (Google Gemini)
* **Polimento de Notas**: Integração com `gemini-2.5-flash` para transformar anotações técnicas brutas em mensagens claras, empáticas e profissionais.

---

## 🛡️ Arquitetura e Segurança (Padrões OWASP)

* **Criptografia Bcrypt**: Senhas armazenadas no PostgreSQL com algoritmo de hash irreversível **Bcrypt** (10 rounds de salting).
* **Proteção Anti Brute-Force**: Bloqueio temporário (HTTP 429) após 5 tentativas incorretas de login a cada 15 minutos.
* **Prevenção a SQL Injection**: 100% das consultas no banco de dados utilizam parâmetros preparados (`$1`, `$2`).
* **Cabeçalhos HTTP Seguros**: Configuração de `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` e `Content-Security-Policy`.
* **Avatares Locais**: Imagens vetoriais SVG servidas diretamente pelo container (`/avatars/`), sem dependência de URLs externas.

---

## 🚀 Como Executar o Projeto (Docker Compose)

### ⚙️ Pré-requisitos
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução.
* [Git](https://git-scm.com/) para clonar o repositório.

---

### 📥 1. Clonar o Repositório
```bash
git clone https://github.com/joaomarcosls/SupportHub.git
cd SupportHub
```

---

### 🔑 2. Configurar as Variáveis de Ambiente
Copie o arquivo de exemplo `.env.example` para criar o seu arquivo `.env`:

```bash
cp .env.example .env
```

*Se necessário, insira sua chave da API do Gemini no arquivo `.env`:*
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

---

### 🐳 3. Subir a Aplicação com Docker Compose
Execute o comando abaixo para compilar e iniciar os containers do **Frontend (Nginx)**, **Backend (Express)** e **Banco de Dados (PostgreSQL)**:

```bash
docker compose up -d --build
```

---

### 🌐 4. Acessar a Aplicação

| Serviço | Endereço / URL | Descrição |
| :--- | :--- | :--- |
| **Aplicação Web** | **[http://localhost:8383](http://localhost:8383)** | Interface gráfica do sistema |
| **API Backend** | `http://localhost:3000` | Servidor Express / REST API |
| **PostgreSQL** | `localhost:5435` | Banco de Dados Relacional |

---

## 🔑 Credenciais Iniciais de Acesso

### 🌐 Login no Navegador (`http://localhost`)

| Perfil | E-mail | Senha Padrão |
| :--- | :--- | :--- |
| 👑 **Administrador** | `admin@empresa.com.br` | `Admin@123` |
| 🛠️ **Agente N2** | `mariana@empresa.com.br` | `Suporte@123` |
| 🎓 **Estagiário (Trainee)** | `lucas@empresa.com.br` | `Suporte@123` |

---

### 🗄️ Conexão ao Banco de Dados (DBeaver / pgAdmin)

| Parâmetro | Valor |
| :--- | :--- |
| **Host** | `127.0.0.1` (ou `localhost`) |
| **Porta** | **`5435`** |
| **Banco de dados** | `supporthub_db` |
| **Usuário** | `supporthub_user` |
| **Senha** | `SupporthubSecure2026!Pass` |

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** & **TypeScript**
- **Vite 6** (Build Tool)
- **Tailwind CSS V4** (Estilização)
- **Framer Motion** (Animações)
- **Lucide React** (Ícones)

### Backend
- **Node.js 20** & **Express**
- **pg (node-postgres)** (Pool de Conexões)
- **bcryptjs** (Hashing de Senhas)
- **@google/genai** (SDK do Gemini AI)

### Banco de Dados & Infraestrutura
- **PostgreSQL 16 Alpine**
- **Nginx Alpine** (Servidor Web Frontend)
- **Docker & Docker Compose**

---

## 🤝 Contribuição

Contribuições são sempre bem-vindas!
1. Faça um Fork do projeto.
2. Crie uma branch para sua funcionalidade (`git checkout -b feature/nova-funcionalidade`).
3. Commit suas alterações (`git commit -m 'feat: Adiciona nova funcionalidade'`).
4. Envie para o repositório (`git push origin feature/nova-funcionalidade`).
5. Abra um Pull Request.

---

## ✒️ Autor

Desenvolvido por **João Marcos**  
🔗 GitHub: [@joaomarcosls](https://github.com/joaomarcosls)
