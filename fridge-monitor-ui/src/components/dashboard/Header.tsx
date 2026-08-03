interface Props {
  connected: boolean;
}

export default function Header({ connected }: Props) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__brand">
        <div className="dashboard-header__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="4" y1="10" x2="20" y2="10" />
            <line x1="9" y1="6" x2="9" y2="8" />
            <line x1="9" y1="14" x2="9" y2="18" />
          </svg>
        </div>
        <div>
          <h1 className="dashboard-header__title">Fridge Monitor</h1>
          <p className="dashboard-header__subtitle">Real-time cold storage temperature tracking</p>
        </div>
      </div>

      <div className={`dashboard-header__connection${connected ? ' dashboard-header__connection--live' : ''}`}>
        <span className="dashboard-header__dot" />
        {connected ? 'Live' : 'Reconnecting…'}
      </div>
    </header>
  );
}
