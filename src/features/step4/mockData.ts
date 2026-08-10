import type { GraphNode, NotificationItem, SearchResult } from './types'

export const searchResults: SearchResult[] = [
  {
    id: 'ART-1001',
    title: 'Brand Launch Brief',
    project: 'Northstar Product Launch',
    model: 'GPT-4.1',
    trustScore: 92,
    reviewStatus: 'Approved',
    lastUpdated: '2026-07-14T18:10:00.000Z',
    preview: 'Executive-ready launch brief covering positioning, launch messaging and KPI scorecard.',
  },
  {
    id: 'ART-1008',
    title: 'ERP Backend Discussion',
    project: 'Atlas AI Ops',
    model: 'Claude 3.7',
    trustScore: 78,
    reviewStatus: 'Under Review',
    lastUpdated: '2026-07-15T10:30:00.000Z',
    preview: 'Summarizes backend tradeoffs between queue throughput, indexing latency and retry logic.',
  },
  {
    id: 'ART-2204',
    title: 'Authentication Prompt Pack',
    project: 'Identity Vault',
    model: 'ChatGPT',
    trustScore: 85,
    reviewStatus: 'Approved',
    lastUpdated: '2026-07-10T09:15:00.000Z',
    preview: 'Reusable prompts covering MFA recovery, session security, and policy escalation flows.',
  },
  {
    id: 'ART-3151',
    title: 'Customer Retention Summary',
    project: 'Luma Growth Lab',
    model: 'Gemini',
    trustScore: 66,
    reviewStatus: 'Draft',
    lastUpdated: '2026-07-06T16:40:00.000Z',
    preview: 'Draft analysis of churn reduction opportunities derived from user interviews.',
  },
]

export const recentSearches = [
  'approved ChatGPT artifacts',
  'ERP backend discussion',
  'authentication prompt pack',
  'highest trust score artifacts',
]

export const searchSuggestions = [
  'Show all approved ChatGPT artifacts.',
  'Summarize the ERP backend discussion.',
  'Find prompts related to authentication.',
  'Which artifact has the highest trust score?',
  'Find recent artifacts from the Northstar project.',
]

export const dashboardStats = [
  { label: 'Total Projects', value: '24', change: '+8%' },
  { label: 'Total Artifacts', value: '318', change: '+14%' },
  { label: 'Approved Artifacts', value: '218', change: '+9%' },
  { label: 'Pending Reviews', value: '31', change: '-4%' },
  { label: 'Rejected Artifacts', value: '12', change: '-1%' },
  { label: 'Avg Trust Score', value: '81%', change: '+6%' },
  { label: 'AI Conversations', value: '6.4k', change: '+18%' },
  { label: 'Active Team Members', value: '42', change: '+5%' },
]

export const activityFeed = [
  { title: 'Artifact Created', detail: 'Brand Launch Brief created by Maya Chen', time: '2h ago' },
  { title: 'Version Updated', detail: 'ERP Backend Discussion was revised', time: '4h ago' },
  { title: 'Review Submitted', detail: 'Authentication Prompt Pack moved to review', time: '8h ago' },
  { title: 'Approved', detail: 'Northstar concept deck approved by Omar', time: '1d ago' },
  { title: 'Rejected', detail: 'Customer summary rejected for missing citations', time: '2d ago' },
]

export const analyticsSeries = {
  artifactsCreated: [24, 32, 46, 58, 66, 82, 94],
  modelUsage: [48, 32, 26, 18],
  reviewStatus: [60, 22, 12, 6],
  scoreDistribution: [12, 28, 45, 15],
}

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Review Requested',
    message: 'The ERP backend discussion is awaiting approval from a reviewer.',
    time: '5 min ago',
    unread: true,
    type: 'review',
  },
  {
    id: 'n2',
    title: 'Artifact Approved',
    message: 'Brand Launch Brief was approved and marked as trusted.',
    time: '35 min ago',
    unread: true,
    type: 'approval',
  },
  {
    id: 'n3',
    title: 'New Version Created',
    message: 'Version 3 of the customer journey recap was published.',
    time: '1 hour ago',
    unread: false,
    type: 'version',
  },
  {
    id: 'n4',
    title: 'Verification Report Generated',
    message: 'The verification report for Authentication Prompt Pack is ready.',
    time: 'Today',
    unread: false,
    type: 'verification',
  },
]

export const graphNodes: GraphNode[] = [
  { id: 'p1', label: 'Northstar', x: 12, y: 20, type: 'project' },
  { id: 'a1', label: 'Launch Brief', x: 34, y: 28, type: 'artifact' },
  { id: 'u1', label: 'Maya', x: 62, y: 18, type: 'user' },
  { id: 'm1', label: 'GPT-4.1', x: 76, y: 36, type: 'model' },
  { id: 'f1', label: 'brief.md', x: 54, y: 58, type: 'file' },
  { id: 'p2', label: 'Identity Vault', x: 18, y: 72, type: 'project' },
  { id: 'a2', label: 'Auth Pack', x: 42, y: 72, type: 'artifact' },
  { id: 'u2', label: 'Omar', x: 66, y: 74, type: 'user' },
]
