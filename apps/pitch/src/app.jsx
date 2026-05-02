/* App shell: router, tweaks, state switcher */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "blue",
  "density": "normal",
  "tickSpeed": 1,
  "paperMode": true
}/*EDITMODE-END*/;

function App() {
  const [route, setRoute] = useStateApp('landing');
  const [state, setState] = useStateApp('happy'); // happy | loading | empty | error
  const [tweaksOpen, setTweaksOpen] = useStateApp(false);
  const [editMode, setEditMode] = useStateApp(false);
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const [backendData, setBackendData] = useStateApp(() => window.TTM.fallbackPitchBackendData());
  const [backendLoading, setBackendLoading] = useStateApp(true);

  const [blockNum, setBlockNum] = useStateApp(1_234_567);
  const [nanopayCount] = useStateApp(63);

  useEffectApp(() => {
    document.documentElement.dataset.accent = tweaks.accent === 'violet' ? 'violet' : 'blue';
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.accent, tweaks.density]);

  // Tweaks host bridge
  useEffectApp(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === '__activate_edit_mode') { setEditMode(true); setTweaksOpen(true); }
      if (d.type === '__deactivate_edit_mode') { setEditMode(false); setTweaksOpen(false); }
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const refreshBackendData = () => {
    setBackendLoading(true);
    window.TTM.loadPitchBackendData()
      .then(data => setBackendData(data))
      .catch(error => setBackendData(window.TTM.fallbackPitchBackendData(error)))
      .finally(() => setBackendLoading(false));
  };

  useEffectApp(() => {
    refreshBackendData();
    const id = setInterval(refreshBackendData, 15000);
    return () => clearInterval(id);
  }, []);

  const setTweak = (patch) => {
    setTweaks(t => {
      const next = { ...t, ...patch };
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
      return next;
    });
  };

  // Tick block + nanopay counter
  useEffectApp(() => {
    const id = setInterval(() => {
      setBlockNum(n => n + 1);
    }, Math.max(800, 2200 / tweaks.tickSpeed));
    return () => clearInterval(id);
  }, [tweaks.tickSpeed]);

  const navigate = (r) => { setRoute(r); setState('happy'); window.scrollTo(0, 0); };

  return (
    <>
      <ChainStrip blockNum={blockNum} nanopayCount={nanopayCount} showPaper={tweaks.paperMode}/>
      <div className="app">
        <TopNav active={route} onNav={navigate}/>
        {['marketplace','payment','dashboard'].includes(route) && (
          <div className="app-status-wrap">
            <DataStatusBanner backendData={backendData} onRetry={refreshBackendData} compact={backendLoading}/>
          </div>
        )}
        {route === 'landing'      && <Landing navigate={navigate} blockNum={blockNum} nanopayCount={nanopayCount}/>}
        {route === 'marketplace'  && <Marketplace state={state} navigate={navigate} tickSpeed={tweaks.tickSpeed}/>}
        {route === 'payment'      && <PaymentFlow state={state} navigate={navigate} backendData={backendData}/>}
        {route === 'dashboard'    && <Dashboard state={state} navigate={navigate} backendData={backendData}/>}
        {route === 'architecture' && <Architecture navigate={navigate}/>}
        {route === 'about'        && <About navigate={navigate}/>}
      </div>

      <StateSwitcher state={state} setState={setState} route={route}/>

      {editMode && (
        <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setTweaksOpen(false)}/>
      )}
    </>
  );
}

function StateSwitcher({ state, setState, route }) {
  // only show for routes with meaningful states
  const supports = ['marketplace','payment','dashboard'].includes(route);
  if (!supports) return null;
  return (
    <div style={{
      position: 'fixed', left: 20, bottom: 20, zIndex: 199,
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      padding: 6,
      display: 'flex', gap: 2,
      boxShadow: 'var(--shadow-elevated)',
    }}>
      <span className="mono-s t3" style={{ padding: '6px 8px' }}>state:</span>
      {['happy','loading','empty','error'].map(s => (
        <button key={s} className={`tweak-opt ${state === s ? 'active' : ''}`}
          style={{ minWidth: 58 }}
          onClick={() => setState(s)}>{s}</button>
      ))}
    </div>
  );
}

function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <button className="btn btn-ghost" style={{ height: 22, padding: '0 4px' }} onClick={onClose}><Icon name="x" size={12}/></button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <span className="label">Accent</span>
          <div className="opts">
            {['blue','violet'].map(a => (
              <button key={a} className={`tweak-opt ${tweaks.accent === a ? 'active' : ''}`} onClick={() => setTweak({ accent: a })}>
                {a === 'blue' ? 'Arc Blue' : 'Violet'}
              </button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <span className="label">Density</span>
          <div className="opts">
            {['normal','compact'].map(d => (
              <button key={d} className={`tweak-opt ${tweaks.density === d ? 'active' : ''}`} onClick={() => setTweak({ density: d })}>{d}</button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <span className="label">Tick speed</span>
          <div className="opts">
            {[0.5, 1, 2, 4].map(v => (
              <button key={v} className={`tweak-opt ${tweaks.tickSpeed === v ? 'active' : ''}`} onClick={() => setTweak({ tickSpeed: v })}>{v}×</button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <span className="label">Paper-mode badge</span>
          <div className="opts">
            {[['on',true],['off',false]].map(([l,v]) => (
              <button key={l} className={`tweak-opt ${tweaks.paperMode === v ? 'active' : ''}`} onClick={() => setTweak({ paperMode: v })}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
