import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './WorkspaceCommandCenter.css'
import {
  activityFeed,
  dashboardStats,
  notifications,
} from './mockData'

type TabKey = 'overview' | 'activity' | 'notifications'

type WorkspaceCommandCenterProps = {
  initialTab?: TabKey
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Recent Activity' },
  { key: 'notifications', label: 'Notifications' },
]

export function WorkspaceCommandCenter(props: WorkspaceCommandCenterProps) {
  return <CommandCenter key={props.initialTab ?? 'overview'} {...props} />
}

function CommandCenter({ initialTab = 'overview' }: WorkspaceCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id))
    setReadNotifications(allIds)
  }

  const handleMarkRead = (id: string) => {
    const updated = new Set(readNotifications)
    updated.add(id)
    setReadNotifications(updated)
  }

  const renderActivity = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Activity Feed</p>
            <h3>Recent workspace activity</h3>
          </div>
        </div>
        <div className="feed-list">
          {activityFeed.map((entry, index) => (
            <div key={`${entry.title}-${index}`} className="feed-item">
              <span className="dot" />
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.detail}</p>
              </div>
              <small>{entry.time}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const renderOverview = () => (
    <div className="panel-stack">
      <section className="metric-section">
        <div className="section-header compact">
          <div>
            <p className="eyebrow">At a glance</p>
            <h3>Work that needs your attention</h3>
          </div>
          <span className="updated-label">Updated just now</span>
        </div>
        <div className="stats-grid">
          {dashboardStats.slice(0, 4).map((stat) => (
            <div key={stat.label} className="stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <em>{stat.change}</em>
            </div>
          ))}
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-card review-card">
          <div className="section-header compact"><div><p className="eyebrow">Review queue</p><h3>Keep releases moving</h3></div><Link to="/artifacts" className="text-link">View all</Link></div>
          <div className="review-row"><span className="review-icon">⌁</span><div><strong>ERP Backend Discussion</strong><p>Awaiting your review · 2 collaborators</p></div><button type="button" onClick={() => navigate('/artifacts')}>Review</button></div>
          <div className="review-row"><span className="review-icon rose">✦</span><div><strong>Launch messaging brief</strong><p>Final approval due today</p></div><button type="button" onClick={() => navigate('/artifacts')}>Review</button></div>
          <div className="review-row"><span className="review-icon blue">◈</span><div><strong>Authentication prompt pack</strong><p>Ready to publish · score 85</p></div><button type="button" onClick={() => navigate('/artifacts')}>Open</button></div>
        </section>
        <section className="dashboard-card activity-card">
          <div className="section-header compact"><div><p className="eyebrow">Recent work</p><h3>Activity across your workspace</h3></div></div>
          <div className="activity-list">{activityFeed.slice(0, 4).map((entry, index) => <div key={entry.title} className="mini-activity"><span className={`activity-mark mark-${index}`} /><div><strong>{entry.title}</strong><p>{entry.detail}</p></div><time>{entry.time}</time></div>)}</div>
          <button type="button" className="outline-action" onClick={() => setActiveTab('activity')}>See all activity →</button>
        </section>
      </div>
      <section className="dashboard-card projects-card">
        <div className="section-header compact"><div><p className="eyebrow">Your projects</p><h3>Jump back into a workspace</h3></div><Link to="/projects" className="text-link">All projects</Link></div>
        <div className="project-list">
          <Link to="/projects" className="project-tile"><span className="project-monogram violet">N</span><div><strong>Northstar Product Launch</strong><p>12 artifacts · 4 collaborators</p></div><span>→</span></Link>
          <Link to="/projects" className="project-tile"><span className="project-monogram teal">A</span><div><strong>Atlas AI Ops</strong><p>8 artifacts · 6 collaborators</p></div><span>→</span></Link>
          <Link to="/projects" className="project-tile"><span className="project-monogram amber">I</span><div><strong>Identity Vault</strong><p>17 artifacts · 3 collaborators</p></div><span>→</span></Link>
        </div>
      </section>
    </div>
  )

  const renderNotifications = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Workspace alerts</h3>
          </div>
          <div className="notification-actions">
            <span className="badge-read">{notifications.filter(n => !readNotifications.has(n.id) && n.unread).length} unread</span>
            <button type="button" className="secondary-btn" onClick={handleMarkAllRead}>Mark All Read</button>
          </div>
        </div>

        <div className="notification-list">
          {notifications
            .filter(item => !readNotifications.has(item.id))
            .map((item) => (
              <div key={item.id} className="notification-item unread">
                <div className="notification-content">
                  <div className="notification-top">
                    <strong>{item.title}</strong>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.message}</p>
                </div>
                <button
                  type="button"
                  className="mark-read-btn"
                  onClick={() => handleMarkRead(item.id)}
                >
                  Mark read
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  )

  const content = (() => {
    switch (activeTab) {
      case 'activity':
        return renderActivity()
      case 'notifications':
        return renderNotifications()
      default:
        return renderOverview()
    }
  })()

  return (
    <section className="workspace-command-center">
      <header className="command-header">
        <div>
          <span className="command-badge"><i /> Your workspace</span>
          <h2>Good morning — make progress<br />on the work that matters.</h2>
          <p>Capture decisions, ship reviewed artifacts, and keep your team in sync.</p>
        </div>
        <div className="hero-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/projects')}>Browse projects</button>
          <button type="button" className="primary-btn" onClick={() => navigate('/chat')}>Start a chat <span>→</span></button>
        </div>
      </header>

      <nav className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {content}
    </section>
  )
}
