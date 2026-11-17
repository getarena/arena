import { PublicPage, PublicSection } from './PublicPage'

const LAST_UPDATED = 'November 11, 2026'
const SUPPORT_EMAIL = 'getarenaapp@gmail.com'

export function PrivacyPolicy() {
  return (
    <PublicPage
      eyebrow="PRIVACY"
      title="Privacy Policy"
      lede="A straightforward explanation of the information Arena handles when you visit the site, manage a workspace or take part in a video review."
    >
      <div className="legal-updated">Last updated: {LAST_UPDATED}</div>
      <PublicSection label="01 / WHO THIS COVERS" title="This policy applies to Arena visitors, editors and reviewers.">
        <p>This Privacy Policy explains how Arena handles information in connection with its website and video-review service. “Arena”, “we”, “us” and “our” refer to the operator of the Arena service. “You” means a visitor, account holder, editor or person participating in a review.</p>
        <p>If an editor or agency uploads material about a client or another person, that editor or agency is responsible for ensuring they have the rights and permissions needed to share it for review. Reviewers should contact the person who shared the review link if they have questions about the project or its content.</p>
      </PublicSection>
      <PublicSection label="02 / INFORMATION WE HANDLE" title="Information needed to provide and protect the review service.">
        <p><strong>Account information.</strong> When an editor signs in with Google, Arena receives account details made available by Google, such as the account name, email address and profile image, to identify and operate the editor’s workspace.</p>
        <p><strong>Workspace and review content.</strong> Arena handles information users add to the service, which may include project and version names, uploaded videos and related media details, review links, comments, timestamps, reviewer names, review decisions and project activity.</p>
        <p><strong>Reviewer information.</strong> A client opening a review may be asked to provide a name so comments and feedback can be attributed. Arena may remember that name in the browser for that review. Information submitted with feedback is also processed as part of the relevant review.</p>
        <p><strong>Technical information.</strong> Arena and its service providers may process basic technical and diagnostic information needed to deliver, secure and troubleshoot the service, such as browser/device details, IP address, request timestamps and service error records.</p>
      </PublicSection>
      <PublicSection label="03 / HOW WE USE INFORMATION" title="To run Arena, keep reviews organised and protect the service.">
        <p>We use information to create and manage accounts and workspaces; upload, store and deliver video; display projects and versions; enable comments and review decisions; maintain review links; provide support; diagnose errors; prevent abuse and unauthorised access; maintain service security; and meet legal obligations.</p>
        <p>We do not use private project videos or review comments to serve advertising. Arena does not currently offer behavioural advertising or an in-product analytics programme. If these practices change, this policy and any required notices or choices will be updated before the new practice is introduced.</p>
      </PublicSection>
      <PublicSection label="04 / SERVICE PROVIDERS" title="Trusted infrastructure helps Arena operate.">
        <p>Arena relies on third-party providers to operate the service. Google provides account sign-in; Firebase provides authentication and database services; Cloudinary handles video storage and delivery; and Vercel hosts and serves the application and its server-side functions. These providers may process information as needed to provide their services to Arena and are governed by their own terms and privacy practices.</p>
        <p>Arena does not control the independent privacy or security practices of these providers. Information may be processed in countries where Arena or its providers operate. Those locations may have privacy laws different from the laws where you live.</p>
      </PublicSection>
      <PublicSection label="05 / REVIEW LINKS & SHARED CONTENT" title="Anyone with access to a working link may be able to view its review.">
        <p>Arena review links are designed to let invited clients view a project without creating an editor account. A link should be treated like a private key: only share it with people who are meant to see the review. If a link is forwarded, copied or otherwise obtained by someone else, that person may be able to access the review while the link remains active and any applicable access requirements are met.</p>
        <p>Editors are responsible for choosing what they upload and who receives a review link. Do not upload highly sensitive information unless you have considered whether Arena is suitable for that material and have the necessary permissions.</p>
      </PublicSection>
      <PublicSection label="06 / RETENTION & DELETION" title="Keep content while it is useful; remove it when you no longer need it.">
        <p>Workspace content is generally kept so editors and reviewers can return to the project history. Available product controls allow workspace owners to delete versions, projects and their Arena account. Account deletion is intended to remove the associated workspace content and uploaded media as part of the deletion process.</p>
        <p>Deletion may not immediately remove every residual copy from provider backups, security logs or records that must be retained for legitimate operational or legal reasons. Such information is retained only as needed for those purposes and is subject to the relevant provider processes.</p>
        <p>You may also contact us to request access, correction or deletion of personal information. We may need to verify your identity or authority before acting on a request.</p>
      </PublicSection>
      <PublicSection label="07 / COOKIES & BROWSER STORAGE" title="Arena uses essential browser storage for product preferences.">
        <p>Arena uses browser storage for functions such as remembering theme and workspace preferences and, where applicable, a reviewer name for a particular review link. These values help the service work as expected. Clearing browser storage may remove remembered preferences or reviewer details.</p>
        <p>Your browser and our infrastructure providers may also use essential technologies or logs for security, routing and service operation. Arena does not currently use advertising cookies or third-party advertising pixels.</p>
      </PublicSection>
      <PublicSection label="08 / SECURITY" title="We take reasonable steps, but no online service is risk-free.">
        <p>Arena uses access controls and service-provider security features intended to protect account and project information. No website, storage system or internet transmission can be guaranteed to be completely secure or continuously available. Keep your sign-in account secure, share review links carefully and maintain your own copies of important original files.</p>
      </PublicSection>
      <PublicSection label="09 / YOUR PRIVACY CHOICES" title="You can ask us to help with your information.">
        <p>Depending on where you live, applicable privacy laws may give you rights to request access to, correction of, deletion of or a copy of certain personal information, or to object to or restrict certain processing. These rights may be subject to legal exceptions and verification requirements.</p>
        <p>To make a privacy request or ask a question about this policy, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Please do not include passwords, API keys or other secrets in your message.</p>
      </PublicSection>
      <PublicSection label="10 / CHILDREN" title="Arena is not designed for children.">
        <p>Arena is designed for professional and business use and is not directed to children under 18. We do not knowingly seek to collect personal information from children. If you believe a child has provided personal information to Arena, contact us so we can review the matter and take appropriate steps.</p>
      </PublicSection>
      <PublicSection label="11 / CHANGES TO THIS POLICY" title="We will publish updates on this page.">
        <p>We may update this policy as Arena changes or legal requirements evolve. The revised policy will be posted here with a new “Last updated” date. Where required, we will provide additional notice or obtain consent for material changes.</p>
      </PublicSection>
      <PublicSection label="12 / CONTACT" title="Questions about privacy? Reach the Arena team.">
        <p>Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </PublicSection>
    </PublicPage>
  )
}

