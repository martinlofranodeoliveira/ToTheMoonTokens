/* Shared components — register on window */
const { useState, useEffect, useRef, useMemo, useCallback } = React;
const D = window.TTM;

// ---------- Icons (lucide-style line) ----------
const Icon = ({ name, size = 14, color = "currentColor", className = "", stroke = 1.7 }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", className };
  switch (name) {
    case 'wallet':    return <svg {...common}><path d="M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M16 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/></svg>;
    case 'coins':     return <svg {...common}><circle cx="8" cy="8" r="5"/><path d="M19 8a5 5 0 1 0-5 8"/><path d="M8 21a5 5 0 0 0 5-5"/><circle cx="16" cy="16" r="5"/></svg>;
    case 'pulse':     return <svg {...common}><path d="M22 12h-4l-3 9-6-18-3 9H2"/></svg>;
    case 'shield':    return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'bank':      return <svg {...common}><path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21v-6"/><path d="M15 21v-6"/><path d="M3 10 12 3l9 7"/></svg>;
    case 'sparkles':  return <svg {...common}><path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
    case 'cart':      return <svg {...common}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/></svg>;
    case 'link':      return <svg {...common}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1-1"/></svg>;
    case 'check':     return <svg {...common}><path d="M20 6 9 17l-5-5"/></svg>;
    case 'check-circle': return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'clock':     return <svg {...common}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
    case 'alert':     return <svg {...common}><path d="m21 16-9-13L3 16Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
    case 'arrow-lr':  return <svg {...common}><path d="M17 3 21 7l-4 4"/><path d="M21 7H5"/><path d="m7 21-4-4 4-4"/><path d="M3 17h16"/></svg>;
    case 'arrow-r':   return <svg {...common}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
    case 'search':    return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'x':         return <svg {...common}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
    case 'chevron-down': return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevron-right': return <svg {...common}><path d="m9 6 6 6-6 6"/></svg>;
    case 'play':      return <svg {...common}><polygon points="5 3 19 12 5 21"/></svg>;
    case 'replay':    return <svg {...common}><path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.4 2.6L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.4-2.6L3 16"/></svg>;
    case 'download':  return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>;
    case 'copy':      return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
    case 'github':    return <svg {...common}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>;
    case 'filter':    return <svg {...common}><path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h2"/></svg>;
    case 'layers':    return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
    case 'activity':  return <svg {...common}><path d="M22 12h-4l-3 9-6-18-3 9H2"/></svg>;
    case 'settings':  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'folder':    return <svg {...common}><path d="M4 4h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>;
    case 'video':     return <svg {...common}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
    case 'expand':    return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    default: return null;
  }
};

// ---------- Avatar ----------
const Avatar = ({ id, size = "", letters }) => {
  const initials = letters || (id ? id.slice(0,2).toUpperCase() : '??');
  const cls = `avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : size === 'xl' ? 'avatar-xl' : ''}`;
  return <div className={cls} style={{ background: D.avatarGradient(id || 'x') }}>{initials}</div>;
};

// ---------- LivePulse ----------
const LivePulse = ({ label = "Live" }) => (
  <span className="live"><span className="dot"/>{label}</span>
);

