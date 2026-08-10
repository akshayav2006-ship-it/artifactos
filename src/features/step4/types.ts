export type SearchResult = {
  id: string
  title: string
  project: string
  model: string
  trustScore: number
  reviewStatus: 'Draft' | 'Under Review' | 'Approved' | 'Rejected'
  lastUpdated: string
  preview: string
}

export type NotificationItem = {
  id: string
  title: string
  message: string
  time: string
  unread: boolean
  type: 'approval' | 'review' | 'version' | 'verification' | 'comment' | 'invitation'
}

export type GraphNode = {
  id: string
  label: string
  x: number
  y: number
  type: 'project' | 'artifact' | 'user' | 'model' | 'file'
}
