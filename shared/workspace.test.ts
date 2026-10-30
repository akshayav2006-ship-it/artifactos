import { expect, test } from 'vitest';
import { needsMyReview, type Artifact, type Project } from './workspace';

const project: Project = { id: 'p', role: 'reviewer', ownerId: 'owner', name: 'Project', description: '' };
const artifact = { status: 'pending', authorId: 'author', approvers: [{ userId: 'me', name: 'Me', delivery: 'sent' }], requiredApprovals: 1 } as Artifact;

test('review inbox includes only pending eligible assignments and legacy owner access', () => {
  expect(needsMyReview(artifact, project, 'me')).toBe(true);
  expect(needsMyReview(artifact, project, 'other')).toBe(false);
  expect(needsMyReview(artifact, { ...project, role: 'viewer' }, 'me')).toBe(false);
  expect(needsMyReview({ ...artifact, authorId: 'me' }, project, 'me')).toBe(false);
  expect(needsMyReview({ ...artifact, status: 'verified' }, project, 'me')).toBe(false);
  expect(needsMyReview({ ...artifact, approvers: [{ ...artifact.approvers![0], decision: 'verified' }] }, project, 'me')).toBe(false);
  const legacy = { ...artifact, approvers: [], requiredApprovals: undefined };
  expect(needsMyReview(legacy, { ...project, role: 'owner' }, 'me')).toBe(true);
  expect(needsMyReview(legacy, project, 'me')).toBe(false);
});
