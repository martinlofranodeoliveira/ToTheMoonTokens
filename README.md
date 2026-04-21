# ToTheMoonTokens

ToTheMoonTokens agora existe como vertical segura do hackathon para o Nexus Orchestrator. O objetivo nao e operar um bot de trading. O objetivo e empacotar artefatos de pesquisa validada, com journal, metricas, contexto de mercado e guardrails claros para uma demo economica auditavel.

## Escopo atual

- artefatos de research para o MVP do hackathon
- backtesting reproduzivel
- snapshots de estrategia e metricas de risco
- journal estruturado para evidencia
- contexto de mercado, noticias e validacao de setup
- bloqueio permanente de envio de ordens

## O que saiu de foco

- backlog legado `TTM-*` de bot de trading
- fluxos de `live arm` e ativacao manual
- paper runtime continuo
- qualquer narrativa de prontidao para execucao

## Estrutura

- `services/api`: API FastAPI com backtests, journal, noticias, scalp validation e guardrails
- `apps/web`: sala visual do hackathon para ler o estado do vertical com narrativa segura
- `.nexus`: perfil local e skill do projeto para manter o foco do Nexus
- `docs/hackathon`: narrativa, plano e material de submissao
- `ops/arc_circle_hackathon_backlog.json`: backlog ativo do hackathon

## API principal

- `POST /api/backtests/run`: backtest deterministico com tiers de risco e checklist
- `POST /api/backtests/walk-forward`: split treino/validacao para robustez fora da amostra
- `GET /api/dashboard`: snapshot unico com estrategias, guardrails, conectores, journal e performance
- `POST /api/journal/trades`, `GET /api/journal/trades`, `GET /api/journal/performance`: journal estruturado e agregados
- `POST /api/news/ingest`, `GET /api/news`, `GET /api/news/risk`: contexto de noticias e filtro de risco
- `POST /api/scalp/validate`: validacao objetiva de setup
- `GET /api/market/health`, `GET /api/market/klines`, `GET /api/market/ticker`, `GET /api/market/depth`, `GET /api/market/stream-preview`: leitura de mercado com degradacao controlada

## Quickstart

1. Copie `.env.example` para `.env`.
2. Rode `make api-install`.
3. Rode `make api-test`.
4. Rode `make api-run`.
5. Em outro terminal, rode `make web-serve`.
6. Em outro terminal, rode `make pitch-serve`.
7. Abra `http://127.0.0.1:4173` (web funcional) e `http://127.0.0.1:4174` (pitch).

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
- `make mirror-verify`: compara branches esperadas entre GitHub e GitLab
- `make validation-evidence`: coleta evidencias locais do runtime do projeto e do review gate
- metricas Prometheus em `GET /metrics`
- logs estruturados em JSON via `structlog`

## Nexus local

- rode `make nexus-start` para subir uma instancia isolada do Nexus em `http://127.0.0.1:4116`
- o profile versionado em `.nexus/nexus-launch.env` aponta o Nexus para este repo, para o mirror GitLab e para o backlog ativo do hackathon no GitHub
- o foco operacional deve ficar no backlog `ARC-HACK-*` e nas tasks de entrega do MVP
- `NEXUS_AUTO_DISPATCH=true` continua ativo, mas os guardrails mantem o projeto fora de qualquer fluxo de execucao
- use `make nexus-status` para validar `instance_id=tothemoontokens-local` e `make nexus-stop` para parar a instancia

## Regra principal

Se uma mudanca empurra o repo de volta para um "bot de trading", ela esta fora do escopo atual. O vertical do hackathon precisa provar compra, execucao, review e entrega de artefato, nao autonomia de mercado.
