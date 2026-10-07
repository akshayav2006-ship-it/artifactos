"use node";
import { approvalMessage } from "./approvals";
import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const deliver = internalAction({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    const url = process.env.APP_URL;
    if (!user || !pass || !url) {
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: "not_configured",
      });
      return null;
    }
    const invitation = await ctx.runQuery(internal.email.getDelivery, args);
    if (!invitation) return null;
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
    try {
      const result = await transporter.sendMail({
        from: { name: "Artifactos", address: user },
        to: invitation.email,
        messageId: `<artifactos-invite-${args.invitationId}@gmail.com>`,
        subject: `You're invited to ${invitation.project}`,
        text: `${invitation.inviter} invited you to collaborate on ${invitation.project} in Artifactos.\n\nSign in using ${invitation.email} at ${url} to accept your invitation.\n\nThis invitation expires in 7 days.`,
      });
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: result.accepted.length ? "sent" : "failed",
      });
    } catch {
      await ctx.runMutation(internal.email.deliveryStatus, {
        ...args,
        delivery: "failed",
      });
    } finally {
      transporter.close();
    }
    return null;
  },
});

export const deliverApproval = internalAction({
  args: { requestId: v.id("approvalRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.runQuery(internal.approvals.getDelivery, args);
    if (!request) return null;
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    const url = process.env.APP_URL;
    if (!user || !pass || !url) {
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: "not_configured" });
      return null;
    }
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    });
    try {
      const result = await transporter.sendMail({
        from: { name: "Artifactos", address: user }, to: request.email,
        messageId: `<artifactos-approval-${args.requestId}@gmail.com>`,
        ...approvalMessage(request, url),
      });
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: result.accepted.length ? "sent" : "failed" });
    } catch {
      await ctx.runMutation(internal.approvals.deliveryStatus, { ...args, delivery: "failed" });
    } finally {
      transporter.close();
    }
    return null;
  },
});
