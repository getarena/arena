export function buildReviewLink(project) {
  return `${window.location.origin}/review/${project.shareToken}`
}

export function buildReviewInvite(project) {
  const title = project?.title?.trim() || 'a video review'
  const link = buildReviewLink(project)
  const passwordLine = project?.reviewPasswordEnabled ? '\n\nThe review room is password protected; the sender will provide the password separately.' : ''
  return `You’ve been invited to review “${title}” in Arena.\n\nWatch the latest cut, leave timestamped feedback, and approve or request changes.${passwordLine}\n\nReview the project:\n${link}`
}

export async function shareReviewInvite(project) {
  const title = project?.title?.trim() || 'Video review'
  const text = buildReviewInvite(project)
  const link = buildReviewLink(project)

  if (navigator.share) {
    await navigator.share({ title: `Review: ${title}`, text, url: link })
    return 'shared'
  }

  await navigator.clipboard.writeText(text)
  return 'copied'
}
