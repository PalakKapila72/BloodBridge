
import { useState } from 'react'
import { API_BASE_URL } from './config'

const API_URL = `${API_BASE_URL}/api/shortest-path`

// Sample road network for testing Dijkstra.
const SAMPLE_EDGES = [
  [0, 1, 4],
  [0, 2, 1],
  [2, 1, 2],
  [1, 3, 1],
  [2, 3, 5],
  [3, 4, 3],
]

const LOCATIONS = [
  'Starting Point',
  'Sector 1',
  'Sector 2',
  'Blood Bank',
  'Hospital',
]

function ShortestPath() {
  const [source, setSource] = useState('0')
  const [destination, setDestination] = useState('4')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function findShortestPath(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeCount: LOCATIONS.length,
          edges: SAMPLE_EDGES,
          source: Number(source),
          destination: Number(destination),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not calculate the path.')
      }

      setResult(data)
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Please make sure the server is running.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="shortest-path"
      style={{
        maxWidth: '1100px',
        margin: '60px auto',
        padding: '32px 24px',
        borderRadius: '20px',
        background: '#fff7f7',
        border: '1px solid #f4dada',
      }}
    >
      <p style={{ color: '#b42332', fontWeight: 700, letterSpacing: '2px' }}>
        GRAPH ALGORITHMS · C++
      </p>

      <h2 style={{ marginBottom: '10px' }}>Shortest Path Finder</h2>

      <p style={{ color: '#665b5b', lineHeight: 1.7 }}>
        Find the minimum-distance path through a sample network using
        Dijkstra's algorithm implemented in C++.
      </p>

      <form
        onSubmit={findShortestPath}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'end',
          marginTop: '24px',
        }}
      >
        <label style={{ display: 'grid', gap: '8px', flex: '1 1 180px' }}>
          Starting location
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            {LOCATIONS.map((location, index) => (
              <option key={location} value={index} disabled={String(index) === destination}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '8px', flex: '1 1 180px' }}>
          Destination
          <select
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
          >
            {LOCATIONS.map((location, index) => (
              <option key={location} value={index} disabled={String(index) === source}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '13px 22px',
            border: 'none',
            borderRadius: '8px',
            background: '#b42332',
            color: 'white',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Calculating...' : 'Find Shortest Path →'}
        </button>
      </form>

      <div style={{ marginTop: '18px', color: '#665b5b', fontSize: '14px' }}>
        <strong>Sample road connections:</strong>
        <ul>
          <li>Starting Point ↔ Sector 1: 4 km</li>
          <li>Starting Point ↔ Sector 2: 1 km</li>
          <li>Sector 2 ↔ Sector 1: 2 km</li>
          <li>Sector 1 ↔ Blood Bank: 1 km</li>
          <li>Sector 2 ↔ Blood Bank: 5 km</li>
          <li>Blood Bank ↔ Hospital: 3 km</li>
        </ul>
      </div>

      {error && (
        <p role="alert" style={{ color: '#b42332', marginTop: '20px' }}>
          {error}
        </p>
      )}

      {result && (
        <div
          aria-live="polite"
          style={{
            marginTop: '24px',
            padding: '20px',
            borderRadius: '12px',
            background: 'white',
            border: '1px solid #eadada',
          }}
        >
          {result.found ? (
            <>
              <p style={{ color: '#267348', fontWeight: 700 }}>
                ✓ Shortest path calculated successfully
              </p>

              <p>
                <strong>Minimum total distance:</strong> {result.distanceKm} km
              </p>

              <p><strong>Path:</strong></p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {result.path.map((node, index) => (
                  <span key={`${node}-${index}`}>
                    {index > 0 && <span aria-hidden="true"> → </span>}
                    <strong>{LOCATIONS[node] ?? `Location ${node}`}</strong>
                  </span>
                ))}
              </div>

              <p style={{ marginTop: '16px', fontSize: '13px', color: '#665b5b' }}>
                Algorithm: {result.algorithm}. This result uses the sample
                road network and is not live navigation.
              </p>
            </>
          ) : (
            <p role="status">
              No route connects these locations in the sample network.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export default ShortestPath
