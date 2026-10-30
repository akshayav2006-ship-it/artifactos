import PolicySheets, { PolicySources } from "./PolicySheets";
import { GoogleSources, GroundedText } from './GoogleSources';
import AIControls from "./AIControls";
import type { AIRequest, ModelProvenance } from "../../shared/ai";
import { ConvexError } from "convex/values";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
  Actions,
  Artifact,
  Commit,
  Data,
  Member,
  Project,
  Prompt,
  Route,
} from "../../shared/workspace";
import { canReview } from "../../shared/workspace";

type Props = {
  data: Data;
  actions: Actions;
  route: Route;
  setRoute: (route: Route) => void;
  account: ReactNode;
  userId: string;
  local: boolean;
  loading?: boolean;
  error?: string;
  loadMore?: () => void;
  more?: boolean;
};
type Pin = { id: string; title: string; route: Route };
const demoChatGPTModel: AIRequest["model"] = { id: "gpt-5.6-luna", name: "GPT-5.6-Luna", provider: "chatgpt" };
const date = (value: number) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const icons: Record<string, string> = {
  Overview: "▦",
  Chat: "✎",
  Prompt: "≡",
  Artifact: "◇",
  Project: "▱",
};
export default function Workspace({
  data,
  actions,
  route,
  setRoute,
  account,
  userId,
  local,
  loading,
  error,
  loadMore,
  more,
}: Props) {
  const demoModelKey = `artifactos-demo-model-${userId}`;
  const [ai, setAI] = useState<AIRequest | undefined>(() => {
    if (local && import.meta.env.DEV) {
      try {
        if (localStorage.getItem(demoModelKey) === demoChatGPTModel.id) return { model: demoChatGPTModel };
      } catch { /* Model selection still works when browser storage is unavailable. */ }
    }
    return undefined;
  });
  function chooseAI(next?: AIRequest) {
    setAI(next);
    if (local && import.meta.env.DEV) {
      try {
        if (next?.model.provider === "chatgpt" && next.model.id === demoChatGPTModel.id) localStorage.setItem(demoModelKey, demoChatGPTModel.id);
        else localStorage.removeItem(demoModelKey);
      } catch { /* Keep the in-memory choice if preferences cannot be persisted. */ }
    }
  }
  const [geminiKey, setGeminiKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [modal, setModal] = useState<"project" | "invite" | null>(null);
  const [pins, setPins] = useState<Pin[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`artifactos-pins-${userId}`) || "[]",
      );
    } catch {
      return [];
    }
  });
  const project = data.projects.find((p) => p.id === route.projectId);
  const chat = data.chats.find((c) => c.id === route.chatId);
  const navigate = (next: Route) => {
    setRoute(next);
    setSearch("");
    setNotice("");
  };
  const newChat = (projectId?: string) => navigate({ page: "Chat", projectId });
  const run = async (action: () => Promise<unknown>, message?: string) => {
    if (busy) return false;
    setBusy(true);
    setNotice("");
    try {
      await action();
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setNotice(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : e instanceof Error
            ? e.message
            : "The change could not be saved.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  function pin(id: string, title: string, target: Route) {
    const next = pins.some((p) => p.id === id)
      ? pins.filter((p) => p.id !== id)
      : [...pins, { id, title, route: target }];
    try {
      localStorage.setItem(`artifactos-pins-${userId}`, JSON.stringify(next));
      setPins(next);
    } catch {
      setNotice("Could not save your pinned items.");
    }
  }
  function pinButton(id: string, title: string, target: Route) {
    return (
      <button
        className={`pin-button ${pins.some((p) => p.id === id) ? "is-pinned" : ""}`}
        aria-label={`${pins.some((p) => p.id === id) ? "Unpin" : "Pin"} ${title}`}
        onClick={() => pin(id, title, target)}
      >
        {pins.some((p) => p.id === id) ? "★" : "☆"}
      </button>
    );
  }
  const matches = (value: string) =>
    value.toLowerCase().includes(search.toLowerCase());
  const projectCards = (page: Route["page"]) => (
    <div className="project-grid">
      {data.projects
        .filter((p) => matches(p.name))
        .map((p) => (
          <div className="project-choice" key={p.id}>
            <button onClick={() => navigate({ page, projectId: p.id })}>
              <span className="folder-icon">▱</span>
              <strong>{p.name}</strong>
              <small>{p.description || "Project workspace"}</small>
              <span className="project-role">
                {p.role} <span>↗</span>
              </span>
            </button>
            {pinButton(p.id, p.name, { page: "Project", projectId: p.id })}
          </div>
        ))}
    </div>
  );
  const scopedPrompts = data.prompts.filter(
    (p) => p.saved !== false && p.projectId === (route.projectId || ""),
  );
  const scopedArtifacts = data.artifacts.filter(
    (a) => a.projectId === route.projectId,
  );
  const title =
    route.page === "Overview"
      ? "Overview"
      : route.page === "Chat"
        ? chat?.title || "New chat"
        : project?.name || (route.page === "Prompt" ? "Prompts" : "Artifacts");
  return (
    <div className={`shell codex-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="codex-sidebar">
        <div className="sidebar-top">
          <button
            className="wordmark"
            onClick={() => navigate({ page: "Overview" })}
          >
            ✳ <span>Artifactos</span>
          </button>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            ◫
          </button>
        </div>
        <nav className="primary-nav">
          {(["Overview", "Chat", "Prompt", "Artifact"] as const).map((page) => (
            <button
              key={page}
              title={page === "Chat" ? "New chat" : page}
              className={route.page === page ? "active" : ""}
              onClick={() => (page === "Chat" ? newChat() : navigate({ page }))}
            >
              <i>{icons[page]}</i>
              <span>{page === "Chat" ? "New chat" : page}</span>
              {page === "Chat" && <kbd>↗</kbd>}
            </button>
          ))}
        </nav>
        <div className="sidebar-group">
          <button
            className="group-label"
            aria-expanded={pinsOpen}
            onClick={() => setPinsOpen(!pinsOpen)}
          >
            <span>{pinsOpen ? "⌄" : "›"} &nbsp;Pinned</span>
          </button>
          {pinsOpen && (
            <div className="sidebar-items">
              {pins.length ? (
                pins.map((p) => (
                  <div className="sidebar-item" key={p.id}>
                    <button onClick={() => navigate(p.route)}>
                      <span>♧</span>
                      <span>{p.title}</span>
                    </button>
                    <button
                      className="item-action"
                      aria-label={`Unpin ${p.title}`}
                      onClick={() => pin(p.id, p.title, p.route)}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <p className="sidebar-empty">
                  Pin a project or chat for quick access.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="sidebar-group">
          <div className="group-heading">
            <button
              className="group-label"
              aria-expanded={projectsOpen}
              onClick={() => setProjectsOpen(!projectsOpen)}
            >
              <span>{projectsOpen ? "⌄" : "›"} &nbsp;Projects</span>
            </button>
            <button
              className="add-project"
              onClick={() => setModal("project")}
              aria-label="Create project"
            >
              ＋
            </button>
          </div>
          {projectsOpen && (
            <div className="sidebar-items">
              {data.projects.map((p) => (
                <div
                  className={`sidebar-item ${route.projectId === p.id ? "selected" : ""}`}
                  key={p.id}
                >
                  <button
                    onClick={() =>
                      navigate({ page: "Project", projectId: p.id })
                    }
                  >
                    <span>▱</span>
                    <span>{p.name}</span>
                  </button>
                  {pinButton(p.id, p.name, {
                    page: "Project",
                    projectId: p.id,
                  })}
                </div>
              ))}
              {!data.projects.length && (
                <button
                  className="sidebar-create"
                  onClick={() => setModal("project")}
                >
                  ＋ Create your first project
                </button>
              )}
            </div>
          )}
        </div>
        <div className="sidebar-group recent-group">
          <div className="group-label">Recent chats</div>
          {data.chats.slice(0, 8).map((c) => (
            <div
              className={`sidebar-item ${route.chatId === c.id ? "selected" : ""}`}
              key={c.id}
            >
              <button
                onClick={() =>
                  navigate({
                    page: "Chat",
                    chatId: c.id,
                    projectId: c.projectId || undefined,
                  })
                }
              >
                <span>◌</span>
                <span>{c.title}</span>
              </button>
              {pinButton(c.id, c.title, {
                page: "Chat",
                chatId: c.id,
                projectId: c.projectId || undefined,
              })}
            </div>
          ))}
        </div>
        <div className="sidebar-account">{account}</div>
      </aside>
      <main>
        <header className="workspace-header">
          <div className="breadcrumb">
            <span>Artifactos</span>
            <b>/</b>
            {title}
          </div>
          <div className="header-right">
            {chat && pinButton(chat.id, chat.title, route)}
            <span className="local-badge">
              <span className="green-dot" />
              {local ? "Local workspace" : "Shared workspace"}
            </span>
          </div>
        </header>
        <div
          className={`content ${route.page === "Chat" ? "chat-content" : ""}`}
        >
          {(notice || error) && (
            <div role="status" className="notice">
              <span>{notice || error}</span>
              <button aria-label="Dismiss" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {(data.approvals || []).map((a) => (
            <div className="invitation-banner" key={a.id}>
              <span><strong>{a.title}</strong> by {a.author} in {a.projectName} needs your approval.</span>
              <button className="primary" onClick={() => navigate({ page: "Artifact", projectId: a.projectId, artifactId: a.id })}>Review submission</button>
            </div>
          ))}
          {data.incoming.map((i) => (
            <div className="invitation-banner" key={i.id}>
              <span>
                You’re invited to <strong>{i.projectName}</strong> as {i.role}.
              </span>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => actions.accept(i.id),
                    "Invitation accepted. Open your project from the sidebar.",
                  )
                }
              >
                Accept invitation
              </button>
            </div>
          ))}
          {loading ? (
            <div className="empty">
              <h3>Loading workspace…</h3>
            </div>
          ) : route.page === "Overview" ? (
            <>
              <div className="heading">
                <div>
                  <div className="eyebrow">YOUR CREATIVE COMMAND CENTER</div>
                  <h1>A little space for big ideas.</h1>
                  <p>
                    Bring your conversations, knowledge, and creations together.
                  </p>
                </div>
                <button className="primary" onClick={() => setModal("project")}>
                  ＋ New project
                </button>
              </div>
              <div className="toolbar">
                <label className="search">
                  ⌕{" "}
                  <input
                    aria-label="Search workspace"
                    placeholder="Search your workspace…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <span className="quiet">A home for work in progress</span>
              </div>
              <div className="stats">
                {[
                  ["Projects", data.projects.length, "Project"],
                  ["Conversations", data.chats.length, "Chat"],
                  ["Artifacts", data.artifacts.length, "Artifact"],
                  ["Prompt history", data.prompts.filter(p => p.saved !== false).length, "Prompt"],
                ].map(([name, count, page]) => (
                  <button
                    key={name}
                    onClick={() =>
                      page === "Project"
                        ? setModal("project")
                        : navigate({ page: page as Route["page"] })
                    }
                  >
                    <span>
                      {icons[page]} <span>{name}</span>
                    </span>
                    <strong>
                      {count}
                      <small>↗</small>
                    </strong>
                  </button>
                ))}
              </div>
              <section className="welcome">
                <div>
                  <span className="tag">FROM SPARK TO SOMETHING REAL</span>
                  <h2>Your next idea belongs here.</h2>
                  <p>
                    Start a conversation. Capture a prompt. Create something
                    worth keeping.
                  </p>
                  <button className="primary" onClick={() => newChat()}>
                    Start a conversation ↗
                  </button>
                </div>
                <div className="orb" aria-hidden="true">
                  <span>✳</span>
                </div>
              </section>
              <section className="panel">
                <Section
                  title="Your projects"
                  action="New project"
                  onClick={() => setModal("project")}
                />
                {data.projects.length ? (
                  projectCards("Project")
                ) : (
                  <Empty
                    title="No projects yet"
                    text="Make room for your next great idea."
                    action="New project"
                    onClick={() => setModal("project")}
                  />
                )}
              </section>
              <div className="two-column">
                <section className="panel">
                  <Section
                    title="Recent conversations"
                    action="New"
                    onClick={() => newChat()}
                  />
                  {data.chats.length ? (
                    data.chats
                      .filter((c) => matches(c.title))
                      .slice(0, 4)
                      .map((c) => (
                        <button
                          className="entry"
                          key={c.id}
                          onClick={() =>
                            navigate({
                              page: "Chat",
                              chatId: c.id,
                              projectId: c.projectId || undefined,
                            })
                          }
                        >
                          <span className="entry-icon">◌</span>
                          <span>
                            <strong>{c.title}</strong>
                            <small>{date(c.createdAt)}</small>
                          </span>
                          <span className="arrow">↗</span>
                        </button>
                      ))
                  ) : (
                    <Empty
                      title="No conversations yet"
                      text="Make room for your next great idea."
                      action="New conversation"
                      onClick={() => newChat()}
                    />
                  )}
                </section>
                <section className="panel">
                  <Section
                    title="Saved artifacts"
                    action="Create"
                    onClick={() => newChat()}
                  />
                  {data.artifacts.length ? (
                    data.artifacts
                      .filter((a) => matches(a.title))
                      .slice(0, 4)
                      .map((a) => (
                        <button
                          className="entry"
                          key={a.id}
                          onClick={() =>
                            navigate({
                              page: "Artifact",
                              projectId: a.projectId,
                            })
                          }
                        >
                          <span className="entry-icon">◇</span>
                          <span>
                            <strong>{a.title}</strong>
                            <small>
                              {a.author} · {date(a.createdAt)}
                            </small>
                          </span>
                          <span className="arrow">↗</span>
                        </button>
                      ))
                  ) : (
                    <Empty
                      title="No artifacts yet"
                      text="Make room for your next great idea."
                      action="Create artifact in chat"
                      onClick={() => newChat()}
                    />
                  )}
                </section>
              </div>
            </>
          ) : route.page === "Chat" ? (
            <ChatView
              ai={ai}
              aiControls={<AIControls apiKey={geminiKey} setApiKey={setGeminiKey} local={local} value={ai} onChange={chooseAI} busy={busy} />}
              key={route.chatId || `new-${route.projectId || "personal"}`}
              data={data}
              route={route}
              actions={actions}
              userId={userId}
              busy={busy}
              run={run}
              navigate={navigate}
              local={local}
            />
          ) : route.page === "Project" ? (
            project ? (
              <ProjectView
                key={project.id}
                project={project}
                data={data}
                userId={userId}
                actions={actions}
                run={run}
                busy={busy}
                local={local}
                invite={() => setModal("invite")}
                newChat={() => newChat(project.id)}
                navigate={navigate}
              />
            ) : (
              <Empty
                title="Project unavailable"
                text="Choose a project from the sidebar or create one to get started."
                action="Create project"
                onClick={() => setModal("project")}
              />
            )
          ) : (
            <>
              <div className="library-heading">
                <div className="eyebrow">PROJECT LIBRARY</div>
                <h1>{route.page === "Prompt" ? "Prompts" : "Artifacts"}</h1>
                <p>
                  {route.page === "Prompt"
                    ? "The thinking behind every result. Organized by project."
                    : "Committed in chat. Pushed for review. Kept together here."}
                </p>
              </div>
              {project ? (
                <>
                  <div className="library-breadcrumb">
                    <button
                      className="subtle"
                      onClick={() => navigate({ page: route.page })}
                    >
                      ← All projects
                    </button>
                    <span>▱ {project.name}</span>
                    <button
                      className="subtle"
                      onClick={() =>
                        navigate({ page: "Project", projectId: project.id })
                      }
                    >
                      Open project ↗
                    </button>
                  </div>
                  {route.page === "Prompt" ? (
                    <PromptList
                      prompts={scopedPrompts}
                      artifacts={scopedArtifacts}
                      navigate={navigate}
                    />
                  ) : (
                    <ArtifactList
                      artifacts={scopedArtifacts}
                      selectedArtifactId={route.artifactId}
                      project={project}
                      userId={userId}
                      actions={actions}
                      busy={busy}
                      run={run}
                      local={local}
                    />
                  )}
                </>
              ) : (
                <>
                  {data.projects.length ? (
                    projectCards(route.page)
                  ) : (
                    <Empty
                      title="Start with a project"
                      text="Each project gets its own prompt history and artifact library."
                      action="New project"
                      onClick={() => setModal("project")}
                    />
                  )}
                </>
              )}
            </>
          )}
          {more && (
            <div className="load-more">
              <button className="secondary" onClick={loadMore}>
                Load older records
              </button>
            </div>
          )}
          {route.page !== "Chat" && (
            <footer>
              Built for your train of thought.
              <span>
                Artifactos / {local ? "Personal workspace" : "Team workspace"}
              </span>
            </footer>
          )}
        </div>
      </main>
      {modal === "project" && (
        <Modal title="Create a project" close={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                const id = await actions.createProject(
                  String(f.get("name")).trim(),
                  String(f.get("description")).trim(),
                );
                setModal(null);
                navigate({ page: "Project", projectId: id });
              }, "Project created.");
            }}
          >
            <p className="muted">
              A shared home for your chats, prompts, and artifacts.
            </p>
            <label>
              Project name
              <input
                autoFocus
                name="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Product research"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={4}
                maxLength={500}
                placeholder="What are you working toward?"
              />
            </label>
            <button className="primary" disabled={busy}>
              Create project
            </button>
          </form>
        </Modal>
      )}
      {modal === "invite" && project && (
        <Modal title={`Invite to ${project.name}`} close={() => setModal(null)}>
          {notice && (
            <p className="connection-note" role="alert">
              {notice}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                const message = await actions.invite(
                  project.id,
                  String(f.get("email")),
                  String(f.get("role")) as "member",
                );
                setNotice(message);
                setModal(null);
              });
            }}
          >
            <p className="muted">
              They’ll use this email to sign in and accept the project
              invitation.
            </p>
            {local && (
              <div className="connection-note">
                Sign in from the sidebar to send invitations. This project
                currently lives only on this device.
              </div>
            )}
            <label>
              Email address
              <input
                autoFocus
                name="email"
                type="email"
                required
                placeholder="teammate@example.com"
              />
            </label>
            <label>
              Project role
              <select name="role" defaultValue="member">
                <option value="member">
                  Contributor — chat, commit, and push
                </option>
                <option value="admin">Admin — manage and verify</option>
                <option value="reviewer">Reviewer — approve assigned submissions</option>
                <option value="viewer">Viewer — read only</option>
              </select>
            </label>
            <p className="muted">
              Owners, admins, and designated reviewers can approve submissions.
            </p>
            <button disabled={busy || local} className="primary">
              Send invitation
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export type Run = (
  action: () => Promise<unknown>,
  message?: string,
) => Promise<boolean>;
function Section({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick: () => void;
}) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && <button className="subtle" onClick={onClick}>
        ＋ {action}
      </button>}
    </div>
  );
}
function Empty({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      <span>◇</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="subtle" onClick={onClick}>
          ＋ {action}
        </button>
      )}
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const el = ref.current;
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal native-modal"
      onCancel={close}
      aria-label={title}
    >
      <div className="section-head">
        <h2>{title}</h2>
        <button className="subtle" onClick={close} aria-label="Close dialog">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ProjectView({
  project,
  data,
  userId,
  actions,
  busy,
  run,
  local,
  invite,
  newChat,
  navigate,
}: {
  project: Project;
  data: Data;
  userId: string;
  actions: Actions;
  busy: boolean;
  run: Run;
  local: boolean;
  invite: () => void;
  newChat: () => void;
  navigate: (r: Route) => void;
}) {
  const [tab, setTab] = useState("Artifacts");
  const artifacts = data.artifacts.filter((a) => a.projectId === project.id);
  const prompts = data.prompts.filter((p) => p.saved !== false && p.projectId === project.id);
  const chats = data.chats.filter((c) => c.projectId === project.id);
  const members = data.members.filter((m) => m.projectId === project.id);
  const canWrite = ["owner", "admin", "member"].includes(project.role);
  return (
    <>
      <div className="project-heading">
        <span className="project-emblem">▱</span>
        <div className="project-title-row">
          <h1>{project.name}</h1>
          <div className="project-heading-actions">
            {["owner", "admin"].includes(project.role) && (
              <button className="secondary" onClick={invite}>
                ♧ Invite collaborators
              </button>
            )}
            {canWrite && (
              <button className="primary" onClick={newChat}>
                ＋ New chat
              </button>
            )}
          </div>
        </div>
        <p>{project.description || "No description added yet."}</p>
        <div className="project-metadata">
          <span className="role-label">{project.role}</span>
          <span>
            {members.length || 1} collaborator{members.length > 1 ? "s" : ""}
          </span>
          <span>
            {artifacts.length} pushed artifact
            {artifacts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div
        className="project-tabs"
        role="tablist"
        aria-label="Project sections"
      >
        {["Artifacts", "Chats", "Prompts", "Collaborators"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            <small>
              {t === "Artifacts"
                ? artifacts.length
                : t === "Chats"
                  ? chats.length
                  : t === "Prompts"
                    ? prompts.length
                    : members.length || 1}
            </small>
          </button>
        ))}
      </div>
      {tab === "Artifacts" && (
        <ArtifactList
          artifacts={artifacts}
          project={project}
          userId={userId}
          actions={actions}
          busy={busy}
          run={run}
          local={local}
        />
      )}
      {tab === "Prompts" && (
        <PromptList
          prompts={prompts}
          artifacts={artifacts}
          navigate={navigate}
        />
      )}
      {tab === "Chats" && (
        <section className="panel">
          {chats.length ? (
            chats.map((c) => (
              <button
                className="entry"
                key={c.id}
                onClick={() =>
                  navigate({
                    page: "Chat",
                    projectId: project.id,
                    chatId: c.id,
                  })
                }
              >
                <span className="entry-icon">◌</span>
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {c.author} · {date(c.createdAt)}
                  </small>
                </span>
                <span className="arrow">↗</span>
              </button>
            ))
          ) : (
            <Empty
              title="Your project starts with a conversation"
              text="Every prompt and artifact will stay connected to this project."
              action={canWrite ? "New chat" : undefined}
              onClick={newChat}
            />
          )}
        </section>
      )}
      {tab === "Collaborators" && (
        <section className="panel">
          <Section
            title="Project collaborators"
            action={["owner", "admin"].includes(project.role) ? "Invite" : undefined}
            onClick={invite}
          />
          {members.length ? (
            members.map((m) => (
              <div className="collaborator-row" key={m.id}>
                <span className="account-avatar">{m.name.slice(0, 1)}</span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.email || "Local workspace"}</small>
                </span>
                <span className="role-label">{m.role}</span>
              </div>
            ))
          ) : (
            <div className="collaborator-row">
              <span className="account-avatar">Y</span>
              <strong>You</strong>
              <span className="role-label">Owner</span>
            </div>
          )}
          {data.invites
            .filter((i) => i.projectId === project.id)
            .map((i) => (
              <div className="collaborator-row" key={i.id}>
                <span>✉</span>
                <span>
                  <strong>{i.email}</strong>
                  <small>
                    {i.status} ·{" "}
                    {i.delivery === "sent"
                      ? "Email sent"
                      : i.delivery === "queued"
                        ? "Email queued"
                        : i.delivery === "failed"
                          ? "Email delivery failed"
                          : "Email not sent"}
                  </small>
                </span>
                <span className="role-label">{i.role}</span>
              </div>
            ))}
        </section>
      )}
    </>
  );
}
function PromptList({
  prompts,
  artifacts,
  navigate,
}: {
  prompts: Prompt[];
  artifacts: Artifact[];
  navigate: (r: Route) => void;
}) {
  const [search, setSearch] = useState("");
  const rows = prompts
    .filter(p => p.saved !== false)
    .filter((p) =>
      `${p.text} ${p.author}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  return (
    <section className="panel library-panel">
      <div className="section-head">
        <h2>Prompt history</h2>
        <input
          className="compact-search"
          aria-label="Search prompts"
          placeholder="Search prompts or contributors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="muted">
        Trust scores come from approver reviews of pushed results.
      </p>
      {rows.length ? (
        <div className="prompt-list">
          {rows.map((p) => {
            const reviewed =
              p.review ||
              artifacts
                .filter((a) => a.promptId === p.id && a.score !== undefined)
                .sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0))[0];
            return (
              <details className="prompt-item" key={p.id}>
                <summary>
                  <span className="prompt-symbol">≡</span>
                  <span className="prompt-summary">
                    <strong>{p.text}</strong>
                    <small>
                      {p.author} · {date(p.createdAt)}
                    </small>
                  </span>
                  <span className={`score ${reviewed ? "scored" : ""}`}>
                    {reviewed ? `${reviewed.score}/100` : "Not scored"}
                  </span>
                </summary>
                <div className="prompt-detail">
                  <h4>Prompt</h4>
                  <pre>{p.text}</pre>
                  <h4>Result</h4>
                  <pre>{p.result || "No result attached yet."}</pre>
                  {reviewed && (
                    <p className="muted">
                      Latest result review: {reviewed.reviewer} ·{" "}
                      {date(reviewed.reviewedAt!)} ·{" "}
                      {reviewed.status.replace("_", " ")}. Score applies to the
                      pushed snapshot “{reviewed.title}”.
                    </p>
                  )}
                  <button
                    className="subtle"
                    onClick={() =>
                      navigate({
                        page: "Chat",
                        chatId: p.chatId,
                        projectId: p.projectId || undefined,
                      })
                    }
                  >
                    Open source chat ↗
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <Empty
          title={search ? "No matching prompts" : "No prompts yet"}
          text="Use Save prompt in a project chat to keep selected prompts here with their contributor and timestamp."
        />
      )}
    </section>
  );
}
function ArtifactList({
  selectedArtifactId,
  artifacts,
  project,
  userId,
  actions,
  busy,
  run,
  local,
}: {
  selectedArtifactId?: string;
  artifacts: Artifact[];
  project: Project;
  userId: string;
  actions: Actions;
  busy: boolean;
  run: Run;
  local: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const rows = artifacts
    .filter((a) => a.id === selectedArtifactId || filter === "all" || a.status === filter)
    .sort((a, b) => b.createdAt - a.createdAt);
  return (
    <section className="panel library-panel">
      <div className="section-head">
        <div>
          <h2>Pushed artifacts</h2>
          <p className="muted">Only artifacts pushed from chat appear here.</p>
        </div>
        <select
          className="status-filter"
          aria-label="Filter artifacts"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Awaiting verification</option>
          <option value="verified">Verified</option>
          <option value="changes_requested">Changes requested</option>
        </select>
      </div>
      {rows.length ? (
        rows.map((a) => (
          <details className="artifact-item" key={a.id} open={a.id === selectedArtifactId || undefined}>
            <summary>
              <span className="artifact-file-icon">◇</span>
              <span className="prompt-summary">
                <strong>{a.title}</strong>
                <small>
                  {a.author} · Pushed {date(a.createdAt)}
                </small>
              </span>
              <span className={`status-badge ${a.status}`}>
                {a.status === "pending"
                  ? "Awaiting verification"
                  : a.status === "verified"
                    ? "Verified"
                    : "Changes requested"}
              </span>
            </summary>
            <div className="artifact-detail">
              <div className="artifact-meta">
                <span>Commit {a.commitId.slice(-7)}</span>
                <span>{a.message}</span>
              </div>
              {a.status === "pending" && !local && a.approvers && (
                <div className="review-help">
                  {a.approvers.length ? <>Assigned approvers: {a.approvers.map(p => `${p.name} (${p.delivery === "not_configured" ? "email unavailable; notified in workspace" : p.delivery === "failed" ? "email failed; notified in workspace" : `email ${p.delivery}`})`).join(", ")}. {a.approvers.filter(p => p.decision === "verified").length}/{a.requiredApprovals ?? 1} approvals received. {a.requiredApprovals ? "Every required approver must approve." : "One assigned owner or admin review completes this request."}</> : "No eligible approvers are assigned. Add another project owner or admin to review this contribution."}
                </div>
              )}
              {a.approvers?.filter(p => p.decision).map(p => (
                <div className="review-record" key={p.userId}>
                  <strong>{p.name}: {p.decision === "verified" ? "Approved" : "Changes requested"} · {p.score}/100</strong>
                  <p>{p.feedback}</p>
                  <small>{date(p.reviewedAt!)}</small>
                </div>
              ))}
              <pre className="artifact-body">{a.body}</pre>
              <button
                className="subtle"
                onClick={() => download(a.title, a.body)}
              >
                Download artifact ↓
              </button>
              {a.score !== undefined && (
                <div className="review-record">
                  <strong>Trust score {a.score}/100</strong>
                  <p>{a.feedback}</p>
                  <small>
                    Reviewed by {a.reviewer} · {date(a.reviewedAt!)}
                  </small>
                </div>
              )}
              {a.status === "pending" &&
              !local &&
              canReview(project.role, a.authorId, userId) && (a.approvers?.length ? a.approvers.some(p => p.userId === userId && !p.decision) : a.requiredApprovals === undefined && project.role !== "reviewer") ? (
                <form
                  className="review-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(
                      () =>
                        actions.review(
                          a.id,
                          String(f.get("decision")) as "verified",
                          Number(f.get("score")),
                          String(f.get("feedback")),
                        ),
                      "Review saved.",
                    );
                  }}
                >
                  <h3>Verify this artifact</h3>
                  <div className="form-pair">
                    <label>
                      Decision
                      <select name="decision">
                        <option value="verified">Verify</option>
                        <option value="changes_requested">
                          Request changes
                        </option>
                      </select>
                    </label>
                    <label>
                      Trust score (0–100)
                      <input
                        name="score"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Review notes
                    <textarea
                      name="feedback"
                      required
                      rows={3}
                      maxLength={2000}
                      placeholder="Explain the score and any changes needed."
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Submit review
                  </button>
                </form>
              ) : (
                a.status === "pending" && (
                  <p className="review-help">
                    {local
                      ? "Sign in to a shared project to have another owner or admin verify this artifact."
                      : a.authorId === userId
                        ? "Your designated approvers must verify your contribution."
                        : "Waiting for the remaining designated approvers to review this artifact."}
                  </p>
                )
              )}
            </div>
          </details>
        ))
      ) : (
        <Empty
          title="No pushed artifacts here yet"
          text="Create a commit in a project chat, select it as the final version, then submit it for owner/admin verification."
        />
      )}
    </section>
  );
}
function download(title: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9 -]/gi, "") || "artifact"}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
function ChatView({
  ai,
  aiControls,
  data,
  route,
  actions,
  userId,
  busy,
  run,
  navigate,
  local,
}: {
  ai?: AIRequest;
  aiControls: ReactNode;
  data: Data;
  route: Route;
  actions: Actions;
  userId: string;
  busy: boolean;
  run: Run;
  navigate: (r: Route) => void;
  local: boolean;
}) {
  const chat = data.chats.find((c) => c.id === route.chatId);
  const [projectId, setProjectId] = useState(route.projectId || "");
  const [text, setText] = useState("");
  const [policySelection, setPolicySelection] = useState<{ projectId: string; ids: string[] }>({ projectId: "", ids: [] });
  const [commitPrompt, setCommitPrompt] = useState<Prompt | null>(null);
  const [resultPrompt, setResultPrompt] = useState<Prompt | null>(null);
  const [showCommits, setShowCommits] = useState(true);
  const prompts = data.prompts
    .filter((p) => p.chatId === route.chatId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const commits = data.commits.filter((c) => c.chatId === route.chatId);
  const project = data.projects.find(
    (p) => p.id === (chat?.projectId || projectId),
  );
  const ownChat = !chat || chat.authorId === userId;
  const canWrite =
    ownChat &&
    (!project || ["owner", "admin", "member"].includes(project.role));
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    const message = text.trim();
    await run(
      async () => {
        let id = chat?.id;
        if (!id)
          id = await actions.createChat(projectId, message.slice(0, 100));
        setText("");
        navigate({
          page: "Chat",
          chatId: id,
          projectId: projectId || undefined,
        });
        await actions.sendPrompt(id, message, ai ? { ...ai, policyIds: policySelection.projectId === project?.id ? policySelection.ids : [] } : undefined);
      },
      ai ? undefined : local
        ? "Prompt saved on this device."
        : "Prompt saved to the project history.",
    );
  }
  return (
    <div
      className={`chat-workspace ${showCommits && chat ? "with-commits" : ""}`}
    >
      <div className="chat-column">
        {aiControls}
        <div className="chat-toolbar">
          <label className="project-picker">
            <span>▱</span>
            <select
              aria-label="Chat project"
              value={chat?.projectId || projectId}
              disabled={busy || commits.length > 0 || !canWrite}
              onChange={(e) => {
                const value = e.target.value;
                if (chat)
                  void run(async () => {
                    await actions.assignChat(chat.id, value);
                    setProjectId(value);
                    navigate({
                      page: "Chat",
                      chatId: chat.id,
                      projectId: value || undefined,
                    });
                  }, "Chat moved to the selected project.");
                else setProjectId(value);
              }}
            >
              <option value="">No project</option>
              {data.projects
                .filter((p) => ["owner", "admin", "member"].includes(p.role))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          {chat && (
            <button
              className="subtle"
              onClick={() => setShowCommits(!showCommits)}
            >
              ◇ Commits <span className="count-pill">{commits.length}</span>
            </button>
          )}
        </div>
        {commits.length > 0 && (
          <p className="project-lock-note">
            Project is fixed after the first commit to preserve its history.
          </p>
        )}
        {project && <PolicySheets key={project.id} projectId={project.id} actions={actions} canWrite={canWrite && !busy} selected={policySelection.projectId === project.id ? policySelection.ids : []} select={ids => setPolicySelection({ projectId: project.id, ids })} />}
        <div className="chat-messages">
          {!prompts.length ? (
            <div className="chat-welcome">
              <div className="chat-mark">✳</div>
              <h1>What are we working on?</h1>
              <p>
                Choose your model and chat. Save useful prompts, then attach results manually.
              </p>
              <div className="chat-suggestions">
                <button onClick={() => setText("Help me explore ideas for ")}>
                  ✧ Explore an idea
                </button>
                <button onClick={() => setText("Draft a plan for ")}>
                  ▤ Draft a plan
                </button>
                <button onClick={() => setText("Review the following work: ")}>
                  ◎ Review my work
                </button>
              </div>
            </div>
          ) : (
            prompts.map((p) => (
              <article className="chat-turn" key={p.id}>
                <div className="message-meta">
                  <span className="account-avatar">{p.author.slice(0, 1)}</span>
                  <strong>{p.author}</strong>
                  <time>{date(p.createdAt)}</time>
                </div>
                <pre className="user-message">{p.text}</pre>
                {p.reply && (
                  <div className="result-message">
                    <div className="message-meta"><span>✳</span><strong>{p.replyProvenance?.requestedModel || "AI reply"}</strong></div>
                    <GroundedText text={p.reply} grounding={p.replyProvenance?.grounding} />
                    {p.replyProvenance && <ModelDetails model={p.replyProvenance} />}
                  </div>
                )}
                {p.result ? (
                  <div className="result-message">
                    <div className="message-meta">
                      <span>◇</span>
                      <strong>{p.model || "Attached result"}</strong>
                      <span className="score">
                        {data.artifacts.find(
                          (a) => a.promptId === p.id && a.score !== undefined,
                        )?.score !== undefined
                          ? `${data.artifacts.find((a) => a.promptId === p.id && a.score !== undefined)?.score}/100`
                          : "Not scored"}
                      </span>
                    </div>
                    <GroundedText text={p.result} grounding={p.provenance?.grounding} />
                    {p.provenance && <ModelDetails model={p.provenance} />}
                  </div>
                ) : (
                  <div className="connection-note">
                    {p.status === "generating" ? "Generating a reply…" : p.status === "failed" ? p.error || "Reply failed. Try again." : "No result attached. Attach results manually when you want to keep them."}
                  </div>
                )}
                {data.responseVersions.some(v => v.promptId === p.id) && (
                  <details className="response-history">
                    <summary>Response history</summary>
                    {data.responseVersions.filter(v => v.promptId === p.id)
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map(version => (
                        <section key={version.id} className="response-version">
                          <div className="message-meta">
                            <strong>{version.source === "ai" ? "AI response" : version.source === "manual" ? "Manual result" : "Earlier saved result"}</strong>
                            <span>{version.author} · {version.id.slice(-7)}</span>
                            <time>{date(version.createdAt)}</time>
                            {p.currentVersionId === version.id && <span>Current</span>}
                          </div>
                          {version.provenance && <ModelDetails model={version.provenance} />}
                          {version.source === "legacy" && <p className="muted">Preserved before replacement; original source and response time are unknown.</p>}
                          <GroundedText text={version.body} grounding={version.provenance?.grounding} />
                        </section>
                      ))}
                  </details>
                )}
                {canWrite && p.status !== "generating" && (
                  <div className="message-actions">
                    <button className="subtle" disabled={busy || p.saved !== false} onClick={() => void run(() => actions.savePrompt(p.id), "Prompt saved to your prompt library.")}>
                      {p.saved !== false ? "✓ Prompt saved" : "Save prompt"}
                    </button>
                    {p.status === "failed" && <button className="secondary" disabled={busy} onClick={() => setText(p.text)}>Retry prompt</button>}
                    <button
                      className="subtle"
                      onClick={() => setResultPrompt(p)}
                    >
                      {p.result ? "Edit attached result" : "＋ Attach result"}
                    </button>
                    <button
                      className="secondary"
                      disabled={busy || !project || !p.result}
                      onClick={() => setCommitPrompt(p)}
                    >
                      ◇ Commit artifact
                    </button>
                    {!project ? <span>Choose a project to commit.</span> : !p.result && <span>Attach a result before committing.</span>}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
        {canWrite ? (
          <form className="composer" onSubmit={send}>
            <textarea
              aria-label="Message"
              placeholder={
                project
                  ? `Message in ${project.name}…`
                  : "Ask anything, or choose a project above…"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              required
              maxLength={12000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                {busy && ai ? "Generating…" : ai?.model.name || "Prompt notebook"} <small>· {ai ? ai.model.provider === "chatgpt" ? "ChatGPT plan" : ai.model.provider === "groq" ? "Groq" : "AI Studio key" : "save only"}</small>
              </span>
              <button
                className={ai ? "send-button" : "secondary"}
                disabled={busy || !text.trim() || (ai?.model.provider === "gemini" && !ai.apiKey?.trim())}
                aria-label={ai ? "Send message" : "Save prompt"}
              >
                {ai ? "↑" : "Save prompt"}
              </button>
            </div>
            <p className="composer-hint">
              {project
                ? "Prompts are shared with this project’s collaborators."
                : "This chat stays outside projects until you choose one."}{" "}
              Save selected prompts. Results must be attached manually.{" "}
              ⌘/Ctrl + Enter to send.
            </p>
          </form>
        ) : (
          <p className="connection-note">
            You can read this conversation. Start your own project chat to
            contribute.
          </p>
        )}
      </div>
      {showCommits && chat && (
        <div className="commit-panel">
          <div className="section-head">
            <h2>Commits</h2>
            <span className="count-pill">{commits.length}</span>
          </div>
          <p className="muted">
            Save snapshots, select one final version for this chat, then submit it for review.
          </p>
          {commits.length ? (
            commits.map((c) => (
              <CommitCard
                key={c.id}
                commit={c}
                approvers={local ? undefined : data.members.filter(m => m.projectId === c.projectId && m.id !== c.authorId && ["owner", "admin", "reviewer"].includes(m.role))}
                isFinal={chat.finalCommitId === c.id}
                selectFinal={() => run(() => actions.selectFinal(c.id), "Final version selected.")}
                pushed={
                  !!c.pushed || data.artifacts.some((a) => a.commitId === c.id)
                }
                canWrite={canWrite}
                busy={busy}
                push={(approverIds) =>
                  run(
                    () => actions.push(c.id, approverIds),
                    local ? "Final version submitted locally. Sign in to a shared project to request approval." : "Final version submitted. All selected approvers must approve; email status is shown on the artifact.",
                  )
                }
              />
            ))
          ) : (
            <Empty
              title="No commits yet"
              text="Use Commit artifact below a prompt to save your first snapshot."
            />
          )}
        </div>
      )}
      {resultPrompt && (
        <Modal title="Attach a result" close={() => setResultPrompt(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await actions.addResult(
                  resultPrompt.id,
                  String(f.get("result")),
                );
                setResultPrompt(null);
              }, "Result attached. Existing commits are unchanged.");
            }}
          >
            <p className="muted">
              Paste the result you want to keep with this prompt. This is
              recorded as a contributor-attached result.
            </p>
            <label>
              Result
              <textarea
                autoFocus
                name="result"
                defaultValue={resultPrompt.result}
                required
                rows={10}
                maxLength={12000}
              />
            </label>
            <button className="primary" disabled={busy}>
              Save result
            </button>
          </form>
        </Modal>
      )}
      {commitPrompt && (
        <Modal title="Commit an artifact" close={() => setCommitPrompt(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                await actions.commit(
                  chat!.id,
                  commitPrompt.id,
                  String(f.get("title")),
                  String(f.get("body")),
                  String(f.get("message")),
                );
                setCommitPrompt(null);
                setShowCommits(true);
              }, "Commit saved. Push it from the Commits panel when ready.");
            }}
          >
            <p className="muted">
              A commit is a fixed snapshot. Create as many as you need; only
              the selected final version can be submitted to the artifact library.
            </p>
            <label>
              Artifact name
              <input
                autoFocus
                name="title"
                required
                maxLength={120}
                placeholder="e.g. Research summary"
              />
            </label>
            <label>
              Content
              <textarea
                name="body"
                defaultValue={commitPrompt.result}
                required
                rows={8}
                maxLength={12000}
              />
            </label>
            <label>
              Commit message
              <input
                name="message"
                required
                maxLength={500}
                placeholder="What does this version contain?"
              />
            </label>
            <button className="primary" disabled={busy}>
              Create commit
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function CommitCard({
  commit,
  approvers,
  isFinal,
  selectFinal,
  pushed,
  canWrite,
  busy,
  push,
}: {
  commit: Commit;
  approvers?: Member[];
  isFinal: boolean;
  selectFinal: () => Promise<boolean>;
  pushed: boolean;
  canWrite: boolean;
  busy: boolean;
  push: (approverIds?: string[]) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const eligibleIds = new Set(approvers?.map(m => m.id));
  const requiredIds = selected.filter(id => eligibleIds.has(id));
  return (
    <div className="commit-card">
      <div className="commit-card-title">
        <span>◇</span>
        <strong>{commit.title}</strong>
      </div>
      <p>{commit.message}</p>
      <small>
        {commit.author} · {date(commit.createdAt)}
      </small>
      <details>
        <summary>View snapshot · {commit.id.slice(-7)}</summary>
        {commit.sourceVersionId && <p>Source response · {commit.sourceVersionId.slice(-7)}</p>}
        {commit.sourceModel && <><p>Source model</p><ModelDetails model={commit.sourceModel} /></>}
        <GroundedText text={commit.body} grounding={commit.sourceModel?.grounding} />
      </details>
      {isFinal && <span className="final-version-label">✓ Final version</span>}
      {canWrite && !isFinal && (
        <button className="secondary" disabled={busy} onClick={selectFinal}>
          Select as final version
        </button>
      )}
      {pushed ? (
        <span className="pushed-label">✓ Submitted for review</span>
      ) : canWrite ? (
        <>
          {approvers && isFinal && <fieldset disabled={busy}>
            <legend>Required approvers</legend>
            <p className="muted">Select everyone who must approve this submission.</p>
            {approvers.map(m => <label key={m.id}>
              <input type="checkbox" checked={requiredIds.includes(m.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} />
              {m.name} ({m.role}) · {m.email}
            </label>)}
            {!approvers.length && <p className="muted">Add another owner, admin, or reviewer before submitting.</p>}
          </fieldset>}
          <button className="secondary" disabled={busy || !isFinal || (!!approvers && !requiredIds.length)} onClick={() => void push(approvers ? requiredIds : undefined)}>
            ↑ Submit final version
          </button>
        </>
      ) : (
        <span className="muted">Not submitted</span>
      )}
    </div>
  );
}

function ModelDetails({ model }: { model: ModelProvenance }) {
  return <div className="model-provenance">
    <span>{model.provider === "gemini" ? "Gemini" : model.provider === "groq" ? "Groq" : "ChatGPT"} · Requested: {model.requestedModel}</span>
    <span>Reported model/version: {model.resolvedModel || "Not provided"}</span>
    <GoogleSources grounding={model.grounding} />
    <PolicySources citations={model.policyCitations} />
  </div>;
}
