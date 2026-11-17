import { useState } from 'react'
import { Icon } from './Icon'
import { PublicNav } from './PublicPage'
import { PublicFooter } from './PublicFooter'

const faqItems = [
  {
    q: 'What is Arena, in one sentence?',
    a: 'Arena is a private place where a video editor can send a cut to a client, collect feedback on exact moments in the video, and get a clear approve-or-change decision.'
  },
  {
    q: 'Does my client need an Arena account?',
    a: 'No. The editor signs in to manage the project, but the client can open the private review link and leave feedback without creating an Arena account.'
  },
  {
    q: 'What is a version?',
    a: 'A version is one uploaded cut of the same project. For example, you might upload V1 for the first review, V2 after changes, and V3 as the final polish. Each version keeps its own review status.'
  },
  {
    q: 'What does timestamped feedback mean?',
    a: 'A comment can belong to a specific moment in the video. Instead of saying “somewhere near the middle”, a client can pause at 00:42 and leave a note there. Clicking a note takes the reviewer back to that moment.'
  },
  {
    q: 'What happens when a client approves?',
    a: 'The current version is marked Approved. The decision stays connected to that version, so a newer upload can still start as Awaiting review until the client decides on it.'
  },
  {
    q: 'Can a client ask for changes instead?',
    a: 'Yes. They can choose Request changes and optionally explain what needs another pass. The project then shows that the current version needs attention.'
  },
  {
    q: 'Does Arena replace my editing software?',
    a: 'No. Arena is for review and communication, not for editing the video itself. You still edit in the software you already use, then upload the next cut to Arena for review.'
  },
  {
    q: 'How large can a video be?',
    a: 'The current uploader accepts MP4, MOV and AVI files up to 100MB per video.'
  },
]

