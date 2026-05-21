# Osiris — Controle de Estoque de TI

Sistema de gestão de ativos de TI com interface moderna, construído com React + Vite + Netlify Functions + Neon DB.

## Funcionalidades

- **Dashboard** — KPIs em tempo real, distribuição por categoria, atividade recente
- **Equipamentos** — CRUD completo com busca e filtros por status e categoria
- **Categorias** — Organização dos ativos com cor personalizada
- **Locais** — Gestão de setores/localidades
- **Histórico** — Rastreamento de movimentações e mudanças de status

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS |
| Roteamento | React Router v6 |
| Deploy | Netlify (Static + Functions) |
| Banco | Neon DB (PostgreSQL serverless) |
| API | Netlify Functions (Node.js) |

## Deploy no Netlify

### 1. Clone e instale

```bash
git clone <seu-repositorio>
cd osiris
npm install
```

### 2. Configure o Neon DB

1. Acesse [console.neon.tech](https://console.neon.tech) e crie um projeto
2. Copie a **Connection String** (formato `postgresql://...`)

### 3. Configure no Netlify

1. Faça o deploy do repositório no Netlify (conecte pelo GitHub ou `netlify deploy`)
2. Em **Site settings → Environment variables**, adicione:
   ```
   DATABASE_URL = postgresql://user:pass@host/db?sslmode=require
   ```
3. Faça um novo deploy para aplicar a variável

### 4. Inicialize o banco

Após o deploy, acesse a URL do seu site e clique em **"Configurar banco de dados"** na tela inicial, ou chame manualmente:

```bash
curl -X POST https://seu-site.netlify.app/.netlify/functions/setup
```

## Desenvolvimento local

```bash
# Instale a Netlify CLI
npm install -g netlify-cli

# Crie o arquivo .env com sua DATABASE_URL
cp .env.example .env
# edite o .env com sua connection string real

# Inicie o servidor local (Vite + Functions)
netlify dev
```

Acesse em `http://localhost:8888`

## Estrutura

```
├── netlify/functions/     # API serverless
│   ├── setup.js           # Inicializa tabelas + seed
│   ├── dashboard.js       # Estatísticas
│   ├── equipment.js       # CRUD equipamentos
│   ├── categories.js      # CRUD categorias
│   └── locations.js       # CRUD locais
├── src/
│   ├── components/
│   │   ├── pages/         # Dashboard, Equipment, Categories, Locations
│   │   ├── modals/        # Formulários modais
│   │   └── ui/            # Badge, Modal, ConfirmDialog
│   └── lib/
│       ├── api.ts          # Cliente de API
│       └── types.ts        # Tipos TypeScript
└── netlify.toml           # Configuração do Netlify
```