export function TermsOfService() {
  return (
    <PublicPage
      eyebrow="TERMS"
      title="Terms of Service"
      lede="These terms explain the rules for accessing Arena and using it to share video projects, collect feedback and manage reviews."
    >
      <div className="legal-updated">Last updated: {LAST_UPDATED}</div>
      <PublicSection label="01 / ACCEPTING THESE TERMS" title="By using Arena, you agree to these terms.">
        <p>These Terms of Service form an agreement between you and the operator of Arena. By visiting, creating an account or using any part of Arena, you agree to these terms and the Privacy Policy. If you do not agree, do not use the service.</p>
        <p>If you use Arena for a company, agency or client, you confirm that you are authorised to do so and that the organisation accepts these terms. In that case, “you” also refers to that organisation where appropriate.</p>
      </PublicSection>
      <PublicSection label="02 / THE SERVICE" title="Arena provides tools for video review and collaboration.">
        <p>Arena allows editors to create workspaces, upload video versions, share review links, receive timestamped feedback and record review decisions. Features, limits and availability may change as the product develops. Some features may be offered as preview or experimental functionality.</p>
      </PublicSection>
      <PublicSection label="03 / YOUR ACCOUNT" title="Keep your account and access secure.">
        <p>Editors sign in using supported authentication methods. You are responsible for maintaining control of your sign-in account, keeping your devices secure and promptly addressing suspected unauthorised access. You are responsible for activity carried out through your account unless applicable law says otherwise.</p>
      </PublicSection>
      <PublicSection label="04 / YOUR CONTENT & PERMISSIONS" title="You retain ownership; you remain responsible for what you share.">
        <p>You retain whatever rights you already hold in videos, project materials, comments and other content you submit. You grant Arena a limited, non-exclusive permission to host, store, reproduce, transmit and display that content only as reasonably necessary to provide, secure and support the service and the review workflow.</p>
        <p>You represent that you own or have obtained all permissions, licences, consents and legal rights needed to upload, share and obtain feedback on your content, including any personal information or material belonging to clients, employees, performers or other third parties.</p>
      </PublicSection>
      <PublicSection label="05 / REVIEW LINKS & CLIENTS" title="You control who you invite to a review.">
        <p>You are responsible for distributing review links and any applicable access credentials to the intended recipients. Do not publish a private review link publicly or send it to anyone who is not authorised to view the material. You should promptly disable or remove access to a review when it is no longer needed, using the controls available in Arena.</p>
        <p>People who submit comments or decisions through a review link must provide information that is accurate and must not impersonate another person. Editors are responsible for ensuring that their use of client feedback complies with their own agreements and privacy obligations.</p>
      </PublicSection>
      <PublicSection label="06 / ACCEPTABLE USE" title="Do not misuse Arena or infringe anyone's rights.">
        <p>You must not use Arena to break the law; infringe copyright, privacy or other rights; upload malware or harmful code; harass, threaten or expose another person; attempt to access another user's workspace; bypass access controls; probe, disrupt or overload the service or its providers; scrape or harvest information without permission; or use the service to distribute spam or deceptive material.</p>
        <p>We may investigate suspected misuse and restrict, suspend or terminate access where reasonably necessary to protect users, the service or our legal rights.</p>
      </PublicSection>
      <PublicSection label="07 / THIRD-PARTY SERVICES" title="Some parts of Arena depend on independent providers.">
        <p>Arena relies on services such as Google, Firebase, Cloudinary and Vercel. Their availability, policies, technical limits or actions may affect Arena. Your use of third-party services may also be subject to their separate terms. Arena is not responsible for services or products that it does not control.</p>
      </PublicSection>
      <PublicSection label="08 / FEES & LIMITS" title="Any applicable pricing and usage limits will be shown separately.">
        <p>Where Arena offers a free or limited service, those limits may apply to uploads, storage, features or usage. If paid plans or charges are introduced, the applicable pricing and payment terms will be presented before you are charged. Unless expressly stated otherwise, you are responsible for internet access, devices and other costs required to use Arena.</p>
      </PublicSection>
      <PublicSection label="09 / AVAILABILITY, BACKUPS & CHANGES" title="Keep your own copies of important work.">
        <p>Arena is provided on an evolving basis. We do not promise uninterrupted access, error-free operation, permanent storage or that every feature will remain available. We may modify, suspend or discontinue any part of the service, including for maintenance, security, legal or operational reasons.</p>
        <p>You are responsible for keeping independent copies of original videos and other important materials. Do not rely on Arena as your only archive or backup.</p>
      </PublicSection>
      <PublicSection label="10 / DELETION & TERMINATION" title="You can stop using Arena and request account deletion.">
        <p>You may stop using Arena at any time and use the available account controls to request deletion. Deletion may remove workspace records and associated uploaded media. Some residual information may remain temporarily in provider backups, security logs or records retained where legally required.</p>
        <p>We may suspend or terminate access if you materially breach these terms, create a security or legal risk, or if we must do so by law. Where reasonably possible, we will provide notice or an opportunity to address the issue.</p>
      </PublicSection>
      <PublicSection label="11 / DISCLAIMERS" title="Arena is provided as available, to the extent permitted by law.">
        <p>To the maximum extent permitted by applicable law, Arena is provided “as is” and “as available”, without warranties or guarantees that the service will be uninterrupted, secure, error-free, suitable for a particular purpose or that stored content will never be lost. Nothing in these terms excludes a warranty or right that cannot lawfully be excluded.</p>
      </PublicSection>
      <PublicSection label="12 / LIMITATION OF LIABILITY" title="Some limits apply to claims relating to the service.">
        <p>To the maximum extent permitted by applicable law, the Arena operator will not be liable for indirect, incidental, special, consequential or punitive loss, or for loss of profits, revenue, business opportunities, goodwill, data or content arising from or related to use of the service.</p>
        <p>To the maximum extent permitted by law, the total liability of the Arena operator for claims arising out of or relating to the service will be limited to the amount you paid directly to Arena for the service in the three months before the event giving rise to the claim, or, if you have paid nothing, the equivalent of INR 1,000. This limitation does not apply where prohibited by law, including liability that cannot legally be limited.</p>
      </PublicSection>
      <PublicSection label="13 / INDEMNITY" title="You are responsible for claims caused by your content or misuse.">
        <p>To the extent permitted by applicable law, you agree to defend and hold the Arena operator harmless from third-party claims, losses and reasonable costs arising from content you submit, your failure to obtain required permissions, your misuse of Arena or your breach of these terms. We will give you reasonable notice of a claim and cooperate in its defence. This section does not apply to the extent a claim is caused by our own unlawful conduct.</p>
      </PublicSection>
      <PublicSection label="14 / CHANGES & CONTACT" title="Updated terms will be published here.">
        <p>We may update these terms as Arena evolves. Continued use after updated terms take effect means you accept the revised terms, to the extent permitted by applicable law. Material changes will be highlighted where appropriate.</p>
        <p>Questions about these terms: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </PublicSection>
    </PublicPage>
  )
}

