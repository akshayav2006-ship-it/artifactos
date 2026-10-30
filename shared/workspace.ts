import type { DocumentAttachment } from './documents';
import type { PolicyRow, PolicyImport } from "./policies";
import type { AIRequest, ModelProvenance } from "./ai";
export type Role = "owner" | "admin" | "member" | "reviewer" | "viewer";
export type Project = {
  id: string;
  name: string;
  description: string;
  role: Role;
  ownerId: string;
};
export type Chat = {
  finalCommitId?: string;
  id: string;
  title: string;
  projectId: string;
  authorId: string;
  author: string;
  createdAt: number;
};
export type Prompt = {
  saved?: boolean;
  reply?: string;
  replyProvenance?: ModelProvenance;
  provenance?: ModelProvenance;
  currentVersionId?: string;
  aiVersionId?: string;
  review?: {
    title: string;
    score: number;
    reviewer: string;
    reviewedAt: number;
    status: string;
  };
  id: string;
  chatId: string;
  projectId: string;
  authorId: string;
  author: string;
  text: string;
  result: string;
  createdAt: number;
  status: "saved" | "generating" | "complete" | "failed" | "cancelled";
  error?: string;
  model?: string;
};
export type Commit = {
  attachment?: DocumentAttachment;
  sourceVersionId?: string;
  sourceModel?: ModelProvenance;
  pushed?: boolean;
  id: string;
  chatId: string;
  projectId: string;
  promptId: string;
  authorId: string;
  author: string;
  title: string;
  body: string;
  message: string;
  createdAt: number;
};
export type Artifact = {
  attachment?: DocumentAttachment;
  requiredApprovals?: number;
  approvers?: { userId: string; name: string; delivery: "queued" | "sent" | "failed" | "not_configured"; decision?: "verified" | "changes_requested"; score?: number; feedback?: string; reviewedAt?: number }[];
  sourceVersionId?: string;
  sourceModel?: ModelProvenance;
  id: string;
  commitId: string;
  chatId: string;
  projectId: string;
  promptId: string;
  authorId: string;
  author: string;
  title: string;
  body: string;
  message: string;
  createdAt: number;
  status: "pending" | "verified" | "changes_requested";
  score?: number;
  reviewer?: string;
  reviewedAt?: number;
  feedback?: string;
};
export type Member = {
  id: string;
  projectId: string;
  name: string;
  email: string;
  role: Role;
};
export type Invite = {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  role: Role;
  status: string;
  delivery?: string;
};
export type ResponseVersion = {
  id: string;
  chatId: string;
  promptId: string;
  authorId: string;
  author: string;
  body: string;
  source: "ai" | "manual" | "legacy";
  provenance?: ModelProvenance;
  createdAt: number;
};
export type Data = {
  policyRows?: PolicyRow[];
  approvals?: { id: string; projectId: string; projectName: string; title: string; author: string }[];
  responseVersions: ResponseVersion[];
  projects: Project[];
  chats: Chat[];
  prompts: Prompt[];
  commits: Commit[];
  artifacts: Artifact[];
  members: Member[];
  invites: Invite[];
  incoming: Invite[];
};
export const emptyData: Data = {
  responseVersions: [],
  projects: [],
  chats: [],
  prompts: [],
  commits: [],
  artifacts: [],
  members: [],
  invites: [],
  incoming: [],
};
export type Route = {
  promptId?: string;
  artifactId?: string;
  page: "Overview" | "Chat" | "Prompt" | "Artifact" | "Project";
  projectId?: string;
  chatId?: string;
};
export type SearchResult = { promptId?: string; id: string; kind: string; title: string; projectId?: string; chatId?: string; artifactId?: string };
export type Actions = {
  searchWorkspace?(text: string): Promise<SearchResult[]>;
  importPolicies(projectId: string, input: PolicyImport): Promise<void>;
  searchPolicies(projectId: string, text: string): Promise<PolicyRow[]>;
  createProject(name: string, description: string): Promise<string>;
  createChat(projectId: string, title: string): Promise<string>;
  assignChat(chatId: string, projectId: string): Promise<void>;
  /** Invoke onPersisted after durable prompt creation, before provider generation. Never invoke for pre-persistence failures. */
  sendPrompt(chatId: string, text: string, ai?: AIRequest, onPersisted?: () => void): Promise<void>;
  cancelGeneration(promptId: string): Promise<void>;
  savePrompt(promptId: string): Promise<void>;
  addResult(promptId: string, result: string): Promise<void>;
  commit(
    chatId: string,
    promptId: string,
    title: string,
    body: string,
    message: string,
    attachment?: DocumentAttachment,
  ): Promise<void>;
  selectFinal(commitId: string): Promise<void>;
  push(commitId: string, approverIds?: string[]): Promise<void>;
  review(
    artifactId: string,
    decision: "verified" | "changes_requested",
    score: number,
    feedback: string,
  ): Promise<void>;
  invite(
    projectId: string,
    email: string,
    role: "admin" | "member" | "reviewer" | "viewer",
  ): Promise<string>;
  accept(invitationId: string): Promise<void>;
};
export function canReview(
  role: Role | undefined,
  authorId: string,
  userId: string,
) {
  return (role === "owner" || role === "admin" || role === "reviewer") && authorId !== userId;
}

export function needsMyReview(a: Artifact, project: Project, userId: string) {
  return a.status === "pending" && canReview(project.role, a.authorId, userId) &&
    (a.approvers?.length ? a.approvers.some(p => p.userId === userId && !p.decision) : a.requiredApprovals === undefined && project.role !== "reviewer");
}
