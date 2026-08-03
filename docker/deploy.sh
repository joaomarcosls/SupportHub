#!/bin/bash

echo "🚀 Iniciando Deploy do SupportHub via pasta docker/..."

# Ir para a raiz do repositório
cd "$(dirname "$0")/.." || exit

# Executar o Docker Compose apontando para o arquivo dentro de docker/
docker compose -f docker/docker-compose.yml up -d --build

echo "✅ SupportHub iniciado com sucesso!"
echo "🌐 Acesso Frontend: http://localhost:8383"
echo "🗄️ PostgreSQL: localhost:5435"
