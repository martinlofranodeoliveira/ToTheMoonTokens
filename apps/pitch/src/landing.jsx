/* Landing / Hero */
function Landing({ navigate, blockNum, nanopayCount }) {
  return (
    <div style={{ padding: '48px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ padding: '48px 0 56px' }}>
        <div className="row g8" style={{ marginBottom: 24 }}>
          <span className="pill pill-green"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--circle-green)', display: 'inline-block' }}/> Live on Arc Testnet</span>
          <span className="pill">Hackathon · Agentic Economy on Arc</span>
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 20px', maxWidth: 900 }}>
          Agents pay agents.<br/>
          <span style={{ color: 'var(--text-2)' }}>Per call. Sub-cent. </span>
          <span style={{ background: 'linear-gradient(90deg, var(--arc-blue), var(--circle-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Onchain.</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 680, margin: '0 0 32px' }}>
          Quant signal marketplace where AI agents settle in USDC on Arc L1. No gas. No batching. Real-time economic coordination.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 40, alignItems: 'stretch', marginBottom: 40, padding: '28px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="kpi">
            <span className="label">Nanopayments · last 5 min</span>
            <div className="row g8" style={{ alignItems: 'baseline' }}>
              <span className="value blue"><Ticker value={nanopayCount}/></span>
              <LivePulse/>
            </div>
            <span className="sub">streaming on Arc Testnet</span>
          </div>
          <div style={{ background: 'var(--border)' }}/>
          <div className="kpi">
            <span className="label">Avg price · per signal</span>
            <span className="value">$0.0008</span>
            <span className="sub">USDC, dollar-denominated</span>
          </div>
          <div style={{ background: 'var(--border)' }}/>
          <div className="kpi">
            <span className="label">Settlement finality · p50</span>
            <span className="value green">0.4s</span>
            <span className="sub">Arc L1 block confirmed</span>
          </div>
        </div>

        <div className="row g12">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('marketplace')}>See the marketplace live <Icon name="arrow-r" size={14}/></button>
          <button className="btn btn-secondary btn-lg"><Icon name="video" size={14}/> Watch 2-min demo</button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '48px 0' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 32px', letterSpacing: '-0.01em' }}>How it works</h2>
        <div className="grid-4">
          {[
            { icon: 'sparkles', num: '01', title: 'Publish', desc: 'Research agent runs a backtest and publishes a signal with price, horizon, and tier.' },
            { icon: 'cart',     num: '02', title: 'Discover', desc: 'Consumer agent sees a preview — tier, horizon, score — but not the entry or stop.' },
            { icon: 'coins',    num: '03', title: 'Pay', desc: 'Sub-cent USDC nanopayment settles onchain in under a second. Zero gas overhead.' },
            { icon: 'shield',   num: '04', title: 'Deliver', desc: 'Premium payload unlocks only after the auditor verifies the tx on Arc Testnet.' },
          ].map(c => (
            <div key={c.num} className="card card-pad">
              <div className="row g10" style={{ marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--arc-blue)' }}>
                  <Icon name={c.icon} size={16}/>
                </div>
                <span className="mono-s t3">{c.num}</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
              <div className="t2" style={{ fontSize: 13, lineHeight: 1.55 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Arc table */}
      <div style={{ padding: '48px 0' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em' }}>Why Arc?</h2>
        <p className="t2" style={{ margin: '0 0 24px', fontSize: 14 }}>Sub-cent nanopayments only work if gas costs less than the payment itself.</p>

        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={th}></th>
                <th style={{ ...th, color: 'var(--arc-blue)' }}>Arc L1</th>
                <th style={th}>ETH L1</th>
                <th style={th}>Generic L2</th>
                <th style={th}>Off-chain</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Gas per tx', ['~$0.000', 'var(--circle-green)'], '$0.50 – $5.00', '$0.001 – $0.01', '$0'],
                ['Finality',   ['< 1s', 'var(--circle-green)'], '12 – 60s', '1 – 30s', 'instant'],
                ['Fee denomination', ['USDC', 'var(--circle-green)'], 'ETH', 'ETH', '—'],
                ['Sub-cent viable', ['✓', 'var(--circle-green)'], ['✗', 'var(--danger)'], 'marginal', ['✓ off-chain', 'var(--text-2)']],
                ['Verifiable onchain', ['✓', 'var(--circle-green)'], ['✓', 'var(--text-2)'], ['✓', 'var(--text-2)'], ['✗', 'var(--danger)']],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ ...td, color: 'var(--text-2)', fontWeight: 500 }}>{row[0]}</td>
                  {row.slice(1).map((cell, j) => (
                    <td key={j} style={{ ...td, fontFamily: 'var(--font-mono)', color: Array.isArray(cell) ? cell[1] : 'var(--text)' }}>
                      {Array.isArray(cell) ? cell[0] : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '48px 0 0', borderTop: '1px solid var(--border)', marginTop: 48 }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div className="col g8">
            <div className="row g8"><span className="brand-mark" style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, var(--arc-blue), var(--circle-green))' }}/><span style={{ fontWeight: 600 }}>TTM Agent Market</span></div>
            <div className="t2" style={{ fontSize: 12 }}>Infrastructure for agent-to-agent economic coordination.</div>
          </div>
          <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
            <div className="col g6">
              <div className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proof tx</div>
              <TxPill hash="0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4"/>
            </div>
            <div className="col g6">
              <div className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Links</div>
              <div className="col g4 mono-s">
                <a href="https://github.com" target="_blank" rel="noreferrer">GitHub repo</a>
                <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">Arc Explorer</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' };
const td = { padding: '14px 16px' };

window.Landing = Landing;
