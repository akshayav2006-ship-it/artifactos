import type { Infer } from 'convex/values';
import { v } from 'convex/values';
import { query } from './_generated/server';
import { promptView } from "./workspaceValidators";
import { requireCurrentUser } from './lib/auth';

// URL inputs intentionally accept strings so malformed links recover as null,
// rather than throwing an argument-validation error into the session boundary.
export const resolve = query({
  args: { project: v.optional(v.string()), chat: v.optional(v.string()), artifact: v.optional(v.string()) },
  returns: v.union(v.null(), v.object({ projectId: v.optional(v.id("projects")), chatId: v.optional(v.id("workChats")), artifactId: v.optional(v.id("workArtifacts")) })),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const artifactId = args.artifact ? ctx.db.normalizeId('workArtifacts', args.artifact) : null;
    const artifact = artifactId ? await ctx.db.get(artifactId) : null;
    if (args.artifact && !artifact) return null;
    const chatId = args.chat ? ctx.db.normalizeId('workChats', args.chat) : null;
    const chat = chatId ? await ctx.db.get(chatId) : null;
    if (args.chat && !chat) return null;
    if (chat && !chat.projectId && chat.authorId !== user._id) return null;
    if (chat && args.project && args.project !== chat.projectId) return null;
    const projectId = artifact?.projectId || chat?.projectId || (args.project ? ctx.db.normalizeId('projects', args.project) : null);
    if (args.project && (!projectId || args.project !== projectId)) return null;
    if (artifact && args.chat && artifact.chatId !== chatId) return null;
    if (projectId) {
      const project = await ctx.db.get(projectId);
      const member = await ctx.db.query('projectMembers').withIndex('by_project_id_and_user_id', q => q.eq('projectId', projectId).eq('userId', user._id)).unique();
      if (!member || !project || project.status !== 'active') return null;
    } else if (chat && chat.authorId !== user._id) return null;
    return { ...(projectId ? { projectId } : {}), ...(chatId ? { chatId } : {}), ...(artifactId ? { artifactId } : {}) };
  },
});

const searchResult = v.object({
  id: v.union(v.id('projects'), v.id('workChats'), v.id('workPrompts'), v.id('workArtifacts')),
  kind: v.union(v.literal('Project'), v.literal('Chat'), v.literal('Prompt'), v.literal('Artifact')),
  title: v.string(),
  projectId: v.optional(v.id('projects')),
  chatId: v.optional(v.id('workChats')),
  artifactId: v.optional(v.id('workArtifacts')),
  promptId: v.optional(v.id('workPrompts')),
});
export const search = query({
  args: { text: v.string() },
  returns: v.array(searchResult),
  handler: async (ctx, { text }) => {
    const user = await requireCurrentUser(ctx);
    const term = text.trim().slice(0, 200);
    if (!term) return [];
    const memberships = await ctx.db.query('projectMembers').withIndex('by_user_id', q => q.eq('userId', user._id)).take(100);
    const projects = (await Promise.all(memberships.map(m => ctx.db.get(m.projectId)))).filter(p => p && p.status === 'active');
    const results: Infer<typeof searchResult>[] = [];
    for (const project of projects) if (project && `${project.name} ${project.description}`.toLowerCase().includes(term.toLowerCase())) results.push({ id: project._id, kind: 'Project', title: project.name, projectId: project._id });
    for (const projectId of [undefined, ...projects.map(p => p!._id)]) {
      const chats = await ctx.db.query('workChats').withSearchIndex('search_title', q => projectId ? q.search('title', term).eq('projectId', projectId) : q.search('title', term).eq('projectId', undefined).eq('authorId', user._id)).take(10);
      const prompts = await ctx.db.query('workPrompts').withSearchIndex('search_text', q => projectId ? q.search('text', term).eq('projectId', projectId) : q.search('text', term).eq('projectId', undefined).eq('authorId', user._id)).take(10);
      const titled = projectId ? await ctx.db.query('workArtifacts').withSearchIndex('search_title', q => q.search('title', term).eq('projectId', projectId)).take(10) : [];
      const artifacts = projectId ? await ctx.db.query('workArtifacts').withSearchIndex('search_body', q => q.search('body', term).eq('projectId', projectId)).take(10) : [];
      results.push(...chats.map(c => ({ id: c._id, kind: 'Chat' as const, title: c.title, projectId, chatId: c._id })), ...prompts.map(p => ({ id: p._id, kind: 'Prompt' as const, title: p.text.slice(0, 180), projectId, chatId: p.chatId, promptId: p._id })), ...[...new Map([...titled, ...artifacts].map(a => [a._id, a])).values()].map(a => ({ id: a._id, kind: 'Artifact' as const, title: a.title, projectId, artifactId: a._id })));
    }
    return results.slice(0, 100);
  },
});

// Fetch a search destination even when it is outside the first history page.
export const prompt = query({
  args: { id: v.string() },
  returns: v.union(v.null(), promptView),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    const promptId = ctx.db.normalizeId('workPrompts', id);
    const p = promptId ? await ctx.db.get(promptId) : null;
    if (!p) return null;
    if (p.projectId) {
      const member = await ctx.db.query('projectMembers').withIndex('by_project_id_and_user_id', q => q.eq('projectId', p.projectId!).eq('userId', user._id)).unique();
      if (!member) return null;
    } else if (p.authorId !== user._id) return null;
    const { _id, _creationTime, ...fields } = p;
    void _creationTime;
    return { ...fields, id: _id, projectId: p.projectId || '' };
  },
});
