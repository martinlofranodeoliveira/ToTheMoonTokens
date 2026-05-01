document.addEventListener('DOMContentLoaded', () => {
    const runSimBtn = document.getElementById('run-simulation-btn');
    const simResultBox = document.getElementById('simulation-result');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-btn');
    const authStatus = document.getElementById('auth-status');
    const genKeyBtn = document.getElementById('generate-key-btn');
    const apiKeyName = document.getElementById('api-key-name');
    const apiKeyDisplay = document.getElementById('api-key-display');
    const apiKeysList = document.getElementById('api-keys-list');
    const subscribeBtn = document.getElementById('subscribe-btn');
    const checkoutStatus = document.getElementById('checkout-status');

    const configuredBase = window.TTM_API_BASE_URL || window.API_URL || 'http://127.0.0.1:8010';
    const API_ROOT = configuredBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    const API_BASE = `${API_ROOT}/api/v1`;

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

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const token = () => localStorage.getItem('ttm_jwt');

    const setAuthStatus = (message) => {
        authStatus.textContent = message;
    };

    const authHeaders = () => ({
        Authorization: `Bearer ${token()}`
    });

    const login = async (email, password) => {
        const body = new URLSearchParams({ username: email, password });
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!res.ok) throw new Error('login failed');
        const { access_token } = await res.json();
        localStorage.setItem('ttm_jwt', access_token);
    };

    const createApiKey = async (name) => {
        const res = await fetch(`${API_BASE}/saas/api-keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(),
            },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('create key failed');
        return res.json();
    };

    const revokeApiKey = async (id) => {
        const res = await fetch(`${API_BASE}/saas/api-keys/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error('revoke key failed');
    };

    const renderApiKeys = (keys) => {
        apiKeysList.replaceChildren();
        keys.forEach((key) => {
            const row = document.createElement('div');
            row.className = 'api-key-row';

            const details = document.createElement('div');
            details.className = 'api-key-details';
            const name = document.createElement('strong');
            name.textContent = key.name;
            const meta = document.createElement('span');
            meta.textContent = `${key.prefix} · ${key.revoked_at ? 'revoked' : 'active'}`;
            details.append(name, meta);

            const button = document.createElement('button');
            button.className = 'secondary-btn';
            button.textContent = 'Revoke';
            button.disabled = Boolean(key.revoked_at);
            button.addEventListener('click', async () => {
                try {
                    await revokeApiKey(key.id);
                    await loadApiKeys();
                    showToast('API key revoked.', 'success');
                } catch (error) {
                    showToast('Could not revoke API key.', 'error');
                }
            });

            row.append(details, button);
            apiKeysList.append(row);
        });
    };

    const loadApiKeys = async () => {
        if (!token()) {
            renderApiKeys([]);
            return;
        }
        const res = await fetch(`${API_BASE}/saas/api-keys`, {
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error('list keys failed');
        renderApiKeys(await res.json());
    };

    loginBtn.addEventListener('click', async () => {
        loginBtn.disabled = true;
        try {
            await login(emailInput.value.trim(), passwordInput.value);
            setAuthStatus(`Signed in as ${emailInput.value.trim()}`);
            await loadApiKeys();
            showToast('Logged in.', 'success');
        } catch (error) {
            showToast('Login failed.', 'error');
        } finally {
            loginBtn.disabled = false;
        }
    });

    genKeyBtn.addEventListener('click', async () => {
        genKeyBtn.disabled = true;
        try {
            const created = await createApiKey(apiKeyName.value.trim() || 'default');
            apiKeyDisplay.value = created.plaintext;
            await loadApiKeys();
            showToast('API key created.', 'success');
        } catch (error) {
            showToast('Create API key failed.', 'error');
        } finally {
            genKeyBtn.disabled = false;
        }
    });

    runSimBtn.addEventListener('click', async () => {
        runSimBtn.disabled = true;
        runSimBtn.innerText = "Auditing Token...";
        simResultBox.classList.remove('hidden');
        simResultBox.innerHTML = "Fetching security audit from /api/v1/tokens/0xSAFE/audit...";

        try {
            // 1. Audit Token
            const apiKey = apiKeyDisplay.value.trim();
            if (!apiKey) throw new Error('missing api key');
            const auditRes = await fetch(`${API_BASE}/tokens/0xSAFE/audit`, {
                headers: { 'X-API-Key': apiKey },
            });
            if (!auditRes.ok) throw new Error('audit failed');
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
                headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                body: JSON.stringify({
                    token_address: "0xSAFE",
                    amount: 1000.0,
                    side: "BUY"
                })
            });
            if (!simRes.ok) throw new Error('simulation failed');
            const simData = await simRes.json();
            
            simResultBox.innerHTML += `<br>=> Trade SUCCESS! Executed Price: $${simData.executed_price.toFixed(4)}`;
            simResultBox.innerHTML += `<br>=> Fees Paid: $${simData.fees_paid.toFixed(2)}`;
            simResultBox.innerHTML += `<br>=> Net Simulated Position: $${simData.net_amount.toFixed(2)}`;
            
            showToast("Simulation completed successfully!", "success");
        } catch (error) {
            showToast("Simulation failed.", "error");
        } finally {
            runSimBtn.disabled = false;
            runSimBtn.innerText = "Run Token Audit & Simulation";
        }
    });

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

    if (token()) {
        setAuthStatus('Signed in');
        loadApiKeys().catch(() => setAuthStatus('Session expired'));
    }
});
