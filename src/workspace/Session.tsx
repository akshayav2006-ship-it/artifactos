import { OperationPending } from "../../shared/pending";
const sends = new OperationPending();
import { AuthLanding } from '../features/auth/AuthLanding';
import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ClerkProvider,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/react";
import {
  ConvexReactClient,
  useAction,
  useConvexAuth,
  useConvex,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Actions, Data, Route } from "../../shared/workspace";
import { emptyData } from "../../shared/workspace";
import { loadLocal, localActions, storageKey } from "./local";
import Workspace from "./Workspace";
import { readRoute, routeURL } from "./navigation";
import { useLocation, useNavigate } from "react-router-dom";

const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const url = import.meta.env.VITE_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
const workspaceModeKey = "artifactos.workspaceMode";
export default function Session() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = readRoute(new URL(`${location.pathname}${location.search}`, window.location.origin));
  const setRoute = (next: Route) => { void navigate(routeURL(next)); };
  const [cloud, setCloud] = useState(() => {
    const mode = sessionStorage.getItem(workspaceModeKey);
    return mode ? mode === "shared" : import.meta.env.PROD && Boolean(key && client);
  });
  const localAccount = (
    <button
      className="account-control"
      onClick={() => {
        setRoute({ page: "Overview" });
        sessionStorage.setItem(workspaceModeKey, "shared");
        setCloud(true);
      }}
    >
      <span className="account-avatar">Y</span>
      <span>
        You<small>Local workspace · Sign in to collaborate</small>
      </span>
      <span>↗</span>
    </button>
  );
  if (!cloud)
    return <Local route={route} setRoute={setRoute} account={localAccount} />;
  if (!key || !client)
    return (
      <div className="session-message">
        <h2>Sign-in is not configured</h2>
        <p>The local workspace is still available.</p>
        <button onClick={() => setCloud(false)}>Back to workspace</button>
      </div>
    );
  return (
    <Boundary>
      <ClerkProvider publishableKey={key} signInFallbackRedirectUrl="/workspace" signUpFallbackRedirectUrl="/workspace" afterSignOutUrl="/workspace">
        <ConvexProviderWithClerk client={client} useAuth={useAuth}>
          <Connected
            route={route}
            setRoute={setRoute}
            leave={() => {
              setRoute({ page: "Overview" });
              sessionStorage.setItem(workspaceModeKey, "local");
              setCloud(false);
            }}
          />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </Boundary>
  );
}
function Local({
  route,
  setRoute,
  account,
}: {
  route: Route;
  setRoute: (r: Route) => void;
  account: ReactNode;
}) {
  const [initial] = useState(() => {
    try {
      return { data: loadLocal(), error: "" };
    } catch (e) {
      return { data: structuredClone(emptyData), error: String(e) };
    }
  });
  const [data, setData] = useState<Data>(initial.data);
  const [controller] = useState(() => {
    let latest = initial.data;
    return {
      get: () => latest,
      persist: (next: Data) => {
        if (initial.error) throw new Error(initial.error);
        localStorage.setItem(storageKey, JSON.stringify(next));
        latest = next;
        setData(next);
      },
    };
  });
  const actions = localActions(controller.get, controller.persist);
  const artifact = data.artifacts.find(a => a.id === route.artifactId);
  const chat = data.chats.find(c => c.id === route.chatId);
  const localRoute = { ...route, projectId: route.projectId || artifact?.projectId || chat?.projectId || undefined };
  return (
    <Workspace
      data={data}
      actions={actions}
      route={localRoute}
      setRoute={setRoute}
      account={account}
      userId="local"
      local
      error={initial.error}
    />
  );
}
function Connected({
  route,
  setRoute,
  leave,
}: {
  route: Route;
  setRoute: (r: Route) => void;
  leave: () => void;
}) {
  const { user, isLoaded } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const sync = useMutation(api.users.syncCurrentUser);
  const me = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    void sync({
      name: user.fullName || user.username || "Contributor",
      email: user.primaryEmailAddress?.emailAddress || "",
    })
      .then(() => setError(""))
      .catch(() =>
        setError(
          "We couldn’t finish connecting your workspace. Please try again.",
        ),
      );
  }, [isAuthenticated, user, sync, attempt]);
  if (!isLoaded || isLoading)
    return (
      <div className="session-message">
        <p>Connecting your workspace…</p>
        <button onClick={leave}>Return to local workspace</button>
      </div>
    );
  if (!user) return <AuthLanding continueLocally={leave} />;
  if (!isAuthenticated)
    return (
      <div className="session-message">
        <h2>Could not connect your account</h2>
        <p>Your sign-in succeeded, but workspace access could not be verified. Reload to try again.</p>
        <button className="primary" onClick={() => window.location.reload()}>Reload workspace</button>
        <UserButton />
        <button className="subtle" onClick={leave}>Return to local workspace</button>
      </div>
    );
  if (error || !me)
    return (
      <div className="session-message">
        <h2>
          {error ? "Could not connect your account" : "Preparing your account…"}
        </h2>
        <p>{error || "Verifying your project access."}</p>
        {error && (
          <button
            className="primary"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        )}
        <UserButton />
        <button className="subtle" onClick={leave}>
          Return to local workspace
        </button>
      </div>
    );
  return (
    <RemoteGate
      route={route}
      setRoute={setRoute}
      userId={me._id}
      account={
        <div className="cloud-account">
          <UserButton showName />
          <button className="subtle" onClick={leave}>
            Local workspace
          </button>
        </div>
      }
    />
  );
}
function RemoteGate(props: { route: Route; setRoute: (r: Route) => void; userId: string; account: ReactNode }) {
  const resolved = useQuery(api.navigation.resolve, { project: props.route.projectId, chat: props.route.chatId, artifact: props.route.artifactId });
  if (resolved === undefined) return <div className="session-message" role="status">Loading destination…</div>;
  if (!resolved) return <div className="session-message"><h2>Destination unavailable</h2><p>This item is missing or you no longer have access.</p><button onClick={() => props.setRoute({ page: 'Overview' })}>Back to workspace</button></div>;
  return <Remote key={props.userId} {...props} route={{ ...props.route, ...resolved }} />;
}
function Remote({
  route,
  setRoute,
  userId,
  account,
}: {
  route: Route;
  setRoute: (r: Route) => void;
  userId: string;
  account: ReactNode;
}) {
  const [openedAt] = useState(() => Date.now());
  const projectId = route.projectId as Id<"projects"> | undefined;
  const chatId = route.chatId as Id<"workChats"> | undefined;
  const projects = useQuery(api.projects.listMine, { includeArchived: false });
  const chats = useQuery(api.workspace.chats, {
    projectId,
    chatId,
  });
  const promptPages = usePaginatedQuery(
    api.workspace.listPrompts,
    { projectId, chatId },
    { initialNumItems: 30 },
  );
  const artifactPages = usePaginatedQuery(
    api.workspace.listArtifacts,
    projectId ? { projectId } : "skip",
    { initialNumItems: 30 },
  );
  const commitPages = usePaginatedQuery(
    api.workspace.listCommits,
    chatId ? { chatId } : "skip",
    { initialNumItems: 30 },
  );
  const responsePages = usePaginatedQuery(
    api.workspace.listResponseVersions,
    chatId ? { chatId } : "skip",
    { initialNumItems: 30 },
  );
  const pages = [promptPages, artifactPages, commitPages, responsePages];
  const more = pages.some((p) => p.status === "CanLoadMore");
  const loadMore = () => {
    pages.forEach((p) => {
      if (p.status === "CanLoadMore") p.loadMore(30);
    });
  };
  const active = projects?.find((p) => p._id === projectId);
  const members = useQuery(
    api.team.listMembers,
    projectId ? { projectId } : "skip",
  );
  const invites = useQuery(
    api.team.listProjectInvitations,
    projectId && ["owner", "admin"].includes(active?.role || "")
      ? { projectId }
      : "skip",
  );
  const incoming = useQuery(api.team.listMyInvitations, {});
  const approvals = useQuery(api.approvals.mine, {});
  const requestedArtifact = useQuery(api.approvals.artifact, route.artifactId ? { artifactId: route.artifactId as Id<"workArtifacts"> } : "skip");
  const convex = useConvex();
  const importPolicies = useMutation(api.policies.importSheet);
  const createProject = useMutation(api.projects.create);
  const createChat = useMutation(api.workspace.createChat);
  const assign = useMutation(api.workspace.assignChat);
  const send = useMutation(api.workspace.sendPrompt);
  const generate = useAction(api.ai.reply);
  const prepare = useMutation(api.ai.prepare);
  const cancelGeneration = useMutation(api.ai.cancel);
  const savePrompt = useMutation(api.workspace.savePrompt);
  const result = useMutation(api.workspace.addResult);
  const commit = useMutation(api.workspace.commit);
  const selectFinal = useMutation(api.workspace.selectFinal);
  const push = useMutation(api.workspace.push);
  const review = useMutation(api.workspace.review);
  const invite = useAction(api.email.invite);
  const accept = useMutation(api.team.acceptInvitation);
  const actions: Actions = {
    searchWorkspace: (text) => convex.query(api.navigation.search, { text }),
    importPolicies: async (projectId, input) => { await importPolicies({ projectId: projectId as Id<"projects">, ...input }); },
    searchPolicies: (projectId, text) => convex.query(api.policies.search, { projectId: projectId as Id<"projects">, text }),
    createProject: (name, description) => createProject({ name, description }),
    createChat: (projectId, title) =>
      createChat({
        projectId: projectId ? (projectId as Id<"projects">) : undefined,
        title,
      }),
    assignChat: async (chatId, projectId) => {
      await assign({
        chatId: chatId as Id<"workChats">,
        projectId: projectId ? (projectId as Id<"projects">) : undefined,
      });
    },
    cancelGeneration: async (promptId) => { await cancelGeneration({ promptId: promptId as Id<"workPrompts"> }); },
    sendPrompt: async (chatId, text, ai, onPersisted) => sends.run(chatId, async () => {
      if (ai) {
        if (ai.model.provider === "chatgpt") throw new Error("ChatGPT subscription access is available in the local workspace.");
        const request = { chatId: chatId as Id<"workChats">, text, model: ai.model.id, provider: ai.model.provider, apiKey: ai.apiKey || "", googleSearch: ai.googleSearch, policyIds: ai.policyIds as Id<"policyRows">[] | undefined };
        const { promptId } = await prepare({ chatId: request.chatId, text, model: request.model, provider: request.provider, policyIds: request.policyIds });
        onPersisted?.();
        await generate({ ...request, promptId });
      } else { await send({ chatId: chatId as Id<"workChats">, text }); onPersisted?.(); }
    }),
    savePrompt: async (promptId) => {
      await savePrompt({ promptId: promptId as Id<"workPrompts"> });
    },
    addResult: async (promptId, value) => {
      await result({ promptId: promptId as Id<"workPrompts">, result: value });
    },
    commit: async (chatId, promptId, title, body, message, attachment) => {
      await commit({
        chatId: chatId as Id<"workChats">,
        promptId: promptId as Id<"workPrompts">,
        title,
        body,
        message,
        attachment,
      });
    },
    selectFinal: async (commitId) => {
      await selectFinal({ commitId: commitId as Id<"workCommits"> });
    },
    push: async (commitId, approverIds) => {
      await push({ commitId: commitId as Id<"workCommits">, approverIds: approverIds as Id<"users">[] | undefined });
    },
    review: async (artifactId, decision, score, feedback) => {
      await review({
        artifactId: artifactId as Id<"workArtifacts">,
        decision,
        score,
        feedback,
      });
    },
    invite: (projectId, email, role) =>
      invite({ projectId: projectId as Id<"projects">, email, role }),
    accept: async (invitationId) => {
      await accept({ invitationId: invitationId as Id<"invitations"> });
    },
  };
  const requestedPrompt = useQuery(api.navigation.prompt, route.promptId ? { id: route.promptId } : 'skip');
  const data: Data = {
    responseVersions: responsePages.results,
    projects: (projects || []).map((p) => ({
      id: p._id,
      name: p.name,
      description: p.description,
      role: p.role,
      ownerId: p.ownerId,
    })),
    chats: chats || [],
    prompts: requestedPrompt && requestedPrompt.chatId === route.chatId && !promptPages.results.some(p => p.id === requestedPrompt.id) ? [requestedPrompt, ...promptPages.results] : promptPages.results,
    commits: commitPages.results,
    approvals: approvals || [],
    artifacts: requestedArtifact && !artifactPages.results.some(a => a.id === requestedArtifact.id) ? [requestedArtifact, ...artifactPages.results] : artifactPages.results,
    members: (members || []).map((m) => ({
      id: m.userId,
      projectId: projectId!,
      name: m.name,
      email: m.email,
      role: m.role,
    })),
    invites: (invites || []).map((i) => ({
      id: i._id,
      projectId: i.projectId,
      projectName: active?.name || "",
      email: i.email,
      role: i.role,
      status: i.status,
      delivery: i.delivery,
    })),
    incoming: (incoming || [])
      .filter((i) => i.expiresAt > openedAt)
      .map((i) => ({
        id: i._id,
        projectId: i.projectId,
        projectName: i.projectName,
        email: i.email,
        role: i.role,
        status: i.status,
      })),
  };
  return (
    <Workspace
      data={data}
      actions={actions}
      route={route}
      setRoute={setRoute}
      account={account}
      userId={userId}
      local={false}
      loading={!projects || !chats || promptPages.status === "LoadingFirstPage" || (!!projectId && artifactPages.status === "LoadingFirstPage") || (!!route.promptId && requestedPrompt === undefined) || (!!route.artifactId && requestedArtifact === undefined)}
      more={more}
      loadMore={loadMore}
    />
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="session-message">
        <h2>Connection unavailable</h2>
        <p>Saved data and drafts can be recovered when browser storage is available. Reload to retry the connection.</p>
        <button onClick={() => window.location.reload()}>
          Retry connection
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
