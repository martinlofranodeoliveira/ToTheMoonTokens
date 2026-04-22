# Architecture

## Objetivo

Entregar um vertical de hackathon onde um comprador solicita um artefato,
paga em USDC, aguarda settlement verificado e recebe o output somente depois de
review e unlock de delivery.

## Nota operacional importante

Nexus foi usado durante a construcao do sistema, backlog e validacao interna,
mas **nao e requisito para o runtime do jurado**. O caminho local de entrega
funciona com:

- `services/api` em `:8010`
- `apps/web` em `:4173`
- `apps/pitch` em `:4174`

## Visao de 3 camadas

```text
Buyer Surface
  apps/pitch        -> narrativa, proposta de valor, fluxo do hackathon
  apps/web          -> artifact room, evidence monitor, guardrails, dashboard
  FastAPI /docs     -> caminho direto para provar endpoints ao vivo

Service + Control Layer
  payments.py       -> catalogo, payment intents, verify, execute
  nexus_jobs.py     -> lifecycle de job e transicoes auditaveis
  demo_agent.py     -> fluxo curto de request -> pay -> execute -> review -> deliver
  settlement.py     -> verify, anti-replay, receipt checks, refund-required states
  reputation.py     -> score deterministico por historico/journal
  main.py           -> composicao da API e dashboards

Settlement + Evidence Layer
  Arc testnet       -> tx hash, explorer proof, settlement anchor
  Circle wallets    -> deposit address e fluxo USDC do demo
  journal + market  -> contexto e trilha de evidencia
  guardrails        -> bloqueio de mainnet, manual signature, fail-closed
```

## Fluxo principal

1. O comprador escolhe um artefato pago no pitch ou via API.
2. `POST /api/payments/intent` cria um payment intent com valor e deposit address.
3. `POST /api/payments/verify` valida o tx hash e aplica anti-replay.
4. O job fica desbloqueado para execucao.
5. `POST /api/demo/jobs/...` ou `POST /api/jobs/...` move o trabalho por review.
6. A entrega e liberada apenas quando pagamento e review estao completos.

## Mapeamento de modulos

### Buyer surface

- `apps/pitch`: narrativa do hackathon e walkthrough para o video
- `apps/web`: artifact room, guardrails, evidence journal e monitor de estado

### Service/control plane

- `services/api/src/tothemoon_api/payments.py`
- `services/api/src/tothemoon_api/nexus_jobs.py`
- `services/api/src/tothemoon_api/demo_agent.py`
- `services/api/src/tothemoon_api/settlement.py`
- `services/api/src/tothemoon_api/reputation.py`
- `services/api/src/tothemoon_api/main.py`

### Compatibility evidence engine

Esses modulos permanecem para contexto de evidencia, nao como produto central:

- `backtesting.py`
- `journal.py`
- `news.py`
- `market_data.py`
- `strategies.py`

## Endpoints que contam a historia do demo

- `GET /api/payments/catalog`
- `POST /api/payments/intent`
- `POST /api/payments/verify`
- `POST /api/payments/execute`
- `GET /api/jobs`
- `POST /api/jobs`
- `POST /api/jobs/{id}/unlock_payment`
- `POST /api/jobs/{id}/reserve_work`
- `POST /api/jobs/{id}/request_review`
- `POST /api/jobs/{id}/deliver`
- `POST /api/demo/jobs/request`
- `POST /api/demo/jobs/{id}/pay`
- `POST /api/demo/jobs/{id}/execute`
- `POST /api/demo/jobs/{id}/review`
- `POST /api/demo/jobs/{id}/deliver`
- `GET /api/agents/{id}/reputation`
- `GET /api/dashboard`

## Prova onchain e guardrails

- prova de settlement real: `0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4`
- explorer: `https://testnet.arcscan.app/tx/0x6fc13745bd3b5137034ccfb2ebb177e8cd5cab2895befd7e2eaa426f4d7679a4`
- `scripts/verify_guardrails.py` vira gate automatizado de CI
- wallets continuam `manual_only`
- mainnet continua bloqueada

## Implicacao para video e submissao

Se o jurado rodar API + web + pitch localmente, ele consegue validar a entrega.
Nexus pode permanecer desligado sem afetar o caminho principal do projeto.
