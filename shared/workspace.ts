export type Role = "owner" | "admin" | "member" | "reviewer" | "viewer";
export type Project = {
  id: string;
  name: string;
  description: string;
  role: Role;
  ownerId: string;
};
export type Chat = {
  id: string;
  title: string;
  projectId: string;
  authorId: string;
  author: string;
  createdAt: number;
};
export type Prompt = {
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
  status: "saved" | "generating" | "complete" | "failed";
  error?: string;
};
export type Commit = {
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
export type Data = {
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
  page: "Overview" | "Chat" | "Prompt" | "Artifact" | "Project";
  projectId?: string;
  chatId?: string;
};
export type Actions = {
  createProject(name: string, description: string): Promise<string>;
  createChat(projectId: string, title: string): Promise<string>;
  assignChat(chatId: string, projectId: string): Promise<void>;
  sendPrompt(chatId: string, text: string): Promise<void>;
  addResult(promptId: string, result: string): Promise<void>;
  commit(
    chatId: string,
    promptId: string,
    title: string,
    body: string,
    message: string,
  ): Promise<void>;
  push(commitId: string): Promise<void>;
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
  return (role === "owner" || role === "admin") && authorId !== userId;
}
