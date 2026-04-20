const fs = require('fs');

let js = fs.readFileSync('apps/web/app.js', 'utf8');

// connectors
js = js.replace(/<div class="connector-item">/g, '<div class="connector-item" data-testid="connector-item">');
js = js.replace(/<div class="connector-item" data-testid="connector-item">\s*<p class="label">Exchange<\/p>/, '<div class="connector-item" data-testid="connector-item-exchange">\n      <p class="label">Exchange</p>');
js = js.replace(/<div class="connector-item" data-testid="connector-item">\s*<p class="label">Wallet mode<\/p>/, '<div class="connector-item" data-testid="connector-item-wallet">\n      <p class="label">Wallet mode</p>');
js = js.replace(/<div class="connector-item" data-testid="connector-item">\s*<p class="label">Market heartbeat<\/p>/, '<div class="connector-item" data-testid="connector-item-heartbeat">\n      <p class="label">Market heartbeat</p>');

// strategies
js = js.replace(/<div class="strategy-item">/g, '<div class="strategy-item" data-testid="strategy-item-${escapeHtml(strategy.id || strategy.name)}">');

// guardrail reasons
js = js.replace(/<li>\$\{escapeHtml\(reason\)\}<\/li>/g, '<li data-testid="guardrail-reason">${escapeHtml(reason)}</li>');

// aggregates - empty
js = js.replace(/<div class="aggregate-item"><strong>No paper trades yet\./, '<div class="aggregate-item" data-testid="aggregate-empty"><strong>No paper trades yet.');
// aggregates - summary
js = js.replace(/<div class="aggregate-item aggregate-summary">/, '<div class="aggregate-item aggregate-summary" data-testid="aggregate-summary">');
// aggregates - items
js = js.replace(/<div class="aggregate-item">\s*<strong>\$\{escapeHtml\(strategyId\)\}<\/strong>/g, '<div class="aggregate-item" data-testid="aggregate-strategy-${escapeHtml(strategyId)}">\n            <strong>${escapeHtml(strategyId)}</strong>');

// journal - empty
js = js.replace(/<div class="journal-item"><strong>No journal entries yet\./, '<div class="journal-item" data-testid="journal-empty"><strong>No journal entries yet.');

// journal - items
js = js.replace(/\(trade\) => `\s*<article class="journal-item">/, '(trade, index) => `\n        <article class="journal-item" data-testid="journal-trade-${escapeHtml(trade.id || index)}">');

fs.writeFileSync('apps/web/app.js', js);