export function AcceptableUse() {
  return (
    <PublicPage eyebrow="ACCEPTABLE USE" title="Acceptable Use" lede="A practical set of boundaries that helps keep Arena useful and safe for editors, clients and reviewers.">
      <div className="legal-updated">Last updated: {LAST_UPDATED}</div>
      <PublicSection label="01 / KEEP IT LEGAL" title="Use content you are entitled to share.">
        <p>Do not upload, share or request content that violates applicable law, copyright, privacy, confidentiality or another person's rights. Obtain the necessary permissions before sharing client or third-party material.</p>
      </PublicSection>
      <PublicSection label="02 / RESPECT PEOPLE" title="Do not use Arena to harm or expose others.">
        <p>Do not harass, threaten, impersonate, dox or discriminate against anyone. Do not use reviewer information for unrelated contact, profiling or solicitation.</p>
      </PublicSection>
      <PublicSection label="03 / PROTECT REVIEWS" title="Treat review links as private.">
        <p>Only share review links with intended participants. Do not attempt to access, guess or distribute another person's private review or workspace.</p>
      </PublicSection>
      <PublicSection label="04 / PROTECT THE SERVICE" title="Do not attack or interfere with Arena.">
        <p>Do not bypass authentication or access controls, probe systems without permission, upload malicious files, scrape information, interfere with service operation or deliberately overload Arena or its infrastructure providers.</p>
      </PublicSection>
      <PublicSection label="05 / ENFORCEMENT" title="Misuse may result in access restrictions.">
        <p>We may review reports of suspected misuse and take proportionate action, including removing content or suspending access where reasonably necessary to protect users, the service or our legal rights.</p>
      </PublicSection>
    </PublicPage>
  )
}

