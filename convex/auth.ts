import { v } from 'convex/values'
import { query } from './_generated/server'

export const currentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      subject: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return null
    }

    return {
      subject: identity.subject,
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.name ? { name: identity.name } : {}),
    }
  },
})
