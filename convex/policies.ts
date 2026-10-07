import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { requireMembership, requireRole } from './lib/auth';
import { validatePolicyImport } from '../shared/policies';

export const importSheet = mutation({
  args: { projectId: v.id('projects'), sheet: v.string(), rows: v.array(v.object({ row: v.number(), text: v.string() })) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, args.projectId, ['owner', 'admin', 'member']);
    validatePolicyImport(args);
    for (const row of args.rows) await ctx.db.insert('policyRows', { projectId: args.projectId, sheet: args.sheet.trim(), ...row });
    return null;
  },
});
export const search = query({
  args: { projectId: v.id('projects'), text: v.string() },
  returns: v.array(v.object({ id: v.id('policyRows'), projectId: v.id('projects'), sheet: v.string(), row: v.number(), text: v.string() })),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.projectId);
    if (args.text.length > 200) throw new Error('Search is limited to 200 characters.');
    const rows = args.text.trim()
      ? await ctx.db.query('policyRows').withSearchIndex('search_text', q => q.search('text', args.text.trim()).eq('projectId', args.projectId)).take(30)
      : await ctx.db.query('policyRows').withIndex('by_projectId', q => q.eq('projectId', args.projectId)).order('desc').take(30);
    return rows.map(row => ({ id: row._id, projectId: row.projectId, sheet: row.sheet, row: row.row, text: row.text }));
  },
});
