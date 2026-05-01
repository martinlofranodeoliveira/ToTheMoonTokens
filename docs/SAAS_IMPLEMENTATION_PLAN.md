# ToTheMoonTokens — Plano Completo de Implementação SaaS

> Documento autosuficiente para um agente de codificação (Codex / Claude Code / outro) executar
> de ponta a ponta. Lê apenas este arquivo + o repositório e segue na ordem das fases.
> Não tem dependência de conversa anterior.

---

## 0. Contexto e objetivo

**Projeto:** ToTheMoonTokens (TTM Agent Market) — API + dashboard + bot autônomo voltado
para "Capital de Risco Automatizado em criptomoedas novas", com Paper Trading,
Settlement em USDC via Circle e arquitetura de Economia de Agentes (Arc Testnet).

**Objetivo deste plano:** sair do estado atual (`~32%` SaaS de produção, com `main.py`
quebrado e várias features apenas declaradas, não implementadas) e chegar a um SaaS
real, vendável, com auth real, multi-tenancy, billing, simulação realista, integrações
externas reais, observabilidade enterprise e compliance básico.

**Política de segurança que NUNCA pode mudar:**

- `orderSubmissionEnabled` continua `False`. Direct order submission permanece
  bloqueado por código (`/ready` precisa validar isso).
- `runtime_mode` `paper` é o padrão. `guarded_testnet` exige flags explícitas.
- `blocked_mainnet` é proibido em `app_env=production`.
- Bot continua **paper-only** por padrão. Modo real exige feature flag por organização
  + aprovação manual + limites diários hard-coded.

**Definição de pronto (geral):**

Cada fase só é considerada concluída quando:

1. `python -m compileall -q services/api/src services/api/tests` passa sem erro.
2. `ruff check services/api/src services/api/tests` passa.
3. `mypy services/api/src/tothemoon_api` passa.
4. `pytest services/api/tests -q` passa com cobertura `>=70%`.
5. Smoke HTTP da fase passa (descrito em cada seção).
6. CHANGELOG da fase é adicionado em `docs/CHANGELOG.md`.

---

## 1. Estado atual auditado (resumo)

| Área | % pronto | Maior gap |
|---|---|---|
| Auth & Identity | 15% | Mock hardcoded, plaintext no DB |
| Banco de dados | 15% | SQLite, sem migrations, 2 tabelas |
| Multi-tenancy | 5% | Não existe |
| Billing | 25% | Sem assinatura, sem webhook |
| Paper Trading Engine | 35% | `simulate.py` é stub de 38 linhas |
| Bot autônomo | 20% | Scanner/auditor/market 100% mock |
| Integrações externas | 10% | Tudo mockado |
| Frontend | 25% | Lógica fake com `setTimeout` |
| Observabilidade | 70% | Falta tracing e alerting |
| Segurança | 40% | Auth fake, sem audit log |
| Qualidade (testes/CI) | 55% | 104 testes, falta e2e/load |
| Deploy & Infra | 35% | Sem IaC, sem staging |
| Documentação | 50% | Inconsistente vs código |
| Compliance & Legal | 0% | Sem TOS, Privacy, LGPD |

**Média ponderada: ~32%.**

---

## 2. Bugs bloqueantes — Fase 0 (1–2 dias)

### 2.1 `main.py` corrompido

Arquivo: `services/api/src/tothemoon_api/main.py`, linhas 453–455 contêm lixo:

```text
mit=limit)
mit)
mit=limit)
```

**Tarefa:** apagar essas três linhas. O arquivo deve terminar em
`return get_arc_jobs(limit=limit)` na função `list_arc_jobs`.

### 2.2 `tokens_router` e `simulate_router` referenciados sem import

`main.py` linhas 109–110 fazem:

```python
app.include_router(tokens_router)
app.include_router(simulate_router)
```

Mas os identificadores nunca foram importados.

**Tarefa:** adicionar no bloco de imports do topo:

```python
from .routers.tokens import router as tokens_router
from .simulate import router as simulate_router
```

### 2.3 `test_api_call.py` solto na raiz

Arquivo: `test_api_call.py` na raiz do repositório. Não pertence ao pacote, não é
executado pelo pytest, e está fora da estrutura.

**Tarefa:** mover o conteúdo relevante para `services/api/tests/test_smoke_external.py`
(marcado com `@pytest.mark.skip(reason="manual smoke")`) ou apagar se não tiver valor.

### 2.4 Inconsistência commit ↔ código

O commit message mais recente afirma várias features que NÃO existem no repositório
deste branch (rotas `/api/v1/saas/*`, `/api/v1/nanopayments/*`, hash de API key,
revoke, ledger no DB, frontend usando `X-API-Key` real). Esses itens são endereçados
nas Fases 1–4. Não tente "fazer o commit ficar verdadeiro" agora — vá fase por fase.

### 2.5 Validação da Fase 0

```bash
cd services/api
python -m compileall -q src tests
ruff check src tests
mypy src/tothemoon_api
pytest tests -q
uvicorn tothemoon_api.main:app --port 8010 --host 127.0.0.1 &
sleep 2
curl -fsS http://127.0.0.1:8010/health | grep -q '"ok": true'
curl -fsS http://127.0.0.1:8010/ready | grep -q '"ok": true'
kill %1
```

