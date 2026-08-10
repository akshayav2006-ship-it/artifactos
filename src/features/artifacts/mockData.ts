import type { ArtifactRecord } from './types'

export const artifactSeed: ArtifactRecord[] = [
  {
    id: 'ART-1001',
    title: 'Brand Launch Brief',
    projectName: 'Northstar Product Launch',
    createdBy: 'Maya Chen',
    aiModel: 'GPT-4.1',
    createdAt: '2026-07-12T09:45:00.000Z',
    lastModified: '2026-07-14T18:10:00.000Z',
    artifactType: 'Chat',
    currentVersion: 3,
    reviewStatus: 'Approved',
    verificationStatus: 'Verified',
    tags: ['brand', 'launch', 'copy', 'strategy'],
    description:
      'Executive-ready launch brief generated from the project discovery notes and AI-assisted market summary.',
    conversation: [
      { role: 'User', content: 'Draft a launch brief for a new productivity platform positioning strategy.' },
      {
        role: 'Assistant',
        content:
          'Here is the launch brief: customer pain points, market positioning, messaging pillars, launch timeline, and a KPI scorecard.',
      },
    ],
    versions: [
      {
        version: 1,
        timestamp: '2026-07-12T09:45:00.000Z',
        author: 'Maya Chen',
        summary: 'Initial launch brief scaffold created from product notes.',
        changes: ['Added goals and audience segmentation', 'Included first market assumptions'],
      },
      {
        version: 2,
        timestamp: '2026-07-13T11:22:00.000Z',
        author: 'Ari Patel',
        summary: 'Expanded messaging and revised CTAs.',
        changes: ['Updated messaging pillars', 'Added launch checklist'],
      },
      {
        version: 3,
        timestamp: '2026-07-14T18:10:00.000Z',
        author: 'Maya Chen',
        summary: 'Final executive review and KPI refinements.',
        changes: ['Added executive summary', 'Adjusted KPI targets', 'Validated stakeholder language'],
      },
    ],
    provenance: {
      createdBy: 'Maya Chen',
      aiModel: 'GPT-4.1',
      promptUsed: 'Draft a launch brief for a new productivity platform positioning strategy.',
      generatedResponse:
        'Here is the launch brief: customer pain points, market positioning, messaging pillars, launch timeline, and a KPI scorecard.',
      sourceFile: 'discovery-notes.md',
      creationTime: '2026-07-12T09:45:00.000Z',
      lastUpdated: '2026-07-14T18:10:00.000Z',
      parentVersion: 0,
      project: 'Northstar Product Launch',
    },
    reviewHistory: [
      {
        reviewer: 'Lena Ortiz',
        date: '2026-07-13T12:45:00.000Z',
        comments: 'Strong positioning but needs better customer proof points.',
        status: 'Under Review',
      },
      {
        reviewer: 'Omar Singh',
        date: '2026-07-14T16:20:00.000Z',
        comments: 'Approved after final KPI adjustments.',
        status: 'Approved',
      },
    ],
    approvalHistory: [
      {
        action: 'Review Started',
        reviewer: 'Lena Ortiz',
        date: '2026-07-13T12:45:00.000Z',
        comment: 'Review initiated for launch readiness.',
        previousStatus: 'Draft',
        newStatus: 'Under Review',
      },
      {
        action: 'Approved',
        reviewer: 'Omar Singh',
        date: '2026-07-14T16:20:00.000Z',
        comment: 'Validated positioning and metrics.',
        previousStatus: 'Under Review',
        newStatus: 'Approved',
      },
    ],
    trust: {
      score: 92,
      badge: 'High Trust',
      explanation:
        'Approved status, verified provenance, and multiple reviewed revisions strongly support trust in this artifact.',
    },
    verification: {
      status: 'Verified',
      generatedAt: '2026-07-14T18:15:00.000Z',
      result: 'Verified against project source notes and reviewer sign-off.',
    },
    auditLogs: [
      {
        timestamp: '2026-07-12T09:45:00.000Z',
        user: 'Maya Chen',
        action: 'Artifact Created',
        artifact: 'ART-1001',
        project: 'Northstar Product Launch',
        ip: '203.0.113.10',
      },
      {
        timestamp: '2026-07-14T18:10:00.000Z',
        user: 'Maya Chen',
        action: 'Edited',
        artifact: 'ART-1001',
        project: 'Northstar Product Launch',
        ip: '203.0.113.10',
      },
      {
        timestamp: '2026-07-14T18:15:00.000Z',
        user: 'Omar Singh',
        action: 'Verification Generated',
        artifact: 'ART-1001',
        project: 'Northstar Product Launch',
      },
    ],
  },
  {
    id: 'ART-1002',
    title: 'QA Summary for Release Candidate',
    projectName: 'Atlas AI Ops',
    createdBy: 'Nina Brooks',
    aiModel: 'Claude 3.7',
    createdAt: '2026-07-09T08:00:00.000Z',
    lastModified: '2026-07-10T14:10:00.000Z',
    artifactType: 'AI Response',
    currentVersion: 2,
    reviewStatus: 'Under Review',
    verificationStatus: 'Pending',
    tags: ['qa', 'release', 'risk'],
    description: 'Summary of release risks and readiness notes generated during release candidate review.',
    conversation: [
      { role: 'User', content: 'Summarize the QA release candidate risks from our latest run.' },
      {
        role: 'Assistant',
        content:
          'There are three key risks: memory leak risk in the export driver, low coverage in edge-case retries, and a moderate delay on large indexing jobs.',
      },
    ],
    versions: [
      {
        version: 1,
        timestamp: '2026-07-09T08:00:00.000Z',
        author: 'Nina Brooks',
        summary: 'Initial synthesis of QA findings.',
        changes: ['Added risk list', 'Summarized callouts'],
      },
      {
        version: 2,
        timestamp: '2026-07-10T14:10:00.000Z',
        author: 'Jules Kim',
        summary: 'Updated issue severity and risk ownership.',
        changes: ['Re-ranked risks', 'Assigned owners', 'Added mitigation notes'],
      },
    ],
    provenance: {
      createdBy: 'Nina Brooks',
      aiModel: 'Claude 3.7',
      promptUsed: 'Summarize the QA release candidate risks from our latest run.',
      generatedResponse:
        'There are three key risks: memory leak risk in the export driver, low coverage in edge-case retries, and a moderate delay on large indexing jobs.',
      sourceFile: 'release-candidate-qa.json',
      creationTime: '2026-07-09T08:00:00.000Z',
      lastUpdated: '2026-07-10T14:10:00.000Z',
      parentVersion: 1,
      project: 'Atlas AI Ops',
    },
    reviewHistory: [
      {
        reviewer: 'Parker Lee',
        date: '2026-07-10T14:50:00.000Z',
        comments: 'Needs a final ownership check before sign-off.',
        status: 'Under Review',
      },
    ],
    approvalHistory: [
      {
        action: 'Review Started',
        reviewer: 'Parker Lee',
        date: '2026-07-10T14:50:00.000Z',
        comment: 'Review initiated for candidate readiness.',
        previousStatus: 'Draft',
        newStatus: 'Under Review',
      },
    ],
    trust: {
      score: 63,
      badge: 'Medium Trust',
      explanation: 'The artifact has a valid source trail and multiple revisions, but it has not yet received final approver sign-off.',
    },
    verification: {
      status: 'Pending',
      generatedAt: '2026-07-10T15:00:00.000Z',
      result: 'Awaiting final provenance verification and reviewer sign-off.',
    },
    auditLogs: [
      {
        timestamp: '2026-07-09T08:00:00.000Z',
        user: 'Nina Brooks',
        action: 'Artifact Created',
        artifact: 'ART-1002',
        project: 'Atlas AI Ops',
      },
      {
        timestamp: '2026-07-10T14:10:00.000Z',
        user: 'Jules Kim',
        action: 'Edited',
        artifact: 'ART-1002',
        project: 'Atlas AI Ops',
      },
    ],
  },
]
