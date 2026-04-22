# ToTheMoonTokens

ToTheMoonTokens agora existe como um vertical de hackathon focado em agent economy sobre Arc e Circle. O objetivo do repositório é demonstrar request, pagamento, settlement, review e delivery de artefatos pagos com trilha auditável.

## Escopo atual

- marketplace de artefatos e entregas do hackathon
- fluxo pago de request -> settlement -> review -> delivery
- journal estruturado para evidencia auditavel
- reputacao, status de job e verificação de settlement
- contexto de mercado apenas como insumo do vertical
- demo pronta para submissao, pitch e avaliacao

## O que este repo nao e

- nao e um bot de trading
- nao e um produto de live execution
- nao e uma camada de orchestration genérica
- nao vende prompt usage; vende machine work com settlement e delivery

## Estrutura

- `services/api`: API FastAPI com pagamentos, settlement, jobs, demo flow, reputacao e artefatos do vertical
- `apps/web`: sala visual do hackathon para ler request, review, delivery e evidencia
- `docs/hackathon`: narrativa, plano e material de submissao
- `ops/hackathon`: bootstrap e scripts de apoio para a entrega do hackathon

## Runtime para jurados

Nexus foi usado para construir e validar partes do sistema, mas **nao e
necessario para rodar a entrega localmente**. Para video, submissao e validacao
do jurado, basta subir:

- API FastAPI em `:8010`
- sala operacional em `:4173`
- pitch site em `:4174`

O runbook final esta em `docs/hackathon/FINAL_HANDOFF.md`.

## API principal

- `GET /api/payments/catalog`, `POST /api/payments/intent`, `POST /api/payments/verify`, `POST /api/payments/execute`: cobrança, verificação e unlock de artefatos
- `GET /api/jobs`, `POST /api/jobs`, `POST /api/jobs/{id}/unlock_payment`, `.../reserve_work`, `.../request_review`, `.../deliver`: ciclo do job pago
- `POST /api/demo/jobs/request`, `.../pay`, `.../execute`, `.../review`, `.../deliver`: fluxo demo de request -> delivery
- `POST /api/settlements/verify`: gate de settlement com proteção contra replay e timeout
- `GET /api/agents/{id}/reputation`: reputação reprodutível do agente
- `GET /api/dashboard`: snapshot único do vertical com guardrails, conectores, journal e performance
- `POST /api/journal/trades`, `GET /api/journal/trades`, `GET /api/journal/performance`: journal estruturado e agregados
- `GET /api/market/health`, `GET /api/market/ticker`, `GET /api/market/depth`: leitura de mercado usada como contexto do vertical

## Quickstart

1. Copie `.env.example` para `.env`.
2. Rode `make api-install`.
3. Rode `make api-test`.
4. Rode `make api-run`.
5. Em outro terminal, rode `make web-serve`.
6. Em outro terminal, rode `make pitch-serve`.
7. Abra `http://127.0.0.1:8010/docs` para a Swagger UI, `http://127.0.0.1:4173` para a sala operacional e `http://127.0.0.1:4174` para o pitch.

Ou use o bootstrap local sem Nexus:

```bash
./scripts/run-local-demo.sh start
./scripts/run-local-demo.sh status
```

Ou use containers:

```bash
make docker-build && make docker-up
# API:  http://127.0.0.1:8010
# Web:  http://127.0.0.1:4173
# Pitch: http://127.0.0.1:4174
make docker-down
```

## Qualidade e operacao

- `make api-cov`: testes com cobertura
- `make api-lint` / `make api-format`: `ruff`
- `make api-typecheck`: `mypy`
- `make validation-evidence`: coleta evidencias locais do runtime do projeto e do review gate
- metricas Prometheus em `GET /metrics`
- logs estruturados em JSON via `structlog`

## Regra principal

Se uma mudança empurra o repo para fora do fluxo request -> pagamento -> settlement -> review -> delivery, ela está fora do escopo do hackathon.