**DoD:** todos os comandos retornam exit code 0.

---

## 3. Fase 1 — Auth real (1 semana)

**Meta:** sair de 15% para 70% em Auth & Identity.

### 3.1 Dependências novas (`services/api/pyproject.toml`)

Adicionar em `[project.dependencies]`:

```toml
"sqlalchemy>=2.0,<3.0",
"alembic>=1.13,<2.0",
"argon2-cffi>=23.1,<24.0",
"python-jose[cryptography]>=3.3,<4.0",
"email-validator>=2.2,<3.0",
"asyncpg>=0.29,<1.0"
```

### 3.2 Refatorar `database.py`

`services/api/src/tothemoon_api/database.py`: substituir o stub atual por configuração
parametrizada via `Settings.database_url` (default sqlite local para desenvolvimento;
Postgres em staging/prod), com `pool_pre_ping=True` e `engine` único reusado.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import get_settings

settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.database_url

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

E adicionar em `Settings`:

```python
database_url: str = Field("sqlite:///./saas.db", alias="DATABASE_URL")
jwt_secret: str = Field("", alias="JWT_SECRET")
jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
jwt_expires_minutes: int = Field(60, alias="JWT_EXPIRES_MINUTES")
```

E no `validate()`:

```python
if self.app_env == "production" and (not self.jwt_secret or len(self.jwt_secret) < 32):
    errors.append("JWT_SECRET >= 32 chars é obrigatório em production")
```

### 3.3 Reescrever `db_models.py`

```python
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    api_keys = relationship("ApiKey", back_populates="owner", cascade="all, delete-orphan")

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    prefix = Column(String(16), nullable=False, index=True)
    key_hash = Column(String(255), nullable=False, unique=True)
    scopes = Column(String(255), nullable=False, default="default")
    revoked_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    owner = relationship("User", back_populates="api_keys")

Index("ix_api_keys_active", ApiKey.user_id, ApiKey.revoked_at)
```

### 3.4 Reescrever `auth.py`

Eliminar o `VALID_API_KEY` hardcoded.

```python
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from datetime import datetime, timedelta
from jose import jwt
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .db_models import ApiKey, User
from .config import get_settings

ph = PasswordHasher()
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def hash_password(plain: str) -> str:
    return ph.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        ph.verify(hashed, plain)
        return True
    except VerifyMismatchError:
        return False

def generate_api_key() -> tuple[str, str, str]:
    """Retorna (plaintext, prefix, key_hash). Plaintext é mostrado UMA vez."""
    raw = "ttm_sk_live_" + secrets.token_urlsafe(32)
    return raw, raw[:12], ph.hash(raw)

def create_jwt_for_user(user: User) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def current_user_from_jwt(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    settings = get_settings()
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == int(data["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    return user

def verify_api_key(
    api_key: str | None = Security(api_key_header),
    db: Session = Depends(get_db),
) -> ApiKey:
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key")
    prefix = api_key[:12]
    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.prefix == prefix, ApiKey.revoked_at.is_(None))
        .all()
    )
    for cand in candidates:
        try:
            ph.verify(cand.key_hash, api_key)
        except VerifyMismatchError:
            continue
        cand.last_used_at = datetime.utcnow()
        db.commit()
        return cand
    raise HTTPException(status_code=403, detail="Invalid API Key")
```

### 3.5 Novo router `routers/saas.py`

Endpoints:

- `POST /api/v1/auth/signup` — body `{email, password}` → cria usuário, retorna `201`.
- `POST /api/v1/auth/login` — form fields `username`, `password` → retorna JWT.
- `GET /api/v1/saas/account` — autenticado JWT → retorna `{email, plan, created_at}`.
- `GET /api/v1/saas/dashboard` — autenticado JWT → retorna métricas agregadas
  (Fase 4 popula com dados reais; nesta fase devolve placeholders zerados, mas a
  rota já existe).
- `GET /api/v1/saas/api-keys` — autenticado JWT → lista (com `prefix`, `name`, `last_used_at`,
  `revoked_at`), nunca o plaintext.
- `POST /api/v1/saas/api-keys` — autenticado JWT, body `{name}` → retorna `{id, name, prefix, plaintext}`.
- `DELETE /api/v1/saas/api-keys/{id}` — autenticado JWT → seta `revoked_at`.

Validação de email com `email-validator`. Senha mínimo 12 caracteres.
Throttle de signup/login: 10/min por IP via `enforce_rate_limit`.

### 3.6 Frontend (`apps/web/app.js`)

Trocar a geração local de chave por chamada real ao backend:

```js
const API_BASE = window.API_URL || 'http://127.0.0.1:8010';

async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('login failed');
  const { access_token } = await res.json();
  localStorage.setItem('ttm_jwt', access_token);
}

async function createApiKey(name) {
  const res = await fetch(`${API_BASE}/api/v1/saas/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('ttm_jwt')}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('create key failed');
  return await res.json();
}

