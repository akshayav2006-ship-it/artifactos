import './ProfilePage.css'

export function ProfilePage() {
  return (
    <section className="profile-page">
      <header className="page-header-card">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Manage your workspace identity</h2>
        </div>
        <div className="page-pill">Owner</div>
      </header>

      <div className="workspace-grid">
        <div className="panel-card">
          <h3>Account overview</h3>
          <div className="detail-meta">
            <div>
              <span>Name</span>
              <strong>Maya Chen</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>maya@artifactos.ai</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>Workspace Owner</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>Pro</strong>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <h3>Preferences</h3>
          <ul className="member-list">
            <li>Default AI model: GPT-4.1</li>
            <li>Artifact review notifications: On</li>
            <li>Auto-save conversations: Enabled</li>
            <li>Trust score alerts: Weekly summary</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
