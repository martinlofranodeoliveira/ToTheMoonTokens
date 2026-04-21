# ToTheMoonTokens - Live Demo Script (3 Minutes)

> **Note:** This script is designed to be synchronized with `run_demo.sh` (TTM-019) and fits comfortably within a 3-minute window. It highlights the research-first approach, paper mode, and Arc testnet integrations.

## 0:00 - 0:30 | Setup & Intro (The "Research-First" Context)

**Presenter:**
"Welcome to the ToTheMoonTokens live demo. What you're seeing here is our Command Dashboard. Notice the active guardrails immediately—we are operating strictly in Paper Trading and Binance Spot Testnet modes. Our philosophy is that no strategy touches real capital without rigorous, reproducible proof. I'm kicking off `run_demo.sh` to initialize the Nexus orchestration engine."

*(Action: Execute `run_demo.sh start` which boots the API, Nexus hooks, and Strategy Lab).*

## 0:30 - 1:15 | Backtesting & The Strategy Lab

**Presenter:**
"First, we define a hypothesis in our Strategy Lab. We're loading a medium-term structural trend strategy. The engine instantly pulls historical data and runs a deterministic backtest."

*(Action: The script outputs backtest results: max drawdown, profit factor, win rate).*

**Presenter:**
"The results are in. We have a positive expected return with a max drawdown well within our defined risk limits. But backtesting is easy to overfit. The real test is the walk-forward simulation."

## 1:15 - 2:00 | Paper Trading & Operational Journal

**Presenter:**
"We now push the strategy into Paper Trading mode. Here, the system connects to the Binance Testnet data feed. It simulates fills, accounts for simulated slippage, and most importantly, logs every decision into a structured operational journal."

*(Action: The terminal shows simulated live ticks, news event filtering, and a logged simulated trade).*

**Presenter:**
"You can see a news event was just processed. Because this is a medium-risk tier, the system used the news classifier as a risk filter to temporarily halt trading, preventing execution during high volatility. This is our guardrail architecture in action."

## 2:00 - 2:45 | Arc + Circle Nanopayments Integration

**Presenter:**
"Now, let's say an autonomous agent wants to request advanced on-chain market intelligence to refine this strategy. This is where Arc and Circle come in."

*(Action: The script initiates an `arc_verify` and `circle_intent` flow).*

**Presenter:**
"The agent initiates a Circle payment intent—a frictionless nanopayment for data access. Simultaneously, the Arc Network verifies the agent's identity and logs the reputation score. It ensures the agent hasn't breached our strict risk tiers in the past. It's a completely trustless validation loop operating purely in testnet."

## 2:45 - 3:00 | Wrap Up & Graduation Guardrails

**Presenter:**
"Finally, the strategy is scored. To ever consider graduating to real money, it would have to pass our `REAL_MODE_GRADUATION.md` compliance checks—requiring manual human approval, sustained testnet edge, and strict security sign-offs. We never promise profit, we engineer validation."

*(Action: `run_demo.sh` safely shuts down the processes and prints the final report).*

**Presenter:**
"Thank you. We're now open for Q&A."
