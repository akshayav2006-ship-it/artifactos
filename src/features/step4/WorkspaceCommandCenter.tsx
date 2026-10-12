import { useState } from 'react'
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
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Command Center</p>
            <h3>Workspace overview</h3>
          </div>
        </div>
        <div className="stats-grid">
          {dashboardStats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <em>{stat.change}</em>
            </div>
          ))}
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
          <span className="command-badge">Artifactos Command Center</span>
          <h2>Search, AI, analytics, and workflow intelligence</h2>
        </div>
        <div className="command-runtime">
          <span className="status-live">Live</span>
          <button type="button" className="primary-btn">Open Assistant</button>
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
