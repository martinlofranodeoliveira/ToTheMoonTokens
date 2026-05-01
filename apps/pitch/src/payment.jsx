/* Payment Flow Inspector — the wow factor */
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

function PaymentFlow({ state, navigate }) {
  const FLOW = window.TTM.PAYMENT_FLOW;
  const [stepIdx, setStepIdx] = useStateP(5); // 5 = all complete
  const [expanded, setExpanded] = useStateP(new Set([2, 3])); // capture + settle expanded by default
  const [replaying, setReplaying] = useStateP(false);
  const [elapsed, setElapsed] = useStateP(743);
  const [startedAt] = useStateP(Date.now() - 4000);

  const toggleExp = (i) => {
    setExpanded(cur => {
      const n = new Set(cur);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };

  const replay = () => {
    setReplaying(true);
    setStepIdx(0);
    setElapsed(0);
    let total = 0;
    FLOW.forEach((s, i) => {
      total += s.duration;
      setTimeout(() => {
        setStepIdx(i + 1);
        setElapsed(total);
        if (i === FLOW.length - 1) setReplaying(false);
      }, total);
    });
  };

  const stepStatus = (i) => {
    if (i < stepIdx) return 'complete';
    if (i === stepIdx && replaying) return 'active';
    if (state === 'error' && i === 3) return 'failed';
    if (state === 'error' && i > 3) return 'pending';
    return 'pending';
  };

  if (state === 'loading') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div className="sk" style={{ height: 24, width: '60%', marginBottom: 12 }}/>
        <div className="sk" style={{ height: 14, width: '40%', marginBottom: 32 }}/>
        {[0,1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 64, marginBottom: 10 }}/>)}
      </div>
    );
  }

  const isFailure = state === 'error';
  const effectiveStepIdx = isFailure ? 3 : stepIdx;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="row g8 mono-s t3" style={{ marginBottom: 10 }}>
          <a onClick={() => navigate('marketplace')} style={{ cursor: 'pointer' }}>Marketplace</a>
          <Icon name="chevron-right" size={10}/>
          <span>Signals</span>
          <Icon name="chevron-right" size={10}/>
          <span className="mono">sig_a74c9f</span>
          <Icon name="chevron-right" size={10}/>
          <span style={{ color: 'var(--text)' }}>Payment</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Payment flow for intent <span className="mono" style={{ color: 'var(--arc-blue)' }}>0x8f3a…e12b</span>
        </h1>
        <div className="row g12" style={{ marginTop: 12, color: 'var(--text-2)', fontSize: 13 }}>
          <div className="row g6"><Avatar id="consumer_01" size="sm"/><span className="mono-s">consumer_01</span></div>
          <Icon name="arrow-r" size={12} className="t3"/>
          <div className="row g6"><Avatar id="research_02" size="sm"/><span className="mono-s">research_02</span></div>
          <span className="t3">·</span>
          <span className="mono" style={{ color: 'var(--circle-green)' }}>0.0012 USDC</span>
          <span className="t3">·</span>
          <span className="mono-s t3">started 4s ago · 14:32:08.441 UTC</span>
        </div>
      </div>

      {/* Replay controls */}
      <div className="card card-pad row between" style={{ marginBottom: 20, padding: '14px 16px' }}>
        <div className="row g12">
          <span className="mono-s t3">END-TO-END</span>
          <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
            {isFailure ? '—' : `${elapsed}ms`}
          </span>
          {!isFailure && <span className="mono-s" style={{ color: 'var(--circle-green)' }}>✓ under 1s finality target</span>}
          {isFailure && <span className="mono-s" style={{ color: 'var(--danger)' }}>⚠ failed at step 04</span>}
        </div>
        <div className="row g8">
          <button className="btn btn-secondary" onClick={replay} disabled={replaying}>
            <Icon name="replay" size={12}/> {replaying ? 'Replaying…' : 'Replay'}
          </button>
          <button className="btn btn-ghost"><Icon name="download" size={12}/> Export JSON</button>
        </div>
      </div>

      {/* Horizontal visual timeline */}
      <div className="stepper" style={{ marginBottom: 20 }}>
        <div className="stepper-connectors">
          {[0,1,2,3].map(i => {
            const donePrev = i < effectiveStepIdx - 1;
            const activeLine = i === effectiveStepIdx - 1 && replaying;
            const failedLine = isFailure && i >= 2;
            return <div key={i} className={`line ${donePrev && !failedLine ? 'done' : ''} ${activeLine ? 'active' : ''}`}
              style={failedLine && i === 2 ? { background: 'linear-gradient(to right, var(--circle-green), var(--danger))' } : {}}/>;
          })}
        </div>
        {FLOW.map((s, i) => (
          <div key={s.id} className={`step ${stepStatus(i)}`}>
            <div className="step-circle">
              {stepStatus(i) === 'complete' ? <Icon name="check" size={14}/> :
               stepStatus(i) === 'failed' ? <Icon name="x" size={14}/> : s.num}
            </div>
            <div className="step-label">{s.title}</div>
            <div className="step-ts">
              {stepStatus(i) === 'complete' ? `${s.duration}ms` :
               stepStatus(i) === 'active' ? '…' :
               stepStatus(i) === 'failed' ? 'timeout' : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="col g10">
        {FLOW.map((s, i) => {
          const st = stepStatus(i);
          const isOpen = expanded.has(i);
          const failedHere = isFailure && i === 3;
          return (
            <div key={s.id} className="card" style={{ overflow: 'hidden', borderColor: failedHere ? 'rgba(255,77,79,0.3)' : undefined }}>
              <div className="row" style={{ padding: '14px 18px', cursor: 'pointer' }} onClick={() => toggleExp(i)}>
                <div className={`step-circle ${st === 'complete' ? '' : ''}`} style={{
                  width: 28, height: 28, flexShrink: 0,
                  background: st === 'complete' ? 'rgba(17,217,139,0.12)' : st === 'failed' ? 'rgba(255,77,79,0.12)' : st === 'active' ? 'var(--arc-blue)' : 'var(--surface-3)',
                  color: st === 'complete' ? 'var(--circle-green)' : st === 'failed' ? 'var(--danger)' : st === 'active' ? 'white' : 'var(--text-3)',
                  borderColor: st === 'complete' ? 'var(--circle-green)' : st === 'failed' ? 'var(--danger)' : st === 'active' ? 'var(--arc-blue)' : 'var(--border)',
                  animation: 'none',
                }}>
                  {st === 'complete' ? <Icon name="check" size={12}/> : st === 'failed' ? <Icon name="x" size={12}/> : s.num}
                </div>
                <div className="col g4" style={{ marginLeft: 14, flex: 1 }}>
                  <div className="row g10">
                    <span style={{ fontWeight: 500 }}>{s.num}. {s.title}</span>
                    <span className={`pill ${
                      st === 'complete' ? 'pill-green' :
                      st === 'failed' ? 'pill-high' :
                      st === 'active' ? 'pill-blue' : ''
                    }`}>{st}</span>
                    {s.tx && !failedHere && <TxPill hash={s.tx}/>}
                  </div>
                  <span className="t2" style={{ fontSize: 12 }}>{failedHere ? 'Settlement timeout after 3000ms — refund issued.' : s.description}</span>
                </div>
                <div className="col g4" style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <span className="mono-s t3">+{(FLOW.slice(0,i).reduce((a,x)=>a+x.duration,0)).toLocaleString()}ms</span>
                  <span className="mono-s" style={{ color: failedHere ? 'var(--danger)' : st === 'complete' ? 'var(--text-2)' : 'var(--text-3)' }}>{failedHere ? '3000ms' : `${s.duration}ms`}</span>
                </div>
                <Icon name="chevron-down" size={14} className="t3" style={{ marginLeft: 12, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}/>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: '#0A0C10' }}>
                  <div className="grid-2" style={{ gap: 14 }}>
                    <div>
                      <div className="mono-s t3" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Request</div>
                      <div className="mono-s t2" style={{ marginBottom: 6 }}>
                        <span className="pill" style={{ marginRight: 6 }}>{s.request.method}</span>
                        <span className="mono">{s.request.endpoint}</span>
                      </div>
                      <JsonView data={s.request.body}/>
                    </div>
                    <div>
                      <div className="mono-s t3" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Response {failedHere && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>(failed)</span>}
                      </div>
                      {failedHere ? (
                        <pre className="json">{`{
  "error": "settlement_timeout",
  "retries": 3,
  "refund_tx": "0x3b11…a920",
  "refunded_amount_usdc": 0.0012
}`}</pre>
                      ) : (
                        <JsonView data={s.response}/>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="row g10" style={{ marginTop: 24, justifyContent: 'center' }}>
        <a className="btn btn-secondary" href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">
          <Icon name="link" size={12}/> View on Arc Explorer
        </a>
        <button className="btn btn-ghost"><Icon name="download" size={12}/> Export evidence JSON</button>
      </div>
    </div>
  );
}

window.PaymentFlow = PaymentFlow;
