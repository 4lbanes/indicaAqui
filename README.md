# IndicaAqui!

Plataforma single-page para cadastro de usuários com indicação e pontuação. O projeto combina um SPA em React/Vite, API em Node.js/Express e persistência em SQLite. O objetivo é permitir que cada usuário gere um link exclusivo de indicação e some pontos a cada novo cadastro originado por esse link.

## 📌 Principais recursos
- Cadastro com validação de nome, e-mail e senha diretamente no browser.
- Alternância animada entre cadastro e login (arraste no slider e o cartão vira em 3D).
- Login persistente via JWT com expiração de 7 dias.
- Perfil do usuário exibindo nome, pontuação atual e link de indicação com botão “copiar”.
- Exclusão de conta mediante confirmação de e-mail e senha.
- Tema claro/escuro com preferência salva em `localStorage`.
- UI bilíngue (Português/Inglês) com troca instantânea.
- Avaliação de senha em tempo real (score visual, recomendações e senha sugerida).
- Recuperação de senha via e-mail com código de verificação e redefinição segura.

## 🧱 Arquitetura em alto nível
```
frontend/          # SPA (React + Vite)
  src/
    pages/        # Auth (login/cadastro) e Profile
    context/      # Autenticação, tema e idioma
    api/          # Cliente de API REST
    i18n/         # Dicionário de traduções pt/en
backend/           # API REST (Express)
  src/
    index.js      # Rotas e regras de negócio
    db.js         # Bootstrap do SQLite + helpers
    auth.js       # Middleware de autenticação JWT
  __tests__/      # Testes automatizados (Jest + Supertest)
```
Uma única tabela `users` armazena o cadastro. Cada usuário possui `referral_code`. Ainda que simples, a estrutura permite evoluir o esquema futuramente (ex.: logs de indicação).

## 🛠️ Tecnologias
| Camada         | Tecnologias                                                         |
| -------------- | ------------------------------------------------------------------- |
| Front-end SPA  | React 18, Vite, React Router, Context API, Fetch API nativo         |
| Estilos        | CSS puro com variáveis, flex/grid, animações keyframes/transforms   |
| Back-end API   | Node.js 18, Express 5, sqlite3, bcryptjs, jsonwebtoken, dotenv      |
| Banco de dados | SQLite (modo arquivo em produção, `:memory:` durante testes)        |
| Testes         | Jest, Supertest                                                     |

## 🚀 Execução local
Pré-requisito: **Node.js 18+**.

### 1. API (backend)
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Variáveis importantes (`backend/.env`):
- `PORT` – porta da API (default `4000`).
- `JWT_SECRET` – segredo usado para assinar tokens (obrigatório).
- `CLIENT_BASE_URL` – origem permitida para CORS (ex.: `http://localhost:5173`).

Para rodar os testes automatizados:
```bash
npm test
```
Durante os testes a API usa um banco em memória e roda via Supertest, garantindo isolamento.

### 2. SPA (frontend)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Variáveis (`frontend/.env`):
- `VITE_API_URL` – endereço da API (default `http://localhost:4000`).

O Vite sobe em `http://localhost:5173`. O script `npm run build` gera o bundle produtivo.

### 3. Execução combinada
Na raiz do projeto use o script auxiliar:
```bash
bash dev.sh
```
Ele garante a cópia dos `.env`, instala dependências caso necessário e executa `npm run dev` em `backend/` e `frontend/` em paralelo.

## 🔄 Fluxo de uso
1. Abra o SPA (modo claro/escuro e idioma podem ser trocados a qualquer momento).
2. Cadastre-se com nome, e-mail e senha. Ao arrastar o slider, o cartão atravessa um efeito flip para alternar login/cadastro.
3. Uma vez autenticado, o perfil exibe a pontuação (inicialmente 0) e o link de indicação. Basta clicar em “Copiar link”.
4. Sempre que um novo usuário cadastrar-se utilizando `?ref=SEUCODIGO`, o dono do link soma +1 ponto.
5. O usuário pode solicitar exclusão da conta informando e-mail, senha e confirmando a ação.

## 🧩 API REST
| Método | Rota                    | Descrição                                                                 | Autenticação |
| ------ | ----------------------- | ------------------------------------------------------------------------- | ------------ |
| POST   | `/api/register`         | Cria usuário (`name`, `email`, `password`, `referralCode?`).             | —            |
| POST   | `/api/login`            | Retorna token + dados do usuário existente.                              | —            |
| GET    | `/api/me`               | Dados do usuário autenticado (inclui histórico de indicações).          | Bearer token |
| DELETE | `/api/me`               | Remove a conta autenticada (requer confirmação de `email` e `password`). | Bearer token |
| POST   | `/api/password-strength`| Avalia senha e retorna métricas (score, nível, recomendações).           | —            |
| POST   | `/api/password-reset/request` | Solicita código de recuperação (resposta genérica para evitar enumeração). | —            |
| POST   | `/api/password-reset/confirm` | Valida código, define nova senha e invalida códigos antigos.             | —            |

