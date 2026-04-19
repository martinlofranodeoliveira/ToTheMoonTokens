# Trading Research Playbook

Este projeto existe para pesquisa, backtesting e paper trading. O objetivo nao e prometer lucro nem ativar execucao real sem evidencia suficiente.

## Regras de base

- paper trading por padrao
- Binance em testnet como primeiro ambiente de execucao controlada
- modo real somente como fluxo manual, supervisionado e posterior
- nenhuma automacao deve custodiar segredos de carteira nem assinar ordens em nome do usuario
- qualquer tese precisa sobreviver a backtest reproduzivel, walk-forward e diario de paper trading antes de ser considerada elegivel para expansao

## Estrutura de analise por horizonte

### Curto prazo: scalp e intraday

- timeframes base: 1m, 3m e 5m
- operar apenas simbolos com boa liquidez, spread curto e volume consistente
- exigir filtro de tendencia ou regime antes de qualquer entrada
- confirmar entrada com confluencia de tendencia, suporte/resistencia, volume e risco/retorno minimo
- bloquear trades em janelas de noticia forte quando o impacto direcional nao estiver claro

Checklist minimo para scalp:

- tendencia do timeframe acima alinhada
- nivel tecnico claro de suporte, resistencia ou rompimento
- volume acima do baseline recente
- slippage e spread dentro do limite da estrategia
- stop definido antes da entrada
- risco da operacao compatível com o tier escolhido

### Medio prazo: intraday estendido e swing

- timeframes base: 15m, 1h e 4h
- usar regime detection para separar tendencia, range e expansao
- combinar estrutura tecnica com catalisadores de noticia e fluxo macro
- evitar sobreposicao com trades de scalp no mesmo simbolo quando o risco agregado ultrapassar o limite diario

### Longo prazo: viés estrutural

- timeframes base: diario e semanal
- funciona como filtro direcional e de exposicao, nao como gatilho principal de execucao
- serve para limitar trades contra tendencia dominante e reduzir overtrading

## Tiers de risco

### Baixo risco

- operacoes apenas a favor da tendencia dominante
- exigir maior confluencia e melhor relacao risco/retorno
- tamanho de posicao menor
- bloquear setups contra tendencia e setups dependentes de leitura subjetiva

### Medio risco

- permite setups de continuidade e alguns setups de range quando houver confirmacao
- aceita um nivel moderado de variabilidade
- continua exigindo checklist tecnico completo e limite diario conservador

### Alto risco

- uso exclusivo para pesquisa e experimento controlado
- nao elegivel para qualquer fluxo de modo real
- tamanho de posicao reduzido e tolerancia operacional mais restrita

## Checklist de probabilidade

Todo setup precisa virar uma avaliacao objetiva com pontuacao por criterio:

- alinhamento multi-timeframe
- contexto de regime
- proximidade de suporte/resistencia
- confirmacao de volume
- spread/slippage estimados
- catalisador de noticia ou ausencia de evento adverso
- risco por trade
- risco diario agregado
- clareza de invalidacao do setup
- qualidade do exit plan

Essa pontuacao deve alimentar:

- score de confianca do setup
- tier de risco permitido
- bloqueio automatico de trades com contexto insuficiente

## Inteligencia de mercado

O sistema precisa unir 3 camadas de contexto:

1. Market data em tempo real
2. Noticias e eventos
3. Metricas proprias de paper trading

### Market data

- usar market data oficial da Binance Spot Testnet para o baseline de integracao
- separar feed de candles, trades, depth e heartbeat operacional
- registrar latencia, gaps de stream e retries

### Noticias e eventos

- classificar noticias por impacto de curto, medio e longo prazo
- separar eventos regulatorios, macro, exchange-specific e asset-specific
- usar noticias como filtro de risco e de regime, nao como gatilho isolado
- guardar justificativa textual da classificacao para auditoria

### Aprendizado operacional

- cada trade de paper precisa alimentar um diario estruturado
- comparar expectativa do setup com resultado real
- detectar degradacao de edge por simbolo, timeframe, regime e tier de risco

## O que a stack precisa implementar

- conector real de market data testnet
- motor de backtest com walk-forward e metricas reproduziveis
- diario de paper trading com fills e motivos de entrada/saida
- classificador de noticias e eventos por horizonte
- perfis de risco baixo/medio/alto parametrizaveis
- score de confianca por checklist
- guardrails que barrem qualquer evolucao precipitada para modo real

## O que nao pode acontecer

- tratar qualquer estrategia como “caminho garantido” para lucro
- ativar mainnet automaticamente
- esconder custo de slippage, taxa ou drawdown
- declarar edge sem evidencia reproduzivel
- executar carteira real sem aprovacao manual e kill switch
