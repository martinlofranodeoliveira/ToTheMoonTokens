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

    // Toast Notification System
    const showToast = (msg, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = msg;
        document.body.appendChild(toast);
        
        // Trigger reflow for transition
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Helper for async/await delays
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Generate API Key
    genKeyBtn.addEventListener('click', () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let key = 'ttm_sk_live_';
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        apiKeyDisplay.value = key;
        showToast("New API Key generated. Update your bots!", "success");
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
                showToast("Simulation aborted due to security risk.", "error");
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
            
            showToast("Simulation completed successfully!", "success");
        } catch (error) {
            showToast("Could not connect to API. Is it running?", "error");
        } finally {
            runSimBtn.disabled = false;
            runSimBtn.innerText = "Run Token Audit & Simulation";
        }
    });

    // Subscribe (Mocking Circle Checkout Flow)
    subscribeBtn.addEventListener('click', async () => {
        subscribeBtn.disabled = true;
        subscribeBtn.innerText = "Processing USDC Payment...";
        checkoutStatus.classList.remove('hidden');
        checkoutStatus.innerHTML = "Generating Circle checkout session...";
        
        try {
            // Simulating the delay of a blockchain transaction
            await sleep(1500);
            checkoutStatus.innerHTML += "<br>=> Waiting for Arc Testnet settlement verification...";
            
            await sleep(2000);
            checkoutStatus.innerHTML += "<br>=> <span style='color: #4ade80;'>Payment Verified! Account upgraded to Pro Tier.</span>";
            subscribeBtn.innerText = "Subscribed";
            showToast("Payment Verified! Account upgraded to Pro Tier.", "success");
        } catch (error) {
            showToast("Payment failed to process.", "error");
            subscribeBtn.disabled = false;
            subscribeBtn.innerText = "Subscribe";
        }
    });
});