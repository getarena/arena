import { useEffect, useState } from 'react'
import { BrandMark, Icon } from './Icon'
import { PublicNav } from './PublicPage'
import { PublicFooter } from './PublicFooter'

function GoogleIcon() {
  return <span className="google-letter">G</span>
}

function BrowserChrome() {
  return (
    <div className="lp-browser-chrome">
      <div className="lp-browser-dots"><i /><i /><i /></div>
      <div className="lp-browser-address"><span className="lp-lock">⌁</span> arena.app/review/summer-launch</div>
      <div className="lp-browser-spacer" />
    </div>
  )
}

function ReviewRoomMockup({ compact = false }) {
  const versions = ['V3', 'V2', 'V1']
  const feedback = [
    { time: '0:14', name: 'Sarah', text: 'Love the opening. Give this beat another half second.' },
    { time: '0:38', name: 'Sarah', text: 'Bring the product shot in just a touch earlier.' },
    { time: '1:21', name: 'Sarah', text: 'End card looks good.' },
  ]
  const [selectedVersion, setSelectedVersion] = useState('V3')
  const [activeFeedback, setActiveFeedback] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [decision, setDecision] = useState('Awaiting review')
  const [hovered, setHovered] = useState(null)

  const selectFeedback = (index) => {
    setActiveFeedback(index)
    setPlaying(false)
  }

  return (
    <div className={`lp-review-mock ${compact ? 'lp-review-mock-compact' : ''}`}>
      <BrowserChrome />
      <div className="lp-review-shell-bar">
        <div className="lp-review-brand" onMouseEnter={() => setHovered('brand')} onMouseLeave={() => setHovered(null)}>
          <BrandMark size={18} /><span>Arena</span>
          {hovered === 'brand' && <span className="lp-hotspot-tooltip">The creator's private review room.</span>}
        </div>
        <div className="lp-review-context">summer launch / review</div>
        <div className="lp-review-private" onMouseEnter={() => setHovered('private')} onMouseLeave={() => setHovered(null)}>
          <i /> Private review
          {hovered === 'private' && <span className="lp-hotspot-tooltip lp-hotspot-tooltip-right">Clients can review without an account.</span>}
        </div>
      </div>
      <div className="lp-review-grid">
        <div className="lp-review-video">
          <div className="lp-video-topline"><span>Current cut</span><b>{selectedVersion}</b></div>
          <div className="lp-video-scene">
            <div className="lp-video-glow" />
            <div className="lp-video-title"><span>SUMMER / 2026</span><strong>Brand film</strong></div>
            <div className="lp-video-product-shape" />
            <div className={`lp-video-frame-tag ${playing ? 'is-playing' : ''}`}>{playing ? 'PLAYING' : feedback[activeFeedback].time}</div>
          </div>
          <div className="lp-video-controls">
            <button className="lp-play lp-demo-button" type="button" aria-label={playing ? 'Pause preview' : 'Play preview'} onClick={() => setPlaying((value) => !value)} onMouseEnter={() => setHovered('play')} onMouseLeave={() => setHovered(null)}>
              <Icon name={playing ? 'pause' : 'play'} size={12} />
              {hovered === 'play' && <span className="lp-hotspot-tooltip lp-hotspot-tooltip-bottom">{playing ? 'Pause preview' : 'Play the cut'}</span>}
            </button>
            <div className="lp-scrub" role="progressbar" aria-valuenow={playing ? 67 : 43} aria-valuemin="0" aria-valuemax="100"><i style={{ width: playing ? '67%' : '43%' }} /></div>
            <span>{playing ? '00:52' : feedback[activeFeedback].time} / 01:42</span>
          </div>
          <div className="lp-video-timeline" aria-label="Feedback timeline">
            {feedback.map((item, index) => (
              <button
                key={item.time}
                type="button"
                className={index === activeFeedback ? 'is-active' : ''}
                style={{ left: index === 0 ? '17%' : index === 1 ? '42%' : '79%' }}
                aria-label={`Jump to ${item.time}`}
                onClick={() => selectFeedback(index)}
                onMouseEnter={() => setHovered(`marker-${index}`)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === `marker-${index}` && <span className="lp-hotspot-tooltip lp-hotspot-tooltip-marker">Jump to {item.time}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="lp-review-feedback">
          <div className="lp-feedback-head"><div><span>Feedback</span><strong>03</strong></div><span className="lp-feedback-open">Open</span></div>
          {feedback.map((item, index) => (
            <button
              key={item.time}
              type="button"
              className={`lp-feedback-item ${index === activeFeedback ? 'lp-feedback-item-active' : ''}`}
              onClick={() => selectFeedback(index)}
              onMouseEnter={() => setHovered(`feedback-${index}`)}
              onMouseLeave={() => setHovered(null)}
            >
              <div><b>{item.time}</b><span>{item.name}</span></div>
              <p>{item.text}</p>
              {hovered === `feedback-${index}` && <span className="lp-hotspot-tooltip lp-hotspot-tooltip-feedback">Jump to {item.time}</span>}
            </button>
          ))}
          <div className="lp-review-decision">
            <span>Client decision</span>
            <button type="button" className={decision === 'Approved' ? 'decision-approved' : ''} onClick={() => setDecision((value) => value === 'Approved' ? 'Awaiting review' : 'Approved')}>
              {decision}
            </button>
          </div>
        </div>
      </div>
      <div className="lp-review-footer">
        <div className="lp-mini-version-row">
          {versions.map((version) => (
            <button
              key={version}
              type="button"
              className={selectedVersion === version ? 'active' : ''}
              onClick={() => setSelectedVersion(version)}
              onMouseEnter={() => setHovered(`version-${version}`)}
              onMouseLeave={() => setHovered(null)}
            >
              {version}
              {hovered === `version-${version}` && <span className="lp-hotspot-tooltip lp-hotspot-tooltip-footer">Switch to {version}</span>}
            </button>
          ))}
        </div>
        <span>Comments stay attached to time.</span>
      </div>
    </div>
  )
}

function MessageCard({ time, children, tone = '' }) {
  return (
    <div className={`lp-message-card ${tone}`}>
      <span className="lp-message-time">{time}</span>
      <span>{children}</span>
    </div>
  )
}

function ThemeStoryMockup() {
  const [activeNav, setActiveNav] = useState('Review room')
  const [activeVersion, setActiveVersion] = useState('V3')
  const navItems = ['Review room', 'Projects', 'Account']
  const versions = { V3: 'Final polish', V2: 'Tighter intro', V1: 'First pass' }

  return (
    <div className="lp-theme-mockup">
      <div className="lp-theme-window">
        <div className="lp-theme-sidebar">
          <div className="lp-theme-brand"><BrandMark size={17} /><span>Arena</span></div>
          {navItems.map((item) => (
            <button key={item} className={`lp-theme-nav ${activeNav === item ? 'active' : ''}`} type="button" onClick={() => setActiveNav(item)}>
              <span className="nav-dot" /> {item}
            </button>
          ))}
        </div>
        <div className="lp-theme-content">
          <div className="lp-theme-content-top"><span>{activeNav}</span><b>{activeVersion}</b></div>
          <div className="lp-theme-content-video"><span>{activeNav === 'Review room' ? 'Brand film' : activeNav}</span><i /></div>
          <div className="lp-theme-content-panel"><span>Current version · {versions[activeVersion]}</span><strong>{activeVersion}</strong><em>0:38</em></div>
          <div className="lp-theme-story-version-row">
            {Object.keys(versions).map((version) => (
              <button key={version} type="button" className={activeVersion === version ? 'active' : ''} onClick={() => setActiveVersion(version)}>{version}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DecisionDemo() {
  const [decision, setDecision] = useState('Awaiting review')
  return (
    <div className="lp-decision-card" data-reveal>
      <span>CLIENT DECISION</span>
      <strong>{decision === 'Approved' ? 'Ready to ship.' : decision === 'Changes requested' ? 'Back to the cut.' : 'Ready to ship?'}</strong>
      <div className="lp-decision-status">{decision}</div>
      <div className="lp-decision-buttons">
        <button className={decision === 'Approved' ? 'approve is-selected' : 'approve'} type="button" onClick={() => setDecision('Approved')}><Icon name="check" size={14} /> {decision === 'Approved' ? 'Approved' : 'Approve'}</button>
        <button className={decision === 'Changes requested' ? 'is-selected' : ''} type="button" onClick={() => setDecision('Changes requested')}><Icon name="edit" size={14} /> Request changes</button>
      </div>
    </div>
  )
}

export function Landing() {
  const handleLogin = () => {
    window.location.href = '/login'
  }

  const tickerFeatures = [
    { text: 'Timestamped feedback', tip: 'Notes point to the exact moment.' },
    { text: 'Private review links', tip: 'One link keeps the review together.' },
    { text: 'Version history', tip: 'Keep every pass in the same room.' },
    { text: 'Client approval', tip: 'The current cut gets a clear decision.' },
    { text: 'Comments that jump to time', tip: 'Click a note and jump to its moment.' },
  ]
  const tickerQuotes = [
    { text: '“Check around 00:42”', tip: 'The kind of feedback that causes confusion.' },
    { text: '“Can we bring this in sooner?”', tip: 'No more vague timing in chat.' },
    { text: '“Which version is this?”', tip: 'Every note is tied to a version.' },
    { text: '“Looks good — approved.”', tip: 'A visible approval closes the loop.' },
  ]


  useEffect(() => {
    const root = document.querySelector('.landing-page')
    if (!root) return undefined

    const animated = root.querySelectorAll('[data-reveal]')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = reduced ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' })

    if (observer) animated.forEach((element) => observer.observe(element))
    else animated.forEach((element) => element.classList.add('is-visible'))

    const stage = root.querySelector('[data-scroll-stage]')
    const card = root.querySelector('[data-scroll-card]')
    let scrollFrame = 0
    const updateScrollMotion = () => {
      scrollFrame = 0
      if (!stage || !card || reduced) return
      const rect = stage.getBoundingClientRect()
      const scrollable = Math.max(stage.offsetHeight - window.innerHeight, 1)
      const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1)
      const eased = progress * progress * (3 - 2 * progress)
      const translate = 24 - eased * 64
      const scale = 0.945 + eased * 0.055
      const rotate = 1.1 - eased * 1.1
      card.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale}) rotate(${rotate}deg)`
    }
    const onScroll = () => {
      if (scrollFrame) return
      scrollFrame = window.requestAnimationFrame(updateScrollMotion)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="landing-page">
      <PublicNav />

      <main id="top">
        <section className="lp-hero-story" data-scroll-stage>
          <div className="lp-hero-atmosphere" aria-hidden="true"><span /><span /><span /></div>
          <div className="lp-hero-copy" data-reveal>
            <div className="eyebrow lp-hero-eyebrow">PRIVATE VIDEO REVIEW FOR EDITORS &amp; AGENCIES</div>
            <h1>Keep the review <span>attached</span> to the work.</h1>
            <p>Send one private link. Let clients watch the cut, leave feedback on the exact moment, and make a clear decision — without a single review living in chat.</p>
            <div className="hero-actions">
              <button className="lp-btn-primary" onClick={handleLogin}><GoogleIcon />Start free<Icon name="arrowRight" size={15} /></button>
            </div>
            <div className="hero-proof"><span>NO CREDIT CARD</span><i /><span>CLIENTS DON'T NEED AN ACCOUNT</span><i /><span>100MB / VIDEO</span></div>
          </div>

          <div className="lp-hero-product-wrap" data-reveal data-scroll-card>
            <div className="lp-hero-product-float"><ReviewRoomMockup /></div>
          </div>
          <div className="lp-hero-caption"><span>01</span><strong>A review room built around the cut.</strong><span>Scroll to explore</span></div>
        </section>

        <section className="lp-ticker-band" aria-label="Arena review features">
          <div className="lp-ticker-intro">
            <span className="section-index light">THE STUFF THAT STAYS ATTACHED</span>
            <h2>Stop reviewing video like it’s a text message.</h2>
            <p>One room for the cut, the context and the decision.</p>
          </div>
          <div className="lp-ticker-rail" onMouseEnter={(event) => event.currentTarget.classList.add('is-hovered')} onMouseLeave={(event) => event.currentTarget.classList.remove('is-hovered')}>
            <div className="lp-ticker-row lp-ticker-row-one">
              <div className="lp-ticker-sequence">
                {tickerFeatures.map((item, index) => <span key={`feature-a-${index}`} data-tip={item.tip}>{item.text}</span>)}
              </div>
              <div className="lp-ticker-sequence" aria-hidden="true">
                {tickerFeatures.map((item, index) => <span key={`feature-b-${index}`} data-tip={item.tip}>{item.text}</span>)}
              </div>
            </div>
            <div className="lp-ticker-row lp-ticker-row-two">
              <div className="lp-ticker-sequence">
                {tickerQuotes.map((item, index) => <span key={`quote-a-${index}`} data-tip={item.tip}>{item.text}</span>)}
              </div>
              <div className="lp-ticker-sequence" aria-hidden="true">
                {tickerQuotes.map((item, index) => <span key={`quote-b-${index}`} data-tip={item.tip}>{item.text}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section className="lp-problem" id="problem">
          <div className="lp-section-lead" data-reveal>
            <span className="section-index">01 / THE OLD WAY</span>
            <h2>Video feedback was never meant to live across ten tabs.</h2>
            <p>When the work is visual, the conversation needs to stay visual too. Arena brings the cut, the comments and the decision into the same room.</p>
          </div>
          <div className="lp-problem-grid">
            <div className="lp-chaos-stack" data-reveal>
              <MessageCard time="0:42">Check around here — the logo feels too big.</MessageCard>
              <MessageCard time="—">Sent the V2 export again.</MessageCard>
              <MessageCard time="1:14">Wait, are we talking about the older cut?</MessageCard>
              <MessageCard time="—">I dropped the screenshot in WhatsApp.</MessageCard>
              <MessageCard time="0:11">Can you just make the intro feel a little faster?</MessageCard>
            </div>
            <div className="lp-arena-way" data-reveal>
              <div className="lp-way-label"><span>02 / THE ARENA WAY</span><i /></div>
              <div className="lp-way-card">
                <div className="lp-way-icon"><BrandMark size={22} /></div>
                <h3>Every comment belongs to a moment.</h3>
                <p>The client pauses the video, leaves the note, and Arena keeps it attached to that exact point.</p>
                <div className="lp-way-list"><div><Icon name="clock" size={15} /><span>0:42 opens the exact frame</span></div><div><Icon name="link" size={15} /><span>One private link for the whole review</span></div><div><Icon name="check" size={15} /><span>Approval is shown clearly</span></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-review-story" id="review-room">
          <div className="lp-review-story-inner">
            <div className="lp-review-story-copy" data-reveal>
              <span className="section-index light">02 / REVIEW ROOM</span>
              <h2>The UI stays quiet. The work stays loud.</h2>
              <p>Arena gets out of the way. The video stays large, the feedback panel stays legible, and the timeline gives every note a place.</p>
              <div className="lp-story-note"><span>Client view</span><strong>One click away</strong></div>
            </div>
            <div className="lp-review-story-visual" data-reveal><ReviewRoomMockup /></div>
          </div>
        </section>

        <section className="lp-scroll-feature">
          <div className="lp-scroll-feature-pin">
            <div className="lp-scroll-feature-copy" data-reveal>
              <span className="section-index">03 / TIMESTAMPS</span>
              <h2>“Check around 1:32” becomes a real place.</h2>
              <p>Comments aren't floating text. They point back to the cut, so revisions start from the same frame the client meant.</p>
            </div>
            <div className="lp-timestamp-demo" data-reveal>
              <div className="lp-demo-video"><div className="lp-demo-scene"><span>01:32</span><strong>Product shot</strong></div><div className="lp-demo-scrub"><i style={{ width: '67%' }} /></div></div>
              <div className="lp-demo-comment"><div><b>1:32</b><span>Sarah</span></div><p>Could this shot breathe for another beat?</p><button>Jump to 1:32 <Icon name="arrowRight" size={12} /></button></div>
            </div>
          </div>
        </section>

        <section className="lp-version-section" id="workflow">
          <div className="lp-version-copy" data-reveal>
            <span className="section-index">04 / VERSIONS</span>
            <h2>One project. Every pass.</h2>
            <p>V1, V2, final polish — your client sees the current cut without losing the story that got you there.</p>
            <div className="lp-version-pills"><span className="active">V3 · Final polish</span><span>V2 · Tighter intro</span><span>V1 · First pass</span></div>
          </div>
          <ThemeStoryMockup />
        </section>

        <section className="lp-decision-section">
          <div className="lp-decision-inner">
            <div className="lp-decision-copy" data-reveal>
              <span className="section-index light">05 / DECISION</span>
              <h2>Finish the review with a decision, not another message.</h2>
              <p>Approve the current version or request changes. Either way, the project room tells you what happens next.</p>
            </div>
            <DecisionDemo />
          </div>
        </section>

        <section className="lp-how">
          <div className="lp-how-inner">
            <span className="section-index">06 / THE FLOW</span>
            <h2>Three moves. One calm review.</h2>
            <div className="how-grid">
              <div data-reveal><span>01</span><Icon name="upload" size={19} /><h3>Upload the cut</h3><p>Create the project and drop in the latest version.</p></div>
              <div data-reveal><span>02</span><Icon name="link" size={19} /><h3>Send one link</h3><p>The client opens the review room without creating an account.</p></div>
              <div data-reveal><span>03</span><Icon name="check" size={19} /><h3>Get the decision</h3><p>Feedback, revisions and approval stay attached to the work.</p></div>
            </div>
          </div>
        </section>

        <section className="lp-final-cta">
          <div className="lp-final-cta-noise" aria-hidden="true" />
          <div className="lp-final-cta-inner" data-reveal>
            <span className="section-index light">ARENA</span>
            <h2>Make the review the easy part.</h2>
            <p>Send the next cut into its own room and keep the conversation exactly where it belongs.</p>
            <button className="lp-cta-button" onClick={handleLogin}><GoogleIcon />Start free<Icon name="arrowRight" size={15} /></button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
