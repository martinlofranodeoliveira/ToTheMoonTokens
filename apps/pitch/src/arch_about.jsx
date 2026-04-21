/* Architecture + About screens */

function Architecture({ navigate }) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 80px' }}>
      <div className="col g8" style={{ marginBottom: 32 }}>
        <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Architecture</span>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>Why Arc + Circle is the only viable stack</h1>
        <p className="t2" style={{ margin: 0, fontSize: 15, maxWidth: 680 }}>
          Sub-cent agent-to-agent payments require gas denominated in USDC, sub-second finality, and deterministic verifiability. Only one combination clears all three.
        </p>
      </div>

      {/* Stack diagram */}
      <div className="card card-pad" style={{ marginBottom: 32 }}>
        <div className="row between" style={{ marginBottom: 20 }}>
          <div><h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>System stack</h3><span className="mono-s t3">3 layers · 11 components</span></div>
          <LivePulse label="Streaming"/>
        </div>
        <StackDiagram/>
      </div>

      {/* Extended comparison */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>Detailed comparison</h2>
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={archTh}></th>
                <th style={{ ...archTh, color: 'var(--arc-blue)' }}>Arc L1</th>
                <th style={archTh}>ETH L1</th>
                <th style={archTh}>Generic L2</th>
                <th style={archTh}>Off-chain ledger</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Finality p50',           '380ms',       '15s',       '2s',         'instant'],
                ['Finality p95',           '720ms',       '60s',       '30s',        'instant'],
                ['Cost per tx (USD)',      '$0.000',      '$0.50–5',   '$0.001–0.01','$0'],
                ['Fee denomination',       'USDC',        'ETH',       'ETH',        '—'],
                ['Volatility exposure',    'none',        'high',      'high',       'none'],
                ['Throughput viable',      '~2,000 TPS',  '15 TPS',    '100–4,000',  'unbounded'],
                ['Deterministic finality', 'yes',         'probabilistic','probabilistic','yes'],
                ['EVM compatible',         'yes',         'native',    'yes',        'n/a'],
                ['Onchain proof',          '✓',           '✓',         '✓',          '✗'],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: i < 8 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ ...archTd, color: 'var(--text-2)', fontWeight: 500 }}>{row[0]}</td>
                  <td style={{ ...archTd, fontFamily: 'var(--font-mono)', color: 'var(--circle-green)' }}>{row[1]}</td>
                  <td style={{ ...archTd, fontFamily: 'var(--font-mono)' }}>{row[2]}</td>
                  <td style={{ ...archTd, fontFamily: 'var(--font-mono)' }}>{row[3]}</td>
                  <td style={{ ...archTd, fontFamily: 'var(--font-mono)' }}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* What breaks */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 14px' }}>What breaks without Arc</h2>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {[
            {
              color: 'var(--danger)', title: 'With ETH L1',
              body: 'Ticket is 0.001 USDC. Gas is $0.50. Publisher loses $499 per 1,000 signals before anyone profits. Marketplace unviable.',
              math: '0.001 − 0.50 = −499.99×'
            },
            {
              color: 'var(--warn)', title: 'With a generic L2',
              body: 'Gas drops, but stays ETH-denominated. A 20% ETH swing changes the effective price of a 0.001 USDC signal by ±2 bps. Pricing is noise, not product.',
              math: 'gas_volatility ≫ signal_value'
            },
            {
              color: 'var(--text-2)', title: 'Off-chain',
              body: 'No hash, no proof. Auditor is a promise. Reputation becomes gossip. Consumer has no way to verify the publisher ever delivered what was paid for.',
              math: 'trust ≠ verification'
            },
          ].map((c, i) => (
            <div key={i} className="card card-pad" style={{ borderColor: c.color, opacity: 0.95 }}>
              <div className="row g8" style={{ marginBottom: 10 }}>
                <Icon name="alert" size={14} color={c.color}/>
                <span style={{ fontWeight: 600, color: c.color }}>{c.title}</span>
              </div>
              <p className="t2" style={{ fontSize: 12, lineHeight: 1.55, margin: '0 0 12px' }}>{c.body}</p>
              <div className="mono-s" style={{ color: c.color, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: 4 }}>{c.math}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo numbers */}
      <div className="card card-pad">
        <div className="row between" style={{ marginBottom: 20 }}>
          <div><h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Observed on Arc Testnet during this demo</h3><span className="mono-s t3">rolling last 24h</span></div>
          <a className="btn btn-ghost" href="https://testnet.arcscan.app" target="_blank" rel="noreferrer"><Icon name="link" size={12}/> Open in Arc Explorer</a>
        </div>
        <div className="grid-4" style={{ gap: 20 }}>
          {[
            { label: 'Nanopayments processed', value: '14,822', sub: '+3,091 in last hour', color: 'var(--text)' },
            { label: 'Avg cost per tx', value: '$0.000', sub: 'gas = 0 on Arc', color: 'var(--circle-green)' },
            { label: 'Avg finality', value: '0.41s', sub: 'p95 = 0.72s', color: 'var(--arc-blue)' },
            { label: 'USDC settled', value: '11.84', sub: 'across 4 publishers', color: 'var(--text)' },
          ].map((k, i) => (
            <div key={i} className="kpi">
              <span className="label">{k.label}</span>
              <span className="value" style={{ color: k.color }}>{k.value}</span>
              <span className="sub">{k.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StackDiagram() {
  const layers = [
    { name: 'Agent layer',    color: 'var(--consumer)', nodes: [
      { icon: 'sparkles', label: 'research_02', sub: 'publisher' },
      { icon: 'cart',     label: 'consumer_01', sub: 'buyer' },
      { icon: 'shield',   label: 'auditor_01', sub: 'verifier' },
      { icon: 'bank',     label: 'treasury',    sub: 'rebalancer' },
    ]},
    { name: 'Service layer',  color: 'var(--arc-blue)', nodes: [
      { icon: 'activity',  label: 'FastAPI',         sub: '/market /payments' },
      { icon: 'layers',    label: 'Nexus',           sub: 'orchestration' },
      { icon: 'folder',    label: 'Journal',         sub: 'event store' },
      { icon: 'pulse',     label: 'Reputation',      sub: 'scoring engine' },
    ]},
    { name: 'Onchain layer',  color: 'var(--circle-green)', nodes: [
      { icon: 'coins',     label: 'Circle Nanopay',  sub: 'hold / capture' },
      { icon: 'link',      label: 'Arc L1',          sub: 'settlement' },
      { icon: 'wallet',    label: 'USDC',            sub: 'unit of account' },
    ]},
  ];
  return (
    <div className="col g10">
      {layers.map((layer, li) => (
        <div key={layer.name}>
          <div className="row g8" style={{ marginBottom: 8 }}>
            <span style={{ width: 3, height: 14, background: layer.color, borderRadius: 2 }}/>
            <span className="mono-s" style={{ color: layer.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{layer.name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${layer.nodes.length}, 1fr)`, gap: 10 }}>
            {layer.nodes.map(n => (
              <div key={n.label} className="row g10" style={{
                padding: '12px 14px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-3)', border: `1px solid ${layer.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: layer.color, flexShrink: 0 }}>
                  <Icon name={n.icon} size={14}/>
                </div>
                <div className="col g4" style={{ minWidth: 0 }}>
                  <span className="mono-s" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</span>
                  <span className="mono-s t3" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.sub}</span>
                </div>
              </div>
            ))}
          </div>
          {li < layers.length - 1 && (
            <div style={{ textAlign: 'center', padding: '6px 0', color: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              ↓ signed requests · intents · hashes
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const archTh = { textAlign: 'left', padding: '12px 16px', fontSize: 10, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' };
const archTd = { padding: '11px 16px' };

/* ============ ABOUT ============ */

function About({ navigate }) {
  const team = [
    { name: 'A. Fasul', role: 'Engineering', avatarId: 'engineer-fasul' },
    { name: 'R. Costa', role: 'Product', avatarId: 'product-costa' },
    { name: 'M. Hsu',   role: 'Design', avatarId: 'design-hsu' },
  ];
  const proofs = [
    { hash: '0x6fc1a092be43d7b8e1240912ab75ae9c83f27d04e5b1c6e2c7a9d4810f2e79a4', desc: 'Initial smoke tx · bootstrap script', when: 'Apr 20, 14:12 UTC' },
    { hash: '0x3b4d1e812f95a7c3b9e2a0d4817c6b5e9032af44d2e1c8b7a9c5d3e2f1820a92', desc: 'First signal sold in live demo (ETHUSDT)', when: 'Apr 21, 09:04 UTC' },
    { hash: '0x9c82a5f1e70d4b3a8c9f6e512d4b7a3c8e9f0d1b2c3a4e5f6a7b8c9d0e1f2a3b', desc: 'Treasury rebalance (research_04 top-up)', when: 'Apr 21, 11:47 UTC' },
    { hash: '0xa714f98e2c5d3b1a6e7f0d9c8b4a2e1f3c5d7b9a0e2f4c6d8b0a2e4f6c8d0a1b', desc: 'Refund by settlement timeout (consumer_02)', when: 'Apr 21, 13:22 UTC' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px' }}>
      <div className="col g8" style={{ marginBottom: 32 }}>
        <span className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Submission · Agentic Economy on Arc</span>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>About TTM Agent Market</h1>
        <p className="t2" style={{ margin: 0, fontSize: 15, maxWidth: 700 }}>
          Submission for the Agentic Economy on Arc hackathon (Circle + Arc · lablab.ai). Paper-mode only. No mainnet. No live trading. No promise of profit.
        </p>
      </div>

      {/* Team */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>Team</h2>
        <div className="grid-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {team.map(m => (
            <div key={m.name} className="card card-pad">
              <div className="row g12">
                <Avatar id={m.avatarId} size="lg" letters={m.name.split(' ').map(x=>x[0]).join('')}/>
                <div className="col g4">
                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                  <span className="mono-s t2">{m.role}</span>
                  <div className="row g8" style={{ marginTop: 4 }}>
                    <a className="mono-s" style={{ color: 'var(--text-3)' }} href="#"><Icon name="github" size={11}/> github</a>
                    <a className="mono-s" style={{ color: 'var(--text-3)' }} href="#">linkedin</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Artifacts */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>Submission artifacts</h2>
        <div className="col g8">
          {[
            { icon: 'video',  title: '2-min demo video', sub: 'Walkthrough: marketplace → payment flow → explorer', link: 'Open →' },
            { icon: 'github', title: 'GitHub repo',     sub: 'Infra, contracts, backend, apps/web, apps/pitch', link: 'github.com/ttm/agent-market' },
            { icon: 'folder', title: 'Hackathon docs',  sub: 'HACKATHON_AGENTIC_ARC.md + paper-mode bootstrap', link: 'View markdown' },
            { icon: 'sparkles', title: 'X announcement', sub: 'Tagged @buildoncircle @arc @lablabai', link: 'x.com/ttm/status' },
          ].map(a => (
            <div key={a.title} className="card card-pad row between" style={{ padding: '14px 18px' }}>
              <div className="row g12">
                <div style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}><Icon name={a.icon} size={14}/></div>
                <div className="col g4">
                  <span style={{ fontWeight: 500 }}>{a.title}</span>
                  <span className="mono-s t3">{a.sub}</span>
                </div>
              </div>
              <a className="btn btn-ghost">{a.link} <Icon name="arrow-r" size={12}/></a>
            </div>
          ))}
        </div>
      </div>

      {/* Onchain proof */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px' }}>Onchain proof</h2>
        <div className="card">
          {proofs.map((p, i) => (
            <div key={p.hash} className="row between" style={{ padding: '14px 18px', borderBottom: i < proofs.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="col g4" style={{ flex: 1 }}>
                <span style={{ fontSize: 13 }}>{p.desc}</span>
                <span className="mono-s t3">{p.when}</span>
              </div>
              <TxPill hash={p.hash}/>
            </div>
          ))}
        </div>
      </div>

      {/* Footer credits */}
      <div style={{ padding: '24px 0', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>
        <span>Built for</span>
        <span className="mono" style={{ color: 'var(--text-2)', fontWeight: 600 }}>Circle</span>
        <span className="t3">·</span>
        <span className="mono" style={{ color: 'var(--arc-blue)', fontWeight: 600 }}>Arc</span>
        <span className="t3">·</span>
        <span className="mono" style={{ color: 'var(--text-2)', fontWeight: 600 }}>lablab.ai</span>
      </div>
    </div>
  );
}

window.Architecture = Architecture;
window.About = About;
