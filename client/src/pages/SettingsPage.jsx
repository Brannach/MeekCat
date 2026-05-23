export default function SettingsPage({ theme, onToggle }) {
    const isDark = theme === 'dark';
    return (
        <div>
            <h1 className="page-title">Settings</h1>
            <div className="setting-row">
                <div>
                    <p className="setting-label">Appearance</p>
                    <p className="muted">Switch between light and dark mode.</p>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-pressed={isDark}
                    className="theme-toggle"
                >
                    {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                </button>
            </div>
        </div>
    );
}