async function callSimulate(apiKey, payload) {
  const res = await fetch(`${API_BASE}/api/v1/simulate/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(payload),
  });
  return await res.json();
}
```

E em `index.html` adicionar campos de email, senha, botão "Login", botão "Criar API key"
e área de "API keys da sua conta" com botão revogar.

### 3.7 Testes

Adicionar `services/api/tests/test_auth.py`:

- `test_signup_creates_user`
- `test_signup_rejects_short_password`
- `test_signup_rejects_invalid_email`
- `test_login_returns_jwt`
- `test_login_rejects_wrong_password`
- `test_create_api_key_requires_jwt`
- `test_api_key_plaintext_returned_only_once`
- `test_api_key_hash_stored_not_plaintext`
- `test_api_key_revoke_blocks_future_calls`
- `test_simulate_order_requires_x_api_key`
- `test_last_used_at_updated_on_use`

### 3.8 Validação Fase 1

```bash
cd services/api && pytest tests -q
# Smoke
curl -fsS -X POST http://127.0.0.1:8010/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"correct horse battery staple"}'
TOKEN=$(curl -fsS -X POST http://127.0.0.1:8010/api/v1/auth/login \
  -d 'username=a@b.com&password=correct horse battery staple' | jq -r .access_token)
KEY=$(curl -fsS -X POST http://127.0.0.1:8010/api/v1/saas/api-keys \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"smoke"}' | jq -r .plaintext)
curl -fsS http://127.0.0.1:8010/api/v1/saas/account -H "Authorization: Bearer $TOKEN"
curl -fsS -X POST http://127.0.0.1:8010/api/v1/simulate/order \
  -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d '{"token_address":"0xSAFE","amount":100,"side":"BUY"}'
```

**DoD:** todos os comandos retornam 2xx; `db_models.py` não armazena plaintext;
frontend autentica e usa `X-API-Key` real.

---

## 4. Fase 2 — Persistência de produção (1 semana)

**Meta:** sair de 15% para 75% em Banco de dados.

### 4.1 Adotar Alembic

Estrutura:

```text
services/api/
  alembic.ini
  src/tothemoon_api/migrations/
    env.py
    script.py.mako
    versions/
      0001_initial.py
      0002_add_orgs.py
      ...
```

`alembic.ini` aponta para `src/tothemoon_api/migrations`. `env.py` importa
`Base.metadata` de `db_models` e usa `settings.database_url`.

Migration inicial: `users`, `api_keys`.

### 4.2 Postgres via Docker Compose

`docker-compose.yml` adiciona serviço `db`:

```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: ttm
    POSTGRES_PASSWORD: ttm
    POSTGRES_DB: ttm
  ports:
    - "5432:5432"
  volumes:
    - ttm_pgdata:/var/lib/postgresql/data
volumes:
  ttm_pgdata:
```

E o serviço da API ganha `DATABASE_URL=postgresql+psycopg://ttm:ttm@db:5432/ttm`.

### 4.3 Tabelas adicionais (para fases 3–4)

Migration `0002`:

```python
# organizations
op.create_table(
  "organizations",
  Column("id", Integer, primary_key=True),
  Column("name", String(120), nullable=False),
  Column("plan_id", Integer, ForeignKey("plans.id"), nullable=False),
  Column("created_at", DateTime, nullable=False, server_default=func.now()),
)

# memberships (user <-> org)
# plans (free, pro, enterprise) com limits
# subscriptions (org_id, status, current_period_end)
# usage_records (org_id, day, requests, simulated_volume_usd)
# simulated_trades (id, org_id, api_key_id, token_address, side, amount,
#                   entry_price, fees_total, slippage_bps, status, created_at, closed_at)
# audit_logs (id, actor_id, actor_type, action, target_type, target_id, ip, ua, created_at)
# nanopayment_receipts (id, org_id, resource_id, amount_usd, status, tx_hash, created_at)
```

### 4.4 Backup automatizado

`ops/backup.sh` chama `pg_dump` para um bucket. Documentar em `docs/RUNBOOK_DB.md`
o procedimento de restore + teste mensal.

### 4.5 Testes

Em `tests/conftest.py`, criar fixture `db_session` que:

1. Cria engine in-memory sqlite.
2. Roda `Base.metadata.create_all`.
3. Yield session.
4. Drop em teardown.

Para CI, opcionalmente subir Postgres em testcontainers.

### 4.6 DoD Fase 2

- `alembic upgrade head` cria 7 tabelas em Postgres limpo.
- `pytest` continua passando com sqlite em memória.
- `docker compose up` sobe API + DB e `/health` responde.

---

## 5. Fase 3 — Multi-tenancy & Billing (2 semanas)

**Meta:** Multi-tenancy 5%→70%, Billing 25%→70%.

### 5.1 Modelo

- Toda conta criada vira automaticamente `User` + `Organization` + `Membership(role=owner)`.
- API keys passam a ter `org_id` (não só `user_id`).
- Plano default: `free` com limites:
  - 1.000 chamadas/mês ao `/api/v1/simulate/order`
  - 100 chamadas/mês ao `/api/v1/tokens/{addr}/audit`
  - 1 API key ativa
- `pro`: 100k/10k/10
- `enterprise`: ilimitado, suporte dedicado, SLA.

### 5.2 Middleware de quota

`services/api/src/tothemoon_api/quota.py`:

```python
def enforce_quota(api_key: ApiKey, resource: str, db: Session) -> None:
    org = api_key.organization
    plan = org.plan
    limit = plan.limit_for(resource)
    used = (
        db.query(UsageRecord)
        .filter(UsageRecord.org_id == org.id, UsageRecord.day == today())
        .with_entities(func.coalesce(func.sum(UsageRecord.requests), 0))
        .scalar()
    )
    if used >= limit:
        raise HTTPException(status_code=429, detail="Plan quota exceeded")
```

Aplicar em cada rota cobrável via `Depends(verify_api_key)` + `enforce_quota`.

Cada call incrementa `usage_records` (upsert por dia).

### 5.3 Billing

Duas trilhas paralelas (escolher uma para começar):

**Trilha A — Stripe (recomendada para começar):**

- Stripe Checkout para upgrade de plano.
- Webhook `POST /api/v1/webhooks/stripe` valida assinatura e atualiza
  `subscriptions.status` + `organizations.plan_id`.
- Portal Stripe Billing para o cliente cancelar/atualizar cartão.

**Trilha B — x402 / Circle:**

- Middleware seller `@circle-fin/x402-batching` em rotas pay-per-call:
  retorna `402 PAYMENT-REQUIRED` com `PAYMENT-REQUIREMENTS` no header.
- Frontend assina com Circle programmable wallet, reenvia request com
  `PAYMENT-SIGNATURE`, backend valida e libera o recurso.
- Receipt persistido em `nanopayment_receipts`.

Na primeira iteração, implementar **Trilha A** (mainstream, mais rápido para faturar).
Trilha B vira diferencial técnico para o pitch Arc/Circle.

### 5.4 Endpoints novos

- `POST /api/v1/billing/checkout` → cria sessão Stripe → retorna URL.
- `POST /api/v1/webhooks/stripe` → atualiza plano.
- `GET /api/v1/saas/usage` → `{requests_today, requests_month, plan, quota}`.
- `GET /api/v1/saas/invoices` → lista links Stripe.
- `POST /api/v1/nanopayments/resources` (Trilha B) → registra recurso x402.
- `GET /api/v1/nanopayments/resources/{id}` → 402 se sem signature, recurso se ok.

### 5.5 Testes

- `test_quota_blocks_when_exceeded`
- `test_quota_resets_per_month` (mock clock)
- `test_stripe_webhook_promotes_plan`
- `test_stripe_webhook_rejects_bad_signature`
- `test_x402_returns_payment_required_when_missing_signature`

### 5.6 DoD Fase 3

- Conta nova começa em `free`.
- 1001ª chamada simulada em uma hora retorna `429`.
- Webhook Stripe (com `stripe trigger checkout.session.completed`) atualiza plano para `pro`.
- Multi-tenant testado: usuário A não vê API keys de usuário B.

---

## 6. Fase 4 — Engine de simulação real (2 semanas)

**Meta:** Paper Trading Engine 35%→85%.

### 6.1 Substituir `simulation.py`

Arquivo atual tem 38 linhas com `base_price = 1.0` hardcoded. Reescrever:

```python
from datetime import datetime
from decimal import Decimal
from .external.market import get_token_market_data
from .external.security import get_token_security_audit
from .db_models import SimulatedTrade

def simulate_trade(order: OrderRequest, *, api_key: ApiKey, db: Session) -> OrderResponse:
    audit = get_token_security_audit(order.token_address)
    if audit["is_honeypot"]:
        raise HTTPException(status_code=409, detail="Honeypot detected, blocked")
    market = get_token_market_data(order.token_address)
    spot = Decimal(str(market["price"]))
    chain = market.get("chain", "evm")
    slippage_bps = chain_slippage_bps(chain)         # 50 evm, 30 base, 10 sol
    gas_usd = chain_gas_usd_estimate(chain, order.amount)
    contract_buy_tax = Decimal(str(audit.get("buy_tax", 0))) / 100
    contract_sell_tax = Decimal(str(audit.get("sell_tax", 0))) / 100

    if order.side == TradeSide.BUY:
        executed = spot * (1 + Decimal(slippage_bps) / 10000)
        tax = contract_buy_tax
    else:
        executed = spot * (1 - Decimal(slippage_bps) / 10000)
        tax = contract_sell_tax

    fees_total = float(gas_usd + Decimal(order.amount) * tax)
    net = float(Decimal(order.amount) - Decimal(str(fees_total)))

    trade = SimulatedTrade(
        org_id=api_key.org_id,
        api_key_id=api_key.id,
        token_address=order.token_address,
        side=order.side.value,
        amount=order.amount,
        entry_price=float(executed),
        fees_total=fees_total,
        slippage_bps=slippage_bps,
        status="OPEN" if order.side == TradeSide.BUY else "CLOSED",
        created_at=datetime.utcnow(),
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    return OrderResponse(
        status="SUCCESS",
        executed_price=float(executed),
        fees_paid=fees_total,
        net_amount=net,
        trade_id=trade.id,
    )
```

### 6.2 Posições e P&L

- `GET /api/v1/simulate/positions` → lista `OPEN` da org.
- `POST /api/v1/simulate/positions/{id}/close` → busca preço atual, registra venda, calcula P&L.
- `GET /api/v1/saas/dashboard` agora retorna:
  - `total_simulated_trades`
  - `total_volume_usd`
  - `total_fees_usd`
  - `realized_pnl_usd`
  - `unrealized_pnl_usd`
  - `last_30_days_chart_points`

### 6.3 Tabela de slippage e gas

`services/api/src/tothemoon_api/simulation_costs.py`:

```python
SLIPPAGE_BPS_BY_CHAIN = {"evm": 50, "base": 30, "solana": 10, "bsc": 40}
GAS_USD_BY_CHAIN = {"evm": 8.0, "base": 0.4, "solana": 0.05, "bsc": 0.5}
```

Tornar configurável por env.

### 6.4 Testes

- `test_buy_records_open_trade`
- `test_sell_closes_position_and_computes_pnl`
- `test_honeypot_blocks_buy`
- `test_dashboard_aggregates_per_org`
- `test_dashboard_isolates_orgs`
- `test_chain_specific_slippage_applied`

### 6.5 DoD Fase 4

- Após 5 simulações de uma org, `/api/v1/saas/dashboard` mostra `total_simulated_trades=5`.
- `simulated_trades` armazena cada trade com `org_id` correto.
- Honeypot bloqueia compra com 409.

---

## 7. Fase 5 — Integrações externas reais (1 semana)

**Meta:** Integrações 10%→80%.

### 7.1 Segurança de token (`external/security.py`)

Substituir mock por consenso 2-de-3:

- **GoPlus Security** (`https://api.gopluslabs.io/api/v1/token_security/{chain_id}`)
- **Honeypot.is** (`https://api.honeypot.is/v2/IsHoneypot`)
- **TokenSniffer** (`https://tokensniffer.com/api/v2/tokens/{chain}/{address}`)

Função `get_token_security_audit`:

```python
def get_token_security_audit(token_address: str, chain: str = "evm") -> dict:
    results = []
    for provider in [goplus, honeypotis, tokensniffer]:
        try:
            results.append(provider.fetch(token_address, chain))
        except Exception as e:
            log.warning("provider_failed", provider=provider.name, error=str(e))
    is_honeypot = sum(r["is_honeypot"] for r in results) >= 2
    risk_score = max((r["risk_score"] for r in results), default=50)
    return {
        "token_address": token_address,
        "is_honeypot": is_honeypot,
        "risk_score": risk_score,
        "buy_tax": max((r.get("buy_tax", 0) for r in results), default=0),
        "sell_tax": max((r.get("sell_tax", 0) for r in results), default=0),
        "providers": [r["provider"] for r in results],
    }
```

### 7.2 Dados de mercado (`external/market.py`)

- **DexScreener** (`https://api.dexscreener.com/latest/dex/tokens/{address}`) — gratuito.
- **Birdeye** (`https://public-api.birdeye.so/defi/token_overview`) — premium para Solana.

### 7.3 Cache Redis

Adicionar `redis>=5.0` ao `pyproject.toml`. Wrapper:

```python
def cached(ttl: int):
    def deco(fn):
        def wrapper(*args, **kwargs):
            key = f"cache:{fn.__name__}:{args}:{kwargs}"
            hit = redis_client.get(key)
            if hit:
                return json.loads(hit)
            value = fn(*args, **kwargs)
            redis_client.setex(key, ttl, json.dumps(value))
            return value
        return wrapper
    return deco
```

TTL 30s para market, 5min para security audit.

### 7.4 Health detalhado

`/health` passa a expor estado de cada provider:

```json
{
  "ok": true,
  "providers": {
    "goplus": {"status": "ok", "latency_ms": 110},
    "honeypotis": {"status": "degraded", "last_error": "timeout"},
    "tokensniffer": {"status": "ok", "latency_ms": 220},
    "dexscreener": {"status": "ok"},
    "birdeye": {"status": "ok"}
  }
}
```

### 7.5 Testes

- `test_security_consensus_true_when_2_of_3_say_honeypot`
- `test_security_uses_max_risk_score`
- `test_market_caches_for_30_seconds`
- `test_market_falls_back_when_dexscreener_500s`

Mockar HTTP com `respx`.

### 7.6 DoD Fase 5

- Endpoint `/api/v1/tokens/{addr}/audit` em token real (ex: `So11111111111111111111111111111111111111112`) retorna dado real, não mock.
- Cache reduz latência segunda chamada para `<10ms`.

---

## 8. Fase 6 — Bot funcional (1 semana)

**Meta:** Bot 20%→75%.

### 8.1 Scanner real

`bot/scanner.py`:

```python
import httpx
DEXSCREENER_LATEST = "https://api.dexscreener.com/latest/dex/search"

async def scan_market() -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.get(DEXSCREENER_LATEST, params={"q": "USDC"})
        r.raise_for_status()
        pairs = r.json().get("pairs", [])
    promising = []
    for p in pairs:
        if (
            float(p.get("volume", {}).get("h24", 0)) >= 100_000
            and float(p.get("priceChange", {}).get("h1", 0)) >= 5.0
            and float(p.get("liquidity", {}).get("usd", 0)) >= 50_000
        ):
            promising.append({
                "address": p["baseToken"]["address"],
                "chain": p["chainId"],
                "symbol": p["baseToken"]["symbol"],
                "volume_24h": float(p["volume"]["h24"]),
                "momentum": float(p["priceChange"]["h1"]),
            })
    return promising[:25]
```

### 8.2 Modo copilot

Bot envia proposta para `POST /api/v1/copilot/proposals` (autenticado via API key).
Backend grava em tabela `copilot_proposals` e empurra via SSE/WebSocket para a UI.
Usuário aprova → backend chama `simulate/order` em nome do bot → notifica usuário.

### 8.3 Cron supervisionado

Não usar `while True`. Substituir por:

- **Cloud Run Job** disparado a cada 5min via Cloud Scheduler
- ou **APScheduler** dentro do próprio bot, com `BackgroundScheduler` e shutdown handler.

### 8.4 Modo real (off por padrão)

Feature flag `org.flags.real_mode_enabled = false` por padrão. Ativação só por
admin (operador humano). Mesmo ativada:

- max gasto por dia = `min(plan_limit_usd, 50.0)` no início.
- aprovação manual obrigatória nos primeiros 30 dias.
- circuit breaker: se 3 trades consecutivos falham, desliga sozinho.

### 8.5 Testes

- `test_scanner_filters_by_volume_and_momentum`
- `test_copilot_proposal_persists`
- `test_real_mode_blocked_when_flag_off`
- `test_circuit_breaker_after_3_failures`

### 8.6 DoD Fase 6

- `python bot/main.py --api-key <key>` busca tokens reais e cria propostas.
- Frontend recebe push em tempo real.
- Modo real só liga com flag explícita + auditoria.

---

## 9. Fase 7 — Frontend SaaS (2 semanas)

**Meta:** Frontend 25%→80%.

### 9.1 Migrar para Next.js (App Router) ou Vite + React

Manter o CSS em `apps/web/styles.reference.css`. Estrutura:

```text
apps/web-next/
  app/
    layout.tsx
    page.tsx                # landing
    login/page.tsx
    signup/page.tsx
    dashboard/page.tsx
    api-keys/page.tsx
    billing/page.tsx
    invoices/page.tsx
    settings/page.tsx
    audit-log/page.tsx
  lib/api.ts                # SDK tipado consumindo OpenAPI
  components/...
```

### 9.2 Cliente tipado

Gerar via `openapi-typescript-codegen` a partir de `/openapi.json` da API. Commitado.

### 9.3 Páginas obrigatórias

- **Login / Signup** — chamadas reais.
- **Dashboard** — gráfico P&L 30d (recharts), KPIs, lista trades recentes.
- **API Keys** — criar (mostra plaintext UMA vez), revogar, ver `last_used_at`.
- **Billing** — botão "Upgrade Pro" → Stripe Checkout. Cartão atual, próxima cobrança.
- **Invoices** — links Stripe.
- **Settings** — perfil, sair, deletar conta (LGPD).
- **Audit log** — paginado.
- **Status** — `/status` puxando `/health` detalhado.

### 9.4 Real-time

WebSocket `/ws/v1/copilot` ou SSE `/api/v1/copilot/stream` — UI mostra propostas do bot ao vivo.

### 9.5 Testes

- E2E com Playwright em `apps/web-next/tests/e2e/`:
  - `signup -> create key -> simulate -> dashboard reflects`
  - `login -> revoke key -> next call returns 403`
  - `upgrade plan -> dashboard shows pro`

### 9.6 DoD Fase 7

- `npm run build && npm run start` sobe sem warnings.
- Lighthouse > 90 em performance/accessibility.
- E2E roda no CI em PRs.

---

## 10. Fase 8 — Observabilidade enterprise (1 semana)

**Meta:** Observabilidade 70%→95%.

### 10.1 OpenTelemetry tracing

Adicionar `opentelemetry-instrumentation-fastapi`, `opentelemetry-exporter-otlp`.
Cada request gera trace com `org_id`, `api_key_id`, `endpoint`. Export para Tempo
ou Honeycomb.

### 10.2 Sentry

`sentry-sdk[fastapi]` no backend, `@sentry/nextjs` no frontend. DSN via env.

### 10.3 Alertas

`ops/grafana/alerts.yaml`:

- p95 latency > 1s por 5min → warning
- error rate > 1% por 2min → critical
- disk > 80% → warning
- queue lag scanner > 60s → warning
- failed payments > 3 em 10min → critical

Notificações via PagerDuty webhook + Discord.

### 10.4 Audit log

Cada mutação relevante grava `audit_logs(actor, action, target, ip, ua, before, after)`.
Endpoint `GET /api/v1/saas/audit-log` paginado, autenticado JWT.

### 10.5 DoD Fase 8

- Trace de uma request aparece em Tempo/Honeycomb.
- Erro forçado (`/api/_test/raise`) chega no Sentry.
- `audit_logs` preenchido para signup, login, criação/revogação de key, upgrade.

---

## 11. Fase 9 — Segurança & Compliance (2 semanas)

**Meta:** Segurança 40%→90%, Compliance 0%→60%.

### 11.1 Secrets management

Tirar `.env` de produção. Usar **GCP Secret Manager** (ou AWS Secrets Manager).
Cloud Run lê via `--set-secrets`. Entity secret da Circle, JWT secret, Stripe key,
DB password — todos lá.

### 11.2 Rate limit por API key

Hoje só limita por IP. Adicionar limite por `api_key.id`:

```python
def per_key_rate_limit(api_key: ApiKey, ...):
    bucket_key = f"rl:key:{api_key.id}:{minute_bucket()}"
    n = redis_client.incr(bucket_key)
    if n == 1:
        redis_client.expire(bucket_key, 60)
    if n > api_key.rate_limit_per_min:
        raise HTTPException(status_code=429)
```

### 11.3 WAF e CSP

- Cloudflare na frente do dashboard com regras anti-bot.
- CSP estrito no Next.js: `default-src 'self'`, `script-src 'self' 'nonce-...'`.
- HSTS, X-Frame-Options DENY (já tem), Permissions-Policy mais agressivo.

### 11.4 CSRF no painel

Token CSRF em mutações do dashboard (não nas chamadas via API key).

### 11.5 Compliance

- `/legal/terms-of-service`
- `/legal/privacy-policy`
- `/legal/cookie-policy` + banner com opt-in granular
- `/legal/dpa` (Data Processing Agreement) para clientes corporate
- Endpoint `DELETE /api/v1/saas/account` que apaga dados pessoais (LGPD/GDPR — direito ao esquecimento)
- Export de dados: `GET /api/v1/saas/export` retorna ZIP com tudo
- Banner: "Não somos consultoria de investimento. Resultados passados não garantem
  resultados futuros. Cripto envolve risco de perda total."
- Se tocar dinheiro real: KYC via Stripe Identity ou Sumsub, AML monitoring.

### 11.6 Testes

- `test_csp_header_present`
- `test_account_deletion_removes_pii`
- `test_per_key_rate_limit_429`

### 11.7 DoD Fase 9

- ZAP/Nikto scan sem severidades altas.
- Account deletion remove de fato.
- Banner LGPD aparece para visitantes BR.

---

## 12. Fase 10 — Deploy & DR (1 semana)

**Meta:** Deploy 35%→90%.

### 12.1 Terraform

`infra/terraform/`:

- `cloud_run_api.tf` (min=1, max=20, cpu=1, mem=512MiB)
- `cloud_run_web.tf` (Next.js standalone)
- `cloud_sql_postgres.tf` (HA, daily backup, PITR 7d)
- `redis.tf` (Memorystore)
- `secret_manager.tf`
- `cloud_armor.tf` (WAF)
- `monitoring.tf` (alerts)
- `dns.tf` (api.tothemoontokens.com, app.tothemoontokens.com)

### 12.2 CI/CD

`.github/workflows/ci.yml`:

```yaml
on: [pull_request, push]
jobs:
  test:
    steps:
      - lint (ruff)
      - typecheck (mypy)
      - unit tests (pytest)
      - frontend tests (vitest + playwright)
      - security scan (bandit, safety, npm audit)
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: test
    steps:
      - build docker
      - push to GCR
      - deploy Cloud Run staging
      - run smoke
  deploy-prod:
    needs: deploy-staging
    environment: production   # exige aprovação manual
```

### 12.3 Healthchecks separados

- `/live` — só responde 200 se processo está vivo
- `/ready` — bloqueia tráfego se DB/Redis indisponível
- `/health` — diagnóstico detalhado

### 12.4 Backup/restore

- Backup automático Postgres (Cloud SQL).
- Teste mensal documentado em `docs/RUNBOOK_DR.md` (script automático que dispara,
  verifica integridade do dump e apaga).

### 12.5 DoD Fase 10

- `terraform apply` recria toda a stack do zero.
- Deploy de PR vira preview URL.
- Restore de backup em <30min.

---

## 13. Validação final (release 1.0)

Antes de chamar o SaaS de "pronto":

1. **Penetration test** externo (mínimo OWASP Top 10).
2. **Load test** com k6: 200 RPS sustentados em `/simulate/order` por 10min, p95 <500ms.
3. **Cobertura de testes** >= 80% no backend, >= 60% no frontend.
4. **Documentação** completa: API reference (Redoc), guia de quickstart, runbooks
   de incidente (DB down, Circle down, scanner travado, billing webhook não chega).
5. **Status page** público em `status.tothemoontokens.com`.
6. **Política de SLA**: 99.5% uptime, 24h response em pro, 4h em enterprise.
7. **Plano de incidente**: severidades, on-call rotation, post-mortem template.
8. **Backup test** executado.
9. **Compliance**: TOS, Privacy, LGPD, banner — todos ativos.
10. **Pricing page** com `free`/`pro`/`enterprise` e CTA.

---

## 14. Cronograma sugerido

| Semana | Fases |
|---|---|
| 1 | Fase 0 + Fase 1 |
| 2 | Fase 2 |
| 3–4 | Fase 3 |
| 5–6 | Fase 4 |
| 7 | Fase 5 |
| 8 | Fase 6 |
| 9–10 | Fase 7 |
| 11 | Fase 8 |
| 12–13 | Fase 9 |
| 14 | Fase 10 + validação final |

**Total: ~14 semanas (3,5 meses) com 1 dev sênior full-time.**
Com 2 devs (um backend, um full-stack), reduz para ~9 semanas.

---

## 15. Como o agente deve operar

1. Trabalhe **uma fase de cada vez**, na ordem 0 → 10.
2. Para cada fase:
   - Crie um branch `feat/phase-NN-<slug>`.
   - Abra PR pequenos por subseção (ex: Fase 1.1, 1.2, 1.3...).
   - Cada PR precisa passar a checklist de DoD da fase ANTES do merge.
   - Atualize `docs/CHANGELOG.md` com o que mudou.
3. Nunca quebre as políticas imutáveis (paper-only por padrão, mainnet bloqueado em prod).
4. Nunca faça commit de segredo. `.env*` está no `.gitignore`.
5. Sempre rode a quadra `compileall + ruff + mypy + pytest` antes de commit.
6. Nunca aumente `fail_under` da cobertura sem rodar a suíte.
7. Em caso de dúvida arquitetural, prefira a opção mais conservadora (mais segurança,
   menos lock-in com fornecedor único).
8. **Prioridade absoluta:** corrigir Fase 0. Sem ela, nada mais sobe.

---

## 16. Apêndice — Snippets úteis

### 16.1 Smoke E2E completo (após Fase 4)

```bash
#!/usr/bin/env bash
set -euo pipefail
API=http://127.0.0.1:8010
EMAIL="dev+$(date +%s)@ttm.local"
PASS="correct horse battery staple 12345"

curl -fsS -X POST "$API/api/v1/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"

TOKEN=$(curl -fsS -X POST "$API/api/v1/auth/login" \
  -d "username=$EMAIL&password=$PASS" | jq -r .access_token)

KEY=$(curl -fsS -X POST "$API/api/v1/saas/api-keys" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"smoke"}' | jq -r .plaintext)

for i in 1 2 3 4 5; do
  curl -fsS -X POST "$API/api/v1/simulate/order" \
    -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
    -d '{"token_address":"0xSAFE","amount":100,"side":"BUY"}' >/dev/null
done

curl -fsS "$API/api/v1/saas/dashboard" -H "Authorization: Bearer $TOKEN" \
  | jq '.total_simulated_trades == 5'

echo "OK"
```

### 16.2 Variáveis de ambiente esperadas

```bash
# Core
APP_ENV=production
API_PORT=8010
LOG_LEVEL=INFO

# DB / cache
DATABASE_URL=postgresql+psycopg://ttm:****@db:5432/ttm
REDIS_URL=redis://redis:6379/0

# Auth
JWT_SECRET=<>=32 chars random
JWT_EXPIRES_MINUTES=60

# Trading policy (NÃO MUDAR)
ENABLE_LIVE_TRADING=false
ALLOW_MAINNET_TRADING=false
WALLET_MODE=manual_only
AUTONOMOUS_PAYMENTS_ENABLED=false

# Circle
CIRCLE_API_KEY=...
CIRCLE_ENTITY_SECRET=...
CIRCLE_WALLET_SET_ID=...

# Stripe (Fase 3)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# External data (Fase 5)
GOPLUS_APP_KEY=...
GOPLUS_APP_SECRET=...
BIRDEYE_API_KEY=...
TOKENSNIFFER_API_KEY=...

# AI (já existe)
GEMINI_API_KEY=...

# Observability (Fase 8)
SENTRY_DSN=...
OTEL_EXPORTER_OTLP_ENDPOINT=https://...

# CORS
CORS_ALLOWED_ORIGINS=https://app.tothemoontokens.com
```

### 16.3 Estrutura final esperada do repositório

```text
ToTheMoonTokens/
  apps/
    web-next/                # Next.js dashboard (Fase 7)
    pitch/                   # já existe
  bot/                       # já existe, refatorar
  services/
    api/
      src/tothemoon_api/
        routers/
          tokens.py
          saas.py            # Fase 1
          billing.py         # Fase 3
          copilot.py         # Fase 6
          nanopayments.py    # Fase 3 (trilha B)
        external/
          security.py        # Fase 5
          market.py          # Fase 5
        migrations/          # Fase 2
        ...
      tests/
      alembic.ini
  infra/
    terraform/               # Fase 10
    grafana/
  ops/
  docs/
    SAAS_IMPLEMENTATION_PLAN.md   # este arquivo
    CHANGELOG.md
    RUNBOOK_DB.md
    RUNBOOK_DR.md
    ...
```

---

**Fim do plano.** Comece pela Fase 0 e siga em ordem. Boa execução.
