import type { Plugin } from 'vite';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import * as chatgpt from './chatgpt.ts';
import type { ChatMessage } from '../shared/ai.ts';
import { googleGrounding, reportedModel } from '../shared/ai.ts';

export function aiPlugin(): Plugin {
  return {
    name: 'artifactos-local-ai',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json');
        try {
          const host = req.headers.host || '';
          const hostname = host.split(':')[0];
          if (!['localhost', '127.0.0.1'].includes(hostname) || req.headers.origin !== `http://${host}` || req.headers['x-artifactos-ai'] !== '1' || req.method !== 'POST') {
            res.writeHead(403).end(JSON.stringify({ error: 'Local AI requires a same-origin localhost request.' })); return;
          }
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 300000) throw new Error('Conversation is too large. Start a new chat.'); }
          const body = JSON.parse(raw || '{}');
          let result: unknown;
          switch (req.url) {
            case '/status': result = await chatgpt.status(); break;
            case '/connect': result = await chatgpt.authorize(typeof body.accountId === 'string' ? body.accountId : undefined); break;
            case '/disconnect': result = await chatgpt.disconnect(); break;
            case '/models': result = await chatgpt.models(); break;
            case '/reply': {
              if (typeof body.model !== 'string' || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100 || body.messages.some((m: ChatMessage) => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 50000)) throw new Error('Invalid conversation.');
              if (body.provider === 'chatgpt') result = await chatgpt.reply(body.model, body.messages);
              else if (body.provider === 'gemini') {
                if (typeof body.apiKey !== 'string' || !body.apiKey.trim()) throw new Error('Enter a Gemini API key from Google AI Studio.');
                if (!/^gemini-[a-z0-9.-]+$/.test(body.model)) throw new Error('Invalid Gemini model.');
                if (body.googleSearch !== undefined && typeof body.googleSearch !== 'boolean') throw new Error('Invalid Google Search option.');
                try {
                  const google = createGoogleGenerativeAI({ apiKey: body.apiKey });
                  const response = await generateText({ model: google(body.model), messages: body.messages, tools: body.googleSearch ? { google_search: google.tools.googleSearch({}) } : undefined, maxRetries: 0, abortSignal: AbortSignal.timeout(120000) });
                  if (!response.text.trim()) throw new Error('empty');
                  result = { text: response.text, resolvedModel: reportedModel(response.response, body.model), grounding: googleGrounding(response.providerMetadata) };
                } catch { throw new Error('Gemini could not reply. Check your AI Studio key, model access, and free-tier quota, then retry.'); }
              } else throw new Error('Unknown provider.');
              break;
            }
            default: res.writeHead(404).end(JSON.stringify({ error: 'Unknown AI route.' })); return;
          }
          res.end(JSON.stringify(result));
        } catch (error) { res.writeHead(400).end(JSON.stringify({ error: error instanceof Error ? error.message : 'AI request failed.' })); }
      });
    },
  };
}
