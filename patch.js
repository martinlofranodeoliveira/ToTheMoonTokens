const fs = require('fs');

let html = fs.readFileSync('apps/web/index.html', 'utf8');

html = html.replace(/<strong id="runtime-mode">/, '<strong id="runtime-mode" data-testid="runtime-mode">');
html = html.replace(/<p id="guardrail-copy">/, '<p id="guardrail-copy" data-testid="guardrail-copy">');
html = html.replace(/<div class="connector-list" id="connector-list">/, '<div class="connector-list" id="connector-list" data-testid="connector-list">');
html = html.replace(/<button id="refresh-button">/, '<button id="refresh-button" data-testid="refresh-button">');
html = html.replace(/<button id="connect-wallet-button" class="secondary">/, '<button id="connect-wallet-button" class="secondary" data-testid="connect-wallet-button">');
html = html.replace(/<p id="status-banner" class="status-banner"/, '<p id="status-banner" class="status-banner" data-testid="status-banner"');

html = html.replace(/<strong id="net-profit">-<\/strong>/, '<strong id="net-profit" data-testid="metric-net-profit">-</strong>');
html = html.replace(/<strong id="return-pct">-<\/strong>/, '<strong id="return-pct" data-testid="metric-return-pct">-</strong>');
html = html.replace(/<strong id="drawdown-pct">-<\/strong>/, '<strong id="drawdown-pct" data-testid="metric-drawdown-pct">-</strong>');
html = html.replace(/<strong id="profit-factor">-<\/strong>/, '<strong id="profit-factor" data-testid="metric-profit-factor">-</strong>');

html = html.replace(/<div id="strategy-list" class="strategy-list">/, '<div id="strategy-list" class="strategy-list" data-testid="strategy-list">');
html = html.replace(/<ul id="guardrail-reasons" class="reason-list">/, '<ul id="guardrail-reasons" class="reason-list" data-testid="guardrail-reasons">');
html = html.replace(/<div id="aggregates-list" class="aggregate-list">/, '<div id="aggregates-list" class="aggregate-list" data-testid="aggregates-list">');
html = html.replace(/<div id="journal-list" class="journal-list">/, '<div id="journal-list" class="journal-list" data-testid="journal-list">');

fs.writeFileSync('apps/web/index.html', html);
