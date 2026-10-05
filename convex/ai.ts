import { v, ConvexError } from 'convex/values';
import { Agent } from '@convex-dev/agent';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { action, internalMutation } from './_generated/server';
import { components, internal } from './_generated/api';
import { chatAccess } from './workspace';

export const begin = internalMutation({
  args: { chatId: v.id('workChats'), text: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    const { chat, user } = await chatAccess(ctx, args.chatId, true);
    const recent = await ctx.db.query('workPrompts').withIndex('by_chatId_and_status', q => q.eq('chatId', chat._id).eq('status', 'generating')).order('desc').first();
    if (recent?.status === 'generating' && Date.now() - recent.createdAt < 180000) throw new ConvexError('Wait for the current reply to finish.');
    const promptId = await ctx.db.insert('workPrompts', { chatId: chat._id, projectId: chat.projectId, authorId: user._id, author: user.name, text: args.text, result: '', status: 'generating', model: args.model, createdAt: Date.now() });
    await ctx.scheduler.runAfter(180000, internal.ai.expire, { promptId });
    return { promptId, threadId: chat.agentThreadId };
  },
});
export const expire = internalMutation({
  args: { promptId: v.id('workPrompts') },
  handler: async (ctx, { promptId }) => {
    const prompt = await ctx.db.get(promptId);
    if (prompt?.status === 'generating') await ctx.db.patch(promptId, { status: 'failed', error: 'The reply timed out. Please send your prompt again.' });
  },
});
export const finish = internalMutation({
  args: { promptId: v.id('workPrompts'), result: v.string(), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (prompt?.status === 'generating') await ctx.db.patch(args.promptId, { result: args.result, status: args.error ? 'failed' : 'complete', error: args.error });
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
      await ctx.runMutation(internal.ai.finish, { promptId, result: response.text });
    } catch {
      await ctx.runMutation(internal.ai.finish, { promptId, result: '', error: 'Gemini could not reply. Check your AI Studio key, model access, and quota, then retry.' });
    }
    return null;
  },
});
