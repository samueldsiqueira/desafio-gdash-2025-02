# Weather Monitoring System

Sistema full-stack de monitoramento climático que coleta, processa e visualiza dados meteorológicos em tempo real, utilizando um pipeline de dados distribuído com múltiplas linguagens e tecnologias.

## 🏗️ Arquitetura

```
┌─────────────────┐
│  Weather APIs   │
│ (Open-Meteo)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│     Python      │
│Weather Collector│
└────────┬────────┘
         │ AMQP
         ▼
┌─────────────────┐
│    RabbitMQ     │
│ Message Broker  │
└────────┬────────┘
         │ AMQP
         ▼
┌─────────────────┐      ┌─────────────────┐
│   Go Worker     │─────▶│    MongoDB      │
│  Queue Consumer │      │                 │
└────────┬────────┘      └────────▲────────┘
         │ HTTP                    │
         ▼                         │
┌─────────────────┐               │
│   NestJS API    │───────────────┘
│     Service     │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│  React + Vite   │
│    Dashboard    │
└─────────────────┘
```

## 🚀 Quick Start

### Pré-requisitos

- Docker e Docker Compose instalados
- Git

### 1. Clone o repositório

```bash
git clone <repository-url>
cd desafio-gdash-2025-02
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário (veja seção de variáveis de ambiente abaixo).

### 3. Inicie todos os serviços

```bash
docker-compose up --build
```

### 4. Acesse a aplicação

| Serviço | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API Service | http://localhost:3000/api |
| API Documentation (Swagger) | http://localhost:3000/api/docs |
| RabbitMQ Management | http://localhost:15672 |

### 5. Login padrão

- **Email:** admin@example.com
- **Senha:** admin123

## 📦 Serviços

### Weather Collector (Python)

Serviço responsável por coletar dados climáticos da API Open-Meteo.

**Localização:** `weather-collector/`

**Funcionalidades:**
- Coleta periódica de dados climáticos (configurável)
- Extração de temperatura, umidade, velocidade do vento, condição e probabilidade de chuva
- Normalização dos dados em formato JSON
- Publicação de mensagens no RabbitMQ

**Executar localmente:**
```bash
cd weather-collector
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python -m src.collector
```

### Queue Worker (Go)

Worker que consome mensagens da fila e envia para a API.

**Localização:** `queue-worker/`

**Funcionalidades:**
- Consumo de mensagens do RabbitMQ
- Validação da estrutura dos dados
- Envio de requisições HTTP POST para a API
- Implementação de ack/nack com retry
- Logging estruturado

**Executar localmente:**
```bash
cd queue-worker
go mod download
go run cmd/worker/main.go
```

### API Service (NestJS)

Backend principal da aplicação.

**Localização:** `api-service/`

**Funcionalidades:**
- Autenticação JWT
- CRUD de usuários
- Armazenamento de weather logs no MongoDB
- Geração de AI Insights (estatísticas, tendências, classificação, alertas)
- Exportação de dados em CSV e XLSX
- Integração opcional com PokéAPI

**Executar localmente:**
```bash
cd api-service
npm install
npm run start:dev
```

### Dashboard (React)

Interface web para visualização dos dados.

**Localização:** `dashboard/`

**Funcionalidades:**
- Dashboard com dados climáticos em tempo real
- Cards de temperatura, umidade, vento e condição
- Gráficos de temperatura e probabilidade de chuva
- Tabela de histórico com paginação
- Painel de AI Insights
- Exportação de dados (CSV/XLSX)
- Gerenciamento de usuários
- Página de exploração (PokéAPI)

**Executar localmente:**
```bash
cd dashboard
npm install
npm run dev
```

## 🔧 Variáveis de Ambiente

### Arquivo `.env`

```bash
# MongoDB Configuration
MONGO_URI=mongodb://mongodb:27017/weather-monitoring

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
RABBITMQ_QUEUE=weather-data
RABBITMQ_USER=guest
RABBITMQ_PASS=guest

# API Service Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=admin123
API_PORT=3000
NODE_ENV=production
API_SERVICE_URL=http://api:3000/api/weather/logs

# Weather Collector Configuration
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
WEATHER_API_KEY=
COLLECTION_INTERVAL=3600
LOCATION_LAT=-23.5505
LOCATION_LON=-46.6333
LOCATION_CITY=São Paulo

# Dashboard Configuration
VITE_API_URL=http://localhost:3000/api

