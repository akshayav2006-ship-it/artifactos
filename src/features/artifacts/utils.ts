import type { ArtifactRecord, ArtifactTrust, ReviewState } from './types'

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function getTrustSummary(artifact: ArtifactRecord): ArtifactTrust {
  let score = 0

  if (artifact.reviewStatus === 'Approved') score += 30
  if (artifact.aiModel && artifact.aiModel !== 'Unknown') score += 20
  if (artifact.versions.length > 1) score += 15
  if (artifact.verificationStatus === 'Verified') score += 20
  if (artifact.approvalHistory.length > 0) score += 15

  if (artifact.reviewStatus === 'Rejected') {
    score = Math.min(score, 40)
  }

  score = Math.max(0, Math.min(100, score))

  let badge: ArtifactTrust['badge'] = 'Low Trust'
  let explanation = 'The artifact needs more review and verification before it can be relied on.'

  if (score >= 80) {
    badge = 'High Trust'
    explanation = 'The artifact has strong approvals, a verified provenance trail, and a robust version history.'
  } else if (score >= 50) {
    badge = 'Medium Trust'
    explanation = 'The artifact is mostly stable, but additional review or verification would increase confidence.'
  } else if (artifact.reviewStatus === 'Rejected') {
    explanation = 'The artifact was rejected and should not be treated as a trusted final output.'
  }

  return {
    score,
    badge,
    explanation,
  }
}

export function getProgressTone(status: ReviewState) {
  switch (status) {
    case 'Approved':
      return 'approved'
    case 'Under Review':
      return 'review'
    case 'Rejected':
      return 'rejected'
    default:
      return 'draft'
  }
}
