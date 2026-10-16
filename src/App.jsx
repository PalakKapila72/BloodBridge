
import { useState } from 'react'
import MapView from './MapView'
import ShortestPath from './ShortestPath'
import EmergencyRequest from './EmergencyRequest'
import './App.css'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const API_URL = 'http://localhost:5000/api/donors'

function App() {
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [city, setCity] = useState('')
  const [donorName, setDonorName] = useState('')
  const [email, setEmail] = useState('')
  const [available, setAvailable] = useState('yes')
  const [donorLocation, setDonorLocation] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [searchCount, setSearchCount] = useState(0)
  const [locationLoading, setLocationLoading] = useState(false)

  function captureDonorLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'))
        return
      }

      setLocationLoading(true)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }

          setDonorLocation(location)
          setLocationLoading(false)
          resolve(location)
        },
        (error) => {
          setLocationLoading(false)

          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Location permission denied. You can register without GPS.'))
          } else {
            reject(new Error('Could not get your location. You can register without GPS.'))
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      )
    })
  }

  async function handleSearch(event) {
    event.preventDefault()
    setMessage('')
    setSearchResults([])
    setSearchCount(0)
    setSearchPerformed(true)
    setSearchLoading(true)

    try {
      const params = new URLSearchParams({
        bloodGroup,
        available: 'true',
      })

      if (city.trim()) {
        params.set('city', city.trim())
      }

      const response = await fetch(`${API_URL}?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not search donors.')
      }

      if (!Array.isArray(data.donors)) {
        throw new Error('Unexpected response from the server.')
      }

      setSearchResults(data.donors)
      setSearchCount(data.count)
    } catch (error) {
      setMessage(
        error.message === 'Failed to fetch'
          ? 'Could not connect to the backend. Please make sure the server is running.'
          : error.message
      )
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleRegistration(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: donorName.trim(),
          email: email.trim(),
          bloodGroup,
          city: city.trim(),
          available: available === 'yes',
          ...(donorLocation
            ? {
                location: {
                  latitude: donorLocation.latitude,
                  longitude: donorLocation.longitude,
                },
              }
            : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.')
      }

      setMessage(
        `Registration successful! Welcome, ${data.donor.name}. ${
          data.donor.location
            ? 'Your GPS coordinates were saved.'
            : 'Your registration was saved without GPS coordinates.'
        }`
      )

      setDonorName('')
      setEmail('')
      setAvailable('yes')
      setDonorLocation(null)
      setSearchPerformed(false)
      setSearchResults([])
      setSearchCount(0)
    } catch (error) {
      setMessage(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Make sure the server is running on port 5000.'
          : error.message
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGetDonorLocation() {
    setMessage('')

    try {
      await captureDonorLocation()
      setMessage('GPS location captured. Submit the registration form to save it.')
    } catch (error) {
      setMessage(error.message)
    }
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
          <a href="#emergency-request" className="emergency-nav-pill">🚨 Emergency Dispatch</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#find-blood">Find Blood</a>
          <a href="#register">Register</a>
        </div>

        <a className="nav-button emergency-nav-btn" href="#emergency-request">
          🚨 Emergency Request
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
              Connecting blood donors, blood banks, and emergency medical requests.
              Powered by high-performance C++ Dijkstra shortest-path algorithms.
            </p>

            <div className="hero-actions">
              <a href="#emergency-request" className="primary-button emergency-hero-btn">
                🚨 Emergency Request <span>→</span>
              </a>

              <a href="#find-blood" className="secondary-button">
                Find Blood
              </a>

              <a href="#register" className="secondary-button">
                Become a donor
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
              <h2>
                Give a little.
                <br />
                Help a lot.
              </h2>
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

        <EmergencyRequest />
        <MapView />
        <ShortestPath />

        <section className="search-section" id="find-blood">
          <div className="search-heading">
            <span className="section-tag">QUICK SEARCH</span>
            <h2>Looking for blood?</h2>
            <p>Search registered demo donors by blood group and city.</p>
          </div>

          <form className="search-form" onSubmit={handleSearch}>
            <label>
              Blood group
              <select
                value={bloodGroup}
                onChange={(event) => setBloodGroup(event.target.value)}
              >
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
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

            <button
              type="submit"
              className="primary-button search-button"
              disabled={searchLoading}
            >
              {searchLoading ? 'Searching...' : 'Search donors →'}
            </button>
          </form>

          <p className="demo-note">
            Demo project · Results include registered donors marked as
            available and matching the selected blood group.
          </p>

          {searchPerformed && (
            <div className="search-results" aria-live="polite">
              <h3>
                Search results
                {!searchLoading && ` (${searchCount})`}
              </h3>

              {searchLoading ? (
                <p>Searching registered donors...</p>
              ) : searchResults.length > 0 ? (
                <div className="feature-grid">
                  {searchResults.map((donor) => (
                    <article className="feature-card" key={donor._id}>
                      <div className="feature-icon red">♥</div>
                      <h3>{donor.name}</h3>
                      <p>
                        Blood group: <strong>{donor.bloodGroup}</strong>
                      </p>
                      <p>City: {donor.city}</p>
                      <p>Availability: Available</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>
                  No matching available demo donors found. Try another
                  blood group or city.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="register-section" id="register">
          <div className="registration-intro">
            <span className="section-tag">BECOME A DONOR</span>

            <h2>Someone out there needs your help.</h2>

            <p>
              Register your interest in blood donation and help build a
              community that connects people in need with potential donors.
            </p>

            <div className="registration-note">
              ♥ This demo sends registration data to the backend.
            </div>
          </div>

          <form className="registration-form" onSubmit={handleRegistration}>
            <h3>Donor registration</h3>
            <p className="form-subtitle">Fill in your basic details.</p>

            <label>
              Full name
              <input
                type="text"
                placeholder="Enter your name"
                value={donorName}
                onChange={(event) => setDonorName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
              />
            </label>

            <div className="form-row">
              <label>
                Blood group
                <select
                  value={bloodGroup}
                  onChange={(event) => setBloodGroup(event.target.value)}
                  required
                >
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                City
                <input
                  type="text"
                  placeholder="Your city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            </div>

            <label>
              Interested in donating?
              <select
                value={available}
                onChange={(event) => setAvailable(event.target.value)}
              >
                <option value="yes">Yes, interested</option>
                <option value="no">Not available currently</option>
              </select>
            </label>

            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleGetDonorLocation}
                disabled={locationLoading}
              >
                {locationLoading
                  ? 'Getting location...'
                  : donorLocation
                    ? 'GPS Location Captured ✓'
                    : 'Share GPS Location (Optional)'}
              </button>

              <p className="privacy-note">
                GPS is optional. Share it only if you consent. Use fake test
                details for this student demo.
              </p>

              {donorLocation && (
                <p role="status">
                  Location captured successfully. Coordinates will be sent
                  when you submit this form.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="primary-button submit-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit registration →'}
            </button>

            <p className="privacy-note">
              Student demo only. Do not enter real personal information.
            </p>
          </form>
        </section>

        {message && (
          <div className="feedback-message" role="status">
            <span>♥</span>
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage('')}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

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
              <p>
                Search registered demo donors by blood group and location.
              </p>
              <span className="feature-number">01</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon pink">♥</div>
              <h3>Connect with donors</h3>
              <p>
                Help connect people in need with potential blood donors.
              </p>
              <span className="feature-number">02</span>
            </article>

            <article className="feature-card">
              <div className="feature-icon peach">✚</div>
              <h3>Make an impact</h3>
              <p>
                Support blood donation awareness in your community.
              </p>
              <span className="feature-number">03</span>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="logo">
          <span className="logo-icon">♥</span>
          BloodBridge
        </a>

        <p>Built with care, for a more connected community.</p>
        <span>© 2026 BloodBridge · Student Project</span>
      </footer>
    </div>
  )
}

export default App
