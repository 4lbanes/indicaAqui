# IndicaAqui!
Plataforma web que incentiva indicações: cada novo cadastro gera um código exclusivo, e todo registro feito com esse código soma pontos para o usuário que indicou. O projeto combina uma SPA rápida em React/Vite com uma API Node.js/Express persistida em SQLite.

## 🔍 Visão Geral Rápida
- UI responsiva com alternância animada entre cadastro e login.
- Autenticação JWT com sessão de 7 dias e tela de perfil com pontuação.
- Recuperação de senha por código, avaliação de força em tempo real e senha sugerida segura.
- Tema claro/escuro, suporte bilíngue (pt/en) e link de indicação com botão de cópia.

## 📦 Stack Principal
| Camada         | Tecnologias                                                         |
| -------------- | ------------------------------------------------------------------- |
| Front-end SPA  | React 18, Vite, React Router, Context API, Fetch API nativo         |
| Estilos        | CSS moderno (variáveis, flex/grid, animações 3D no cartão de auth)  |
| Back-end API   | Node.js 18, Express 5, sqlite3, bcryptjs, jsonwebtoken, dotenv      |
| Banco de dados | SQLite (arquivo em produção, `:memory:` durante testes)             |
| Testes         | — (sem suíte automatizada no momento)                               |

## 🚀 Como Rodar Localmente
Pré-requisito: **Node.js 18+** instalado.

### 1. API (backend)
```bash
cd backend
cp .env.example .env   # configure PORT, JWT_SECRET e CLIENT_BASE_URL
npm install
npm run dev
```
- `PORT`: porta HTTP (padrão `4000`).
- `JWT_SECRET`: segredo obrigatório para assinar tokens.
- `CLIENT_BASE_URL`: origens liberadas no CORS (ex.: `http://localhost:5173`).

### 2. SPA (frontend)
```bash
cd frontend
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm install
npm run dev
```
- `VITE_API_URL`: endereço da API (padrão `http://localhost:4000`).
- Vite inicia em `http://localhost:5173`. Use `npm run build` para produção.

### 3. Execução combinada
Na raiz do repositório:
```bash
bash dev.sh
```
O script prepara `.env`, instala dependências quando faltarem e sobe API + SPA em paralelo.

## ⚙️ Variáveis de Ambiente
| Local          | Variável            | Descrição                                               |
| -------------- | ------------------- | ------------------------------------------------------- |
| `backend/.env` | `PORT`              | Porta de escuta da API                                  |
|                | `JWT_SECRET`        | Segredo usado para assinar tokens JWT                   |
|                | `CLIENT_BASE_URL`   | Lista de origens permitidas para CORS (separadas por ,) |
| `frontend/.env`| `VITE_API_URL`      | URL base usada pelos fetches do front                   |

## 🔁 Fluxo de Indicação
1. Usuário se cadastra e recebe um `referralCode` exclusivo.
2. O link compartilhado segue o formato `/?ref=<CÓDIGO>`.
3. Cada cadastro originado pelo link incrementa `points` do indicante e fica registrado no histórico.
4. O perfil mostra pontuação atual, link para copiar e tabela de indicações recentes.

## 🧩 API REST
| Método | Rota                           | Descrição                                                                       | Autenticação |
| ------ | ------------------------------ | ------------------------------------------------------------------------------- | ------------ |
| POST   | `/api/register`                | Cria usuário (`name`, `email`, `password`, `referralCode?`).                    | —            |
| POST   | `/api/login`                   | Retorna token + dados do usuário existente.                                     | —            |
| GET    | `/api/me`                      | Dados do usuário autenticado (inclui histórico de indicações).                  | Bearer token |
| DELETE | `/api/me`                      | Remove a conta autenticada (exige confirmação de `email` e `password`).         | Bearer token |
| POST   | `/api/password-strength`       | Calcula métricas da senha e retorna recomendações + senha sugerida aleatória.   | —            |
| POST   | `/api/password-reset/request`  | Solicita envio de código de recuperação (resposta genérica para evitar leaks).  | —            |
| POST   | `/api/password-reset/confirm`  | Valida código recebido e define uma nova senha segura.                          | —            |

**Exemplo rápido** (`password-strength`):
```bash
curl -X POST http://localhost:4000/api/password-strength \
  -H "Content-Type: application/json" \
  -d '{"password":"Abc123!@#"}'
```

## 🧪 Testes e Qualidade
- O projeto ainda não possui testes automatizados configurados; recomenda-se adicioná-los para cobrir cadastro, login, indicações e fluxos sensíveis.

## 🗃️ Dados e Persistência
- O banco de produção local fica em `backend/data/database.sqlite`.
- Para limpar tudo rapidamente:
  ```bash
  sqlite3 backend/data/database.sqlite "PRAGMA foreign_keys=OFF; DELETE FROM password_resets; DELETE FROM users; VACUUM;"
  ```

## 📂 Estrutura de Pastas
```
backend/
  src/index.js           # Rotas, validações e regras (inclui geração de senhas sugeridas)
  src/db.js              # Conexão SQLite + helpers (run/get/all)
  src/auth.js            # Middleware JWT e extração do userId
  src/mailer.js          # Envio simulado do código de reset (logado no console)

frontend/
  src/pages/AuthPage.jsx      # Formulário com slider 3D + analisador de senha
  src/pages/ProfilePage.jsx   # Dashboard com pontuação e histórico de indicações
  src/context/                # Providers para auth, tema e idioma
  src/api/client.js           # Cliente REST centralizado
  src/i18n/translations.js    # Dicionário pt/en
  src/App.css                 # Estilos globais, animações e layout
```

## 🤖 Colaboração com IA
O assistente Codex ajudou a:
- Planejar as entregas, separar responsabilidades e reduzir rework.
- Produzir o MVP (frontend + backend), ajustar validações e estilizações.
- Escrever documentação, revisar mensagens e organizar tarefas de QA manual.

Principais aprendizados: manter validações alinhadas entre front/back, garantir ergonomia de UI (tema/idioma), reforçar práticas de modularização na API e acelerar o fluxo com apoio de IA, sempre revisando o resultado final.

## 🚧 Próximos Passos Sugeridos
- Integrar serviço de e-mail real (SMTP/SendGrid) para recuperar senhas e enviar notificações.
- Criar painel administrativo com ranking de indicações e filtros por período.
- Adicionar rate limiting e mecanismos anti-bot (CAPTCHA) em formulários sensíveis.

## 📚 Casos de Uso Cobertos
- **Cadastro e login** com validação de campos, JWT e persistência segura.
- **Sistema de indicações** completo: código dedicado, link compartilhável e pontos acumulados.
- **Recuperação de senha** via código de verificação, com fluxo completo de redefinição.
- **Experiência de senha** com feedback visual, recomendações e sugestão aleatória.
- **Exclusão de conta** com confirmação de credenciais e remoção definitiva.
