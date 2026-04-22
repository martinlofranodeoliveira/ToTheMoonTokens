/* Live Marketplace screen */
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM, useMemo: useMemoM, useCallback: useCallbackM } = React;

function Marketplace({ state, navigate, tickSpeed }) {
  const [signals, setSignals] = useStateM([]);
  const [settlements, setSettlements] = useStateM([]);
  const [isMockData, setIsMockData] = useStateM(false);
  const [isLoadingData, setIsLoadingData] = useStateM(true);

  const [newIds, setNewIds] = useStateM(new Set());
  const [soldIds, setSoldIds] = useStateM(new Set());

  const [filterSyms, setFilterSyms] = useStateM('');
  const [horizons, setHorizons] = useStateM(new Set(window.TTM.HORIZONS));
  const [tiers, setTiers] = useStateM(new Set(['low','med','high']));
  const [maxPrice, setMaxPrice] = useStateM(0.01);
  const [freshOnly, setFreshOnly] = useStateM(false);

  const [buyTarget, setBuyTarget] = useStateM(null);

  // Fetch initial data
  useEffectM(() => {
    let mounted = true;
    async function loadData() {
      setIsLoadingData(true);
      const [sigsRes, setsRes] = await Promise.all([
        window.TTM.api.getSignals(),
        window.TTM.api.getSettlements()
      ]);
      if (!mounted) return;
      setSignals(sigsRes.data);
      setSettlements(setsRes.data.map((s, i) => ({ ...s, isNew: false, agoLabel: s.ago ? s.ago + 's ago' : window.TTM.relTime((Date.now() - (s.ts || Date.now()))/1000) })));
      setIsMockData(sigsRes.isMock || setsRes.isMock);
      setIsLoadingData(false);
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  // Stream new signals
  useEffectM(() => {
    if (state !== 'happy') return;
    const id = setInterval(() => {
      const s = window.TTM.nextSignal();
      setSignals(prev => [s, ...prev].slice(0, 40));
      setNewIds(prev => {
        const nxt = new Set(prev); nxt.add(s.id);
        setTimeout(() => setNewIds(cur => { const n = new Set(cur); n.delete(s.id); return n; }), 1200);
        return nxt;
      });
      // Randomly sell a few
      if (Math.random() < 0.6) {
        setSignals(prev => {
          const unsold = prev.filter(x => !x.sold);
          if (!unsold.length) return prev;
          const pick = unsold[Math.floor(Math.random() * Math.min(6, unsold.length))];
          // Emit settlement
          const settle = {
            id: 'tx_' + Math.random().toString(36).slice(2,8),
            consumer: window.TTM.CONSUMERS[Math.floor(Math.random()*window.TTM.CONSUMERS.length)],
            research: pick.publisher,
            amount: pick.price,
            hash: window.TTM.randomHash(),
            ts: Date.now(),
            isNew: true,
            agoLabel: 'just now',
          };
          setSettlements(cur => [settle, ...cur].slice(0, 15));
          setTimeout(() => setSettlements(cur => cur.map(x => x.id === settle.id ? { ...x, isNew: false } : x)), 1200);
          return prev.map(x => x.id === pick.id ? { ...x, sold: true } : x);
        });
      }
    }, Math.max(1500, 3200 / tickSpeed));
    return () => clearInterval(id);
  }, [state, tickSpeed]);

  // Tick "ago" labels
  useEffectM(() => {
    const id = setInterval(() => {
      setSettlements(cur => cur.map(s => {
        const sec = Math.floor((Date.now() - s.ts) / 1000);
        return { ...s, agoLabel: sec < 1 ? 'just now' : window.TTM.relTime(sec) };
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Clean up sold items
  useEffectM(() => {
    const id = setInterval(() => {
      setSignals(prev => prev.filter(s => !s.sold || (Date.now() - s.createdAt < 120_000)));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemoM(() => signals.filter(s => {
    if (filterSyms && !s.sym.toLowerCase().includes(filterSyms.toLowerCase())) return false;
    if (!horizons.has(s.horizon)) return false;
    if (!tiers.has(s.tier)) return false;
    if (s.price > maxPrice) return false;
    if (freshOnly && (Date.now() - s.createdAt) > 60_000) return false;
    return true;
  }), [signals, filterSyms, horizons, tiers, maxPrice, freshOnly]);

  const toggleIn = (set, val, setter) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val); else n.add(val);
    setter(n);
  };

  // Buy flow - minimal in-modal stepper
  const onBuy = (sig) => setBuyTarget(sig);
  const confirmBuy = (sig) => {
    setSignals(prev => prev.map(x => x.id === sig.id ? { ...x, sold: true } : x));
    const settle = {
      id: 'tx_' + Math.random().toString(36).slice(2,8),
      consumer: 'consumer_01',
      research: sig.publisher,
      amount: sig.price,
      hash: window.TTM.randomHash(),
      ts: Date.now(),
      isNew: true,
      agoLabel: 'just now',
    };
    setSettlements(cur => [settle, ...cur].slice(0, 15));
  };

  if (state === 'loading' || isLoadingData) {
    return (
      <div className="layout-3col">
        <div className="col-filter"><div className="sk" style={{ height: 22, width: '60%', marginBottom: 16 }}/><div className="sk" style={{ height: 34, marginBottom: 20 }}/><div className="sk" style={{ height: 18, width: '40%', marginBottom: 10 }}/><div className="sk" style={{ height: 120, marginBottom: 16 }}/></div>
        <div className="col-main">
          <div className="sect-head"><h3>Live signals</h3><LivePulse/></div>
          <div className="col g8">{[...Array(6)].map((_,i) => <SkeletonSignal key={i}/>)}</div>
        </div>
        <div className="col-right"><div className="sect-head"><h3>Settlements</h3></div>{[...Array(6)].map((_,i) => <div key={i} className="sk" style={{ height: 52, marginBottom: 8 }}/>)}</div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="layout-3col">
        <div className="col-filter"/>
        <div className="col-main">
          <div className="banner danger" style={{ marginBottom: 20 }}>
            <Icon name="alert" size={14}/>
            <span>Connection to Circle sandbox lost. Signals stream unavailable.</span>
            <button className="btn btn-secondary" style={{ marginLeft: 'auto', height: 28 }}>Retry</button>
          </div>
          <EmptyState title="Stream disconnected" desc="We couldn't reach the Nanopayments sandbox. Retrying automatically every 10s." icon="alert"/>
        </div>
        <div className="col-right"/>
      </div>
    );
  }

  if (state === 'empty' || signals.length === 0) {
    return (
      <div className="layout-3col">
        <div className="col-filter"/>
        <div className="col-main" style={{ paddingTop: 40 }}>
          <EmptyState title="No signals yet" desc="Research agents haven't published any signals in the last cycle. New ones will stream in here." cta="Trigger bootstrap" icon="activity"/>
        </div>
        <div className="col-right"/>
      </div>
    );
  }

  return (
    <div className="layout-3col">
      {/* FILTERS */}
      <div className="col-filter">
        {isMockData && (
          <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px 14px', borderRadius: 6, marginBottom: 20, border: '1px solid #fcd34d', fontSize: '0.85rem', lineHeight: 1.4 }}>
            <strong>Backend Unreachable:</strong> Showing mock data for demo. Ensure API is running at <code>http://127.0.0.1:8000</code>.
          </div>
        )}
        <div className="col g16">
          <div className="col g8">
            <label className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={12} className="" />
              <input className="search" style={{ paddingLeft: 30 }} placeholder="Symbol, e.g. BTC"
                value={filterSyms} onChange={e => setFilterSyms(e.target.value)}/>
              <div style={{ position: 'absolute', left: 10, top: 11, pointerEvents: 'none', color: 'var(--text-3)' }}><Icon name="search" size={12}/></div>
            </div>
          </div>

          <div className="col g8">
            <label className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Horizon</label>
            <div>
              {window.TTM.HORIZONS.map(h => (
                <label key={h} className="check-row">
                  <input type="checkbox" checked={horizons.has(h)} onChange={() => toggleIn(horizons, h, setHorizons)}/>
                  <span className="mono-s">{h}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col g8">
            <label className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tier</label>
            {['low','med','high'].map(t => (
              <label key={t} className="check-row">
                <input type="checkbox" checked={tiers.has(t)} onChange={() => toggleIn(tiers, t, setTiers)}/>
                <span className={`pill ${window.TTM.tierPill(t)}`}>{t}</span>
              </label>
            ))}
          </div>

          <div className="col g8">
            <label className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Max price (USDC)</label>
            <input type="range" min="0.0001" max="0.01" step="0.0001" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
              style={{ accentColor: 'var(--arc-blue)' }}/>
            <div className="row between"><span className="mono-s t3">0.0001</span><span className="mono-s">{maxPrice.toFixed(4)}</span></div>
          </div>

          <div className="col g8">
            <label className="mono-s t3" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Publisher</label>
            {window.TTM.PUBS.map(p => (
              <label key={p} className="check-row">
                <input type="checkbox" defaultChecked/>
                <Avatar id={p} size="sm"/>
                <span className="mono-s">{p}</span>
              </label>
            ))}
          </div>

          <label className="check-row">
            <input type="checkbox" checked={freshOnly} onChange={e => setFreshOnly(e.target.checked)}/>
            <span>Only fresh (&lt;60s)</span>
          </label>

          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { setFilterSyms(''); setHorizons(new Set(window.TTM.HORIZONS)); setTiers(new Set(['low','med','high'])); setMaxPrice(0.01); setFreshOnly(false); }}>
            Clear filters
          </button>
        </div>
      </div>

      {/* MAIN FEED */}
      <div className="col-main">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div className="sect-head" style={{ marginBottom: 0 }}>
            <h3>Live signals</h3><LivePulse/>
            <span className="count">{filtered.length} active</span>
          </div>
          <div className="row g8">
            <button className="btn btn-ghost" style={{ height: 30 }}><Icon name="filter" size={12}/> Sort: newest</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No signals match your filters" desc="Try loosening the horizon or price caps to see more published signals." cta="Clear filters"
            onCta={() => { setFilterSyms(''); setHorizons(new Set(window.TTM.HORIZONS)); setTiers(new Set(['low','med','high'])); setMaxPrice(0.01); setFreshOnly(false); }}
            icon="filter"/>
        ) : (
          <div className="col g8">
            {filtered.slice(0, 20).map(sig => (
              <SignalCard key={sig.id} sig={sig} onBuy={onBuy} animClass={newIds.has(sig.id) ? 'new' : ''}/>
            ))}
          </div>
        )}
      </div>

      {/* SETTLEMENTS */}
      <div className="col-right">
        <div className="sect-head">
          <h3>Settlements</h3>
          <LivePulse/>
        </div>

        <div className="card card-pad" style={{ marginBottom: 14, padding: 14 }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="mono-s t3">LAST 5 MIN</span>
            <span className="mono-s t2">{settlements.length * 14} txs</span>
          </div>
          <div className="row between">
            <div className="col g4">
              <span className="mono-s t3">Total</span>
              <span className="mono" style={{ fontSize: 15, color: 'var(--circle-green)' }}>
                {settlements.reduce((a,s) => a + s.amount, 0).toFixed(4)} USDC
              </span>
            </div>
            <div className="col g4">
              <span className="mono-s t3">Avg finality</span>
              <span className="mono" style={{ fontSize: 15 }}>
                0.4<span className="t3">s</span>
              </span>
            </div>
          </div>
        </div>

        <div className="col">
          {settlements.map(s => <SettlementItem key={s.id} item={s} isNew={s.isNew}/>)}
        </div>

        <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          onClick={() => navigate('payment')}>
          Inspect a payment flow <Icon name="arrow-r" size={12}/>
        </button>
      </div>

      {buyTarget && (
        <BuyModal sig={buyTarget} onClose={() => setBuyTarget(null)} onConfirm={() => { confirmBuy(buyTarget); }} onInspect={() => { confirmBuy(buyTarget); setBuyTarget(null); navigate('payment'); }}/>
      )}
    </div>
  );
}

function BuyModal({ sig, onClose, onConfirm, onInspect }) {
  const [stepIdx, setStepIdx] = useStateM(-1); // -1 = initial review; 0..4 = stepper states
  const [done, setDone] = useStateM(false);
  const [txHash] = useStateM(window.TTM.randomHash());

  const start = () => {
    setStepIdx(0);
    const durations = [42, 78, 154, 387, 82]; // ms
    let total = 0;
    durations.forEach((d, i) => {
      total += d;
      setTimeout(() => {
        setStepIdx(i === durations.length - 1 ? durations.length : i + 1);
        if (i === durations.length - 1) {
          setDone(true);
          onConfirm();
        }
      }, total);
    });
  };

  const status = (i) => {
    if (stepIdx === -1) return 'pending';
    if (i < stepIdx) return 'complete';
    if (i === stepIdx) return 'active';
    return 'pending';
  };

  const labels = ['Quote','Hold','Capture','Settle','Deliver'];

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <div className="row between">
          <h2>Confirm purchase</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ height: 28, padding: '0 6px' }}><Icon name="x" size={14}/></button>
        </div>
        <p className="t2" style={{ margin: 0, fontSize: 13 }}>Atomic nanopayment. One click = one onchain tx on Arc Testnet.</p>
      </div>
      <div className="modal-body">
        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{sig.sym}</div>
            <div className="row g6">
              <span className="pill pill-blue">{sig.horizon}</span>
              <span className={`pill ${window.TTM.tierPill(sig.tier)}`}>{sig.tier}</span>
            </div>
          </div>
          <div className="row between">
            <div className="col g4">
              <span className="mono-s t3">PUBLISHER</span>
              <div className="row g6"><Avatar id={sig.publisher} size="sm"/><span className="mono-s">{sig.publisher}</span></div>
            </div>
            <div className="col g4">
              <span className="mono-s t3">SCORE</span>
              <ReputationBadge score={sig.score}/>
            </div>
            <div className="col g4" style={{ alignItems: 'flex-end' }}>
              <span className="mono-s t3">PRICE</span>
              <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{sig.price.toFixed(4)} <span className="t2" style={{ fontSize: 12 }}>USDC</span></div>
            </div>
          </div>
        </div>

        {stepIdx !== -1 && (
          <div style={{ marginBottom: 20 }}>
            <div className="stepper" style={{ padding: '16px 20px' }}>
              <div className="stepper-connectors">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`line ${i < stepIdx - 1 ? 'done' : (i === stepIdx - 1 ? 'active' : '')}`}/>
                ))}
              </div>
              {labels.map((l, i) => (
                <div key={l} className={`step ${status(i)}`}>
                  <div className="step-circle">
                    {status(i) === 'complete' ? <Icon name="check" size={14}/> : (i+1).toString().padStart(2,'0')}
                  </div>
                  <div className="step-label">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {done && (
          <div className="card card-pad" style={{ borderColor: 'rgba(17,217,139,0.3)', background: 'rgba(17,217,139,0.04)' }}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <span className="row g6" style={{ color: 'var(--circle-green)' }}><Icon name="check-circle" size={14}/> Delivered</span>
              <TxPill hash={txHash}/>
            </div>
            <pre className="json" style={{ background: 'transparent', border: 'none', padding: 0 }}>
{`{
  `}<span className="key">"direction"</span>{`: `}<span className="str">"long"</span>{`,
  `}<span className="key">"entry"</span>{`:  `}<span className="num">64210.50</span>{`,
  `}<span className="key">"stop"</span>{`:   `}<span className="num">63890.00</span>{`,
  `}<span className="key">"target"</span>{`: `}<span className="num">64780.00</span>{`
}`}
            </pre>
          </div>
        )}
      </div>
      <div className="modal-foot">
        {stepIdx === -1 && (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={start}>Pay {sig.price.toFixed(4)} USDC</button>
          </>
        )}
        {stepIdx !== -1 && done && (
          <>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={onInspect}>Inspect payment flow <Icon name="arrow-r" size={12}/></button>
          </>
        )}
        {stepIdx !== -1 && !done && (
          <button className="btn btn-secondary" disabled>Settling on Arc…</button>
        )}
      </div>
    </Modal>
  );
}

window.Marketplace = Marketplace;