Exemplo de chamada `password-strength`:
```bash
curl -X POST http://localhost:4000/api/password-strength \
  -H "Content-Type: application/json" \
  -d '{"password":"Abc123!@#"}'
```
Resposta (resumo):
```json
{
  "length": 9,
  "hasLower": true,
  "hasUpper": true,
  "hasNumber": true,
  "hasSymbol": true,
  "uniqueChars": 9,
  "score": 82,
  "strength": "strong",
  "issues": [],
  "reused": false,
  "recommendedPassword": "nQfz9@YF7WqT3LgK"
}
```
O front consome esse endpoint para exibir a barra colorida (vermelho, laranja, verde) e as recomendações.

## 🧪 Testes
- `backend/npm test` — executa a suíte Jest + Supertest em banco SQLite em memória.
- `npm install` (na raiz) + `npx playwright install` + `npm run test:e2e` — sobe API e SPA automaticamente em modo teste e roda o fluxo completo com Playwright (cadastro → login → indicação → reset → exclusão).

## 💡 Decisões de design
- **Componentização mínima**: a SPA foca em duas páginas (`AuthPage` e `ProfilePage`) com contextos para estado global (auth/tema/idioma), evitando lib de estado pesada.
- **Internacionalização sem dependências**: um simples objeto `translations` + contexto garante alternância instantânea de idioma, e mantém as strings centralizadas.
- **Experiência de senha**: o backend realiza a análise (score, diversidade, reutilização) garantindo que a lógica permaneça consistente independentemente do front.
- **Banco leve**: SQLite dispensa servidor externo, mas pode ser migrado para Postgres/MySQL sem grandes mudanças (basta trocar driver e realizar migrações).
- **Testes automatizados**: a suíte atual cobre o endpoint de força de senha (incluindo detecção de reutilização). É um ponto inicial para evoluir os testes de usuários, indicações e exclusão.

## 📂 Estrutura relevante
```
backend/
  src/index.js           # Rotas, validações e regras (inclui geração de senha sugerida)
  src/db.js              # Conexão SQLite, helpers (run/get/all), bootstrapping
  src/auth.js            # Middleware JWT
  src/mailer.js          # Simulação de envio de código de reset (log em console)
  __tests__/passwordStrength.test.js  # Casos de teste com Jest + Supertest
frontend/
  src/pages/AuthPage.jsx # Formulário com slider 3D + analisador de senha
  src/pages/ProfilePage.jsx # Pontuação, link de indicação e exclusão de conta
  src/context/           # AuthProvider, ThemeProvider, LanguageProvider
  src/api/client.js      # Cliente REST (register/login/profile/password-strength)
  src/i18n/translations.js # Dicionário pt/en
  src/App.css            # Estilização global (tema, slider, password meter)
e2e/
  app.spec.js           # Teste end-to-end com Playwright
playwright.config.js    # Configuração do Playwright (sobe API + SPA em modo teste)
```

## 🤖 Colaboração com IA
Utilizei o assistente Codex para:
- Organizar o plano de desenvolvimento, separar responsabilidades entre front/back e priorizar entregas.
- Produzir o MVP em React/Vite, estilização responsiva e animações do slider/card.
- Ajustar versões, criar testes automatizados (Jest + Supertest), refatorar README e preparar instruções de execução.

Lições tiradas: reforço das boas práticas de modularização da API, importância de alinhar validações front/back e ganho de produtividade ao acoplar IA no fluxo (refinando mensagens de commit, documentação e testes).

## 🚧 Próximos passos sugeridos
- Integrar serviço de e-mail real (SMTP/SendGrid etc.) para enviar códigos de reset, boas-vindas e alertas de pontos.
- Criar visualizações administrativas (ranking, filtros e exportação) com base no histórico já disponível.
- Adicionar rate limiting em tentativas suspeitas de login/cadastro.
- Adicionar CAPTCHA na criação das contas.
- Disponibilizar testes E2E em pipeline CI/CD (GitHub Actions) e publicar deploy containerizado.

## 📚 Casos de uso cobertos
- **Cadastro e login** com validação instantânea de campos e persistência via JWT.
- **Sistema de indicações** gerando link único, pontuação automática e histórico por usuário.
- **Recuperação de senha** com solicitação de código, validação e troca segura totalmente automatizada.
- **Experiência de senha** com avaliação de força, sugestões personalizadas e verificação de reutilização.
- **Exclusão de conta** com confirmação de credenciais e limpeza dos dados na base.
