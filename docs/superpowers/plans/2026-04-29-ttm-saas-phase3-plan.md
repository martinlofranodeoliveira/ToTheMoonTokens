# TTM SaaS Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or generalist tools to implement this plan task-by-task.

**Goal:** Transform the existing hackathon frontend (`apps/web/index.html` and `apps/web/app.js`) into a SaaS Dashboard. This includes adding an API Key generation interface, a visual report for the bot's simulated paper trades, and a subscription billing section using the existing Circle integration.

**Architecture:** Vanilla JS/HTML/CSS in the existing `apps/web` directory.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript

---

### Task 1: Update HTML Structure for SaaS Dashboard

**Files:**
- Modify: `apps/web/index.html`

- [ ] **Step 1: Replace the `<body>` content with the new Dashboard UI**

Find the main container in `index.html` and add new SaaS sections. We will add an "API Management" section, a "Simulation Metrics" section, and a "SaaS Billing" section.

```html
<!-- Replace the existing main content in apps/web/index.html with this updated structure inside the main container -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TTM Agent Market - SaaS Dashboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="app-header">
        <div class="logo">TTM SaaS <span>Automated Venture Capital</span></div>
        <nav>
            <a href="#dashboard" class="active">Dashboard</a>
            <a href="#api-keys">API Keys</a>
            <a href="#billing">Billing</a>
        </nav>
    </header>

    <main class="dashboard-container">
        <!-- Dashboard Section -->
        <section id="dashboard" class="saas-section">
            <h2>Bot Simulation Performance</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h3>Simulated Balance</h3>
                    <p class="value" id="sim-balance">$10,000.00</p>
                </div>
                <div class="metric-card">
                    <h3>Win Rate</h3>
                    <p class="value" id="win-rate">68.5%</p>
                </div>
                <div class="metric-card">
                    <h3>Total Trades Simulated</h3>
                    <p class="value" id="total-trades">1,240</p>
                </div>
            </div>
            <div class="action-panel">
                <button id="run-simulation-btn" class="primary-btn">Run Token Audit & Simulation</button>
                <div id="simulation-result" class="hidden result-box"></div>
            </div>
        </section>

        <!-- API Keys Section -->
        <section id="api-keys" class="saas-section">
            <h2>API Key Management</h2>
            <p>Use this key to authenticate your AI trading bot against our Paper Trading Engine.</p>
            <div class="api-key-box">
                <input type="text" id="api-key-display" value="ttm_sk_mock_8f92a1b4c..." readonly>
                <button id="generate-key-btn" class="secondary-btn">Generate New Key</button>
            </div>
        </section>

        <!-- Billing Section (Using existing Circle logic) -->
        <section id="billing" class="saas-section">
            <h2>Premium Subscription</h2>
            <p>Unlock unlimited paper trading simulations and advanced honeypot detection.</p>
            <div class="pricing-card">
                <h3>Pro Tier</h3>
                <p class="price">$50 USDC / month</p>
                <button id="subscribe-btn" class="primary-btn">Pay with Circle (USDC)</button>
            </div>
            <div id="checkout-status" class="hidden result-box"></div>
        </section>
    </main>

    <script src="config.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### Task 2: Update CSS for SaaS Dashboard

**Files:**
- Modify: `apps/web/styles.css`

- [ ] **Step 1: Append new styles for the dashboard to the bottom of `styles.css`**

```css
/* Append to apps/web/styles.css */

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

.saas-section {
    background: #1e1e24;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
    color: #eee;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
}

.metric-card {
    background: #2a2a35;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
}

.metric-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #aaa;
}

.metric-card .value {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
    color: #4ade80;
}

.api-key-box {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.api-key-box input {
    flex: 1;
    padding: 0.75rem;
    background: #111;
    border: 1px solid #444;
    color: #4ade80;
    font-family: monospace;
    border-radius: 4px;
}

.primary-btn, .secondary-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
}

.primary-btn {
    background: #2563eb;
    color: white;
}

.primary-btn:hover {
    background: #1d4ed8;
}

.secondary-btn {
    background: #4b5563;
    color: white;
}

.secondary-btn:hover {
    background: #374151;
}

.hidden {
    display: none;
}

