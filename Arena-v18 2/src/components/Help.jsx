import { PublicPage, PublicSection } from './PublicPage'

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'getarenaapp@gmail.com'

export function Help() {
  return (
    <PublicPage eyebrow="HELP" title="Keep the review moving." lede="A practical guide for the moments that matter most: uploading a cut, sharing the room and getting a decision." active="help">
      <PublicSection label="01 / FIRST REVIEW" title="Start with one project and one cut.">
        <p>Sign in with Google, choose <strong>New review</strong>, give the project and version a clear name, then upload the video. Arena currently accepts MP4, MOV and AVI files up to 100MB per video.</p>
      </PublicSection>
      <PublicSection label="02 / SEND THE LINK" title="Share the project review link.">
        <p>From the review room, use <strong>Copy link</strong> or <strong>Client view</strong>. Keep that link with the client or team members who should review the cut. A new version stays inside the same project.</p>
      </PublicSection>
      <PublicSection label="03 / FEEDBACK" title="Notes belong to a timestamp.">
        <p>A reviewer can pause the video, write a note and submit it. The note is attached to that moment in the cut, so the editor can jump back to the same time.</p>
      </PublicSection>
      <PublicSection label="04 / DECISIONS" title="Approval and change requests are explicit.">
        <p>A client can approve the current cut or request changes with a short reason. A new uploaded version starts its own review state, so the latest cut can be distinguished from earlier decisions.</p>
      </PublicSection>
      <PublicSection label="05 / TROUBLESHOOTING" title="When something fails, keep the recovery simple.">
        <div className="help-list">
          <div><strong>Upload failed</strong><span>Check the file format, keep it under 100MB and try again with a stable connection.</span></div>
          <div><strong>Review link does not open</strong><span>Make sure the full link was copied. The project may also have been removed or the link may no longer be active.</span></div>
          <div><strong>Feedback is not showing</strong><span>Refresh the review room and reopen the project. Temporary network or service issues can interrupt a load.</span></div>
          <div><strong>You cannot access a project</strong><span>Confirm that you are signed into the Google account that owns the workspace.</span></div>
        </div>
      </PublicSection>
      <PublicSection label="06 / SUPPORT" title="Need a human?"><p>{supportEmail ? <>Email <a className="public-inline-link" href={`mailto:${supportEmail}`}>{supportEmail}</a> with the project name and a short description of the issue.</> : <>Email getarenaapp@gmail.com and include the project name plus a short description of the issue.</>}</p></PublicSection>
    </PublicPage>
  )
}

export function Contact() {
  return (
    <PublicPage eyebrow="CONTACT" title="Contact Arena." lede="Keep the support path simple. This page uses the deployment's configured support address rather than inventing one in the product copy.">
      <PublicSection label="01 / SUPPORT" title="A small, direct support channel.">
        <p>For product questions or a problem with a review, email <a className="public-inline-link" href={`mailto:${supportEmail}`}>{supportEmail}</a>. Include the project name, what happened and what you expected to happen.</p>
      </PublicSection>
      <PublicSection label="02 / REVIEWERS" title="Are you a client reviewing a cut?"><p>For a review-specific issue, start by contacting the person who sent you the Arena link. They control the project and can usually resolve project-specific questions fastest.</p></PublicSection>
      <PublicSection label="03 / PRIVACY" title="For privacy-related requests."><p>Use the same published support address and make it clear that your message is a privacy request. Arena may need to verify the request before taking action.</p></PublicSection>
    </PublicPage>
  )
}
