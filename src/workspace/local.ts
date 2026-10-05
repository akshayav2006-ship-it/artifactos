import { localAI } from "./aiClient";
import type { AIReply, ChatMessage } from "../../shared/ai";
import type { Actions, Data, Prompt } from "../../shared/workspace";
import { emptyData } from "../../shared/workspace";
export const storageKey = "artifactos-workspace-v2";
export function loadLocal(): Data {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const parsed = JSON.parse(raw);
    // v2 workspaces created before response history remain readable.
    if (parsed.responseVersions === undefined) parsed.responseVersions = [];
    if (!Object.keys(emptyData).every((k) => Array.isArray(parsed[k])))
      throw new Error(
        "Saved workspace format could not be read. Your data has not been overwritten.",
      );
    for (const prompt of parsed.prompts) {
      if (prompt.status === "generating") {
        prompt.status = "failed";
        prompt.error = "This reply was interrupted when the page closed. Send the prompt again.";
      }
    }
    return parsed;
  }
  const old = JSON.parse(
    localStorage.getItem("artifactos-workspace-v1") || "null",
  );
  const data: Data = structuredClone(emptyData);
  if (!old?.entries) return data;
  for (const e of old.entries) {
    if (e.kind === "Projects")
      data.projects.push({
        id: e.id,
        name: e.title,
        description: e.body,
        role: "owner",
        ownerId: "local",
      });
    if (
      e.kind === "Conversations" ||
      e.kind === "Prompt history" ||
      e.kind === "Artifacts"
    ) {
      const now = Date.parse(e.date) || Date.now();
      const chatId = `import-${e.id}`;
      data.chats.push({
        id: chatId,
        title: e.title,
        projectId: e.project,
        authorId: "local",
        author: "You",
        createdAt: now,
      });
      data.prompts.push({
        id: e.id,
        chatId,
        projectId: e.project,
        authorId: "local",
        author: "You",
        text: e.kind === "Artifacts" ? e.title : e.body,
        result: e.kind === "Artifacts" ? e.body : "",
        status: "saved",
        createdAt: now,
      });
      if (e.kind === "Artifacts") {
        const versions = e.versions?.length
          ? e.versions
          : [{ body: e.body, date: e.date }];
        versions.forEach((v: { body: string; date: string }, i: number) =>
          data.commits.push({
            id: `${e.id}-v${i}`,
            chatId,
            promptId: e.id,
            projectId: e.project,
            authorId: "local",
            author: "You",
            title: e.title,
            body: v.body,
            message: "Imported saved version",
            createdAt: Date.parse(v.date) || now,
          }),
        );
      }
    }
  }
  return data;
}
export function localActions(
  get: () => Data,
  persist: (data: Data) => void,
): Actions {
  const id = () => crypto.randomUUID();
  const update = (change: (data: Data) => void) => {
    const data = structuredClone(get());
    change(data);
    persist(data);
  };
  const preserveResult = (data: Data, prompt: Prompt) => {
    if (prompt.result && !prompt.currentVersionId) {
      prompt.currentVersionId = id();
      data.responseVersions.unshift({
        id: prompt.currentVersionId, chatId: prompt.chatId, promptId: prompt.id,
        authorId: prompt.authorId, author: prompt.author, body: prompt.result,
        source: "legacy", createdAt: Date.now(),
      });
    }
  };
  return {
    async createProject(name, description) {
      name = name.trim();
      if (name.length < 2 || name.length > 100 || description.length > 500)
        throw new Error(
          "Enter a project name of 2–100 characters and a description of up to 500 characters.",
        );
      const projectId = id();
      update((d) => {
        d.projects.unshift({
          id: projectId,
          name,
          description,
          role: "owner",
          ownerId: "local",
        });
        d.members.push({
          id: "local",
          projectId,
          name: "You",
          email: "",
          role: "owner",
        });
      });
      return projectId;
    },
    async createChat(projectId, title) {
      const chatId = id();
      update((d) => {
        d.chats.unshift({
          id: chatId,
          projectId,
          title,
          authorId: "local",
          author: "You",
          createdAt: Date.now(),
        });
      });
      return chatId;
    },
    async assignChat(chatId, projectId) {
      update((d) => {
        const chat = d.chats.find((c) => c.id === chatId);
        if (!chat) throw new Error("Chat not found.");
        if (d.commits.some((c) => c.chatId === chatId))
          throw new Error(
            "Project is locked after the first commit. Start a new chat for another project.",
          );
        chat.projectId = projectId;
        d.prompts
          .filter((p) => p.chatId === chatId)
          .forEach((p) => {
            p.projectId = projectId;
          });
      });
    },
    async sendPrompt(chatId, text, ai) {
      const promptId = id();
      update((d) => {
        const chat = d.chats.find((c) => c.id === chatId);
        if (!chat) throw new Error("Chat not found.");
        d.prompts.push({
          id: promptId,
          chatId,
          projectId: chat.projectId,
          authorId: "local",
          author: "You",
          text,
          result: "",
          status: ai ? "generating" : "saved",
          model: ai?.model.name,
          provenance: ai ? { provider: ai.model.provider, requestedModel: ai.model.id } : undefined,
          createdAt: Date.now(),
        });
      });
      if (ai) {
        try {
          const history: ChatMessage[] = get().prompts.filter(p => p.chatId === chatId).slice(-30).flatMap(p => [
            { role: "user" as const, content: p.text },
            ...(p.result ? [{ role: "assistant" as const, content: p.result }] : []),
          ]);
          const response = await localAI<AIReply>("reply", { provider: ai.model.provider, model: ai.model.id, apiKey: ai.apiKey, messages: history });
          if (!response.text.trim()) throw new Error("AI returned an empty reply.");
          update(d => {
            const p = d.prompts.find(p => p.id === promptId)!;
            const provenance = { provider: ai.model.provider, requestedModel: ai.model.id, resolvedModel: response.resolvedModel };
            const versionId = id();
            d.responseVersions.unshift({ id: versionId, chatId, promptId,
              authorId: p.authorId, author: p.author, body: response.text,
              source: "ai", provenance, createdAt: Date.now(),
            });
            p.result = response.text; p.status = "complete";
            p.provenance = provenance; p.currentVersionId = versionId; p.aiVersionId = versionId;
          });
        } catch (error) {
          update(d => { const p = d.prompts.find(p => p.id === promptId)!; p.status = "failed"; p.error = error instanceof Error ? error.message : "AI request failed."; });
        }
      }
    },
    async addResult(promptId, result) {
      update((d) => {
        const p = d.prompts.find((p) => p.id === promptId);
        if (!p) throw new Error("Prompt not found.");
        if (p.status === "generating") throw new Error("Wait for the current reply to finish.");
        if (!result.trim()) throw new Error("Enter a result.");
        preserveResult(d, p);
        p.currentVersionId = id();
        d.responseVersions.unshift({ id: p.currentVersionId, chatId: p.chatId, promptId,
          authorId: "local", author: "You", body: result, source: "manual", createdAt: Date.now(),
        });
        p.result = result;
        p.status = "complete";
        delete p.model;
        delete p.provenance;
        delete p.error;
      });
    },
    async commit(chatId, promptId, title, body, message) {
      update((d) => {
        const chat = d.chats.find((c) => c.id === chatId);
        if (!chat) throw new Error("Chat not found.");
        if (!chat.projectId)
          throw new Error("Choose a project before committing an artifact.");
        const prompt = d.prompts.find((p) => p.id === promptId && p.chatId === chatId);
        if (!prompt)
          throw new Error("Source prompt does not belong to this chat.");
        preserveResult(d, prompt);
        d.commits.unshift({
          sourceVersionId: prompt.currentVersionId,
          sourceModel: prompt.provenance,
          id: id(),
          chatId,
          projectId: chat.projectId,
          promptId,
          title,
          body,
          message,
          author: "You",
          authorId: "local",
          createdAt: Date.now(),
        });
      });
    },
    async push(commitId) {
      update((d) => {
        const c = d.commits.find((c) => c.id === commitId);
        if (!c?.projectId)
          throw new Error("Choose a project before committing and pushing.");
        if (d.artifacts.some((a) => a.commitId === commitId))
          throw new Error("This commit has already been pushed.");
        d.artifacts.unshift({
          ...c,
          id: id(),
          commitId,
          createdAt: Date.now(),
          status: "pending",
        });
      });
    },
    async review() {
      throw new Error(
        "Sign in to a shared workspace to verify another contributor’s artifact. Local submissions cannot be self-verified.",
      );
    },
    async invite() {
      throw new Error(
        "Sign in to invite collaborators by email. Local workspaces stay on this device.",
      );
    },
    async accept() {
      throw new Error("Sign in to accept a project invitation.");
    },
  };
}
