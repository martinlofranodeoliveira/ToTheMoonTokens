# Legacy Evidence Engine Playbook

Este playbook substitui o antigo guia de trading research. O objetivo agora e
documentar como os modulos legados podem continuar gerando **evidencia
auditavel** para o vertical do hackathon sem voltarem a ditar o produto.

## Para que essa engine ainda existe

- produzir snapshots reproduziveis para o dashboard
- gerar contexto de mercado para artefatos pagos
- alimentar journal, review e reputacao com dados explicaveis
- reforcar guardrails e sinais de anomalia em fluxos de demo

## O que esses modulos nao devem virar novamente

- produto principal
- strategy lab publico
- signal marketplace como narrativa central
- live trading roadmap
- qualquer fluxo de execucao real ou auto-signing

## Modulos retidos por compatibilidade

- `services/api/src/tothemoon_api/backtesting.py`
- `services/api/src/tothemoon_api/journal.py`
- `services/api/src/tothemoon_api/news.py`
- `services/api/src/tothemoon_api/scalp.py`
- `services/api/src/tothemoon_api/market_data.py`
- `services/api/src/tothemoon_api/strategies.py`

## Regras ao tocar essa camada

- preserve entradas deterministicas e saidas reproduziveis
- conecte a mudanca a um artefato, review ou evidencia concreta do hackathon
- mantenha market data como contexto secundario, nao promessa operacional
- prefira snapshots e agregados a qualquer loop continuo legado
- cubra regressao em `services/api/tests/`

## Leitura correta dos dados

- `strategy_id`, `risk_tier` e agregados de PnL existem como chaves de
  compatibilidade e evidencia
- journal e snapshots servem para explicar qualidade do artefato entregue
- market context serve para enriquecer auditoria, nao para vender execucao

## Regra final

Se uma mudanca nessa camada faz o repositorio parecer novamente um produto de
trading, ela esta fora de escopo.
