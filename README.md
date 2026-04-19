# ToTheMoonTokens

ToTheMoonTokens e um workspace inicial para pesquisa, backtesting e paper trading de estrategias de cripto. O foco desta base e validar se uma estrategia tem edge estatistico antes de qualquer tentativa de execucao em exchange ou carteira.

## Principios do projeto

- paper trading por padrao
- live trading desabilitado por padrao
- Binance em modo testnet como primeiro conector
- MetaMask e outras carteiras apenas para assinatura/manual approval no frontend
- nenhuma promessa de lucro; o sistema mede PnL, drawdown e consistencia
- o Nexus deve bloquear qualquer tentativa automatica de ligar mainnet ou usar segredos sensiveis em comandos

## Estrutura

- `services/api`: API FastAPI com backtesting, guardrails e status de conectores
- `apps/web`: dashboard estatico para acompanhar estrategias, risco e conectores
- `.nexus`: hooks e skill local para os agentes do Nexus
- `docs`: arquitetura, guardrails e briefing de UI para Stitch

## Quickstart

1. Copie `.env.example` para `.env` e mantenha `ENABLE_LIVE_TRADING=false`.
2. Rode `make api-install`.
3. Rode `make api-test`.
4. Rode `make api-run`.
5. Em outro terminal, rode `make web-serve`.
6. Abra `http://127.0.0.1:4173`.

Ou use containers:

```bash
make docker-build && make docker-up
# API:  http://127.0.0.1:8010
# Web:  http://127.0.0.1:4173
make docker-down   # quando terminar
```

## Qualidade e observabilidade

- `make api-cov` — testes com cobertura (alvo 70%+).
- `make api-lint` / `make api-format` — `ruff`.
- `make api-typecheck` — `mypy --strict`.
- Metricas Prometheus expostas em `GET /metrics`.
- Logs estruturados em JSON via `structlog` (nivel controlado por `LOG_LEVEL`).
- Guia completo em [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
- Procedimentos de resposta a incidente em [docs/SECURITY_RUNBOOK.md](docs/SECURITY_RUNBOOK.md).

## Nexus local

- Rode `make nexus-start` para subir uma instancia isolada do Nexus em `http://127.0.0.1:4116`.
- O profile versionado em `.nexus/nexus-launch.env` aponta o Nexus para este repo, para o mirror GitLab e para as issues `TTM-*` no GitHub.
- Os segredos continuam fora deste repo. O bootstrap le credenciais do `.env` do `NexusOrchestrator` e so versiona a configuracao nao sensivel do projeto.
- A topologia padrao sobe `role_cells`: 14 salas interligadas, CEO singleton e 7 replicas por sala operacional.
- `NEXUS_AUTO_DISPATCH=true` fica ativo por default neste profile, mas os hooks locais continuam bloqueando qualquer tentativa de mainnet, live trading ou comandos com segredos.
- Use `make nexus-status` para validar `instance_id=tothemoontokens-local` e `make nexus-stop` para parar a instancia.

## Operacao segura

- `ENABLE_LIVE_TRADING=false` mantem o runtime em `paper`.
- `ALLOW_MAINNET_TRADING=false` e politica permanente desta base.
- qualquer evolucao para testnet live precisa de validacao humana, backtest positivo e evidencia de paper trading.
