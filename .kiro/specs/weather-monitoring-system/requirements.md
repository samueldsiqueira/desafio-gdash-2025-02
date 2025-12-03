# Requirements Document

## Introduction

O Weather Monitoring System é uma aplicação full-stack que coleta, processa e visualiza dados climáticos em tempo real, integrando múltiplas linguagens e tecnologias. O sistema utiliza um pipeline de dados distribuído (Python → Message Broker → Go → NestJS → MongoDB → React) para coletar informações meteorológicas de APIs públicas, processá-las através de uma fila de mensagens, armazená-las em banco de dados, e apresentá-las em um dashboard interativo com insights gerados por IA. A aplicação também inclui gerenciamento de usuários com autenticação e capacidade de exportação de dados em múltiplos formatos.

## Glossary

- **Weather Collector**: Serviço Python responsável por coletar dados climáticos de APIs externas
- **Message Broker**: Sistema de fila de mensagens (RabbitMQ ou Redis) que gerencia a comunicação assíncrona entre serviços
- **Queue Worker**: Serviço Go que consome mensagens da fila e as processa
- **API Service**: Backend NestJS que gerencia dados, autenticação e lógica de negócio
- **Dashboard**: Interface React que exibe dados climáticos e insights
- **Weather Log**: Registro individual de dados climáticos coletados em um momento específico
- **AI Insights**: Análises e previsões geradas automaticamente a partir dos dados climáticos históricos
- **User**: Entidade que representa um usuário do sistema com credenciais de autenticação
- **MongoDB**: Banco de dados NoSQL usado para armazenar weather logs e usuários
- **Docker Compose**: Ferramenta de orquestração que gerencia todos os containers da aplicação

## Requirements

### Requirement 1

**User Story:** Como um administrador do sistema, eu quero que dados climáticos sejam coletados automaticamente da minha localização, para que o sistema tenha informações atualizadas sem intervenção manual.

#### Acceptance Criteria

1. THE Weather Collector SHALL buscar dados climáticos de Open-Meteo ou OpenWeather API a cada intervalo configurável
2. WHEN o Weather Collector obtém dados da API externa THEN THE Weather Collector SHALL extrair temperatura, umidade, velocidade do vento, condição do céu e probabilidade de chuva
3. WHEN o Weather Collector processa dados climáticos THEN THE Weather Collector SHALL normalizar os dados em formato JSON estruturado
4. WHEN o Weather Collector normaliza dados THEN THE Weather Collector SHALL enviar a mensagem JSON para o Message Broker
5. IF a API externa retorna erro ou está indisponível THEN THE Weather Collector SHALL registrar o erro em logs e tentar novamente no próximo intervalo

### Requirement 2

**User Story:** Como um desenvolvedor do sistema, eu quero que as mensagens climáticas sejam processadas de forma assíncrona e confiável, para que o sistema seja resiliente e escalável.

#### Acceptance Criteria

1. THE Message Broker SHALL receber mensagens JSON do Weather Collector e armazená-las em uma fila
2. THE Queue Worker SHALL consumir mensagens da fila do Message Broker
3. WHEN o Queue Worker consome uma mensagem THEN THE Queue Worker SHALL validar a estrutura e integridade dos dados
4. WHEN o Queue Worker valida dados com sucesso THEN THE Queue Worker SHALL enviar requisição HTTP POST para o API Service
5. WHEN o API Service confirma recebimento dos dados THEN THE Queue Worker SHALL enviar acknowledgment (ack) para o Message Broker
6. IF o API Service retorna erro ou está indisponível THEN THE Queue Worker SHALL enviar negative acknowledgment (nack) e a mensagem SHALL retornar para a fila
7. WHEN o Queue Worker processa mensagens THEN THE Queue Worker SHALL registrar logs de todas operações principais

### Requirement 3

**User Story:** Como um usuário do sistema, eu quero visualizar dados climáticos históricos e atuais em um dashboard, para que eu possa acompanhar as condições meteorológicas da minha região.

#### Acceptance Criteria

1. WHEN o API Service recebe dados do Queue Worker THEN THE API Service SHALL armazenar o Weather Log no MongoDB
2. THE API Service SHALL expor endpoint GET para listar Weather Logs com suporte a filtros e paginação
3. WHEN o Dashboard solicita dados climáticos THEN THE API Service SHALL retornar Weather Logs ordenados por data/hora
4. THE Dashboard SHALL exibir temperatura atual, umidade, velocidade do vento e condição do céu em cards visuais
5. THE Dashboard SHALL exibir gráficos de temperatura e probabilidade de chuva ao longo do tempo
6. THE Dashboard SHALL exibir tabela com histórico de Weather Logs incluindo data/hora, local, condição, temperatura e umidade

### Requirement 4

**User Story:** Como um usuário do sistema, eu quero receber insights inteligentes sobre os dados climáticos, para que eu possa tomar decisões informadas sobre o clima.

#### Acceptance Criteria

