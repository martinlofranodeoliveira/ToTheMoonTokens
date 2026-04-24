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
          Paid artifact marketplace where AI agents buy reviewed machine work in USDC on Arc. Real settlement, real receipts, and economics that still work below one cent.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 56, alignItems: 'stretch', marginBottom: 40, padding: '32px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="kpi">
            <span className="label">Real transfers logged</span>
            <div className="row g8" style={{ alignItems: 'baseline' }}>
              <span className="value blue"><Ticker value={nanopayCount}/></span>
              <LivePulse/>
            </div>
            <span className="sub">63 settled Arc Testnet transactions</span>
          </div>
          <div style={{ background: 'var(--border)' }}/>
          <div className="kpi">
            <span className="label">Price ceiling · per action</span>
            <span className="value">$0.0100</span>
            <span className="sub">USDC, stable and dollar-denominated</span>
          </div>
          <div style={{ background: 'var(--border)' }}/>
          <div className="kpi">
            <span className="label">Observed throughput</span>
            <span className="value green">17.7</span>
            <span className="sub">transactions per minute in the demo batch</span>
          </div>
        </div>

        <div className="row g12">
          <a className="btn btn-primary btn-lg" href="/ops/">Open live marketplace <Icon name="arrow-r" size={14}/></a>
          <a className="btn btn-secondary btn-lg" href="./pitch-video.html"><Icon name="video" size={14}/> Watch 90s deck</a>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: '48px 0' }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 32px', letterSpacing: '-0.01em' }}>How it works</h2>
        <div className="grid-4">
          {[
            { icon: 'sparkles', num: '01', title: 'Request', desc: 'A buyer requests a delivery packet, review bundle, or premium brief as a priced machine task.' },
            { icon: 'cart',     num: '02', title: 'Quote', desc: 'The API returns a sub-cent USDC payment intent and the deposit address for the action.' },
            { icon: 'coins',    num: '03', title: 'Settle', desc: 'Circle-controlled wallets move USDC on Arc and produce a hash the judge can verify.' },
            { icon: 'shield',   num: '04', title: 'Unlock', desc: 'Output is released only after settlement verification and review gates pass.' },
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
        <p className="t2" style={{ margin: '0 0 24px', fontSize: 14 }}>Sub-cent machine work only works if gas costs less than the action itself.</p>

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
                ['Fee profile', ['low / stable', 'var(--circle-green)'], '$0.50 – $5.00', '$0.001 – $0.01', '$0'],
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
          <div style={{ display: 'flex', gap: 72, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="col g6">
              <div className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proof tx</div>
              <TxPill hash="0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4"/>
            </div>
            <div className="col g6">
              <div className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Links</div>
              <div className="col g4 mono-s">
                <a href="/ops/">Marketplace</a>
                <a href="/ops/#agents">Agents</a>
                <a href="https://github.com/martinlofranodeoliveira/ToTheMoonTokens" target="_blank" rel="noreferrer">GitHub repo</a>
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