export function SecurityPage() {
  return (
    <PublicPage eyebrow="SECURITY" title="How Arena approaches trust" lede="A practical overview of the safeguards and responsibilities that matter when sharing creative work." active="security">
      <div className="legal-updated">Last updated: {LAST_UPDATED}</div>
      <PublicSection label="01 / ACCOUNT ACCESS" title="Editors sign in through Google.">
        <p>Arena uses Firebase Authentication with Google sign-in for editor workspaces. Clients can participate in a review without creating an editor account.</p>
      </PublicSection>
      <PublicSection label="02 / PROJECT ACCESS" title="Workspace access is tied to its owner.">
        <p>Project records are associated with the editor's workspace. Review links provide a separate way for invited clients to access the relevant review. Anyone who obtains an active link may be able to access that review, so links should be shared carefully.</p>
      </PublicSection>
      <PublicSection label="03 / VIDEO STORAGE" title="Video uploads are handled by Cloudinary.">
        <p>Cloudinary receives and delivers video uploaded through Arena. Arena uses server-side controls to support upload verification and media management. Keep independent copies of important original files.</p>
      </PublicSection>
      <PublicSection label="04 / DELETION" title="Workspace owners have deletion controls.">
        <p>Available controls allow owners to delete versions, projects and their Arena account. Provider backups and legally required records may take additional time to expire or may need to be retained.</p>
      </PublicSection>
      <PublicSection label="05 / REPORT A CONCERN" title="Tell us if something does not look right.">
        <p>Report suspected vulnerabilities, accidental exposure or account access concerns to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Please include enough detail to investigate, but do not send passwords, API keys or private credentials.</p>
      </PublicSection>
    </PublicPage>
  )
}