# Optional External API Configuration
EXTERNAL_API_URL=https://pokeapi.co/api/v2
```

### Descrição das Variáveis

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `MONGO_URI` | URI de conexão com MongoDB | `mongodb://mongodb:27017/weather-monitoring` |
| `RABBITMQ_URL` | URL de conexão com RabbitMQ | `amqp://guest:guest@rabbitmq:5672` |
| `RABBITMQ_QUEUE` | Nome da fila de mensagens | `weather-data` |
| `RABBITMQ_USER` | Usuário do RabbitMQ | `guest` |
| `RABBITMQ_PASS` | Senha do RabbitMQ | `guest` |
| `JWT_SECRET` | Chave secreta para tokens JWT | - |
| `JWT_EXPIRATION` | Tempo de expiração do token | `24h` |
| `DEFAULT_USER_EMAIL` | Email do usuário padrão | `admin@example.com` |
| `DEFAULT_USER_PASSWORD` | Senha do usuário padrão | `admin123` |
| `API_PORT` | Porta da API | `3000` |
| `NODE_ENV` | Ambiente de execução | `production` |
| `API_SERVICE_URL` | URL interna da API (para o worker) | `http://api:3000/api/weather/logs` |
| `WEATHER_API_URL` | URL da API de clima | `https://api.open-meteo.com/v1/forecast` |
| `WEATHER_API_KEY` | Chave da API de clima (opcional) | - |
| `COLLECTION_INTERVAL` | Intervalo de coleta em segundos | `3600` |
| `LOCATION_LAT` | Latitude da localização | `-23.5505` |
| `LOCATION_LON` | Longitude da localização | `-46.6333` |
| `LOCATION_CITY` | Nome da cidade | `São Paulo` |
| `VITE_API_URL` | URL da API para o frontend | `http://localhost:3000/api` |
| `EXTERNAL_API_URL` | URL da API externa (PokéAPI) | `https://pokeapi.co/api/v2` |

## 📚 API Documentation

A documentação completa da API está disponível via Swagger UI em:

**http://localhost:3000/api/docs**

### Endpoints Principais

#### Autenticação
- `POST /api/auth/login` - Login e obtenção de token JWT

#### Usuários (requer autenticação)
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `GET /api/users/:id` - Obter usuário
- `PATCH /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

#### Weather (requer autenticação para GET)
- `POST /api/weather/logs` - Criar weather log (interno)
- `GET /api/weather/logs` - Listar weather logs
- `GET /api/weather/logs/:id` - Obter weather log
- `GET /api/weather/insights` - Obter AI insights
- `GET /api/weather/export/csv` - Exportar CSV
- `GET /api/weather/export/xlsx` - Exportar XLSX

#### External API (requer autenticação)
- `GET /api/external/items` - Listar Pokémon
- `GET /api/external/items/:id` - Detalhes do Pokémon

#### Health
- `GET /api/health` - Health check

## 🧪 Testes

### API Service (NestJS)
```bash
cd api-service
npm test
npm run test:cov  # Com cobertura
```

### Queue Worker (Go)
```bash
cd queue-worker
go test ./...
```

### Weather Collector (Python)
```bash
cd weather-collector
pip install -r requirements.txt
pytest
```

### Dashboard (React)
```bash
cd dashboard
npm test
```

## 🐳 Docker Commands

### Iniciar todos os serviços
```bash
docker-compose up -d
```

### Iniciar com rebuild
```bash
docker-compose up --build
```

### Parar todos os serviços
```bash
docker-compose down
```

### Ver logs de um serviço específico
```bash
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f collector
docker-compose logs -f dashboard
```

### Reiniciar um serviço específico
```bash
docker-compose restart api
```

### Limpar volumes (reset do banco)
```bash
docker-compose down -v
```

## 🔍 Troubleshooting

### Serviços não iniciam
1. Verifique se as portas 3000, 5173, 27017, 5672 e 15672 estão livres
2. Execute `docker-compose down -v` e tente novamente
3. Verifique os logs: `docker-compose logs`

### Erro de conexão com MongoDB
1. Aguarde o MongoDB iniciar completamente (health check)
2. Verifique a variável `MONGO_URI`

### Erro de conexão com RabbitMQ
1. Aguarde o RabbitMQ iniciar completamente
2. Verifique as credenciais em `RABBITMQ_USER` e `RABBITMQ_PASS`

### Dashboard não conecta na API
1. Verifique se a API está rodando: `curl http://localhost:3000/api/health`
2. Verifique a variável `VITE_API_URL`

## 📹 Vídeo Demonstrativo

[Link do vídeo no YouTube - não listado]

<!-- TODO: Adicionar link do vídeo -->

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** NestJS 10, TypeScript, Mongoose, Passport JWT
- **Worker:** Go 1.21, amqp091-go
- **Collector:** Python 3.11, requests, pika, APScheduler
- **Database:** MongoDB 7.0
- **Message Broker:** RabbitMQ 3.12
- **Infrastructure:** Docker, Docker Compose

## 📄 Licença

MIT License
