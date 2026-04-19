# ToTheMoonTokens Project Scope

Use esta skill quando a task envolver este repositorio.

## Regras do projeto

- trate o produto como plataforma de pesquisa e paper trading
- nao prometa lucro
- nao implemente execucao em mainnet
- Binance deve permanecer testnet-first
- qualquer operacao com carteira deve ser manual-signature only
- exija evidencias de backtest e paper trading antes de declarar edge

## O que priorizar

- backtesting confiavel
- metricas de risco
- observabilidade de PnL
- inteligencia de mercado por horizonte
- diarios de paper trading e score de checklist
- UX clara sobre modo paper/testnet
- testes automatizados

## Leituras obrigatorias antes de implementar

- `docs/TRADING_RESEARCH_PLAYBOOK.md`
- `docs/TRADING_GUARDRAILS.md`

## Diretriz de pesquisa

- trate noticias e eventos como filtro de risco, nao como gatilho unico
- separe sempre curto, medio e longo prazo
- qualquer tier alto de risco continua sendo apenas de pesquisa ate existir aprovacao manual explicita

## O que evitar

- hardcode de segredos
- automacoes que assinem ou enviem ordens em mainnet
- claims de “prever mercado” sem medições reproduzíveis
