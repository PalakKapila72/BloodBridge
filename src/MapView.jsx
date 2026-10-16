
import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { API_BASE_URL } from './config';

const API_URL = `${API_BASE_URL}/api/donors`;
const ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving';
const GEOCODING_URL = 'https://nominatim.openstreetmap.org/search';

const BLOOD_GROUPS = [
  'All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
];

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
  );
}

function MapController({ userPosition, routeCoordinates }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates, {
        padding: [40, 40],
        maxZoom: 14,
      });
    } else if (userPosition) {
      map.flyTo(userPosition, 13);
    }
  }, [userPosition, routeCoordinates, map]);

  return null;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);

  if (minutes < 1) return 'Less than 1 min';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

export default function MapView() {
  const [userPosition, setUserPosition] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);

  const [donors, setDonors] = useState([]);
  const [nearestDonor, setNearestDonor] = useState(null);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [routeError, setRouteError] = useState('');

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  // Load available donors with GPS coordinates.
  async function loadDonors() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}?available=true&withLocation=true`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not load donors.');
      }

      const validDonors = (data.donors || []).filter((donor) => {
        const latitude = Number(donor.location?.latitude);
        const longitude = Number(donor.location?.longitude);

        return (
          donor.location?.latitude !== undefined &&
          donor.location?.longitude !== undefined &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        );
      });

      setDonors(validDonors);

      if (validDonors.length === 0) {
        setMessage(
          'No GPS-enabled available donors found. Register a test donor with GPS first.'
        );
      } else {
        setMessage('');
      }
    } catch (err) {
      setError(
        err.message ||
          'Unable to load donors. Check whether the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Search a city, locality, or place.
  async function searchLocation(event) {
    event?.preventDefault();

    const query = locationQuery.trim();

    if (!query) {
      setError('Please enter a city or area name.');
      return;
    }

    setError('');
    setMessage('');
    setLocationResults([]);
    setSearchingLocation(true);

    try {
      const params = new URLSearchParams({
        q: `${query}, India`,
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'in',
      });

      const response = await fetch(
        `${GEOCODING_URL}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          'Location search is temporarily unavailable. Please try again.'
        );
      }

      const results = await response.json();

      if (results.length === 0) {
        setMessage('No locations found. Try another city or area.');
        return;
      }

      setLocationResults(results);
    } catch (err) {
      setError(err.message || 'Could not search for this location.');
    } finally {
      setSearchingLocation(false);
    }
  }

  // Set the manually selected location as the search origin.
  function chooseLocation(place) {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setError('Invalid location coordinates. Select another result.');
      return;
    }

    setUserPosition([latitude, longitude]);
    setLocationLabel(place.display_name);
    setLocationQuery(place.display_name);
    setLocationResults([]);
    setError('');
    setMessage('');
  }

  // Use the browser's current GPS location.
  function getMyLocation() {
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([
          position.coords.latitude,
          position.coords.longitude,
        ]);

        setLocationLabel('Your current GPS location');
        setLocationQuery('');
        setLocationResults([]);
        setLocationLoading(false);
      },
      (err) => {
        if (err.code === 1) {
          setError(
            'Location permission denied. Allow location access in your browser.'
          );
        } else if (err.code === 3) {
          setError('Location request timed out. Please try again.');
        } else {
          setError('Could not get your location. Please try again.');
        }

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  const filteredDonors =
    selectedBloodGroup === 'All'
      ? donors
      : donors.filter(
          (donor) => donor.bloodGroup === selectedBloodGroup
        );
    const rankedDonors = userPosition
  ? filteredDonors
      .map((donor) => {
        const latitude = Number(donor.location.latitude);
        const longitude = Number(donor.location.longitude);

        return {
          ...donor,
          distance: calculateDistance(
            userPosition[0],
            userPosition[1],
            latitude,
            longitude
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance)
  : [];

  // Find the closest donor using straight-line distance.
  useEffect(() => {
    if (!userPosition || filteredDonors.length === 0) {
      setNearestDonor(null);
      return;
    }

    let closest = null;
    let minimumDistance = Infinity;

    for (const donor of filteredDonors) {
      const latitude = Number(donor.location.latitude);
      const longitude = Number(donor.location.longitude);

      const distance = calculateDistance(
        userPosition[0],
        userPosition[1],
        latitude,
        longitude
      );

      if (distance < minimumDistance) {
        minimumDistance = distance;

        closest = {
          ...donor,
          distance,
          position: [latitude, longitude],
        };
      }
    }

    setNearestDonor(closest);
  }, [userPosition, donors, selectedBloodGroup]);

  // Calculate the road route to the nearest donor.
  useEffect(() => {
    if (!userPosition || !nearestDonor) {
      setRouteCoordinates([]);
      setRouteInfo(null);
      setRouteError('');
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchRoute() {
      setRouteLoading(true);
      setRouteError('');
      setRouteCoordinates([]);
      setRouteInfo(null);

      try {
        const [startLat, startLon] = userPosition;
        const [endLat, endLon] = nearestDonor.position;

        // Routing service expects longitude,latitude order.
        const url =
          `${ROUTING_URL}/` +
          `${startLon},${startLat};${endLon},${endLat}` +
          '?overview=full&geometries=geojson';

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('The road-routing service is unavailable.');
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error('No driving route was found for these locations.');
        }

        const route = data.routes[0];

        // Convert [longitude, latitude] to Leaflet's [latitude, longitude].
        const coordinates = route.geometry.coordinates.map(
          ([longitude, latitude]) => [latitude, longitude]
        );

        setRouteCoordinates(coordinates);

        setRouteInfo({
          distanceKm: route.distance / 1000,
          durationSeconds: route.duration,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setRouteError(
            err.message || 'Could not calculate the driving route.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }
    }

    fetchRoute();

    return () => controller.abort();
  }, [userPosition, nearestDonor]);

  useEffect(() => {
    loadDonors();
  }, []);

  useEffect(() => {
    if (userPosition && filteredDonors.length === 0) {
      setMessage(
        `No GPS-enabled available donors found for ${
          selectedBloodGroup === 'All'
            ? 'any blood group'
            : selectedBloodGroup
        }. Register a GPS-enabled test donor or select another blood group.`
      );
    }
  }, [userPosition, filteredDonors.length, selectedBloodGroup]);

  const styles = {
    section: {
      margin: '32px auto',
      padding: 'clamp(16px, 3vw, 30px)',
      maxWidth: '1100px',
      borderRadius: '24px',
      background: '#ffffff',
      color: '#18181b',
      boxShadow: '0 12px 45px rgba(24, 24, 27, 0.07)',
      fontFamily: 'Arial, sans-serif',
    },
    eyebrow: {
      margin: 0,
      color: '#be123c',
      fontSize: '12px',
      fontWeight: 800,
      letterSpacing: '1.8px',
      textTransform: 'uppercase',
    },
    heading: {
      margin: '8px 0',
      fontSize: 'clamp(25px, 4vw, 34px)',
      lineHeight: 1.2,
      color: '#18181b',
    },
    subtitle: {
      color: '#71717a',
      lineHeight: 1.7,
      marginTop: '10px',
      marginBottom: '24px',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: '12px',
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      color: '#52525b',
      fontWeight: 700,
      fontSize: '13px',
      marginBottom: '8px',
    },
    select: {
      padding: '12px 14px',
      minWidth: '175px',
      border: '1px solid #e4e4e7',
      borderRadius: '10px',
      background: '#ffffff',
      color: '#18181b',
      fontSize: '14px',
    },
    primaryButton: {
      padding: '12px 17px',
      background: '#be123c',
      color: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 700,
      fontSize: '14px',
      cursor: 'pointer',
    },
    secondaryButton: {
      padding: '12px 17px',
      background: '#fff1f2',
      color: '#9f1239',
      border: '1px solid #fecdd3',
      borderRadius: '10px',
      fontWeight: 700,
      fontSize: '14px',
      cursor: 'pointer',
    },
    resultCard: {
      border: '1px solid #fecdd3',
      borderRadius: '20px',
      padding: 'clamp(18px, 3vw, 26px)',
      marginBottom: '22px',
      background: 'linear-gradient(135deg, #fff1f2 0%, #ffffff 72%)',
      boxShadow: '0 10px 30px rgba(190, 24, 60, 0.07)',
    },
    muted: {
      color: '#71717a',
      fontSize: '13px',
      lineHeight: 1.6,
    },
    mapFrame: {
      overflow: 'hidden',
      borderRadius: '18px',
      border: '1px solid #e4e4e7',
    },
  };

  return (
    <section style={styles.section} className="map-section">
      <div style={styles.eyebrow}>
        BloodBridge · Donor Discovery
      </div>

      <h2 style={styles.heading}>Find a Donor Near You</h2>

      <p style={styles.subtitle}>
        Search for a location or use your GPS to find the nearest
        available donor and view a driving route.
      </p>

      <div style={styles.toolbar}>
        <div>
          <label style={styles.label} htmlFor="map-blood-group">
            Required blood group
          </label>

          <select
            id="map-blood-group"
            value={selectedBloodGroup}
            onChange={(event) =>
              setSelectedBloodGroup(event.target.value)
            }
            style={styles.select}
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group === 'All' ? 'All Blood Groups' : group}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '250px', flex: '1 1 270px' }}>
          <label style={styles.label} htmlFor="manual-location">
            Search a city, area or place
          </label>

          <form
            onSubmit={searchLocation}
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <input
              id="manual-location"
              type="text"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="e.g. Sector 17, Chandigarh"
              style={{
                ...styles.select,
                minWidth: 0,
                flex: '1 1 180px',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              disabled={searchingLocation}
              style={{
                ...styles.primaryButton,
                opacity: searchingLocation ? 0.7 : 1,
              }}
            >
              {searchingLocation ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={getMyLocation}
            disabled={locationLoading}
            style={{
              ...styles.primaryButton,
              opacity: locationLoading ? 0.7 : 1,
            }}
          >
            {locationLoading ? 'Getting Location...' : '⌖ Use My Location'}
          </button>

          <button
            type="button"
            onClick={loadDonors}
            disabled={loading}
            style={styles.secondaryButton}
          >
            {loading ? 'Refreshing...' : '↻ Refresh Donors'}
          </button>
        </div>
      </div>

      {locationResults.length > 0 && (
        <div
          style={{
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            marginBottom: '20px',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              margin: 0,
              padding: '12px 14px',
              background: '#f4f4f5',
              fontWeight: 700,
              color: '#3f3f46',
              fontSize: '13px',
            }}
          >
            Select your location
          </p>

          {locationResults.map((place) => (
            <button
              type="button"
              key={place.place_id}
              onClick={() => chooseLocation(place)}
              style={{
                display: 'block',
                width: '100%',
                padding: '13px 14px',
                textAlign: 'left',
                background: '#ffffff',
                color: '#27272a',
                border: 'none',
                borderTop: '1px solid #e4e4e7',
                cursor: 'pointer',
                lineHeight: 1.5,
              }}
            >
              📍 {place.display_name}
            </button>
          ))}
        </div>
      )}

      {locationLabel && (
        <p
          style={{
            color: '#166534',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '11px 14px',
            borderRadius: '10px',
            overflowWrap: 'anywhere',
            fontSize: '13px',
          }}
        >
          <strong>Search origin:</strong> {locationLabel}
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 15px',
            borderRadius: '10px',
            marginBottom: '16px',
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            padding: '12px 15px',
            borderRadius: '10px',
            marginBottom: '16px',
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}
      >
        <span style={styles.muted}>
          Matching GPS-enabled donors
        </span>

        <strong style={{ color: '#9f1239', fontSize: '14px' }}>
          {filteredDonors.length} found
        </strong>
      </div>
      {userPosition && rankedDonors.length > 0 && (
  <div
    style={{
      marginBottom: '22px',
      padding: '20px',
      border: '1px solid #fecdd3',
      borderRadius: '16px',
      background: '#ffffff',
    }}
  >
    <h3 style={{ color: '#881337', marginTop: 0 }}>
      Donors Ranked by Distance
    </h3>

    <p style={styles.muted}>
      Nearest donor first, based on straight-line distance.
    </p>

    {rankedDonors.map((donor, index) => (
      <div
        key={donor._id || index}
        style={{
          padding: '14px 0',
          borderTop: '1px solid #f4f4f5',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <strong>{index + 1}. {donor.name}</strong>
          <div style={styles.muted}>
            {donor.city} · {donor.bloodGroup}
          </div>
        </div>

        <strong style={{ color: '#be123c' }}>
          {donor.distance.toFixed(2)} km
        </strong>
      </div>
    ))}
  </div>
)}

      {nearestDonor && (
        <div style={styles.resultCard}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={styles.eyebrow}>Best distance match</p>
              <h3
                style={{
                  margin: '7px 0 0',
                  color: '#881337',
                  fontSize: '24px',
                }}
              >
                Nearest Donor
              </h3>
            </div>

            <div
              style={{
                minWidth: '60px',
                height: '60px',
                padding: '0 8px',
                borderRadius: '18px',
                background: '#be123c',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '21px',
                fontWeight: 800,
              }}
            >
              {nearestDonor.bloodGroup}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginTop: '24px',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#ffe4e6',
                color: '#9f1239',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '23px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {nearestDonor.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '19px',
                  color: '#18181b',
                  overflowWrap: 'anywhere',
                }}
              >
                {nearestDonor.name}
              </h4>

              <p style={{ margin: '5px 0 0', color: '#71717a' }}>
                {nearestDonor.city}
              </p>
            </div>

            <span
              style={{
                background: '#dcfce7',
                color: '#166534',
                borderRadius: '30px',
                padding: '7px 11px',
                fontSize: '12px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              ● Available
            </span>
          </div>

          <div
            style={{
              marginTop: '22px',
              padding: '18px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid #ffe4e6',
            }}
          >
            <p style={{ ...styles.muted, margin: 0 }}>
              Straight-line distance
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginTop: '5px',
              }}
            >
              <span
                style={{
                  fontSize: 'clamp(34px, 6vw, 42px)',
                  lineHeight: 1.2,
                  fontWeight: 800,
                  color: '#be123c',
                }}
              >
                {nearestDonor.distance.toFixed(2)}
              </span>

              <span style={{ fontSize: '16px', color: '#52525b' }}>
                km
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '14px',
              padding: '20px',
              borderRadius: '14px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: '#0369a1',
                textTransform: 'uppercase',
              }}
            >
              🚗 Driving route
            </div>

            {routeLoading && (
              <p style={{ color: '#075985' }}>
                Calculating road distance and travel time...
              </p>
            )}

            {routeError && (
              <p role="status" style={{ color: '#9a3412', lineHeight: 1.6 }}>
                {routeError}
              </p>
            )}

            {routeInfo && !routeLoading && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '28px',
                  marginTop: '12px',
                }}
              >
                <div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    Road distance
                  </div>
                  <div
                    style={{
                      color: '#0c4a6e',
                      fontSize: '28px',
                      fontWeight: 800,
                      marginTop: '4px',
                    }}
                  >
                    {routeInfo.distanceKm.toFixed(2)} km
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    Estimated driving time
                  </div>
                  <div
                    style={{
                      color: '#0c4a6e',
                      fontSize: '28px',
                      fontWeight: 800,
                      marginTop: '4px',
                    }}
                  >
                    {formatDuration(routeInfo.durationSeconds)}
                  </div>
                </div>
              </div>
            )}

            <p
              style={{
                color: '#475569',
                fontSize: '12px',
                lineHeight: 1.6,
                marginBottom: 0,
              }}
            >
              Travel estimates may differ from actual traffic and road
              conditions.
            </p>
          </div>

          <p style={{ ...styles.muted, margin: '15px 0 0' }}>
            Confirm donor availability before travelling. Blood group
            filtering alone does not establish transfusion compatibility;
            a healthcare professional must verify it.
          </p>
        </div>
      )}

      {userPosition && filteredDonors.length > 0 && !nearestDonor && (
        <p style={styles.muted}>Calculating nearest donor...</p>
      )}

      <div style={styles.mapFrame}>
        <MapContainer
          center={[30.7333, 76.7794]}
          zoom={11}
          style={{ height: '450px', width: '100%', zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController
            userPosition={userPosition}
            routeCoordinates={routeCoordinates}
          />

          {userPosition && (
            <Marker position={userPosition}>
              <Popup>
                {locationLabel || 'Selected search location'}
              </Popup>
            </Marker>
          )}

          {filteredDonors.map((donor) => {
            const position = [
              Number(donor.location.latitude),
              Number(donor.location.longitude),
            ];

            const isNearest = nearestDonor?._id === donor._id;

            return (
              <Marker key={donor._id} position={position}>
                <Popup>
                  {isNearest && <strong>Nearest Matching Donor</strong>}
                  {isNearest && <br />}
                  <strong>{donor.name}</strong>
                  <br />
                  Blood Group: {donor.bloodGroup}
                  <br />
                  City: {donor.city}
                  <br />
                  Status: Available
                  {isNearest && (
                    <>
                      <br />
                      Straight-line distance: {nearestDonor.distance.toFixed(2)} km
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}

          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: '#2563eb',
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}
        </MapContainer>
      </div>

      <p
        style={{
          ...styles.muted,
          marginTop: '14px',
          marginBottom: 0,
        }}
      >
        Demo mode: use test donor records. Do not publicly expose exact
        donor GPS coordinates. This demo filters exact blood groups only;
        medical compatibility must be verified by a healthcare professional.
      </p>
    </section>
  );
}
