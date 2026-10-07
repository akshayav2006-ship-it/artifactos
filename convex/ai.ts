import { v, ConvexError } from 'convex/values';
import { Agent } from '@convex-dev/agent';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { action, internalMutation } from './_generated/server';
import { components, internal } from './_generated/api';
import { chatAccess } from './workspace';
import { reportedModel } from '../shared/ai';

export const begin = internalMutation({
  args: { chatId: v.id('workChats'), text: v.string(), model: v.string() },
  returns: v.object({ promptId: v.id('workPrompts'), threadId: v.string() }),
  handler: async (ctx, args) => {
    const { chat, user } = await chatAccess(ctx, args.chatId, true);
    const recent = await ctx.db.query('workPrompts').withIndex('by_chatId_and_status', q => q.eq('chatId', chat._id).eq('status', 'generating')).order('desc').first();
    if (recent?.status === 'generating' && Date.now() - recent.createdAt < 180000) throw new ConvexError('Wait for the current reply to finish.');
    const promptId = await ctx.db.insert('workPrompts', { chatId: chat._id, projectId: chat.projectId, authorId: user._id, author: user.name, text: args.text, saved: false, result: '', status: 'generating', model: args.model, replyProvenance: { provider: 'gemini', requestedModel: args.model }, createdAt: Date.now() });
    await ctx.scheduler.runAfter(180000, internal.ai.expire, { promptId });
    return { promptId, threadId: chat.agentThreadId };
  },
});
export const expire = internalMutation({
  args: { promptId: v.id('workPrompts') },
  returns: v.null(),
  handler: async (ctx, { promptId }) => {
    const prompt = await ctx.db.get(promptId);
    if (prompt?.status === 'generating') await ctx.db.patch(promptId, { status: 'failed', error: 'The reply timed out. Please send your prompt again.' });
    return null;
  },
});
export const finish = internalMutation({
  args: { promptId: v.id('workPrompts'), result: v.string(), requestedModel: v.string(), error: v.optional(v.string()), resolvedModel: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.aiVersionId) return null;
    if (args.error) {
      if (prompt.status === 'generating') await ctx.db.patch(prompt._id, { status: 'failed', error: args.error });
      return null;
    }
    if (!args.result.trim()) throw new Error('Cannot save an empty AI response.');
    const provenance = { provider: 'gemini' as const, requestedModel: args.requestedModel, resolvedModel: args.resolvedModel };
    const aiVersionId = await ctx.db.insert('workResponseVersions', {
      chatId: prompt.chatId, promptId: prompt._id, authorId: prompt.authorId,
      author: prompt.author, body: args.result, source: 'ai', provenance, createdAt: Date.now(),
    });
    // Keep the conversational reply separate from the manually attached result.
    await ctx.db.patch(prompt._id, {
      aiVersionId, reply: args.result, replyProvenance: provenance,
      status: 'complete', error: undefined,
    });
    return null;
  },
});
export const reply = action({
  args: { chatId: v.id('workChats'), text: v.string(), model: v.string(), apiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.text.trim() || args.text.length > 12000) throw new ConvexError('Enter a prompt of 1–12000 characters.');
    if (!args.apiKey.trim() || args.apiKey.length > 500) throw new ConvexError('Enter a Gemini API key from Google AI Studio.');
    if (!/^gemini-[a-z0-9.-]+$/.test(args.model)) throw new ConvexError('Choose a Gemini model.');
    const { promptId, threadId } = await ctx.runMutation(internal.ai.begin, { chatId: args.chatId, text: args.text.trim(), model: args.model });
    try {
      const agent = new Agent(components.agent, { name: 'Artifactos', languageModel: createGoogleGenerativeAI({ apiKey: args.apiKey })(args.model), instructions: 'Help the user create useful, accurate work and artifacts.' });
      const response = await agent.generateText(ctx, { threadId }, { prompt: args.text.trim(), maxRetries: 0, abortSignal: AbortSignal.timeout(120000) });
      if (!response.text.trim()) throw new Error('Empty reply');
      await ctx.runMutation(internal.ai.finish, { promptId, requestedModel: args.model, result: response.text, resolvedModel: reportedModel(response.response, args.model) });
    } catch {
      await ctx.runMutation(internal.ai.finish, { promptId, requestedModel: args.model, result: '', error: 'Gemini could not reply. Check your AI Studio key, model access, and quota, then retry.' });
    }
    return null;
  },
});
