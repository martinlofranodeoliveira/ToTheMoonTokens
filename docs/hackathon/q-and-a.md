# Pitch Deck Q&A Cheat Sheet

This document contains objective responses to 10 likely questions during the SF onsite pitch. 
**Crucial Reminder:** Emphasize that the platform currently operates *strictly* in paper-mode and Arc testnet. Never promise guaranteed profits.

### 1. Mainnet Readiness
**Q:** "When will this be available on mainnet for live trading?"
**A:** We deliberately block mainnet execution right now. Our architecture is research-first, meaning we prioritize rigorous backtesting and paper trading. Moving to live capital requires strict compliance with our `REAL_MODE_GRADUATION.md` framework, which demands manual human approval, proven testnet edge, and external security audits. We are in Phase 1; live mainnet is not a priority until the research platform is flawless.

### 2. Economic Model
**Q:** "How does the economic model work for agents and data providers?"
**A:** We leverage Circle Nanopayments on the testnet. When an agent requests a strategy component, risk assessment, or market data from another provider, a micro-transaction is initiated. This creates a sustainable, frictionless economy where valuable data and validation are compensated without exorbitant gas fees, settling natively via Circle infrastructure.

### 3. Security
**Q:** "How are you securing user funds and API keys?"
**A:** First, we hold zero user funds—our system does not custody capital. For testnet, we enforce strict, read-only or test-only API keys. Any real-money interaction (if ever enabled in the future) would be entirely "manual signature only." The system acts as an analytical oracle; the human retains total control of the wallet.

### 4. Scalability
**Q:** "How does the platform scale as thousands of strategies are tested concurrently?"
**A:** We separate the computation layer from the validation layer. The heavy lifting of backtesting and data streaming runs off-chain on our decoupled Nexus engine. Only the intent verification, nanopayment settlement, and reputation scoring are pushed to the Arc Network, keeping on-chain bloat minimal and scaling effectively.

### 5. Reputation
**Q:** "How do you prevent malicious agents or overfitting strategies from dominating?"
**A:** The Arc Network provides our decentralized reputation layer. Agents are scored based on the proven, out-of-sample performance of their strategies in paper trading—not on their backtests. Over time, an immutable track record is built on Arc. If an agent consistently breaches risk thresholds, their reputation drops, limiting their ability to monetize their signals.

### 6. Dispute Resolution
**Q:** "What happens if a data provider delivers faulty intelligence after being paid via Circle?"
**A:** Because we are in a testnet validation phase, disputes are currently handled via algorithmic slashing of reputation on Arc. A data provider providing consistently noisy data will automatically trigger a drop in their Arc reputation score. Future iterations may include escrowed nanopayments that only settle once the consumer agent successfully validates the data integrity.

### 7. Cold-Start Problem
**Q:** "How do you attract users when there's no reputation data yet?"
**A:** We bypass the cold-start problem by acting as our own first major consumer. We are seeding the platform with robust, open-source market data connectors and baseline quantitative strategies. This generates initial volume, reputation scoring, and nanopayment flow, creating a demonstrable marketplace that early adopters can immediately plug into.

### 8. Competitors
**Q:** "How does this differ from platforms like Numerai or standard trading bots?"
**A:** Standard trading bots sell "black-box" profit promises and jump straight to live execution, which is dangerous. Numerai crowdsources alpha but abstracts the execution entirely. We are a transparent validation stack: we force every strategy through a reproducible research and paper-trading funnel, backed by an open reputation layer. We aren't selling a strategy; we're selling the infrastructure to prove a strategy is safe.

### 9. Price Floor
**Q:** "Is there a minimum cost or price floor for the Circle nanopayments?"
**A:** Nanopayments are designed to be extremely flexible. In our current testnet implementation, the price floor is dictated only by the absolute minimum settlement limits of the Circle infrastructure. This allows for incredibly granular pricing for API calls—like charging fractions of a cent for a single risk-assessment query.

### 10. Legal & Compliance
**Q:** "What are the legal implications of running an automated trading network?"
**A:** This is exactly why we are strictly "research-first." We do not solicit investments, we do not pool funds, and we do not execute trades on mainnet. The platform is a localized research tool that simulates trading. By operating purely on testnet data and requiring manual signatures for any theoretical future live execution, we mitigate the regulatory risks associated with custodial exchanges and fully autonomous live-trading bots.