// ---------- TxPill ----------
const TxPill = ({ hash, label }) => (
  <a className="tx-pill" href={`https://testnet.arcscan.app/tx/${hash}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
    <span>{label || D.truncHash(hash)}</span>
    <Icon name="link" size={10} />
  </a>
);

// ---------- Balance display ----------
const BalanceDisplay = ({ amount, label, sub }) => (
  <div className="balance">
    {label && <div className="kpi-label" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' }}>{label}</div>}
    <div className="big">
      <span>{D.fmtUSDC(amount)}</span><span className="ccy">USDC</span>
    </div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

// ---------- Reputation badge ----------
const ReputationBadge = ({ score, size = "" }) => {
  if (score === null || score === undefined) return null;
  const cls = D.scoreColor(score);
  return <span className={`rep-badge ${cls} ${size === 'lg' ? 'rep-badge-lg' : ''}`}>{score}</span>;
};

// ---------- Ticker number (smoothly interpolates) ----------
const Ticker = ({ value, decimals = 0, speed = 1 }) => {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(0);
  const startRef = useRef({ val: value, at: 0 });
  useEffect(() => {
    startRef.current = { val: display, at: performance.now() };
    const duration = 400 / speed;
    const from = display, to = value;
    const animate = (now) => {
      const t = Math.min(1, (now - startRef.current.at) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * ease;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [value, speed]);
  const fmt = decimals === 0 ? Math.round(display).toLocaleString('en-US') : display.toFixed(decimals);
  return <span className="num">{fmt}</span>;
};

// ---------- Signal card ----------
const SignalCard = ({ sig, onBuy, animClass }) => {
  const ttlCountdown = useTTL(sig.ttl, sig.createdAt);
  return (
    <div className={`signal ${animClass || ''} ${sig.sold ? 'sold' : ''}`}>
      <div className="col g4">
        <div className="sym">{sig.sym}</div>
        <div className="row g6">
          <span className="pill pill-blue">{sig.horizon}</span>
          <span className={`pill ${D.tierPill(sig.tier)}`}>{sig.tier}</span>
        </div>
      </div>
      <div className="score-cell">
        <ReputationBadge score={sig.score} />
      </div>
      <div className="col g4">
        <div className="mono-s t3">ttl</div>
        <div className="mono-s" style={{ color: ttlCountdown < 30 ? 'var(--warn)' : 'var(--text-2)' }}>{D.formatTTL(ttlCountdown)}</div>
      </div>
      <div className="pub">
        <Avatar id={sig.publisher} size="sm"/>
        <span className="pub-name mono-s">{sig.publisher}</span>
      </div>
      <div className="actions">
        <div className="price-pill">{sig.price.toFixed(4)} <span className="t3">USDC</span></div>
        {sig.sold
          ? <button className="btn btn-secondary" disabled>Sold out</button>
          : <button className="btn btn-primary" onClick={() => onBuy(sig)}>Subscribe &amp; pay</button>
        }
      </div>
      {sig.sold && <div className="sold-overlay">sold · tx settled</div>}
    </div>
  );
};

// TTL countdown hook
function useTTL(initialSec, createdAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.floor((now - createdAt) / 1000);
  return Math.max(0, initialSec - elapsed);
}

// ---------- Settlement feed item ----------
const SettlementItem = ({ item, isNew }) => (
  <div className={`settle-item ${isNew ? 'new' : ''}`}>
    <div className="flow">
      <Avatar id={item.consumer} size="sm"/>
      <Icon name="arrow-r" size={12} className="arrow"/>
      <Avatar id={item.research} size="sm"/>
    </div>
    <div className="meta">
      <div className="amt">+{item.amount.toFixed(4)} USDC</div>
      <TxPill hash={item.hash} />
    </div>
    <div className="ts">{item.agoLabel}</div>
  </div>
);

// ---------- Chain strip ----------
const ChainStrip = ({ blockNum, nanopayCount, showPaper = true }) => (
  <div className="chain-strip">
    <span className="row g6"><span className="dot"/><strong>Arc Testnet</strong></span>
    <span className="sep">·</span>
    <span>Chain ID <strong>5042002</strong></span>
    <span className="sep">·</span>
    <span>Block <strong className="live-block">#<Ticker value={blockNum}/></strong></span>
    <span className="sep">·</span>
    <span>Explorer <strong>testnet.arcscan.app</strong></span>
    <div className="right">
      {showPaper && <span style={{ color: 'var(--warn)' }}>artifact-only demo — no mainnet</span>}
      <span><Ticker value={nanopayCount}/> real transfers logged</span>
    </div>
  </div>
);

// ---------- Top nav ----------
const TopNav = ({ active, onNav, connectedAgent = 'consumer_01' }) => (
  <div className="topnav">
    <a className="brand" href="/">
      <span className="brand-mark"/>
      <span>TTM Agent Market</span>
    </a>
    <nav aria-label="Primary">
      <a
        className={active==='landing' ? 'active' : ''}
        href="/"
        onClick={(event) => {
          if (active === 'landing') {
            event.preventDefault();
            onNav('landing');
          }
        }}
      >
        Pitch
      </a>
      <a href="/ops/">Marketplace</a>
      <a href="/ops/#agents">Agents</a>
      <a
        className={active==='architecture' ? 'active' : ''}
        href="#architecture"
        onClick={(event) => {
          event.preventDefault();
          onNav('architecture');
        }}
      >
        Architecture
      </a>
      <a
        className={active==='about' ? 'active' : ''}
        href="#about"
        onClick={(event) => {
          event.preventDefault();
          onNav('about');
        }}
      >
        About
      </a>
      <a href="/pitch-video.html">90s Deck</a>
      <a href="/api/hackathon/summary" target="_blank" rel="noreferrer">Proof JSON</a>
      <a href="/docs" target="_blank" rel="noreferrer">Swagger</a>
      <a href="https://github.com/martinlofranodeoliveira/ToTheMoonTokens" target="_blank" rel="noreferrer"><Icon name="github" size={12}/> GitHub</a>
    </nav>
    <div className="right">
      <LivePulse label="Connected"/>
      <span className="testnet-badge">Arc Testnet</span>
      <div className="row g6" style={{ paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
        <Avatar id={connectedAgent} size="sm"/>
        <span className="mono-s t2">{connectedAgent}</span>
      </div>
    </div>
  </div>
);

// ---------- Empty state ----------
const EmptyState = ({ title = "No data", desc = "Try again in a moment.", cta, onCta, icon = "folder" }) => (
  <div className="empty">
    <div className="glyph"><Icon name={icon} size={22}/></div>
    <h4>{title}</h4>
    <p>{desc}</p>
    {cta && <button className="btn btn-secondary" onClick={onCta}>{cta}</button>}
  </div>
);

// ---------- Skeleton rows ----------
const SkeletonSignal = () => (
  <div className="signal" style={{ pointerEvents: 'none' }}>
    <div className="col g8" style={{ width: '100%' }}>
      <div className="sk" style={{ height: 14, width: '60%' }}/>
      <div className="sk" style={{ height: 18, width: '40%' }}/>
    </div>
    <div className="sk" style={{ height: 28, width: 28, borderRadius: '50%' }}/>
    <div className="sk" style={{ height: 14, width: '70%' }}/>
    <div className="sk" style={{ height: 20, width: '80%' }}/>
    <div className="row g8">
      <div className="sk" style={{ height: 28, width: 100 }}/>
      <div className="sk" style={{ height: 36, width: 120 }}/>
    </div>
  </div>
);

// ---------- JSON pretty print ----------
const JsonView = ({ data }) => {
  const stringify = (val, indent = 0) => {
    const pad = '  '.repeat(indent);
    if (val === null) return <span className="bool">null</span>;
    if (typeof val === 'boolean') return <span className="bool">{String(val)}</span>;
    if (typeof val === 'number') return <span className="num">{val}</span>;
    if (typeof val === 'string') return <span className="str">"{val}"</span>;
    if (Array.isArray(val)) {
      return <>[{val.map((v, i) => <div key={i}>{'  '.repeat(indent+1)}{stringify(v, indent+1)}{i<val.length-1?',':''}</div>)}{pad}]</>;
    }
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      return <>{'{'}{keys.map((k, i) => (
        <div key={k}>{'\u00A0\u00A0'.repeat(indent+1)}<span className="key">"{k}"</span>: {stringify(val[k], indent+1)}{i<keys.length-1?',':''}</div>
      ))}<div>{'\u00A0\u00A0'.repeat(indent)}{'}'}</div></>;
    }
    return String(val);
  };
  return <pre className="json">{stringify(data)}</pre>;
};

// ---------- Modal shell ----------
const Modal = ({ onClose, children }) => {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
};

// Sparkline
const Sparkline = ({ points, color = 'var(--arc-blue)' }) => {
  const w = 280, h = 64;
  const min = Math.min(...points), max = Math.max(...points);
  const range = Math.max(0.0001, max - min);
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - 4 - ((p - min) / range) * (h - 8);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#sparkGrad)"/>
      <path d={path} stroke={color} strokeWidth="1.5" fill="none"/>
    </svg>
  );
};

Object.assign(window, {
  Icon, Avatar, LivePulse, TxPill, BalanceDisplay, ReputationBadge,
  SignalCard, SettlementItem, ChainStrip, TopNav,
  EmptyState, SkeletonSignal, JsonView, Modal, Ticker, Sparkline,
});
