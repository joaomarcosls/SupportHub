# 🐳 Docker Deployment - SupportHub

Esta pasta reúne todos os arquivos de configuração do **Docker** e **Docker Compose** organizados de forma independente.

---

## 📂 Arquivos Incluídos

* `docker-compose.yml`: Orquestração dos containers (PostgreSQL 16, Backend Express e Frontend Nginx).
* `Dockerfile.backend`: Build do servidor Node.js com TypeScript e Criptografia Bcrypt.
* `Dockerfile.frontend`: Build da interface React 19 + Vite com servidor de produção Nginx.
* `nginx.conf`: Configuração do proxy reverso para rotas da API (`/api/`) e avatares (`/avatars/`).
* `deploy.sh`: Script executável para deploy automatizado em 1 clique.

---

## 🚀 Como Executar o Sistema Usando Esta Pasta

### Opção 1: Executando a partir da Raiz do Projeto (Recomendado)
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### Opção 2: Usando o Script Automático `deploy.sh`
```bash
chmod +x docker/deploy.sh
./docker/deploy.sh
```

---

## 🛑 Como Encerrar os Containers
```bash
docker compose -f docker/docker-compose.yml down
```

---

## 🌐 URLs de Acesso

| Serviço | Endereço |
| :--- | :--- |
| **Interface Web (Frontend)** | **`http://localhost:8383`** |
| **API Backend** | `http://localhost:3000` |
| **PostgreSQL (DBeaver)** | `localhost:5435` |
