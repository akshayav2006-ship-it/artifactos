import { useMemo, useState } from 'react'
import './ArtifactManagement.css'
import { artifactSeed } from './mockData'
import { formatDate, getProgressTone, getTrustSummary } from './utils'
import type { ArtifactRecord, ReviewState } from './types'

const reviewFilters = ['All', 'Draft', 'Under Review', 'Approved', 'Rejected'] as const

export function ArtifactManagement() {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>(artifactSeed)
  const [selectedId, setSelectedId] = useState(artifactSeed[0].id)
  const [reviewFilter, setReviewFilter] = useState<(typeof reviewFilters)[number]>('All')
  const [compareFrom, setCompareFrom] = useState(1)
  const [compareTo, setCompareTo] = useState(3)
  const [auditFilter, setAuditFilter] = useState('All')

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedId) ?? artifacts[0],
    [artifacts, selectedId],
  )

  const filteredArtifacts = useMemo(() => {
    if (reviewFilter === 'All') {
      return artifacts
    }
    return artifacts.filter((artifact) => artifact.reviewStatus === reviewFilter)
  }, [artifacts, reviewFilter])

  const trustSummary = useMemo(() => getTrustSummary(selectedArtifact), [selectedArtifact])

  const compareVersionA = selectedArtifact.versions.find((version) => version.version === compareFrom)
  const compareVersionB = selectedArtifact.versions.find((version) => version.version === compareTo)

  const handleRestoreVersion = (versionNumber: number) => {
    if (!selectedArtifact) return

    const restoredVersion = selectedArtifact.versions.find((version) => version.version === versionNumber)
    if (!restoredVersion) return

    setArtifacts((current) =>
      current.map((artifact) =>
        artifact.id === selectedArtifact.id
          ? {
              ...artifact,
              currentVersion: versionNumber,
              lastModified: restoredVersion.timestamp,
              reviewStatus: 'Draft',
              auditLogs: [
                {
                  timestamp: new Date().toISOString(),
                  user: 'System',
                  action: 'Version Restored',
                  artifact: artifact.id,
                  project: artifact.projectName,
                },
                ...artifact.auditLogs,
              ],
            }
          : artifact,
      ),
    )
  }

  const handleReviewAction = (action: 'Approved' | 'Rejected' | 'Requested Changes', nextStatus: ReviewState) => {
    if (!selectedArtifact) return

    const newEntry = {
      action,
      reviewer: 'Current Reviewer',
      date: new Date().toISOString(),
      comment:
        action === 'Approved'
          ? 'Approved after final review.'
          : action === 'Rejected'
            ? 'Rejected due to validation issues.'
            : 'Requested changes before final approval.',
      previousStatus: selectedArtifact.reviewStatus,
      newStatus: nextStatus,
    }

    setArtifacts((current) =>
      current.map((artifact) => {
        if (artifact.id !== selectedArtifact.id) return artifact

        return {
          ...artifact,
          reviewStatus: nextStatus,
          lastModified: new Date().toISOString(),
          approvalHistory: [newEntry, ...artifact.approvalHistory],
          reviewHistory: [
            {
              reviewer: 'Current Reviewer',
              date: new Date().toISOString(),
              comments:
                action === 'Approved'
                  ? 'Artifact approved.'
                  : action === 'Rejected'
                    ? 'Artifact rejected.'
                    : 'Requested follow-up revisions.',
              status: nextStatus,
            },
            ...artifact.reviewHistory,
          ],
          trust: getTrustSummary({ ...artifact, reviewStatus: nextStatus }),
        }
      }),
    )
  }

  if (!selectedArtifact) {
    return null
  }

  const auditEntries = selectedArtifact.auditLogs.filter((entry) =>
    auditFilter === 'All' ? true : entry.action === auditFilter,
  )

  return (
    <section className="artifact-management">
      <div className="artifact-shell">
        <header className="artifact-header">
          <div>
            <span className="artifact-badge">Artifact Management</span>
            <h2>Artifactos Trust Center</h2>
          </div>
          <div className="artifact-header-actions">
            <button type="button" className="secondary-btn">
              Export Report
            </button>
            <button type="button" className="primary-btn">
              Verify Artifact
            </button>
          </div>
        </header>

        <div className="artifact-layout">
          <aside className="artifact-sidebar panel-card">
            <div className="panel-title-row">
              <h3>Artifacts</h3>
              <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as (typeof reviewFilters)[number])}>
                {reviewFilters.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter}
                  </option>
                ))}
              </select>
            </div>

            <div className="artifact-list">
              {filteredArtifacts.map((artifact) => (
                <button
                  type="button"
                  key={artifact.id}
                  className={`artifact-item ${artifact.id === selectedArtifact.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(artifact.id)}
                >
                  <div className="artifact-item-top">
                    <strong>{artifact.title}</strong>
                    <span className={`status-pill ${getProgressTone(artifact.reviewStatus)}`}>{artifact.reviewStatus}</span>
                  </div>
                  <p>{artifact.projectName}</p>
                  <div className="artifact-meta-row">
                    <span>{artifact.artifactType}</span>
                    <span>v{artifact.currentVersion}</span>
                    <span>{artifact.trust.score}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main className="artifact-content">
            <section className="panel-card detail-card">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Artifact Details</p>
                  <h3>{selectedArtifact.title}</h3>
                </div>
                <div className="trust-badge-wrap">
                  <span className="trust-badge">{selectedArtifact.trust.badge}</span>
                </div>
              </div>

              <div className="detail-grid">
                <div><span>Artifact ID</span><strong>{selectedArtifact.id}</strong></div>
                <div><span>Project Name</span><strong>{selectedArtifact.projectName}</strong></div>
                <div><span>Created By</span><strong>{selectedArtifact.createdBy}</strong></div>
                <div><span>AI Model Used</span><strong>{selectedArtifact.aiModel}</strong></div>
                <div><span>Created Time</span><strong>{formatDate(selectedArtifact.createdAt)}</strong></div>
                <div><span>Last Modified</span><strong>{formatDate(selectedArtifact.lastModified)}</strong></div>
                <div><span>Artifact Type</span><strong>{selectedArtifact.artifactType}</strong></div>
                <div><span>Current Version</span><strong>v{selectedArtifact.currentVersion}</strong></div>
                <div><span>Review Status</span><strong>{selectedArtifact.reviewStatus}</strong></div>
                <div><span>Trust Score</span><strong>{selectedArtifact.trust.score}/100</strong></div>
                <div><span>Verification Status</span><strong>{selectedArtifact.verificationStatus}</strong></div>
                <div><span>Tags</span><strong>{selectedArtifact.tags.join(', ')}</strong></div>
              </div>

              <div className="description-box">
                <span>Description</span>
                <p>{selectedArtifact.description}</p>
              </div>

              <div className="conversation-box">
                <span>Conversation</span>
                <div className="conversation-list">
                  {selectedArtifact.conversation.map((entry, index) => (
                    <div key={`${entry.role}-${index}`} className={`message ${entry.role.toLowerCase()}`}>
                      <strong>{entry.role}</strong>
                      <p>{entry.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel-card">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Version History</p>
                  <h3>Timeline of Artifact Versions</h3>
                </div>
              </div>

              <div className="version-controls">
                <label>
                  Compare
                  <select value={compareFrom} onChange={(event) => setCompareFrom(Number(event.target.value))}>
                    {selectedArtifact.versions.map((version) => (
                      <option key={`from-${version.version}`} value={version.version}>
                        v{version.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  To
                  <select value={compareTo} onChange={(event) => setCompareTo(Number(event.target.value))}>
                    {selectedArtifact.versions.map((version) => (
                      <option key={`to-${version.version}`} value={version.version}>
                        v{version.version}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="comparison-box">
                {compareVersionA && compareVersionB ? (
                  <>
                    <div>
                      <strong>v{compareVersionA.version}</strong>
                      <p>{compareVersionA.summary}</p>
                    </div>
                    <div>
                      <strong>v{compareVersionB.version}</strong>
                      <p>{compareVersionB.summary}</p>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="timeline-list">
                {selectedArtifact.versions.map((version) => (
                  <div key={version.version} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-head">
                        <strong>Version {version.version}</strong>
                        <span>{formatDate(version.timestamp)}</span>
                      </div>
                      <p>{version.summary}</p>
                      <small>{version.author}</small>
                      <ul>
                        {version.changes.map((change) => (
                          <li key={change}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    <button type="button" className="restore-btn" onClick={() => handleRestoreVersion(version.version)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-card two-column-grid">
              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Provenance Tracking</p>
                    <h3>Origin Timeline</h3>
                  </div>
                </div>
                <div className="timeline-list compact">
                  <div className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-head">
                        <strong>Created</strong>
                        <span>{formatDate(selectedArtifact.provenance.creationTime)}</span>
                      </div>
                      <p>Created by {selectedArtifact.provenance.createdBy} using {selectedArtifact.provenance.aiModel}</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-head">
                        <strong>Prompt</strong>
                        <span>Parent v{selectedArtifact.provenance.parentVersion}</span>
                      </div>
                      <p>{selectedArtifact.provenance.promptUsed}</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-head">
                        <strong>Response</strong>
                        <span>{formatDate(selectedArtifact.provenance.lastUpdated)}</span>
                      </div>
                      <p>{selectedArtifact.provenance.generatedResponse}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Review Workflow</p>
                    <h3>Decision Center</h3>
                  </div>
                </div>
                <div className="review-actions">
                  <button type="button" className="primary-btn" onClick={() => handleReviewAction('Approved', 'Approved')}>
                    Approve
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => handleReviewAction('Rejected', 'Rejected')}>
                    Reject
                  </button>
                  <button type="button" className="muted-btn" onClick={() => handleReviewAction('Requested Changes', 'Under Review')}>
                    Request Changes
                  </button>
                </div>
                <div className="review-history-list">
                  {selectedArtifact.reviewHistory.map((entry, index) => (
                    <div key={`${entry.reviewer}-${index}`} className="history-card">
                      <strong>{entry.reviewer}</strong>
                      <span>{formatDate(entry.date)}</span>
                      <p>{entry.comments}</p>
                      <em>{entry.status}</em>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel-card two-column-grid">
              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Trust Score</p>
                    <h3>Artifact Confidence</h3>
                  </div>
                </div>
                <div className="trust-score-card">
                  <div className="score-header">
                    <strong>{trustSummary.score}</strong>
                    <span>{trustSummary.badge}</span>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${trustSummary.score}%` }} />
                  </div>
                  <p>{trustSummary.explanation}</p>
                </div>
              </div>

              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Approval History</p>
                    <h3>Decision Timeline</h3>
                  </div>
                </div>
                <div className="timeline-list compact">
                  {selectedArtifact.approvalHistory.map((approval, index) => (
                    <div key={`${approval.action}-${index}`} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="timeline-body">
                        <div className="timeline-head">
                          <strong>{approval.action}</strong>
                          <span>{formatDate(approval.date)}</span>
                        </div>
                        <p>{approval.comment}</p>
                        <small>{approval.reviewer}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel-card two-column-grid">
              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Verification Report</p>
                    <h3>Artifact Validation Result</h3>
                  </div>
                </div>
                <div className="verification-box">
                  <div className="verification-row">
                    <span>Status</span>
                    <strong>{selectedArtifact.verification.status}</strong>
                  </div>
                  <div className="verification-row">
                    <span>Generated</span>
                    <strong>{formatDate(selectedArtifact.verification.generatedAt)}</strong>
                  </div>
                  <p>{selectedArtifact.verification.result}</p>
                  <button type="button" className="secondary-btn">Download PDF</button>
                </div>
              </div>

              <div>
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Audit Logs</p>
                    <h3>Action History</h3>
                  </div>
                  <select value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)}>
                    <option value="All">All</option>
                    <option value="Artifact Created">Artifact Created</option>
                    <option value="Edited">Edited</option>
                    <option value="Version Restored">Version Restored</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Verification Generated">Verification Generated</option>
                  </select>
                </div>
                <div className="audit-list">
                  {auditEntries.map((entry, index) => (
                    <div key={`${entry.action}-${index}`} className="audit-item">
                      <div>
                        <strong>{entry.action}</strong>
                        <p>{entry.user}</p>
                      </div>
                      <span>{formatDate(entry.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  )
}
