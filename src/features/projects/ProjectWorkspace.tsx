import { useMemo, useState } from 'react'
import { artifactSeed } from '../artifacts/mockData'
import './ProjectWorkspace.css'

type Collaborator = {
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Editor' | 'Reviewer' | 'Viewer'
}

type Project = {
  id: string
  name: string
  description: string
  stage: 'Planning' | 'Active' | 'Review'
  focus: string
  trust: string
  collaborators: Collaborator[]
}

const starterProjects: Project[] = [
  {
    id: 'p-1',
    name: 'Northstar Product Launch',
    description: 'Coordinate launch assets, proof points, and launch reviews across the product team.',
    stage: 'Active',
    focus: 'Launch readiness',
    trust: '92%',
    collaborators: [
      { name: 'Maya Chen', email: 'maya.chen@artifactos.io', role: 'Owner' },
      { name: 'Jordan Lee', email: 'jordan.lee@artifactos.io', role: 'Editor' },
      { name: 'Priya Singh', email: 'priya.singh@artifactos.io', role: 'Reviewer' },
    ],
  },
  {
    id: 'p-2',
    name: 'Atlas AI Ops',
    description: 'Track trustworthy AI workflows, approvals, and verification for internal copilots.',
    stage: 'Review',
    focus: 'Ops governance',
    trust: '88%',
    collaborators: [
      { name: 'Akshay Rao', email: 'akshay.rao@artifactos.io', role: 'Owner' },
      { name: 'Nia Patel', email: 'nia.patel@artifactos.io', role: 'Admin' },
      { name: 'Liam Ortiz', email: 'liam.ortiz@artifactos.io', role: 'Viewer' },
    ],
  },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ProjectWorkspacePage() {
  const [projects, setProjects] = useState(starterProjects)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Collaborator['role']>('Reviewer')

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.stage === 'Active').length,
    review: projects.filter((project) => project.stage === 'Review').length,
  }), [projects])

  const selectedProjectArtifacts = useMemo(() => {
    if (!selectedProject) return []
    return artifactSeed.filter((artifact) => artifact.projectName === selectedProject.name)
  }, [selectedProject])

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectName.trim()) return

    const nextProject: Project = {
      id: `p-${Date.now()}`,
      name: projectName.trim(),
      description: projectDescription.trim() || 'New project ready for collaboration.',
      stage: 'Planning',
      focus: 'Knowledge capture',
      trust: '85%',
      collaborators: [{ name: 'You', email: 'you@artifactos.io', role: 'Owner' }],
    }

    setProjects((current) => [nextProject, ...current])
    setProjectName('')
    setProjectDescription('')
    setIsAddOpen(false)
  }

  function inviteCollaborator(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inviteEmail.trim() || !selectedProject) return

    const email = inviteEmail.trim().toLowerCase()
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              collaborators: project.collaborators.some((c) => c.email === email)
                ? project.collaborators
                : [...project.collaborators, { name, email, role: inviteRole }],
            }
          : project,
      ),
    )
    setInviteEmail('')
    setInviteRole('Reviewer')
  }

  if (selectedProject) {
    return (
      <section className="project-workspace">
        <header className="page-header-card">
          <div>
            <button type="button" className="back-btn" onClick={() => setSelectedProjectId(null)}>
              ← All projects
            </button>
            <h2>{selectedProject.name}</h2>
            <p className="muted">{selectedProject.description}</p>
          </div>
          <form className="invite-inline-form" onSubmit={inviteCollaborator}>
            <input
              type="email"
              required
              placeholder="Invite by email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Collaborator['role'])}>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Reviewer">Reviewer</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button type="submit" className="primary-btn">Invite</button>
          </form>
        </header>

        <div className="detail-meta">
          <div>
            <span>Focus</span>
            <strong>{selectedProject.focus}</strong>
          </div>
          <div>
            <span>Stage</span>
            <strong>{selectedProject.stage}</strong>
          </div>
          <div>
            <span>Trust</span>
            <strong>{selectedProject.trust}</strong>
          </div>
          <div>
            <span>Collaborators</span>
            <strong>{selectedProject.collaborators.length}</strong>
          </div>
        </div>

        <div className="workspace-grid detail-grid">
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>Artifacts</h3>
              <span className="muted">{selectedProjectArtifacts.length} total</span>
            </div>
            {selectedProjectArtifacts.length === 0 ? (
              <p className="muted">No artifacts yet for this project.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Created by</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProjectArtifacts.map((artifact) => (
                    <tr key={artifact.id}>
                      <td>{artifact.title}</td>
                      <td>{artifact.artifactType}</td>
                      <td>{artifact.createdBy}</td>
                      <td>
                        <span className="pill small">{artifact.reviewStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel-card">
            <div className="panel-title-row">
              <h3>Collaborators</h3>
            </div>
            <ul className="collaborator-list">
              {selectedProject.collaborators.map((collaborator) => (
                <li key={collaborator.email} className="collaborator-row">
                  <span className="avatar">{initials(collaborator.name)}</span>
                  <div className="collaborator-info">
                    <strong>{collaborator.name}</strong>
                    <span className="muted">{collaborator.email}</span>
                  </div>
                  <span className="pill small">{collaborator.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="project-workspace">
      <header className="page-header-card">
        <div className="header-left">
          <button type="button" className="primary-btn add-project-btn" onClick={() => setIsAddOpen(true)}>
            + Add project
          </button>
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Run your collaborative workspaces</h2>
          </div>
        </div>
        <div className="page-pill">{stats.total} workspaces</div>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <strong>{stats.total}</strong>
          <span>Total projects</span>
        </div>
        <div className="stat-card">
          <strong>{stats.active}</strong>
          <span>Active</span>
        </div>
        <div className="stat-card">
          <strong>{stats.review}</strong>
          <span>In review</span>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-title-row">
          <h3>Active projects</h3>
          <span className="muted">Click a project to view details</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Stage</th>
              <th>Focus</th>
              <th>Trust</th>
              <th>Collaborators</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="clickable-row"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <td>
                  <strong>{project.name}</strong>
                  <div className="muted">{project.description}</div>
                </td>
                <td>
                  <span className="pill small">{project.stage}</span>
                </td>
                <td>{project.focus}</td>
                <td>{project.trust}</td>
                <td>{project.collaborators.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddOpen ? (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <form
            className="panel-card form-card modal-card"
            onSubmit={createProject}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-title-row">
              <h3>Create project</h3>
              <button type="button" className="icon-btn" onClick={() => setIsAddOpen(false)}>
                ✕
              </button>
            </div>
            <label>
              Project name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Product Research"
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                rows={4}
                placeholder="What will this workspace focus on?"
              />
            </label>
            <button type="submit" className="primary-btn">Create workspace</button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
