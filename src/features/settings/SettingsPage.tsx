import './SettingsPage.css'

export function SettingsPage() {
  return (
    <section className="settings-page">
      <header className="page-header-card">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your Artifactos preferences</h2>
        </div>
        <div className="page-pill">Workspace configuration</div>
      </header>

      <div className="workspace-grid">
        <div className="panel-card">
          <h3>Workspace defaults</h3>
          <ul className="member-list">
            <li>Local data is saved in this browser.</li>
            <li>Model selection and credentials are managed in chat.</li>
            <li>Shared project access is managed after signing in to the workspace.</li>
          </ul>
        </div>

        <div className="panel-card">
          <h3>Integrations</h3>
          <ul className="member-list">
            <li>AI providers: connection status is checked in chat model controls.</li>
            <li>ChatGPT subscription: available in the local development workspace after sign-in.</li>
            <li>Google Drive: no account connection is configured by this settings page.</li>
          </ul>
          <a href="/workspace">Open workspace and manage model connections</a>
        </div>
      </div>
    </section>
  )
}
