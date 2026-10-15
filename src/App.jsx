import { useState } from 'react'
import './App.css'

function App() {
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [city, setCity] = useState('')

  function handleSearch(event) {
    event.preventDefault()
    alert(`Blood group: ${bloodGroup}\nLocation: ${city || 'Not specified'}\n\nDonor search will be connected in the next phase!`)
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#home" className="logo">
          <span className="logo-icon">♥</span>
          BloodBridge
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#find-blood">Find Blood</a>
        </div>

        <a className="nav-button" href="#find-blood">
          Get Started
        </a>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="live-dot"></span>
              EVERY DONATION MATTERS
            </div>

            <h1>
              A bridge between
              <br />
              <span>life and hope.</span>
            </h1>

            <p className="hero-description">
              Connecting blood donors, blood banks, and people
              in need. Because every second matters when a life
              is waiting.
            </p>

            <div className="hero-actions">
              <a href="#find-blood" className="primary-button">
                Find Blood <span>→</span>
              </a>
              <a href="#how-it-works" className="secondary-button">
                How it works
              </a>
            </div>

            <div className="hero-note">
              <span className="note-heart">♥</span>
              One donation can help save lives.
            </div>
          </div>

          <div className="hero-art">
            <div className="art-glow"></div>
            <div className="art-card">
              <div className="drop">♥</div>
              <span className="art-label">GIVE BLOOD</span>
              <h2>Give a little.<br />Help a lot.</h2>
              <p>Your kindness can make a difference.</p>
              <div className="art-bottom">
                <span>DONATE · CARE · SAVE</span>
                <span>♥</span>
              </div>
            </div>
            <div className="floating-card">
              <span className="floating-icon">+</span>
              <div>
                <strong>Be someone's hope</strong>
                <small>Your action matters.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="search-section" id="find-blood">
          <div className="search-heading">
            <span className="section-tag">QUICK SEARCH</span>
            <h2>Looking for blood?</h2>
            <p>Start by selecting a blood group and your city.</p>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <label>
              Blood group
              <select
                value={bloodGroup}
                onChange={(event) => setBloodGroup(event.target.value)}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                  (group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              City or location
              <input
                type="text"
                placeholder="e.g. Chandigarh"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </label>

            <button type="submit" className="primary-button search-button">
              Search donors →
            </button>
          </form>
          <p className="demo-note">
            Demo interface · Live donor search will be added later.
          </p>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-tag">SIMPLE. MEANINGFUL. HUMAN.</div>
          <h2>Small steps. A big difference.</h2>
          <p className="section-description">
            Our goal is to make finding and offering blood easier.
          </p>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon red">⌕</div>
              <h3>Find a match</h3>
              <p>Search by blood group and location to start finding potential matches.</p>
              <span className="feature-number">01</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon pink">♥</div>
              <h3>Connect with donors</h3>
              <p>Help connect people in need with potential blood donors.</p>
              <span className="feature-number">02</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon peach">✚</div>
              <h3>Make an impact</h3>
              <p>Support blood donation awareness and help people find assistance.</p>
              <span className="feature-number">03</span>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="logo">
          <span className="logo-icon">♥</span> BloodBridge
        </a>
        <p>Built with care, for a more connected community.</p>
        <span>© 2026 BloodBridge · Student Project</span>
      </footer>
    </div>
  )
}

export default App