export function About() {
  const [openFaq, setOpenFaq] = useState(0)

  const goLogin = () => {
    window.location.href = '/login'
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="about-page">
      <PublicNav active="about" />

      <main>
        <section className="about-hero" id="top">
          <div className="about-hero-grid" aria-hidden="true" />
          <div className="about-hero-inner">
            <div className="about-kicker">ARENA / THE PLAIN-ENGLISH VERSION</div>
            <h1>So… what exactly <span>is Arena?</span></h1>
            <p className="about-hero-lede">Arena is the place you send a finished-looking video when you need another human to watch it, comment on it, and tell you what happens next.</p>
            <div className="about-hero-actions">
              <button type="button" className="about-primary" onClick={goLogin}>Try Arena <Icon name="arrowRight" size={15} /></button>
              <button type="button" className="about-secondary" onClick={() => scrollTo('what-is-arena')}>Explain it to me <Icon name="arrowDown" size={15} /></button>
            </div>
            <div className="about-proof-line">
              <span><Icon name="video" size={14} /> Video-first</span>
              <span><Icon name="link" size={14} /> One private link</span>
              <span><Icon name="message" size={14} /> Feedback at the moment it belongs</span>
              <span><Icon name="check" size={14} /> Clear approval</span>
            </div>
          </div>
        </section>

        <section className="about-section about-intro" id="what-is-arena">
          <div className="about-container">
            <div className="about-section-head">
              <div>
                <span className="about-index">01 / WHAT IT IS</span>
                <h2>It is basically a review room for your video.</h2>
              </div>
              <p>You upload a cut, Arena gives that cut a private room, and your client gets a link. Everything that normally gets scattered between chat messages, screenshots and “check around 00:42” lives next to the video instead.</p>
            </div>

            <div className="about-plain-grid">
              <article className="about-plain-card about-plain-card-wide">
                <div className="about-card-number">A</div>
                <div>
                  <h3>You are the editor.</h3>
                  <p>You create the project, upload the video and send the review link. When you make changes, you upload another version into the same project instead of starting a brand-new conversation.</p>
                </div>
              </article>
              <article className="about-plain-card">
                <div className="about-card-number">B</div>
                <h3>Your client is the reviewer.</h3>
                <p>They open the private link, watch the video, pause where something needs attention and leave feedback. They do not need to sign in.</p>
              </article>
              <article className="about-plain-card">
                <div className="about-card-number">C</div>
                <h3>The video is the centre of the conversation.</h3>
                <p>Comments, versions and decisions all point back to the cut, so the discussion stays understandable even after several rounds.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-dark-explain" id="how-it-works">
          <div className="about-container">
            <div className="about-section-head dark">
              <div>
                <span className="about-index">02 / HOW IT WORKS</span>
                <h2>Four simple steps.</h2>
              </div>
              <p>There is no complicated setup. The point is to make the review process easier without changing how you actually edit.</p>
            </div>

            <div className="about-flow">
              <article className="about-flow-step">
                <span>01</span>
                <div className="about-flow-icon"><Icon name="upload" size={19} /></div>
                <h3>Upload the cut.</h3>
                <p>Create a project and upload the video you want someone to review.</p>
              </article>
              <article className="about-flow-step">
                <span>02</span>
                <div className="about-flow-icon"><Icon name="link" size={19} /></div>
                <h3>Send one link.</h3>
                <p>Copy the private review link and send it wherever you normally talk to your client.</p>
              </article>
              <article className="about-flow-step">
                <span>03</span>
                <div className="about-flow-icon"><Icon name="clock" size={19} /></div>
                <h3>Get useful feedback.</h3>
                <p>Comments stay connected to timestamps, so “make this part better” can become a specific action.</p>
              </article>
              <article className="about-flow-step">
                <span>04</span>
                <div className="about-flow-icon"><Icon name="check" size={19} /></div>
                <h3>Get the decision.</h3>
                <p>The client can approve the current version or request changes. You always know what the latest cut needs.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="about-version-section">
          <div className="about-container">
            <div className="about-version-copy">
              <span className="about-index">03 / VERSIONS</span>
              <h2>One project can hold the whole story.</h2>
              <p>Imagine a 30-second ad going through three passes. Instead of creating three separate links and wondering which one is current, Arena keeps those passes together.</p>
              <div className="about-version-list">
                <div className="about-version-row"><b>V1</b><span>First cut</span><em>Changes requested</em></div>
                <div className="about-version-row"><b>V2</b><span>Second pass</span><em>Awaiting review</em></div>
                <div className="about-version-row current"><b>V3</b><span>Final polish</span><em>Approved</em></div>
              </div>
            </div>
            <div className="about-version-visual" aria-label="Example of Arena version history">
              <div className="about-window-bar"><i /><i /><i /><span>arena / project / campaign</span></div>
              <div className="about-window-body">
                <div className="about-mini-video"><div className="about-mini-orb" /><span>FINAL POLISH</span></div>
                <div className="about-mini-sidebar">
                  <span className="mini-label">VERSIONS</span>
                  <button type="button">V1 <small>changes</small></button>
                  <button type="button">V2 <small>review</small></button>
                  <button type="button" className="active">V3 <small>approved</small></button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-old-new">
          <div className="about-container">
            <span className="about-index">04 / WHY IT EXISTS</span>
            <h2>The problem is not feedback. The problem is <span>where feedback lives.</span></h2>
            <div className="about-compare">
              <article className="about-compare-card old">
                <div className="about-compare-label">WITHOUT ARENA</div>
                <ul>
                  <li><Icon name="x" size={14} /> “Check around 00:42.”</li>
                  <li><Icon name="x" size={14} /> Screenshot in a chat.</li>
                  <li><Icon name="x" size={14} /> “Which version is this?”</li>
                  <li><Icon name="x" size={14} /> New export, new link, new confusion.</li>
                  <li><Icon name="x" size={14} /> Approval buried in a message.</li>
                </ul>
              </article>
              <div className="about-compare-arrow"><Icon name="arrowRight" size={22} /></div>
              <article className="about-compare-card new">
                <div className="about-compare-label">WITH ARENA</div>
                <ul>
                  <li><Icon name="check" size={14} /> The comment points to 00:42.</li>
                  <li><Icon name="check" size={14} /> The note lives beside the video.</li>
                  <li><Icon name="check" size={14} /> Versions stay in one project.</li>
                  <li><Icon name="check" size={14} /> The latest cut is easy to identify.</li>
                  <li><Icon name="check" size={14} /> Approval is visible on the version.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="about-roles">
          <div className="about-container">
            <span className="about-index">05 / WHO DOES WHAT</span>
            <h2>Two people. Two simple jobs.</h2>
            <div className="about-role-grid">
              <article>
                <div className="about-role-top"><span className="about-role-tag">EDITOR</span><Icon name="edit" size={19} /></div>
                <h3>Keep the work moving.</h3>
                <ul>
                  <li>Creates the project.</li>
                  <li>Uploads each new cut.</li>
                  <li>Sends the private link.</li>
                  <li>Reads feedback and resolves the work in the edit.</li>
                </ul>
              </article>
              <article>
                <div className="about-role-top"><span className="about-role-tag">CLIENT</span><Icon name="user" size={19} /></div>
                <h3>Watch, react, decide.</h3>
                <ul>
                  <li>Opens the review link.</li>
                  <li>Leaves notes on exact moments.</li>
                  <li>Can come back to earlier comments.</li>
                  <li>Approves the current cut or requests changes.</li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="about-faq" id="faq">
          <div className="about-container about-faq-grid">
            <div className="about-faq-intro">
              <span className="about-index">06 / QUESTIONS</span>
              <h2>Okay, but what does that actually mean?</h2>
              <p>Here are the questions people usually have before the first upload.</p>
              <button type="button" onClick={goLogin}>Open Arena <Icon name="arrowRight" size={14} /></button>
            </div>
            <div className="about-faq-list">
              {faqItems.map((item, index) => (
                <div className={`about-faq-item ${openFaq === index ? 'open' : ''}`} key={item.q}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                    <span>{item.q}</span>
                    <Icon name="chevronDown" size={15} />
                  </button>
                  {openFaq === index && <p>{item.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-final">
          <div className="about-final-lines" aria-hidden="true" />
          <div className="about-final-inner">
            <span className="about-index light">ARENA / IN PLAIN ENGLISH</span>
            <h2>Send the cut. Get the feedback. Know what happens next.</h2>
            <p>That is Arena. Nothing more complicated than that.</p>
            <button type="button" onClick={goLogin}>Start free <Icon name="arrowRight" size={15} /></button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
