import { policyContext, citedPolicies } from '../shared/policies';
import { v, ConvexError } from 'convex/values';
import { createOpenAI } from '@ai-sdk/openai';
import { fetchFreeOpenRouterModels, freeOpenRouterFetch } from '../shared/openrouter';
import { createGroq } from '@ai-sdk/groq';
import { APICallError } from 'ai';
import { groqModels } from '../shared/ai';
import { Agent } from '@convex-dev/agent';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { action, internalMutation, env } from './_generated/server';
import { components, internal } from './_generated/api';
import { chatAccess } from './workspace';
import { googleGroundingValidator, policyCitationValidator } from './workspaceValidators';
import { googleGrounding, reportedModel } from '../shared/ai';

export const begin = internalMutation({
  args: { chatId: v.id('workChats'), text: v.string(), model: v.string(), provider: v.optional(v.union(v.literal('gemini'), v.literal('groq'), v.literal('openrouter'))), policyIds: v.optional(v.array(v.id('policyRows'))) },
  returns: v.object({ promptId: v.id('workPrompts'), threadId: v.string(), policies: v.array(v.object({ id: v.string(), projectId: v.string(), sheet: v.string(), row: v.number(), text: v.string() })) }),
  handler: async (ctx, args) => {
    const { chat, user } = await chatAccess(ctx, args.chatId, true);
    if ((args.policyIds?.length || 0) > 8) throw new ConvexError('Select up to 8 policy rows.');
    const policies = [];
    for (const id of [...new Set(args.policyIds || [])]) {
      const row = await ctx.db.get(id);
      if (!row || !chat.projectId || row.projectId !== chat.projectId) throw new ConvexError('Policy is unavailable in this project.');
      policies.push({ id: row._id, projectId: row.projectId, sheet: row.sheet, row: row.row, text: row.text });
    }
    const recent = await ctx.db.query('workPrompts').withIndex('by_chatId_and_status', q => q.eq('chatId', chat._id).eq('status', 'generating')).order('desc').first();
    if (recent?.status === 'generating' && Date.now() - recent.createdAt < 180000) throw new ConvexError('Wait for the current reply to finish.');
    const promptId = await ctx.db.insert('workPrompts', { chatId: chat._id, projectId: chat.projectId, authorId: user._id, author: user.name, text: args.text, saved: false, result: '', status: 'generating', model: args.model, replyProvenance: { provider: args.provider ?? 'gemini', requestedModel: args.model }, createdAt: Date.now() });
    await ctx.scheduler.runAfter(180000, internal.ai.expire, { promptId });
    return { promptId, threadId: chat.agentThreadId, policies };
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
  args: { promptId: v.id('workPrompts'), result: v.string(), requestedModel: v.string(), error: v.optional(v.string()), resolvedModel: v.optional(v.string()), grounding: v.optional(googleGroundingValidator), policyCitations: v.optional(v.array(policyCitationValidator)) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.aiVersionId) return null;
    if (args.error) {
      if (prompt.status === 'generating') await ctx.db.patch(prompt._id, { status: 'failed', error: args.error });
      return null;
    }
    if (!args.result.trim()) throw new Error('Cannot save an empty AI response.');
    const provenance = { provider: prompt.replyProvenance?.provider ?? 'gemini' as const, requestedModel: args.requestedModel, resolvedModel: args.resolvedModel, grounding: args.grounding, policyCitations: args.policyCitations };
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
  args: { chatId: v.id('workChats'), text: v.string(), model: v.string(), apiKey: v.optional(v.string()), provider: v.optional(v.union(v.literal('gemini'), v.literal('groq'), v.literal('openrouter'))), googleSearch: v.optional(v.boolean()), policyIds: v.optional(v.array(v.id('policyRows'))) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.text.trim() || args.text.length > 12000) throw new ConvexError('Enter a prompt of 1–12000 characters.');
    const isGroq = args.provider === 'groq';
    const isOpenRouter = args.provider === 'openrouter';
    const isGemini = !isGroq && !isOpenRouter;
    if (isGemini && (!args.apiKey?.trim() || args.apiKey.length > 500)) throw new ConvexError('Enter a Gemini API key from Google AI Studio.');
    if (!isOpenRouter && (isGroq ? !groqModels.some(m => m.id === args.model) : !/^gemini-[a-z0-9.-]+$/.test(args.model))) throw new ConvexError(isGroq ? 'Choose a supported Groq model.' : 'Choose a Gemini model.');
    const { promptId, threadId, policies } = await ctx.runMutation(internal.ai.begin, { chatId: args.chatId, text: args.text.trim(), model: args.model, provider: args.provider, policyIds: args.policyIds });
    try {
      if (isGroq && !env.GROQ_API_KEY) throw new Error('Groq is not configured.');
      if (isOpenRouter) {
        if (!env.OPENROUTER_API_KEY) throw new Error('OpenRouter is not configured.');
        const available = await fetchFreeOpenRouterModels();
        if (!available.some(model => model.id === args.model)) throw new Error('Choose a currently free OpenRouter chat model.');
      }
      const google = createGoogleGenerativeAI({ apiKey: args.apiKey });
      const agent = new Agent(components.agent, { name: 'Artifactos', languageModel: isOpenRouter ? createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: env.OPENROUTER_API_KEY, fetch: freeOpenRouterFetch }).chat(args.model) : isGroq ? createGroq({ apiKey: env.GROQ_API_KEY })(args.model) : google(args.model), tools: isGemini && args.googleSearch ? { google_search: google.tools.googleSearch({}) } : undefined, instructions: 'Help the user create useful, accurate work and artifacts.' });
      const response = await agent.generateText(ctx, { threadId }, { prompt: args.text.trim() + policyContext(policies), maxRetries: 0, maxOutputTokens: !isGemini ? 2048 : undefined, abortSignal: AbortSignal.timeout(120000) });
      if (!response.text.trim()) throw new Error('Empty reply');
      await ctx.runMutation(internal.ai.finish, { promptId, requestedModel: args.model, result: response.text, resolvedModel: reportedModel(response.response, args.model), grounding: googleGrounding(response.providerMetadata), policyCitations: citedPolicies(response.text, policies) });
    } catch (error) {
      const retry = APICallError.isInstance(error) && error.statusCode === 429;
      const seconds = retry ? Number(error.responseHeaders?.['retry-after']) : NaN;
      const providerName = isOpenRouter ? 'OpenRouter' : 'Groq';
      const groqError = retry ? `${providerName} rate limit reached. ${Number.isFinite(seconds) && seconds > 0 ? `Retry after ${Math.ceil(seconds)} seconds.` : 'Wait for your organization quota to reset, then retry.'}` : `${providerName} could not reply. Check the server key, free model availability, account privacy settings, and quota, then retry.`;
      await ctx.runMutation(internal.ai.finish, { promptId, requestedModel: args.model, result: '', error: !isGemini ? groqError : 'Gemini could not reply. Check your AI Studio key, model access, and quota, then retry.' });
    }
    return null;
  },
});