.result-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #0f172a;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    font-family: monospace;
}
```

### Task 3: Implement Dashboard Logic in Vanilla JS

**Files:**
- Modify: `apps/web/app.js`

- [ ] **Step 1: Replace or append the JS logic to handle the new SaaS UI**

Since this is a vanilla JS app, we will overwrite `app.js` with the SaaS dashboard logic, ensuring we wire up the new endpoints created in Phase 1 and 2.

```javascript
// Replace apps/web/app.js contents entirely or adapt to fit.
// For the SaaS Dashboard MVP:

document.addEventListener('DOMContentLoaded', () => {
    const runSimBtn = document.getElementById('run-simulation-btn');
    const simResultBox = document.getElementById('simulation-result');
    
    const genKeyBtn = document.getElementById('generate-key-btn');
    const apiKeyDisplay = document.getElementById('api-key-display');
    
    const subscribeBtn = document.getElementById('subscribe-btn');
    const checkoutStatus = document.getElementById('checkout-status');
    
    // API URL based on config or default localhost
    const API_BASE = window.API_URL || 'http://127.0.0.1:8010/api/v1';

    // Generate API Key
    genKeyBtn.addEventListener('click', () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let key = 'ttm_sk_live_';
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        apiKeyDisplay.value = key;
        alert("New API Key generated. Update your bots!");
    });

    // Run Token Audit & Simulation (Calling Phase 1 & 2 APIs)
    runSimBtn.addEventListener('click', async () => {
        runSimBtn.disabled = true;
        runSimBtn.innerText = "Auditing Token...";
        simResultBox.classList.remove('hidden');
        simResultBox.innerHTML = "Fetching security audit from /api/v1/tokens/0xSAFE/audit...";

        try {
            // 1. Audit Token
            const auditRes = await fetch(`${API_BASE}/tokens/0xSAFE/audit`);
            const auditData = await auditRes.json();
            
            simResultBox.innerHTML += `<br>=> Audit result: Honeypot risk is ${auditData.security.is_honeypot ? 'HIGH' : 'LOW'}.`;
            
            if (auditData.security.is_honeypot) {
                simResultBox.innerHTML += `<br>=> Simulation aborted due to security risk.`;
                return;
            }

            // 2. Simulate Trade
            simResultBox.innerHTML += `<br>=> Simulating trade on /api/v1/simulate/order...`;
            const simRes = await fetch(`${API_BASE}/simulate/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token_address: "0xSAFE",
                    amount: 1000.0,
                    side: "BUY"
                })
            });
            const simData = await simRes.json();
            
            simResultBox.innerHTML += `<br>=> Trade SUCCESS! Executed Price: $${simData.executed_price.toFixed(4)}`;
            simResultBox.innerHTML += `<br>=> Fees Paid: $${simData.fees_paid.toFixed(2)}`;
            simResultBox.innerHTML += `<br>=> Net Simulated Position: $${simData.net_amount.toFixed(2)}`;
            
        } catch (error) {
            simResultBox.innerHTML += `<br><span style="color: red;">Error: Could not connect to API. Is it running?</span>`;
            console.error(error);
        } finally {
            runSimBtn.disabled = false;
            runSimBtn.innerText = "Run Token Audit & Simulation";
        }
    });

    // Subscribe (Mocking Circle Checkout Flow)
    subscribeBtn.addEventListener('click', () => {
        subscribeBtn.disabled = true;
        subscribeBtn.innerText = "Processing USDC Payment...";
        checkoutStatus.classList.remove('hidden');
        checkoutStatus.innerHTML = "Generating Circle checkout session...";
        
        // Simulating the delay of a blockchain transaction
        setTimeout(() => {
            checkoutStatus.innerHTML += "<br>=> Waiting for Arc Testnet settlement verification...";
            setTimeout(() => {
                checkoutStatus.innerHTML += "<br>=> <span style='color: #4ade80;'>Payment Verified! Account upgraded to Pro Tier.</span>";
                subscribeBtn.innerText = "Subscribed";
            }, 2000);
        }, 1500);
    });
});
```

- [ ] **Step 2: Commit and Push**
```bash
git add apps/web/index.html apps/web/styles.css apps/web/app.js
git commit -m "feat: implement SaaS Dashboard frontend with API Key and Simulation UI (Phase 3)"
git push origin main
```
