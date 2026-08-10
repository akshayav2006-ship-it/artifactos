import './SettingsPage.css'

export function SettingsPage() {
  return (
    <section className="settings-page">
      <header className="page-header-card">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your Artifactos preferences</h2>
        </div>
        <div className="page-pill">Configured</div>
      </header>

      <div className="workspace-grid">
        <div className="panel-card">
          <h3>Workspace defaults</h3>
          <ul className="member-list">
            <li>Default project view: Overview</li>
            <li>Auto-create artifact versions: On</li>
            <li>Require review before sharing: Yes</li>
          </ul>
        </div>

        <div className="panel-card">
          <h3>Integrations</h3>
          <ul className="member-list">
            <li>OpenAI connected</li>
            <li>Claude connected</li>
            <li>Google Drive connected</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
