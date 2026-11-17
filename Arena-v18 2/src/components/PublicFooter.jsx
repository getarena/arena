import { BrandMark, Icon } from './Icon'

function FooterLink({ href, children }) {
  return (
    <a href={href}>
      {children}
    </a>
  )
}

export function PublicFooter({ compact = false }) {
  return (
    <footer className={`public-footer public-footer-v17-9 ${compact ? 'compact' : ''}`}>
      <div className="public-footer-v17-9-inner">
        <div className="public-footer-v17-9-grid">
          <div className="public-footer-v17-9-brand">
            <a href="/" className="public-footer-v17-9-brandmark" aria-label="Go to Arena home">
              <BrandMark size={28} />
              <span>Arena</span>
            </a>
            <p>Private video review for editors and agencies. Keep the cut, the feedback, and the decision in one calm room.</p>
            <a className="public-footer-v17-9-email" href="mailto:getarenaapp@gmail.com">getarenaapp@gmail.com <Icon name="arrowRight" size={13} /></a>
          </div>

          <div className="public-footer-v17-9-column">
            <h3>Product</h3>
            <FooterLink href="/#problem">Why Arena</FooterLink>
            <FooterLink href="/#review-room">Review room</FooterLink>
            <FooterLink href="/#workflow">Workflow</FooterLink>
            <FooterLink href="/about">About</FooterLink>
          </div>

          <div className="public-footer-v17-9-column">
            <h3>Trust</h3>
            <FooterLink href="/security">Security</FooterLink>
            <FooterLink href="/privacy">Privacy policy</FooterLink>
            <FooterLink href="/terms">Terms of service</FooterLink>
            <FooterLink href="/acceptable-use">Acceptable use</FooterLink>
          </div>

          <div className="public-footer-v17-9-column">
            <h3>Support</h3>
            <FooterLink href="/help">Help</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
            <FooterLink href="/login">Start free</FooterLink>
          </div>
        </div>

        <div className="public-footer-v17-9-wordmark" aria-hidden="true">ARENA</div>

        <div className="public-footer-v17-9-bottom">
          <span>© {new Date().getFullYear()} Arena</span>
          <span><Icon name="lock" size={12} /> Review links are intended to be shared privately.</span>
        </div>
      </div>
    </footer>
  )
}
