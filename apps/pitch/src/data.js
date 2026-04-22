// Shared mock data + helpers for TTM Agent Market

const SYMS = ['BTCUSDT','ETHUSDT','SOLUSDT','ARBUSDT','AVAXUSDT','LINKUSDT','OPUSDT','MATICUSDT','BNBUSDT','DOGEUSDT','NEARUSDT','ATOMUSDT','DOTUSDT','APTUSDT','SUIUSDT'];
const HORIZONS = ['1m','15m','1h','4h','1d'];
const TIERS = ['low','med','high'];
const PUBS = ['research_01','research_02','research_03','research_04','research_05'];
const CONSUMERS = ['consumer_01','consumer_02','consumer_03','consumer_04','consumer_07','consumer_11'];

// Deterministic PRNG so initial render is stable
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const seededRandom = mulberry32(0xC1C1E);
function sr() { return seededRandom(); }
function spick(arr) { return arr[Math.floor(sr() * arr.length)]; }

function randomHash() {
  const hex = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 64; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}
function truncHash(h, head = 6, tail = 4) {
  return h.slice(0, 2 + head) + '…' + h.slice(-tail);
}

// gradient colors for avatars - derive from string
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
function avatarGradient(id) {
  const h = hashStr(id);
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 70% 55%), hsl(${hue2} 75% 45%))`;
}

function priceFor(sym) {
  // plausible sub-cent USDC pricing
  const tier = Math.random();
  if (tier < 0.5) return +(0.0002 + Math.random() * 0.0010).toFixed(4); // 0.0002-0.0012
  if (tier < 0.85) return +(0.0010 + Math.random() * 0.0020).toFixed(4);
  return +(0.0030 + Math.random() * 0.0050).toFixed(4); // premium
}

function scoreFor() {
  return Math.floor(40 + Math.random() * 58); // 40..98
}

// Initial signals
const initialSignals = [];
for (let i = 0; i < 18; i++) {
  const sym = spick(SYMS);
  const horizon = spick(HORIZONS);
  const tierRoll = sr();
  const tier = tierRoll < 0.55 ? 'low' : tierRoll < 0.85 ? 'med' : 'high';
  const pub = spick(PUBS);
  initialSignals.push({
    id: 'sig_' + Math.random().toString(36).slice(2, 8),
    sym,
    horizon,
    tier,
    score: scoreFor(),
    publisher: pub,
    price: priceFor(sym),
    ttl: 60 + Math.floor(sr() * 220),
    sold: false,
    createdAt: Date.now() - Math.floor(sr() * 180_000),
  });
}

const initialSettlements = [];
for (let i = 0; i < 10; i++) {
  const ago = i * 3 + Math.floor(Math.random() * 4) + 2;
  initialSettlements.push({
    id: 'tx' + i,
    consumer: spick(CONSUMERS),
    research: spick(PUBS),
    amount: +(0.0004 + Math.random() * 0.0022).toFixed(4),
    hash: randomHash(),
    ago,
    ts: Date.now() - ago * 1000,
  });
}

const AGENTS = [
  { id: 'research_01', role: 'research', balance: 1.2043, revenue24: 0.2412, rep: 82, address: '0x7b4c…12aa' },
  { id: 'research_02', role: 'research', balance: 0.8743, revenue24: 0.1203, rep: 73, address: '0x3f29…84be' },
  { id: 'research_03', role: 'research', balance: 2.3102, revenue24: 0.3845, rep: 88, address: '0x9a11…7021' },
  { id: 'research_04', role: 'research', balance: 0.4129, revenue24: 0.0512, rep: 51, address: '0xb6d8…e044' },
  { id: 'research_05', role: 'research', balance: 1.8820, revenue24: 0.2081, rep: 79, address: '0xce03…a113' },
  { id: 'consumer_01', role: 'consumer', balance: 19989.5485, spend24: 0.4213, rep: 64, address: '0x1a3d…8812' },
  { id: 'consumer_02', role: 'consumer', balance: 9432.1104, spend24: 0.1881, rep: 70, address: '0xdd7e…4002' },
  { id: 'auditor_01', role: 'auditor', balance: 312.4400, rep: null, address: '0x5512…f9aa' },
  { id: 'treasury', role: 'treasury', balance: 78_214.9102, rep: null, address: '0x0042…0001' },
];

const SETTLEMENT_HASH_BASE = randomHash();

// Payment-flow steps for the inspector
const PAYMENT_FLOW = [
  {
    id: 'quote', num: '01', title: 'Quote',
    description: 'Consumer requests a price quote; API returns intent_id and sub-cent price.',
    duration: 42,
    request: {
      method: 'POST',
      endpoint: '/api/market/quote',
      body: { signal_id: 'sig_a74c9f', consumer_id: 'consumer_01' }
    },
    response: {
      intent_id: '0x8f3a1d22c4ab9c7de8a5f3210cb2a7d9e12b',
      price_usdc: 0.0012,
      expires_in_ms: 30_000,
      publisher: 'research_02'
    },
    tx: null,
  },
  {
    id: 'hold', num: '02', title: 'Hold',
    description: 'Middleware reserves consumer balance. Off-chain Circle sandbox hold.',
    duration: 78,
    request: {
      method: 'POST',
      endpoint: '/api/payments/hold',
      body: { intent_id: '0x8f3a…e12b', amount_usdc: 0.0012 }
    },
    response: {
      hold_id: 'hld_f82c1b',
      held_amount_usdc: 0.0012,
      consumer_balance_after: 19989.5473,
      status: 'held'
    },
    tx: null,
  },
  {
    id: 'capture', num: '03', title: 'Capture',
    description: 'Hold is captured. Transaction submitted to Arc L1.',
    duration: 154,
    request: {
      method: 'POST',
      endpoint: '/api/payments/capture',
      body: { hold_id: 'hld_f82c1b' }
    },
    response: {
      tx_hash: '0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4',
      submitted_block: 1_234_566,
      gas_used_usdc: 0.000000,
      status: 'submitted'
    },
    tx: '0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4',
  },
  {
    id: 'settle', num: '04', title: 'Settlement',
    description: 'Arc L1 confirms block. Auditor verifies via eth_getTransactionReceipt.',
    duration: 387,
    request: {
      method: 'RPC',
      endpoint: 'eth_getTransactionReceipt',
      body: { tx_hash: '0x6fc1…79a4' }
    },
    response: {
      block_number: 1_234_567,
      confirmations: 1,
      status: '0x1',
      effective_gas_price: '0',
      finality_ms: 387
    },
    tx: '0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4',
  },
  {
    id: 'deliver', num: '05', title: 'Deliver',
    description: 'Premium payload unlocked for consumer. Journal entry recorded.',
    duration: 82,
    request: {
      method: 'GET',
      endpoint: '/api/market/signals/sig_a74c9f/payload',
      body: { intent_id: '0x8f3a…e12b' }
    },
    response: {
      symbol: 'BTCUSDT',
      direction: 'long',
      entry: 64_210.50,
      stop: 63_890.00,
      target: 64_780.00,
      horizon: '1h',
      published_at: '2026-04-21T14:32:08.441Z'
    },
    tx: null,
  },
];

// Speaker pairs for settlements
function nextSettlement() {
  return {
    id: 'tx_' + Math.random().toString(36).slice(2, 8),
    consumer: spick(CONSUMERS),
    research: spick(PUBS),
    amount: +(0.0003 + Math.random() * 0.0025).toFixed(4),
    hash: randomHash(),
    ts: Date.now(),
  };
}

function nextSignal() {
  const sym = spick(SYMS);
  const tierRoll = Math.random();
  const tier = tierRoll < 0.55 ? 'low' : tierRoll < 0.85 ? 'med' : 'high';
  return {
    id: 'sig_' + Math.random().toString(36).slice(2, 8),
    sym,
    horizon: spick(HORIZONS),
    tier,
    score: scoreFor(),
    publisher: spick(PUBS),
    price: priceFor(sym),
    ttl: 60 + Math.floor(Math.random() * 220),
    sold: false,
    createdAt: Date.now(),
  };
}

function tierPill(t) {
  if (t === 'low') return 'pill-low';
  if (t === 'med') return 'pill-med';
  return 'pill-high';
}

function scoreColor(s) {
  if (s >= 80) return 'rep-gold';
  if (s >= 60) return 'rep-green';
  if (s >= 40) return 'rep-blue';
  return 'rep-gray';
}

function roleColor(r) {
  return {
    research: 'pill-blue',
    consumer: 'pill-violet',
    auditor:  'pill-green',
    treasury: 'pill-gold',
  }[r] || 'pill';
}

function fmtUSDC(n, places = 4) {
  if (n === undefined || n === null) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return n.toFixed(places);
}

function relTime(secAgo) {
  if (secAgo < 60) return secAgo + 's ago';
  if (secAgo < 3600) return Math.floor(secAgo / 60) + 'm ago';
  return Math.floor(secAgo / 3600) + 'h ago';
}

function formatTTL(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

const API_BASE = 'http://127.0.0.1:8000';

async function fetchWithFallback(endpoint, mockData) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, isMock: false };
  } catch (err) {
    console.warn(`Fallback to mock for ${endpoint}`, err.message);
    return { data: mockData, isMock: true };
  }
}

const api = {
  getSignals: () => fetchWithFallback('/api/market/signals', initialSignals),
  getAgent: (id) => fetchWithFallback(`/api/agents/${id}`, AGENTS.find(a => a.id === id) || AGENTS[1]),
  getPaymentFlow: (intentId) => fetchWithFallback(`/api/payments/${intentId}/flow`, PAYMENT_FLOW),
  getSettlements: () => fetchWithFallback('/api/journal/trades', initialSettlements),
};

window.TTM = {
  SYMS, HORIZONS, TIERS, PUBS, CONSUMERS, AGENTS, PAYMENT_FLOW,
  initialSignals, initialSettlements,
  randomHash, truncHash, avatarGradient, priceFor, scoreFor,
  nextSettlement, nextSignal,
  tierPill, scoreColor, roleColor,
  fmtUSDC, relTime, formatTTL, hashStr,
  api,
};
