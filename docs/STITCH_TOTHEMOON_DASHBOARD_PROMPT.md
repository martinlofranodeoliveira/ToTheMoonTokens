# ToTheMoonTokens Dashboard Stitch Prompt

## Contexto

Este arquivo serve para você gerar um novo protótipo visual no Stitch para o dashboard do projeto `ToTheMoonTokens`.

O produto **não é uma tela de trading com dinheiro real**. Ele é um **control room de pesquisa e paper trading**. A proposta é:

- validar estratégias antes de tocar capital real
- monitorar o runtime em quase tempo real
- comparar pesquisa vs execução em paper
- manter guardrails rígidos para bloquear operação real

## O que existe hoje na tela

### 1. Topbar

- marca `TT`
- texto `Paper trading command deck`
- título `ToTheMoonTokens`
- badge de runtime no topo
- botão `Refresh board`
- botão `Connect MetaMask`

### 2. Hero principal

- eyebrow `Research-first execution stack`
- headline grande:
  `Measure the edge, watch the drift, keep capital blocked.`
- texto explicando que a tela combina:
  - market heartbeat
  - research snapshots
  - paper journal performance
  - runtime guardrails
- linha de chips com:
  - mode
  - testnet arm
  - kill switch
  - approvals
  - market status
- banner de status

### 3. Market spotlight

Dois cards grandes:

#### BTCUSDT spot

- preço atual
- variação 24h
- volume 24h

#### Active runtime

- estado do runtime
- janela start/end
- progresso temporal da sessão
- cadência do polling

### 4. KPI grid

Hoje aparecem 6 KPIs:

- `Journal PnL`
- `Win rate`
- `Average drawdown`
- `Best paper lane`
- `Best research snapshot`
- `Runtime heartbeat`

### 5. Strategy board

Hoje existem 3 cards de estratégia:

- `EMA Crossover`
- `Breakout Range`
- `Mean Reversion`

Cada card mostra:

- nome da estratégia
- regime de mercado
- risk tier
- descrição
- research net
- research drawdown
- paper net
- paper win rate
- trade count
- barra de performance/conversão
- helper text com profit factor e journal drawdown

### 6. Guardrails

Painel com:

- `Testnet arm`
- `Manual approvals`
- `Kill switch`
- lista de bloqueios / razões

### 7. Connectors

Painel com:

- exchange
- wallet mode
- status/heartbeat do mercado
- latência
- informação operacional do conector

### 8. Paper journal

Lista de trades recentes com:

- símbolo
- estratégia
- outcome
- setup reason
- timeframe
- regime
- horário de entrada
- horário de saída
- PnL
- drawdown
- hold time
- exit reason

### 9. Runtime monitor

Painel do loop ativo com:

- símbolo e timeframe do runtime
- status do conector
- latest candle timestamp
- close atual
- sample count
- connector latency
- cards por estratégia com:
  - signal
  - open/flat state
  - equity
  - realized PnL
  - unrealized PnL
  - last event

## Snapshot real atual do produto

Use estes dados apenas como referência de contexto para o protótipo:

- modo atual: `paper`
- exchange: `binance_spot_testnet`
- wallet mode: `manual_only`
- MetaMask ready: `true`
- runtime atual: `running`
- símbolo: `BTCUSDT`
- timeframe: `1m`
- cadence: `60s`
- lookback: `240 bars`
- research snapshot atual:
  - `EMA Crossover`: flat
  - `Breakout Range`: flat
  - `Mean Reversion`: negative
- journal atual do ciclo limpo: ainda com poucos ou nenhum trade fechado

## O que está fraco visualmente hoje

- o layout ainda parece um dashboard genérico estilizado
- falta hierarquia mais forte entre visão executiva, estado do runtime e análise detalhada
- a tela ainda não comunica sofisticação institucional
- guardrails e modo paper ainda não estão “gritando” o suficiente visualmente
- há informação correta, mas o storytelling visual ainda está frouxo
- no mobile a reorganização ainda é funcional, mas não premium

## O objetivo do novo protótipo

Criar uma tela muito mais madura, clara e premium, mantendo a mesma base de informação.

A sensação precisa ser:

- institutional
- serious
- high-trust
- research-driven
- premium operations room
- elegant under pressure

Não deve parecer:

- painel gamer
- cassino cripto
- template SaaS comum
- landing page promocional
- dashboard neon genérico

## Prompt final para colar no Stitch

