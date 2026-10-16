import { useState } from 'react'
import { API_BASE_URL } from './config'

const API_DISPATCH_URL = `${API_BASE_URL}/api/emergency-dispatch`
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const LOCATION_PRESETS = [
  { name: 'Sector 17 Central Plaza, Chandigarh', lat: 30.7398, lon: 76.7827 },
  { name: 'PGIMER Hospital, Sector 12, Chandigarh', lat: 30.7661, lon: 76.7770 },
  { name: 'GMSH Hospital, Sector 16, Chandigarh', lat: 30.7456, lon: 76.7735 },
  { name: 'Sector 62, Mohali', lat: 30.7046, lon: 76.7291 },
  { name: 'Civil Hospital, Panchkula', lat: 30.6974, lon: 76.8570 },
]

export default function EmergencyRequest() {
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [unitsNeeded, setUnitsNeeded] = useState(1)
  const [urgency, setUrgency] = useState('critical')
  const [selectedLocation, setSelectedLocation] = useState(LOCATION_PRESETS[0])
  const [customLat, setCustomLat] = useState('')
  const [customLon, setCustomLon] = useState('')
  const [useGps, setUseGps] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [dispatchResult, setDispatchResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function handleGpsDetection() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setGpsLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          name: 'My Current GPS Location',
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        }
        setSelectedLocation(coords)
        setUseGps(true)
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        setError('Location access denied or unavailable. Please choose a preset location.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  async function handleEmergencyDispatch(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDispatchResult(null)

    const lat = useGps ? selectedLocation.lat : (customLat ? Number(customLat) : selectedLocation.lat)
    const lon = useGps ? selectedLocation.lon : (customLon ? Number(customLon) : selectedLocation.lon)

    if (isNaN(lat) || isNaN(lon)) {
      setError('Please provide valid patient coordinates.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(API_DISPATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodGroup,
          unitsNeeded: Number(unitsNeeded),
          urgency,
          latitude: lat,
          longitude: lon,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Emergency dispatch calculation failed.')
      }

      setDispatchResult(data)
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to backend server. Please verify the server is running on http://localhost:5000.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  function handleCopyDetails() {
    if (!dispatchResult?.nearest) return
    const text = `🚨 BloodBridge Emergency Dispatch\nMatch: ${dispatchResult.nearest.name} (${dispatchResult.nearest.type === 'blood_bank' ? 'Blood Bank' : 'Donor'})\nRequired: ${bloodGroup} (${unitsNeeded} unit(s))\nDistance: ${dispatchResult.nearest.calculatedDistanceKm} km (ETA: ~${dispatchResult.nearest.etaMinutes} mins)\nContact: ${dispatchResult.nearest.phone}\nAddress: ${dispatchResult.nearest.address}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <section className="emergency-section" id="emergency-request">
      <div className="emergency-container">
        <div className="emergency-badge-header">
          <span className="emergency-pulse-dot"></span>
          <span>CRITICAL DISPATCH SYSTEM · C++ GRAPH ALGORITHMS</span>
        </div>

        <h2 className="emergency-title">Emergency Blood Request</h2>
        <p className="emergency-subtitle">
          Instantly connects critical blood requests with the <strong>nearest available donor or verified blood bank</strong> using a high-performance C++ Dijkstra shortest-path engine.
        </p>

        <form onSubmit={handleEmergencyDispatch} className="emergency-form">
          <div className="form-row">
            <div className="form-group">
              <label>Required Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="emergency-select"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Units Needed</label>
              <select
                value={unitsNeeded}
                onChange={(e) => setUnitsNeeded(e.target.value)}
                className="emergency-select"
              >
                {[1, 2, 3, 4, 5].map((u) => (
                  <option key={u} value={u}>
                    {u} Unit{u > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Urgency Level</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="emergency-select"
              >
                <option value="critical">⚡ Critical (Immediate / 30 mins)</option>
                <option value="urgent">🚨 Urgent (Within 2 Hours)</option>
                <option value="standard">Standard Requirement</option>
              </select>
            </div>
          </div>

          <div className="form-group location-group">
            <label>Emergency Patient / Hospital Location</label>
            <div className="location-selector-row">
              <select
                className="emergency-select location-select"
                value={useGps ? 'GPS' : selectedLocation.name}
                onChange={(e) => {
                  setUseGps(false)
                  const found = LOCATION_PRESETS.find((p) => p.name === e.target.value)
                  if (found) setSelectedLocation(found)
                }}
              >
                {useGps && <option value="GPS">📍 Current GPS Location ({selectedLocation.lat}, {selectedLocation.lon})</option>}
                {LOCATION_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGpsDetection}
                className="gps-btn"
                disabled={gpsLoading}
              >
                {gpsLoading ? 'Detecting...' : '📍 Auto-Detect GPS'}
              </button>
            </div>
          </div>

          {error && <div className="emergency-error-banner">{error}</div>}

          <button
            type="submit"
            className="dispatch-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>⚡ Running C++ Dijkstra Shortest-Path Algorithm...</span>
            ) : (
              <span>🚨 Find Nearest Available Donor / Blood Bank →</span>
            )}
          </button>
        </form>

        {dispatchResult && dispatchResult.nearest && (
          <div className="dispatch-result-card">
            <div className="result-header">
              <span className={`result-type-pill ${dispatchResult.nearest.type}`}>
                {dispatchResult.nearest.type === 'blood_bank' ? '🏥 Verified Blood Bank' : '🩸 Active Volunteer Donor'}
              </span>
              <span className="algo-tag">
                ⚡ C++ Dijkstra ({dispatchResult.timeComplexity})
              </span>
            </div>

            <div className="result-main-grid">
              <div className="result-info">
                <h3 className="result-name">{dispatchResult.nearest.name}</h3>
                <p className="result-address">📍 {dispatchResult.nearest.address}</p>
                <p className="result-phone">📞 <strong>Phone:</strong> {dispatchResult.nearest.phone}</p>
                <p className="result-stock">
                  🩸 <strong>Compatible Stock:</strong> {dispatchResult.nearest.availableUnits} unit(s) available
                </p>
              </div>

              <div className="result-stats">
                <div className="stat-box highlight">
                  <span className="stat-label">Shortest Distance</span>
                  <span className="stat-value">{dispatchResult.nearest.calculatedDistanceKm} km</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Estimated Transit Time</span>
                  <span className="stat-value">~{dispatchResult.nearest.etaMinutes} mins</span>
                </div>
              </div>
            </div>

            <div className="dsa-callout">
              <strong>DSA Algorithm Breakdown:</strong>
              <div className="dsa-details">
                <span><strong>Algorithm:</strong> {dispatchResult.algorithm}</span>
                <span><strong>Data Structure:</strong> {dispatchResult.dataStructure}</span>
                <span><strong>Graph Path Traversal:</strong> Node {dispatchResult.path.join(' → Node ')}</span>
              </div>
            </div>

            <div className="result-actions">
              <a href={`tel:${dispatchResult.nearest.phone}`} className="call-now-btn">
                📞 Call Facility / Donor Now
              </a>
              <button onClick={handleCopyDetails} className="copy-details-btn">
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy Emergency Details'}
              </button>
            </div>

            {dispatchResult.rankedCandidates && dispatchResult.rankedCandidates.length > 1 && (
              <div className="ranked-section">
                <h4>Other Available Options (Ranked by Shortest Distance):</h4>
                <div className="ranked-list">
                  {dispatchResult.rankedCandidates.slice(1, 5).map((candidate, idx) => (
                    <div key={idx} className="ranked-item">
                      <div>
                        <strong>{candidate.name}</strong> ({candidate.type === 'blood_bank' ? 'Blood Bank' : 'Donor'})
                        <span className="ranked-sub">{candidate.address}</span>
                      </div>
                      <div className="ranked-dist">
                        <span>{candidate.calculatedDistanceKm} km</span>
                        <small>~{candidate.etaMinutes} mins</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
