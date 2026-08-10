import { useMemo, useState } from 'react'
import './ProjectWorkspace.css'

type Project = {
  id: string
  name: string
  description: string
  stage: 'Planning' | 'Active' | 'Review'
  focus: string
  trust: string
  team: string[]
}

const starterProjects: Project[] = [
  {
    id: 'p-1',
    name: 'Northstar Product Launch',
    description: 'Coordinate launch assets, proof points, and launch reviews across the product team.',
    stage: 'Active',
    focus: 'Launch readiness',
    trust: '92%',
    team: ['Maya Chen', 'Jordan Lee', 'Priya Singh'],
  },
  {
    id: 'p-2',
    name: 'Atlas AI Ops',
    description: 'Track trustworthy AI workflows, approvals, and verification for internal copilots.',
    stage: 'Review',
    focus: 'Ops governance',
    trust: '88%',
    team: ['Akshay Rao', 'Nia Patel', 'Liam Ortiz'],
  },
]

export function ProjectWorkspacePage() {
  const [projects, setProjects] = useState(starterProjects)
  const [selectedProjectId, setSelectedProjectId] = useState(starterProjects[0].id)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Reviewer')

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0]

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.stage === 'Active').length,
    review: projects.filter((project) => project.stage === 'Review').length,
  }), [projects])

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
      team: ['You'],
    }

    setProjects((current) => [nextProject, ...current])
    setSelectedProjectId(nextProject.id)
    setProjectName('')
    setProjectDescription('')
  }

  function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inviteName.trim() || !selectedProject) return

    setProjects((current) =>
      current.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              team: [...project.team, `${inviteName.trim()} (${inviteRole})`],
            }
          : project,
      ),
    )
    setInviteName('')
    setInviteRole('Reviewer')
  }

  return (
    <section className="project-workspace">
      <header className="page-header-card">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Run your collaborative workspaces</h2>
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

      <div className="workspace-grid">
        <form className="panel-card form-card" onSubmit={createProject}>
          <h3>Create project</h3>
          <label>
            Project name
            <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Product Research" />
          </label>
          <label>
            Description
            <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={4} placeholder="What will this workspace focus on?" />
          </label>
          <button type="submit" className="primary-btn">Create workspace</button>
        </form>

        <div className="panel-card">
          <div className="panel-title-row">
            <h3>Your projects</h3>
            <span className="muted">Select one to manage</span>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`project-chip ${project.id === selectedProjectId ? 'active' : ''}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.stage}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedProject ? (
        <div className="workspace-grid detail-grid">
          <div className="panel-card">
            <div className="panel-title-row">
              <h3>{selectedProject.name}</h3>
              <span className="pill">Trust {selectedProject.trust}</span>
            </div>
            <p>{selectedProject.description}</p>
            <div className="detail-meta">
              <div>
                <span>Focus</span>
                <strong>{selectedProject.focus}</strong>
              </div>
              <div>
                <span>Stage</span>
                <strong>{selectedProject.stage}</strong>
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title-row">
              <h3>Invite collaborators</h3>
            </div>
            <form className="invite-form" onSubmit={inviteMember}>
              <label>
                Name
                <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Alex Morgan" />
              </label>
              <label>
                Role
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                  <option value="Reviewer">Reviewer</option>
                  <option value="Editor">Editor</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <button type="submit" className="secondary-btn">Add member</button>
            </form>
            <ul className="member-list">
              {selectedProject.team.map((member) => (
                <li key={member}>{member}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  )
}
