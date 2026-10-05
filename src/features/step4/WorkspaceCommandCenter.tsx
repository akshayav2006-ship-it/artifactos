import { useEffect, useMemo, useState } from 'react'
import './WorkspaceCommandCenter.css'
import {
  activityFeed,
  analyticsSeries,
  dashboardStats,
  graphNodes,
  notifications,
  recentSearches,
  searchResults,
  searchSuggestions,
} from './mockData'
import type { SearchResult } from './types'

type TabKey = 'overview' | 'activity' | 'notifications'

type WorkspaceCommandCenterProps = {
  initialTab?: TabKey
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Recent Activity' },
  { key: 'notifications', label: 'Notifications' },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function WorkspaceCommandCenter({ initialTab = 'overview' }: WorkspaceCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [query, setQuery] = useState('Show all approved ChatGPT artifacts.')
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set())

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])
  const [projectFilter, setProjectFilter] = useState('All Projects')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [modelFilter, setModelFilter] = useState('All Models')
  const [trustFilter, setTrustFilter] = useState('All Trust')
  const [sortBy, setSortBy] = useState('Most Relevant')

  const filteredResults = useMemo<SearchResult[]>(() => {
    const normalizedQuery = query.trim().toLowerCase()
    let result = [...searchResults]

    if (projectFilter !== 'All Projects') {
      result = result.filter((item) => item.project === projectFilter)
    }
    if (statusFilter !== 'All Statuses') {
      result = result.filter((item) => item.reviewStatus === statusFilter)
    }
    if (modelFilter !== 'All Models') {
      result = result.filter((item) => item.model === modelFilter)
    }
    if (trustFilter !== 'All Trust') {
      const minimum = Number(trustFilter.replace('+', ''))
      result = result.filter((item) => item.trustScore >= minimum)
    }
    if (normalizedQuery) {
      result = result.filter((item) =>
        [
          item.title,
          item.project,
          item.model,
          item.preview,
          item.reviewStatus,
          item.id,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    }
    if (sortBy === 'Highest Trust') {
      result = [...result].sort((a, b) => b.trustScore - a.trustScore)
    }
    if (sortBy === 'Last Updated') {
      result = [...result].sort((a, b) => Number(new Date(b.lastUpdated)) - Number(new Date(a.lastUpdated)))
    }

    return result
  }, [projectFilter, query, sortBy, statusFilter, trustFilter, modelFilter])

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

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderSearch = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Semantic Search</p>
            <h3>Search artifacts</h3>
          </div>
        </div>

        <div className="search-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by meaning, prompt, model, project, review, or artifact tag"
          />
          <button type="button" className="primary-btn">Search</button>
        </div>

        <div className="filter-row">
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option>All Projects</option>
            <option>Northstar Product Launch</option>
            <option>Atlas AI Ops</option>
            <option>Identity Vault</option>
          </select>
          <select value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
            <option>All Models</option>
            <option>GPT-4.1</option>
            <option>Claude 3.7</option>
            <option>ChatGPT</option>
            <option>Gemini</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>All Statuses</option>
            <option>Approved</option>
            <option>Under Review</option>
            <option>Rejected</option>
            <option>Draft</option>
          </select>
          <select value={trustFilter} onChange={(event) => setTrustFilter(event.target.value)}>
            <option>All Trust</option>
            <option>70+</option>
            <option>80+</option>
            <option>90+</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option>Most Relevant</option>
            <option>Highest Trust</option>
            <option>Last Updated</option>
          </select>
        </div>

        <div className="search-meta-row">
          <div className="suggestions">
            <span>Suggestions</span>
            {searchSuggestions.map((item) => (
              <button type="button" key={item} onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="suggestions">
            <span>Recent</span>
            {recentSearches.map((item) => (
              <button type="button" key={item} onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-header compact">
          <h3>Search results</h3>
          <span>{filteredResults.length} results</span>
        </div>
        <div className="result-list">
          {filteredResults.map((item) => (
            <article key={item.id} className="result-card">
              <div className="result-head">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.project}</p>
                </div>
                <span className={`status-pill status-${item.reviewStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                  {item.reviewStatus}
                </span>
              </div>
              <div className="result-meta">
                <span>{item.model}</span>
                <span>Trust {item.trustScore}</span>
                <span>{formatDate(item.lastUpdated)}</span>
              </div>
              <p>{item.preview}</p>
            </article>
          ))}
        </div>
        <div className="pagination">
          <button type="button">Prev</button>
          <span>Page 1 of 3</span>
          <button type="button">Next</button>
        </div>
      </section>
    </div>
  )

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderAssistant = () => (
    <div className="panel-stack">
      <section className="panel-card two-column">
        <div>
          <div className="section-header">
            <div>
              <p className="eyebrow">AI Workspace Assistant</p>
              <h3>Ask the workspace</h3>
            </div>
          </div>
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={5} />
          <div className="assistant-actions">
            <button type="button" className="primary-btn">Run</button>
            <button type="button" className="secondary-btn">Summarize Selected</button>
          </div>
        </div>

        <div className="assistant-panel">
          <div className="assistant-card">
            <strong>Suggested prompts</strong>
            <ul>
              {searchSuggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-header compact">
          <h3>Assistant response</h3>
        </div>
        <div className="assistant-response">
          <p>
            The highest-trust artifact is <strong>Brand Launch Brief</strong> with a score of 92. It was approved
            by the project review team and contains verified provenance with multiple approved revisions.
          </p>
          <div className="mini-grid">
            <div>
              <span>Similar artifacts</span>
              <strong>3 related conversations</strong>
            </div>
            <div>
              <span>Duplicate content</span>
              <strong>1 possible match</strong>
            </div>
            <div>
              <span>Recommended prompts</span>
              <strong>4 reusable prompt blocks</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderDashboard = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h3>Project performance</h3>
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

      <section className="panel-card">
        <div className="chart-grid">
          <div className="chart-card">
            <strong>Artifacts created over time</strong>
            <div className="bars vertical-bars">
              {analyticsSeries.artifactsCreated.map((value, index) => (
                <span key={`${value}-${index}`} style={{ height: `${value}%` }} />
              ))}
            </div>
          </div>
          <div className="chart-card">
            <strong>AI model usage</strong>
            <div className="bars horizontal-bars">
              {analyticsSeries.modelUsage.map((value, index) => (
                <div key={index} className="bar-row">
                  <label>{['GPT-4.1', 'Claude 3.7', 'ChatGPT', 'Gemini'][index]}</label>
                  <span style={{ width: `${value}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderAnalytics = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h3>Artifact trends</h3>
          </div>
          <button type="button" className="secondary-btn">Download Report</button>
        </div>

        <div className="analytics-grid">
          <div className="metric-box"><span>Most Used AI Model</span><strong>GPT-4.1</strong></div>
          <div className="metric-box"><span>Top Contributor</span><strong>Maya Chen</strong></div>
          <div className="metric-box"><span>Monthly Growth</span><strong>+24.3%</strong></div>
          <div className="metric-box"><span>Review Completion Rate</span><strong>88%</strong></div>
          <div className="metric-box"><span>Average Trust Score</span><strong>81/100</strong></div>
          <div className="metric-box"><span>Average Approval Time</span><strong>2.4 days</strong></div>
        </div>
      </section>

      <section className="panel-card">
        <div className="chart-grid">
          <div className="chart-card">
            <strong>Review status distribution</strong>
            <div className="donut-wrap">
              <div className="donut" />
            </div>
          </div>
          <div className="chart-card">
            <strong>Trust score distribution</strong>
            <div className="bars vertical-bars short">
              {analyticsSeries.scoreDistribution.map((value, index) => (
                <span key={`${value}-${index}`} style={{ height: `${value * 2}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderGraph = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Knowledge Graph</p>
            <h3>Artifact relationships</h3>
          </div>
          <div className="graph-toolbar">
            <button type="button" className="secondary-btn">Zoom</button>
            <button type="button" className="secondary-btn">Pan</button>
          </div>
        </div>

        <div className="graph-canvas">
          {graphNodes.map((node) => (
            <div
              key={node.id}
              className={`graph-node ${node.type}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {node.label}
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
