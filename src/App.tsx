import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import "./App.css";

type Section = "projects" | "team" | "profile" | "plans";
type AssignableRole = "admin" | "member" | "reviewer" | "viewer";

function App() {
  return (
    <>
      <Show when="signed-out"><Landing /></Show>
      <Show when="signed-in"><Workspace /></Show>
    </>
  );
}

function Landing() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <div className="brand"><span className="brand-mark">A</span>Artifactos</div>
        <div className="nav-actions">
          <SignInButton mode="modal"><button className="button ghost">Sign in</button></SignInButton>
          <SignUpButton mode="modal"><button className="button primary">Create account</button></SignUpButton>
        </div>
      </nav>
      <section className="hero-section">
        <div className="eyebrow">Unified AI workspace</div>
        <h1>Manage trusted AI work in one place.</h1>
        <p>Build projects, invite collaborators, control access and manage every AI-generated artifact with clear ownership.</p>
        <SignUpButton mode="modal"><button className="button primary large">Start building</button></SignUpButton>
      </section>
    </main>
  );
}

function Workspace() {
  const { user: clerkUser, isLoaded } = useUser();
  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const currentUser = useQuery(api.users.current);
  const projects = useQuery(api.projects.listMine, { includeArchived: true });
  const myInvitations = useQuery(api.team.listMyInvitations);
  const acceptInvitation = useMutation(api.team.acceptInvitation);
  const rejectInvitation = useMutation(api.team.rejectInvitation);

  const [section, setSection] = useState<Section>("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (isLoaded && clerkUser) {
      void syncCurrentUser({}).catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Could not synchronise your account.");
      });
    }
  }, [isLoaded, clerkUser?.id, syncCurrentUser]);

  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId]);

  async function runAction(action: () => Promise<unknown>, success: string) {
    try {
      setNotice("");
      await action();
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  if (!currentUser || projects === undefined) {
    return <div className="loading-screen"><div className="spinner" />Preparing your workspace…</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand"><span className="brand-mark">A</span>Artifactos</div>
        <div className="user-summary">
          <strong>{currentUser?.name ?? clerkUser?.fullName ?? "Artifactos user"}</strong>
          <span>{currentUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress}</span>
        </div>
        <nav className="sidebar-nav">
          <SidebarButton active={section === "projects"} onClick={() => setSection("projects")} label="Projects" />
          <SidebarButton active={section === "team"} onClick={() => setSection("team")} label="Team management" />
          <SidebarButton active={section === "profile"} onClick={() => setSection("profile")} label="Profile" />
          <SidebarButton active={section === "plans"} onClick={() => setSection("plans")} label="Subscription" />
        </nav>
        <div className="sidebar-bottom"><UserButton showName /></div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div><div className="eyebrow">Member 1 workspace</div><h1>{sectionTitle(section)}</h1></div>
          <div className="plan-badge">{currentUser?.plan ?? "free"} plan</div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        {myInvitations && myInvitations.length > 0 && (
          <section className="card invitation-banner">
            <div><strong>You have {myInvitations.length} pending invitation(s)</strong><p>Accept an invitation to join its project.</p></div>
            <div className="invitation-list">
              {myInvitations.map((invitation) => (
                <div className="invitation-row" key={invitation._id}>
                  <span><strong>{invitation.projectName}</strong> · {invitation.role}</span>
                  <div className="row-actions">
                    <button className="button primary small" onClick={() => runAction(() => acceptInvitation({ invitationId: invitation._id }), "Invitation accepted.")}>Accept</button>
                    <button className="button ghost small" onClick={() => runAction(() => rejectInvitation({ invitationId: invitation._id }), "Invitation rejected.")}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {section === "projects" && <ProjectsPage projects={projects} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} setSection={setSection} runAction={runAction} />}
        {section === "team" && <TeamPage projects={projects} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} runAction={runAction} />}
        {section === "profile" && <ProfilePage user={currentUser} runAction={runAction} />}
        {section === "plans" && <PlansPage runAction={runAction} />}
      </main>
    </div>
  );
}

function SidebarButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button className={`sidebar-link ${active ? "active" : ""}`} onClick={onClick}>{label}</button>;
}

function sectionTitle(section: Section) {
  return { projects: "Project dashboard", team: "Team management", profile: "Your profile", plans: "Subscription plans" }[section];
}

function ProjectsPage({ projects, selectedProjectId, setSelectedProjectId, setSection, runAction }: {
  projects: NonNullable<ReturnType<typeof useQuery<typeof api.projects.listMine>>>;
  selectedProjectId: Id<"projects"> | null;
  setSelectedProjectId: (id: Id<"projects">) => void;
  setSection: (section: Section) => void;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const createProject = useMutation(api.projects.create);
  const setArchived = useMutation(api.projects.setArchived);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runAction(async () => {
      const id = await createProject({ name, description });
      setSelectedProjectId(id);
      setName("");
      setDescription("");
    }, "Project created.");
  }

  const activeProjects = projects.filter((project) => project.status === "active");
  const archivedProjects = projects.filter((project) => project.status === "archived");

  return (
    <div className="content-grid">
      <section className="card">
        <h2>Create a project</h2>
        <form className="form-stack" onSubmit={submit}>
          <label>Project name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product Research" required /></label>
          <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will your team work on?" rows={4} /></label>
          <button className="button primary" type="submit">Create project</button>
        </form>
      </section>

      <section className="card span-two">
        <div className="section-heading"><div><h2>Your projects</h2><p>{activeProjects.length} active · {archivedProjects.length} archived</p></div></div>
        {projects.length === 0 ? <EmptyState title="No projects yet" text="Create your first Artifactos workspace using the form." /> : (
          <div className="project-grid">
            {projects.map((project) => (
              <article className={`project-card ${selectedProjectId === project._id ? "selected" : ""}`} key={project._id}>
                <div className="project-card-top"><span className={`status ${project.status}`}>{project.status}</span><span className="role-pill">{project.role}</span></div>
                <h3>{project.name}</h3><p>{project.description || "No description added."}</p>
                <div className="row-actions">
                  <button className="button primary small" onClick={() => { setSelectedProjectId(project._id); setSection("team"); }}>Open team</button>
                  {(project.role === "owner" || project.role === "admin") && <button className="button ghost small" onClick={() => runAction(() => setArchived({ projectId: project._id, archived: project.status !== "archived" }), project.status === "archived" ? "Project restored." : "Project archived.")}>{project.status === "archived" ? "Restore" : "Archive"}</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamPage({ projects, selectedProjectId, setSelectedProjectId, runAction }: {
  projects: NonNullable<ReturnType<typeof useQuery<typeof api.projects.listMine>>>;
  selectedProjectId: Id<"projects"> | null;
  setSelectedProjectId: (id: Id<"projects">) => void;
  runAction: (action: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const project = useQuery(api.projects.get, selectedProjectId ? { projectId: selectedProjectId } : "skip");
  const members = useQuery(api.team.listMembers, selectedProjectId ? { projectId: selectedProjectId } : "skip");
  const invitations = useQuery(api.team.listProjectInvitations, selectedProjectId && (project?.role === "owner" || project?.role === "admin") ? { projectId: selectedProjectId } : "skip");
  const inviteMember = useMutation(api.team.inviteMember);
  const updateRole = useMutation(api.team.updateMemberRole);
  const removeMember = useMutation(api.team.removeMember);
  const revokeInvitation = useMutation(api.team.revokeInvitation);
  const leaveProject = useMutation(api.team.leaveProject);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("member");

  if (projects.length === 0) return <EmptyState title="Create a project first" text="Team management becomes available after you create a project." />;

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return;
    await runAction(async () => {
      await inviteMember({ projectId: selectedProjectId, email, role });
      setEmail("");
    }, "Invitation created. The teammate can accept it after signing in with that email.");
  }

  const canManage = project?.role === "owner" || project?.role === "admin";

  return (
    <div className="content-grid">
      <section className="card span-three compact-card">
        <label>Select project<select value={selectedProjectId ?? ""} onChange={(e) => setSelectedProjectId(e.target.value as Id<"projects">)}>{projects.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.role})</option>)}</select></label>
      </section>

      {project && <section className="card span-three project-overview"><div><h2>{project.name}</h2><p>{project.description || "No description"}</p></div><div className="metrics"><div><strong>{project.memberCount}</strong><span>Members</span></div><div><strong>{project.pendingInvitationCount}</strong><span>Pending</span></div><div><strong>{project.role}</strong><span>Your role</span></div></div></section>}

      {canManage && <section className="card"><h2>Invite teammate</h2><form className="form-stack" onSubmit={submitInvite}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teammate@example.com" /></label><label>Role<select value={role} onChange={(e) => setRole(e.target.value as AssignableRole)}><option value="admin">Admin</option><option value="member">Member</option><option value="reviewer">Reviewer</option><option value="viewer">Viewer</option></select></label><button className="button primary">Send invitation</button></form></section>}

      <section className={`card ${canManage ? "span-two" : "span-three"}`}><div className="section-heading"><div><h2>Project members</h2><p>Roles are enforced by the Convex backend.</p></div></div>{members === undefined ? <div className="spinner" /> : <div className="table-list">{members.map((member) => <div className="member-row" key={member.membershipId}><div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div><div className="member-main"><strong>{member.name}</strong><span>{member.email}</span></div>{canManage && member.role !== "owner" ? <select value={member.role} onChange={(e) => runAction(() => updateRole({ membershipId: member.membershipId, role: e.target.value as AssignableRole }), "Member role updated.")}><option value="admin">Admin</option><option value="member">Member</option><option value="reviewer">Reviewer</option><option value="viewer">Viewer</option></select> : <span className="role-pill">{member.role}</span>}{canManage && member.role !== "owner" && <button className="icon-button danger" onClick={() => window.confirm(`Remove ${member.name}?`) && runAction(() => removeMember({ membershipId: member.membershipId }), "Member removed.")}>Remove</button>}</div>)}</div>}</section>

      {canManage && invitations && <section className="card span-three"><h2>Invitation history</h2>{invitations.length === 0 ? <p className="muted">No invitations sent.</p> : <div className="table-list">{invitations.map((invitation) => <div className="invitation-row" key={invitation._id}><span><strong>{invitation.email}</strong> · {invitation.role}</span><span className={`status ${invitation.status}`}>{invitation.status}</span>{invitation.status === "pending" && <button className="button ghost small" onClick={() => runAction(() => revokeInvitation({ invitationId: invitation._id }), "Invitation revoked.")}>Revoke</button>}</div>)}</div>}</section>}

      {selectedProjectId && project?.role !== "owner" && <section className="card span-three danger-zone"><div><h3>Leave project</h3><p>You will lose access until another invitation is accepted.</p></div><button className="button danger" onClick={() => window.confirm("Leave this project?") && runAction(() => leaveProject({ projectId: selectedProjectId }), "You left the project.")}>Leave project</button></section>}
    </div>
  );
}

function ProfilePage({ user, runAction }: { user: NonNullable<ReturnType<typeof useQuery<typeof api.users.current>>>; runAction: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  useEffect(() => { if (user) { setName(user.name); setBio(user.bio ?? ""); } }, [user?._id, user?.name, user?.bio]);

  if (!user) return <div className="loading-screen"><div className="spinner" />Synchronising profile…</div>;
  return <div className="content-grid"><section className="card"><div className="profile-hero"><div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><h2>{user.name}</h2><p>{user.email}</p><span className="plan-badge">{user.plan} plan</span></div></div></section><section className="card span-two"><h2>Edit profile</h2><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void runAction(() => updateProfile({ name, bio }), "Profile updated."); }}><label>Display name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><label>Email<input value={user.email} disabled /></label><label>Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={5} placeholder="Tell your teammates about your role." /></label><div className="character-count">{bio.length}/300</div><button className="button primary">Save profile</button></form></section></div>;
}

function PlansPage({ runAction }: { runAction: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const plans = useQuery(api.subscriptions.listPlans);
  const subscription = useQuery(api.subscriptions.current);
  const changePlan = useMutation(api.subscriptions.changePlan);
  if (!plans || !subscription) return <div className="spinner" />;
  return <div className="plans-grid">{plans.map((plan) => <article className={`plan-card ${subscription.plan === plan.id ? "current" : ""}`} key={plan.id}><div className="plan-top"><h2>{plan.name}</h2>{subscription.plan === plan.id && <span className="status active">Current</span>}</div><div className="price">{plan.price}</div><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><button className={`button ${subscription.plan === plan.id ? "ghost" : "primary"}`} disabled={subscription.plan === plan.id} onClick={() => runAction(() => changePlan({ plan: plan.id }), `Plan changed to ${plan.name}.`)}>{subscription.plan === plan.id ? "Current plan" : `Choose ${plan.name}`}</button></article>)}</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><div className="empty-icon">A</div><h3>{title}</h3><p>{text}</p></div>;
}

export default App;
