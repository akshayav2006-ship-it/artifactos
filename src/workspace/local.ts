import { validateAttachment } from '../../shared/documents';
import { policyContext, citedPolicies, validatePolicyImport } from "../../shared/policies";
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
const generations = new Map<string, AbortController>();

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
    async importPolicies(projectId, input) {
      validatePolicyImport(input);
      update(d => {
        if (!d.projects.some(p => p.id === projectId)) throw new Error("Project not found.");
        d.policyRows ??= [];
        d.policyRows.push(...input.rows.map(row => ({ ...row, id: id(), projectId, sheet: input.sheet.trim() })));
      });
    },
    async searchPolicies(projectId, text) {
      const terms = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
      return (get().policyRows || []).filter(row => row.projectId === projectId && terms.every(term => row.text.toLowerCase().includes(term))).slice(-30).reverse();
    },
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
    async cancelGeneration(promptId) {
      update(d => { const p = d.prompts.find(p => p.id === promptId); if (p?.status === "generating") p.status = "cancelled"; });
      generations.get(promptId)?.abort();
    },
    async sendPrompt(chatId, text, ai, onPersisted) {
      if (get().prompts.some(p => p.chatId === chatId && p.status === "generating")) throw new Error("Wait for the current reply to finish.");
      const selected = [...new Set(ai?.policyIds || [])];
      if (selected.length > 8) throw new Error("Select up to 8 policy rows.");
      const projectId = get().chats.find(c => c.id === chatId)?.projectId;
      const policies = selected.map(id => {
        const row = get().policyRows?.find(row => row.id === id);
        if (!row || !projectId || row.projectId !== projectId) throw new Error("Policy is unavailable in this project.");
        return row;
      });
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
          saved: !ai,
          status: ai ? "generating" : "saved",
          model: ai?.model.name,
          replyProvenance: ai ? { provider: ai.model.provider, requestedModel: ai.model.id } : undefined,
          createdAt: Date.now(),
        });
      });
      onPersisted?.();
      if (ai) {
        const controller = new AbortController();
        generations.set(promptId, controller);
        try {
          const history: ChatMessage[] = get().prompts.filter(p => p.chatId === chatId).slice(-30).flatMap(p => [
            { role: "user" as const, content: p.text },
            ...((p.reply || p.result) ? [{ role: "assistant" as const, content: p.reply || p.result }] : []),
          ]);
          if (policies.length) history[history.length - 1].content += policyContext(policies);
          const response = await localAI<AIReply>("reply", { provider: ai.model.provider, model: ai.model.id, apiKey: ai.apiKey, googleSearch: ai.googleSearch, messages: history }, controller.signal);
          if (!response.text.trim()) throw new Error("AI returned an empty reply.");
          update(d => {
            const p = d.prompts.find(p => p.id === promptId)!;
            if (p.status !== "generating") return;
            const policyCitations = citedPolicies(response.text, policies);
            const provenance = { provider: ai.model.provider, requestedModel: ai.model.id, resolvedModel: response.resolvedModel,
              ...(response.grounding ? { grounding: response.grounding } : {}),
              ...(policyCitations.length ? { policyCitations } : {}),
            };
            const versionId = id();
            d.responseVersions.unshift({ id: versionId, chatId, promptId,
              authorId: p.authorId, author: p.author, body: response.text,
              source: "ai", provenance, createdAt: Date.now(),
            });
            p.reply = response.text; p.status = "complete";
            p.replyProvenance = provenance; p.aiVersionId = versionId;
          });
        } catch (error) {
          update(d => { const p = d.prompts.find(p => p.id === promptId)!; if (p.status !== "generating") return; p.status = "failed"; p.error = error instanceof Error ? error.message : "AI request failed."; });
        } finally { generations.delete(promptId); }
      }
    },
    async savePrompt(promptId) {
      update(d => {
        const prompt = d.prompts.find(p => p.id === promptId);
        if (!prompt) throw new Error("Prompt not found.");
        prompt.saved = true;
      });
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
        p.saved = true;
        p.status = "complete";
        delete p.model;
        delete p.provenance;
        delete p.error;
      });
    },
    async commit(chatId, promptId, title, body, message, attachment) {
      update((d) => {
        const chat = d.chats.find((c) => c.id === chatId);
        if (!chat) throw new Error("Chat not found.");
        if (!chat.projectId)
          throw new Error("Choose a project before committing an artifact.");
        const prompt = d.prompts.find((p) => p.id === promptId && p.chatId === chatId);
        if (!prompt)
          throw new Error("Source prompt does not belong to this chat.");
        validateAttachment(attachment);
        preserveResult(d, prompt);
        const matchesReply = !!prompt.reply && body.trim() === prompt.reply.trim();
        const matchesResult = !!prompt.result && body.trim() === prompt.result.trim();
        const sourceVersionId = matchesReply && prompt.aiVersionId ? prompt.aiVersionId : matchesResult ? prompt.currentVersionId : id();
        if (!matchesReply && !matchesResult) d.responseVersions.unshift({ id: sourceVersionId!, chatId, promptId, authorId: "local", author: "You", body, source: "manual", createdAt: Date.now() });
        prompt.saved = true;
        d.commits.unshift({
          attachment,
          sourceVersionId,
          sourceModel: matchesReply ? prompt.replyProvenance : matchesResult ? prompt.provenance : undefined,
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
    async selectFinal(commitId) {
      update((d) => {
        const commit = d.commits.find((c) => c.id === commitId);
        if (!commit?.projectId) throw new Error("A project commit is required.");
        const chat = d.chats.find((c) => c.id === commit.chatId);
        if (!chat) throw new Error("Chat not found.");
        if (chat.authorId !== "local" || commit.authorId !== "local")
          throw new Error("Only the contributor can finalize this commit.");
        chat.finalCommitId = commitId;
      });
    },
    async push(commitId) {
      update((d) => {
        const c = d.commits.find((c) => c.id === commitId);
        if (!c?.projectId)
          throw new Error("Choose a project before committing and pushing.");
        if (d.artifacts.some((a) => a.commitId === commitId))
          throw new Error("This commit has already been pushed.");
        if (d.chats.find((chat) => chat.id === c.chatId)?.finalCommitId !== commitId)
          throw new Error("Select this commit as the final version before submitting it.");
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
