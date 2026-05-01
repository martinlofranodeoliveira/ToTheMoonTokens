/* Agent Dashboard */
const { useState: useStateD } = React;

function Dashboard({ state, navigate }) {
  const [agentId, setAgentId] = useStateD('research_02');
  const agent = window.TTM.AGENTS.find(a => a.id === agentId) || window.TTM.AGENTS[1];

  const isResearch = agent.role === 'research';
  const isConsumer = agent.role === 'consumer';
  const isTreasury = agent.role === 'treasury';

  const sparkPoints = Array.from({ length: 48 }, (_, i) => {
    const base = isResearch ? 0.7 + i*0.004 : 19989 - i*0.5;
    return base + Math.sin(i * 0.4) * (isResearch ? 0.05 : 8) + (window.TTM.hashStr(agent.id + i) % 100) / (isResearch ? 1200 : 25);
  });

  if (state === 'loading') {
    return <div style={{ padding: '40px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="sk" style={{ height: 80, marginBottom: 20 }}/>
      <div className="grid-2" style={{ gap: 16 }}>{[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 260 }}/>)}</div>
    </div>;
  }

  return (
    <div style={{ padding: '28px 32px 64px', maxWidth: 1240, margin: '0 auto' }}>
      {/* Agent picker row */}
      <div className="row g8" style={{ marginBottom: 24, overflowX: 'auto', padding: '4px 0' }}>
        {window.TTM.AGENTS.map(a => (
          <button key={a.id} className={`btn ${a.id === agentId ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ height: 36, borderColor: a.id === agentId ? 'var(--arc-blue)' : undefined, color: a.id === agentId ? 'var(--text)' : 'var(--text-2)' }}
            onClick={() => setAgentId(a.id)}>
            <Avatar id={a.id} size="sm"/>
            <span className="mono-s">{a.id}</span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="row g16">
          <Avatar id={agent.id} size="xl"/>
          <div className="col g8" style={{ flex: 1 }}>
            <div className="row g10">
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{agent.id}</h1>
              <span className={`pill ${window.TTM.roleColor(agent.role)}`}>{agent.role}</span>
              <LivePulse label="Active"/>
            </div>
            <div className="row g12 mono-s t2">
              <span className="row g6"><Icon name="wallet" size={11}/><span className="mono">{agent.address}</span><button className="btn btn-ghost" style={{ height: 20, padding: 0, color: 'var(--text-3)' }}><Icon name="copy" size={11}/></button></span>
              <span className="t3">·</span>
              <span>Joined 14d ago</span>
              <span className="t3">·</span>
              <span className="row g4"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--circle-green)' }}/>synced to block #1,234,567</span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('payment')}>Open latest payment flow <Icon name="arrow-r" size={12}/></button>
        </div>
      </div>

      {/* 4 quadrants */}
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Q1 balance */}
        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Balance &amp; flow</span>
            <span className="mono-s t3">24h</span>
          </div>
          <BalanceDisplay amount={agent.balance} sub={`≈ $${agent.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}/>
          <div className="row g16" style={{ marginTop: 14, marginBottom: 14 }}>
            {isResearch && <div className="col g4"><span className="mono-s t3">REVENUE 24H</span><span className="mono" style={{ fontSize: 14, color: 'var(--circle-green)' }}>+{agent.revenue24?.toFixed(4)} USDC</span></div>}
            {isConsumer && <div className="col g4"><span className="mono-s t3">SPEND 24H</span><span className="mono" style={{ fontSize: 14, color: 'var(--danger)' }}>-{agent.spend24?.toFixed(4)} USDC</span></div>}
            {isTreasury && <div className="col g4"><span className="mono-s t3">REBALANCES 24H</span><span className="mono" style={{ fontSize: 14 }}>3 events</span></div>}
            <div className="col g4"><span className="mono-s t3">TXNS 24H</span><span className="mono" style={{ fontSize: 14 }}>{isResearch ? 142 : isConsumer ? 318 : 21}</span></div>
            <div className="col g4"><span className="mono-s t3">AVG / TX</span><span className="mono" style={{ fontSize: 14 }}>0.0009 USDC</span></div>
          </div>
          <Sparkline points={sparkPoints} color={isResearch ? 'var(--circle-green)' : isConsumer ? 'var(--danger)' : 'var(--arc-blue)'}/>
        </div>

        {/* Q2 rep / wallet health */}
        <div className="card card-pad">
          {!isTreasury && agent.rep != null ? (
            <>
              <div className="row between" style={{ marginBottom: 18 }}>
                <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reputation</span>
                <span className="mono-s t3">score 0–100</span>
              </div>
              <div className="row g24">
                <div className="col g8" style={{ alignItems: 'center' }}>
                  <ReputationBadge score={agent.rep} size="lg"/>
                  <span className="mono-s t3">overall</span>
                </div>
                <RadarChart values={{ trend: 78, range: 62, vol: 71 }}/>
              </div>
              <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div className="mono-s t3" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last 5 signals</div>
                <div className="col g4">
                  {[
                    { sym: 'BTCUSDT', horizon: '1h', outcome: 'hit' },
                    { sym: 'ETHUSDT', horizon: '15m', outcome: 'hit' },
                    { sym: 'SOLUSDT', horizon: '1d', outcome: 'miss' },
                    { sym: 'ARBUSDT', horizon: '1h', outcome: 'pending' },
                    { sym: 'AVAXUSDT', horizon: '4h', outcome: 'hit' },
                  ].map((s, i) => (
                    <div key={i} className="row between" style={{ padding: '6px 0', borderBottom: i < 4 ? '1px dashed var(--border)' : 'none' }}>
                      <span className="mono-s">{s.sym}</span>
                      <span className="pill">{s.horizon}</span>
                      <span className={`mono-s pill ${s.outcome === 'hit' ? 'pill-green' : s.outcome === 'miss' ? 'pill-high' : 'pill-med'}`}>{s.outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="row between" style={{ marginBottom: 14 }}>
                <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Wallet health</span>
                <span className="pill pill-green">8 of 8 healthy</span>
              </div>
              <div className="col g4">
                {['research_01','research_02','research_03','research_04','research_05','consumer_01','consumer_02','auditor_01'].map((w, i) => (
                  <div key={w} className="row between" style={{ padding: '8px 0', borderBottom: i < 7 ? '1px dashed var(--border)' : 'none' }}>
                    <div className="row g8"><Avatar id={w} size="sm"/><span className="mono-s">{w}</span></div>
                    <span className="mono-s t2">{(0.3 + (i * 0.21) % 2.2).toFixed(4)} USDC</span>
                    <span className={`pill ${i === 3 ? 'pill-med' : 'pill-green'}`}>{i === 3 ? 'below floor' : 'healthy'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Q3 activity */}
        <div className="card">
          <div className="card-header row between">
            <span>Recent activity</span>
            <LivePulse/>
          </div>
          <div style={{ padding: 4 }}>
            {[
              { t: 'signal_published', desc: 'BTCUSDT · 1h · med', ago: '12s ago', pill: 'pill-blue' },
              { t: 'signal_sold',      desc: 'ETHUSDT sold to consumer_01', price: '0.0012 USDC', ago: '28s ago', hash: window.TTM.randomHash(), pill: 'pill-green' },
              { t: 'payment_received', desc: 'from consumer_02', price: '0.0008 USDC', ago: '41s ago', hash: window.TTM.randomHash(), pill: 'pill-green' },
              { t: 'signal_published', desc: 'SOLUSDT · 15m · low', ago: '1m ago', pill: 'pill-blue' },
              { t: 'signal_expired',   desc: 'ARBUSDT expired without buyer', ago: '2m ago', pill: 'pill' },
              { t: 'signal_sold',      desc: 'AVAXUSDT sold to consumer_07', price: '0.0021 USDC', ago: '2m ago', hash: window.TTM.randomHash(), pill: 'pill-green' },
              { t: 'signal_published', desc: 'LINKUSDT · 1d · high', ago: '3m ago', pill: 'pill-blue' },
              { t: 'payment_received', desc: 'from consumer_11', price: '0.0005 USDC', ago: '4m ago', hash: window.TTM.randomHash(), pill: 'pill-green' },
            ].map((e, i) => (
              <div key={i} className="row" style={{ padding: '10px 14px', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', gap: 10 }}>
                <span className={`pill ${e.pill}`} style={{ fontSize: 10, minWidth: 110, justifyContent: 'center' }}>{e.t}</span>
                <span className="mono-s t2" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.desc}</span>
                {e.price && <span className="mono-s" style={{ color: 'var(--circle-green)' }}>+{e.price}</span>}
                {e.hash && <TxPill hash={e.hash}/>}
                <span className="mono-s t3" style={{ minWidth: 56, textAlign: 'right' }}>{e.ago}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Q4 config / rebalance */}
        <div className="card card-pad">
          {!isTreasury ? (
            <>
              <div className="row between" style={{ marginBottom: 14 }}>
                <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Configuration</span>
                <button className="btn btn-ghost" style={{ height: 26 }}><Icon name="settings" size={12}/> Edit</button>
              </div>
              <div className="col g12">
                <div>
                  <div className="mono-s t3" style={{ marginBottom: 8 }}>PRICING TIERS</div>
                  <div className="col g4">
                    {[
                      { tier: 'base', price: 0.0005, features: '1h + 4h horizons' },
                      { tier: 'premium', price: 0.0012, features: 'adds 15m, tier=med', active: true },
                      { tier: 'realtime', price: 0.0030, features: 'adds 1m, tier=high' },
                    ].map(p => (
                      <div key={p.tier} className="row between" style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: p.active ? 'rgba(46,107,255,0.05)' : 'transparent', borderColor: p.active ? 'rgba(46,107,255,0.3)' : undefined }}>
                        <div className="col g4">
                          <span className="mono-s" style={{ fontWeight: 500 }}>{p.tier} {p.active && <span className="pill pill-blue" style={{ marginLeft: 6 }}>active</span>}</span>
                          <span className="mono-s t3">{p.features}</span>
                        </div>
                        <span className="mono">{p.price.toFixed(4)} USDC</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div className="mono-s t3" style={{ marginBottom: 8 }}>RATE LIMITS</div>
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="col g4"><span className="mono-s t3">per hour</span><span className="mono">max 30 signals</span></div>
                    <div className="col g4"><span className="mono-s t3">price floor</span><span className="mono">0.0003 USDC</span></div>
                    <div className="col g4"><span className="mono-s t3">price ceiling</span><span className="mono">0.0050 USDC</span></div>
                    <div className="col g4"><span className="mono-s t3">ttl default</span><span className="mono">180s</span></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="row between" style={{ marginBottom: 14 }}>
                <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rebalance history</span>
              </div>
              <div className="col g4">
                {[
                  { ago: '14m ago', from: 'treasury', to: 'research_04', amt: 0.1500, reason: 'below floor' },
                  { ago: '1h ago', from: 'treasury', to: 'research_02', amt: 0.0800, reason: 'scheduled' },
                  { ago: '3h ago', from: 'treasury', to: 'consumer_07', amt: 5.0000, reason: 'topup' },
                  { ago: '9h ago', from: 'treasury', to: 'research_01', amt: 0.2100, reason: 'below floor' },
                  { ago: '1d ago', from: 'treasury', to: 'auditor_01', amt: 100.0000, reason: 'scheduled' },
                ].map((r, i) => (
                  <div key={i} className="row between" style={{ padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                    <div className="row g8"><Avatar id={r.to} size="sm"/><span className="mono-s">→ {r.to}</span></div>
                    <span className="mono-s t2">{r.reason}</span>
                    <span className="mono-s" style={{ color: 'var(--circle-green)' }}>+{r.amt.toFixed(4)}</span>
                    <span className="mono-s t3">{r.ago}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarChart({ values }) {
  const cx = 70, cy = 70, r = 56;
  const axes = [
    { key: 'trend', label: 'trend', angle: -Math.PI/2 },
    { key: 'range', label: 'range', angle: Math.PI/6 },
    { key: 'vol',   label: 'vol',   angle: 5*Math.PI/6 },
  ];
  const pt = (angle, dist) => ({ x: cx + Math.cos(angle) * r * dist, y: cy + Math.sin(angle) * r * dist });
  const points = axes.map(a => pt(a.angle, values[a.key] / 100));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" style={{ flexShrink: 0 }}>
      {[0.33, 0.66, 1].map(lvl => (
        <polygon key={lvl}
          points={axes.map(a => { const p = pt(a.angle, lvl); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth="1"/>
      ))}
      {axes.map(a => {
        const end = pt(a.angle, 1);
        return <line key={a.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth="1"/>;
      })}
      <path d={pathD} fill="rgba(46,107,255,0.2)" stroke="var(--arc-blue)" strokeWidth="1.5"/>
      {axes.map(a => {
        const end = pt(a.angle, 1.18);
        return <text key={a.key} x={end.x} y={end.y} fill="var(--text-3)" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" dominantBaseline="middle">{a.label} {values[a.key]}</text>;
      })}
    </svg>
  );
}

window.Dashboard = Dashboard;
