import './SettingsPage.css'

export function SettingsPage({ local, modelName, geminiConfigured = false }: { local?: boolean; modelName?: string; geminiConfigured?: boolean }) {
  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your Artifactos preferences</h2>
        </div>
        <div className="settings-caption">Workspace configuration</div>
      </header>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Workspace defaults</h3>
          <ul className="settings-list">
            <li>Workspace: {local === false ? "Shared · project access is checked on the server" : "Local · data is saved in this browser"}.</li>
            <li>Selected model for this context: {modelName || "Notebook · save only"}.</li>
            <li>Model selection and credentials are managed in chat.</li>
            <li>Shared project access is managed after signing in to the workspace.</li>
          </ul>
        </div>

        <div className="settings-card">
          <h3>Integrations</h3>
          <ul className="settings-list">
            <li>Gemini API key: {geminiConfigured ? "available in this session" : "not added to this session"}.</li>
            <li>Hosted provider availability is checked when sending. Manage connections in chat.</li>
            <li>ChatGPT subscription: available in the local development workspace after sign-in.</li>
            <li>Google Drive: no account connection is configured by this settings page.</li>
          </ul>
          <a href="/workspace?page=chat">Open workspace and manage model connections</a>
        </div>
      </div>
    </section>
  )
}
