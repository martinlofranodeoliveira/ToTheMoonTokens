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

## Operacao segura

- `ENABLE_LIVE_TRADING=false` mantem o runtime em `paper`.
- `ALLOW_MAINNET_TRADING=false` e politica permanente desta base.
- qualquer evolucao para testnet live precisa de validacao humana, backtest positivo e evidencia de paper trading.

