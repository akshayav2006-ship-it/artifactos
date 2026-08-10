export type ArtifactType = 'Chat' | 'Prompt' | 'AI Response' | 'File'
export type ReviewState = 'Draft' | 'Under Review' | 'Approved' | 'Rejected'
export type ApprovalAction = 'Approved' | 'Rejected' | 'Requested Changes' | 'Review Started'

export type ArtifactVersion = {
  version: number
  timestamp: string
  author: string
  summary: string
  changes: string[]
}

export type ArtifactReview = {
  reviewer: string
  date: string
  comments: string
  status: ReviewState
}

export type ArtifactApproval = {
  action: ApprovalAction
  reviewer: string
  date: string
  comment: string
  previousStatus: ReviewState
  newStatus: ReviewState
}

export type ArtifactProvenance = {
  createdBy: string
  aiModel: string
  promptUsed: string
  generatedResponse: string
  sourceFile: string
  creationTime: string
  lastUpdated: string
  parentVersion: number
  project: string
}

export type ArtifactAuditLog = {
  timestamp: string
  user: string
  action: string
  artifact: string
  project: string
  ip?: string
}

export type ArtifactTrust = {
  score: number
  badge: 'High Trust' | 'Medium Trust' | 'Low Trust'
  explanation: string
}

export type ArtifactVerification = {
  status: 'Verified' | 'Pending' | 'Needs Review'
  generatedAt: string
  result: string
}

export type ArtifactRecord = {
  id: string
  title: string
  projectName: string
  createdBy: string
  aiModel: string
  createdAt: string
  lastModified: string
  artifactType: ArtifactType
  currentVersion: number
  reviewStatus: ReviewState
  verificationStatus: ArtifactVerification['status']
  tags: string[]
  description: string
  conversation: Array<{
    role: 'User' | 'Assistant'
    content: string
  }>
  versions: ArtifactVersion[]
  provenance: ArtifactProvenance
  reviewHistory: ArtifactReview[]
  approvalHistory: ArtifactApproval[]
  trust: ArtifactTrust
  verification: ArtifactVerification
  auditLogs: ArtifactAuditLog[]
}

export type ArtifactListItem = Pick<
  ArtifactRecord,
  'id' | 'title' | 'projectName' | 'reviewStatus' | 'currentVersion' | 'createdAt' | 'artifactType' | 'trust'
>