1. THE API Service SHALL processar Weather Logs históricos para gerar AI Insights
2. WHEN AI Insights são solicitados THEN THE API Service SHALL calcular médias, tendências e padrões nos dados climáticos
3. THE API Service SHALL classificar condições climáticas em categorias como "frio", "quente", "agradável", "chuvoso"
4. WHEN condições extremas são detectadas THEN THE API Service SHALL gerar alertas como "Alta chance de chuva", "Calor extremo" ou "Frio intenso"
5. THE Dashboard SHALL exibir AI Insights em formato textual e visual
6. THE API Service SHALL expor endpoint para obter AI Insights gerados

### Requirement 5

**User Story:** Como um analista de dados, eu quero exportar dados climáticos em formatos estruturados, para que eu possa realizar análises externas e gerar relatórios.

#### Acceptance Criteria

1. THE API Service SHALL expor endpoint GET para exportar Weather Logs em formato CSV
2. THE API Service SHALL expor endpoint GET para exportar Weather Logs em formato XLSX
3. WHEN o usuário solicita exportação THEN THE API Service SHALL incluir todos os campos relevantes dos Weather Logs
4. THE Dashboard SHALL exibir botões para download de arquivos CSV e XLSX
5. WHEN o usuário clica em botão de exportação THEN THE Dashboard SHALL iniciar download do arquivo no formato solicitado

### Requirement 6

**User Story:** Como um administrador do sistema, eu quero gerenciar usuários e controlar acesso ao sistema, para que apenas pessoas autorizadas possam visualizar dados climáticos.

#### Acceptance Criteria

1. THE API Service SHALL implementar autenticação baseada em JWT (JSON Web Token)
2. THE API Service SHALL expor endpoint POST para login que retorna token JWT válido
3. WHEN o sistema é inicializado pela primeira vez THEN THE API Service SHALL criar um User padrão com credenciais configuráveis via variáveis de ambiente
4. THE API Service SHALL expor endpoints CRUD completos para gerenciar Users (criar, listar, atualizar, deletar)
5. WHEN um endpoint protegido é acessado sem token válido THEN THE API Service SHALL retornar erro 401 Unauthorized
6. THE Dashboard SHALL implementar tela de login que solicita credenciais do User
7. WHEN o User faz login com sucesso THEN THE Dashboard SHALL armazenar token JWT e permitir acesso às rotas protegidas
8. THE Dashboard SHALL implementar interface para CRUD de Users acessível apenas para usuários autenticados

### Requirement 7

**User Story:** Como um desenvolvedor do sistema, eu quero que toda a aplicação seja executada via Docker Compose, para que o ambiente seja reproduzível e fácil de configurar.

#### Acceptance Criteria

1. THE Docker Compose SHALL definir serviços para Weather Collector, Message Broker, Queue Worker, API Service, MongoDB e Dashboard
2. WHEN o comando docker-compose up é executado THEN THE Docker Compose SHALL inicializar todos os serviços na ordem correta
3. THE Docker Compose SHALL configurar redes internas para comunicação entre serviços
4. THE Docker Compose SHALL expor portas necessárias para acesso externo ao Dashboard e API Service
5. THE Docker Compose SHALL utilizar variáveis de ambiente definidas em arquivo .env
6. WHEN todos os serviços estão em execução THEN THE Docker Compose SHALL permitir que o sistema funcione end-to-end

### Requirement 8

**User Story:** Como um desenvolvedor do sistema, eu quero que o código seja bem estruturado e siga boas práticas, para que o sistema seja mantível e escalável.

#### Acceptance Criteria

1. THE API Service SHALL ser implementado em TypeScript com NestJS framework
2. THE Dashboard SHALL ser implementado em React com Vite, Tailwind CSS e shadcn/ui components
3. THE Weather Collector SHALL ser implementado em Python utilizando bibliotecas como requests ou httpx
4. THE Queue Worker SHALL ser implementado em Go com tratamento adequado de erros
5. WHEN erros ocorrem em qualquer serviço THEN THE serviço SHALL registrar logs detalhados com contexto suficiente para debugging
6. THE código SHALL seguir padrões de formatação e linting (ESLint/Prettier para TypeScript, gofmt para Go, black/flake8 para Python)
7. THE API Service SHALL implementar validação de dados de entrada em todos os endpoints

### Requirement 9 (Optional)

**User Story:** Como um usuário do sistema, eu quero explorar dados de APIs públicas paginadas, para que eu possa ter funcionalidades adicionais no dashboard.

#### Acceptance Criteria

1. WHERE a funcionalidade opcional está habilitada, THE API Service SHALL implementar endpoints para consumir API pública paginada (PokéAPI ou SWAPI)
2. WHERE a funcionalidade opcional está habilitada, THE API Service SHALL expor endpoint GET para listar itens com suporte a paginação
3. WHERE a funcionalidade opcional está habilitada, THE API Service SHALL expor endpoint GET para obter detalhes de um item específico
4. WHERE a funcionalidade opcional está habilitada, THE Dashboard SHALL implementar página para exibir lista paginada de itens
5. WHERE a funcionalidade opcional está habilitada, WHEN o usuário clica em um item THEN THE Dashboard SHALL exibir página de detalhes do item selecionado