```md
Design a premium desktop and mobile dashboard for a product called "ToTheMoonTokens".

This product is not a real-money trading terminal. It is a research-first crypto paper-trading control room built to validate strategies before any real capital is ever used.

Core product purpose:
- paper trading only
- strategy research
- runtime monitoring
- guardrails and approvals
- post-trade analysis
- operational safety before live activation

The dashboard should communicate:
- rigor
- institutional trust
- intelligent monitoring
- execution discipline
- premium visual taste

Avoid:
- generic SaaS admin dashboard styling
- gamer visuals
- loud neon crypto aesthetics
- casino vibes
- visual clutter
- retail exchange UI patterns

The current dashboard contains these information groups and the redesign must preserve them:

1. Top command bar
- TT brand mark
- product name ToTheMoonTokens
- runtime mode badge
- refresh action
- wallet / manual approval action

2. Executive hero
- a large headline about measuring edge before risking capital
- a short supporting paragraph
- compact live status chips for:
  - mode
  - testnet arm
  - kill switch
  - approvals
  - market status

3. Market spotlight
- BTCUSDT current spot price
- 24h change
- volume
- make this feel important, calm, and institutional

4. Active runtime card
- runtime state
- start/end window
- session progress
- polling cadence
- this should feel operational and alive

5. KPI overview
Show six executive metrics:
- total journal PnL
- win rate
- average drawdown
- best paper strategy
- best research snapshot
- runtime heartbeat

6. Strategy board
Three strategy cards:
- EMA Crossover
- Breakout Range
- Mean Reversion

Each strategy card should show:
- strategy name
- market regime fit
- risk tier
- short description
- research net profit
- research drawdown
- paper net profit
- paper win rate
- trade count
- performance/confidence bar

This area should feel analytical, precise, and easy to scan.

7. Guardrails panel
Show:
- testnet arm status
- manual approvals count
- kill switch status
- blocking reasons

This should feel like operational governance, not settings.

8. Connectors panel
Show:
- exchange connection
- wallet mode
- market heartbeat
- latency
- reliability / readiness state

9. Paper journal panel
Show recent closed trades with:
- symbol
- strategy
- outcome
- setup reason
- timeframe
- market regime
- entry and exit timestamps
- PnL
- drawdown
- hold duration
- exit reason

This should feel like a serious research journal, not a noisy table.

10. Runtime monitor panel
Show live runtime state:
- symbol and timeframe
- latest candle
- sample count
- connector latency
- strategy runtime cards with:
  - signal
  - open or flat state
  - equity
  - realized PnL
  - unrealized PnL
  - last event

Visual direction:
- dark but refined
- not pure black; use deep navy, carbon, graphite, muted steel
- restrained accent colors:
  - positive = mint / green
  - warning = amber
  - danger = coral / red
  - info = ice blue
- cinematic but controlled atmosphere
- strong editorial typography
- larger hero scale than a normal admin dashboard
- layered depth with subtle grid, soft glows, blur, and structure
- clean spacing rhythm
- strong hierarchy between executive overview, runtime status, and deep analysis

UX direction:
- prioritize the most important information above the fold
- make blocked modes and safe modes unmistakably clear
- make negative performance visually obvious but elegant
- the mobile version must be intentionally recomposed, not just vertically stacked
- the desktop version should feel like a premium control room for quant-style research operations

Layout goal:
- produce 1 desktop screen and 1 mobile screen
- keep the screen implementation-friendly for later HTML/CSS coding
- create a cohesive visual system that can scale into more screens later
```

## Refinamentos opcionais

Se o Stitch vier genérico, complemente com uma destas instruções:

### Refinamento 1

`Make it feel like Bloomberg Terminal meets Stripe Dashboard, but calmer, more cinematic, and more premium.`

### Refinamento 2

`Reduce card soup, strengthen hierarchy, and make the hero and runtime areas feel more intentional and executive.`

### Refinamento 3

`Push the interface toward a premium research operations room rather than a retail crypto dashboard.`

### Refinamento 4

`Use a more authored editorial visual language and less template-like dashboard composition.`

## Depois do protótipo

Quando você me mandar o link, screenshot ou Figma/Stitch resultante, eu consigo:

- traduzir o visual para `HTML/CSS/JS`
- manter os dados reais já conectados na API
- adaptar desktop e mobile
- preservar runtime, guardrails e journal sem perder funcionalidade
- melhorar a implementação atual sem mexer no modo seguro de paper trading
