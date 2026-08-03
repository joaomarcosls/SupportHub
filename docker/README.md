# 🐳 Docker Deployment com Git Clone Automático - SupportHub

Esta pasta reúne os arquivos de configuração do **Docker** projetados para baixar automaticamente o código-fonte diretamente do GitHub durante o processo de `docker build`.

---

## 🛠️ Como Funciona o Git Clone Automático nos Dockerfiles

Durante a construção da imagem, o `Dockerfile.backend` e o `Dockerfile.frontend` executam o download do repositório via `git clone`, permitindo que o container seja compilado de forma 100% autônoma em qualquer servidor.

### Argumentos Suportados (`ARG` / `ENV`):

* `REPO_URL`: URL do repositório GitHub (Padrão: `https://github.com/joaomarcosls/SupportHub.git`).
* `BRANCH_VERSION`: Branch a ser clonada (Padrão: `main`).
* `GIT_AUTH_TOKEN`: Token de autenticação GitHub (Opcional, para repositórios privados).

---

## 📋 Exemplo de Sintaxe nos Dockerfiles

```dockerfile
# Clonar o repositório diretamente do GitHub no container de Build
RUN if [ -n "$GIT_AUTH_TOKEN" ]; then \
        git clone https://${GIT_AUTH_TOKEN}:x-oauth-basic@${REPO_URL#https://} --branch ${BRANCH_VERSION} . ; \
    else \
        git clone ${REPO_URL} --branch ${BRANCH_VERSION} . ; \
    fi
```

---

## 🚀 Como Executar no Servidor

### 1. Build Padrão (Repositório Público na Branch `main`):
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 2. Build com Token de Acesso Privado ou Outra Branch:
```bash
GIT_AUTH_TOKEN="seu_token_github" BRANCH_VERSION="main" docker compose -f docker/docker-compose.yml up -d --build
```

---

## 🌐 URLs de Acesso

| Serviço | Endereço |
| :--- | :--- |
| **Interface Web (Frontend)** | **`http://localhost:8383`** |
| **API Backend** | `http://localhost:3000` |
| **PostgreSQL (DBeaver)** | `localhost:5435` |
