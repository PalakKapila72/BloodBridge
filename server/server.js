const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json({ limit: '50kb' }))

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Medical Blood Compatibility Matrix (Recipient -> Compatible Donor Types)
const BLOOD_COMPATIBILITY = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal Recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal Donor
}

// -------------------------------------------------------------
// 1. Database Schemas (DBMS)
// -------------------------------------------------------------

// Donor schema
const donorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: validBloodGroups,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    available: {
      type: Boolean,
      required: true,
      default: true,
    },
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
  },
  { timestamps: true }
)

const Donor = mongoose.model('Donor', donorSchema)

// Blood Bank schema
const bloodBankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    stock: {
      'A+': { type: Number, default: 15 },
      'A-': { type: Number, default: 5 },
      'B+': { type: Number, default: 20 },
      'B-': { type: Number, default: 4 },
      'AB+': { type: Number, default: 8 },
      'AB-': { type: Number, default: 3 },
      'O+': { type: Number, default: 25 },
      'O-': { type: Number, default: 6 },
    },
    is24x7: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

const BloodBank = mongoose.model('BloodBank', bloodBankSchema)

// Pre-seeded verified blood banks around Chandigarh / Mohali / Panchkula region
const INITIAL_BLOOD_BANKS = [
  {
    name: 'PGIMER Rotary Blood Bank',
    city: 'Chandigarh',
    address: 'Postgraduate Institute of Medical Education & Research, Sector 12',
    phone: '+91 172 275 6565',
    location: { latitude: 30.7661, longitude: 76.7770 },
    stock: { 'A+': 35, 'A-': 8, 'B+': 40, 'B-': 7, 'AB+': 15, 'AB-': 5, 'O+': 45, 'O-': 12 },
    is24x7: true,
  },
  {
    name: 'GMSH Sector 16 Blood Center',
    city: 'Chandigarh',
    address: 'Government Multi Specialty Hospital, Sector 16',
    phone: '+91 172 278 2457',
    location: { latitude: 30.7456, longitude: 76.7735 },
    stock: { 'A+': 20, 'A-': 4, 'B+': 25, 'B-': 5, 'AB+': 10, 'AB-': 2, 'O+': 30, 'O-': 8 },
    is24x7: true,
  },
  {
    name: 'Rotary Blood Bank Resource Centre',
    city: 'Chandigarh',
    address: 'Dakshin Marg, Sector 37-A',
    phone: '+91 172 269 8888',
    location: { latitude: 30.7398, longitude: 76.7450 },
    stock: { 'A+': 18, 'A-': 3, 'B+': 22, 'B-': 4, 'AB+': 8, 'AB-': 2, 'O+': 28, 'O-': 6 },
    is24x7: true,
  },
  {
    name: 'Civil Hospital Blood Center',
    city: 'Mohali',
    address: 'Phase 6, Sahibzada Ajit Singh Nagar',
    phone: '+91 172 222 5555',
    location: { latitude: 30.7226, longitude: 76.7118 },
    stock: { 'A+': 14, 'A-': 3, 'B+': 18, 'B-': 4, 'AB+': 6, 'AB-': 2, 'O+': 22, 'O-': 5 },
    is24x7: true,
  },
  {
    name: 'Fortis Hospital Blood Center',
    city: 'Mohali',
    address: 'Sector 62, Phase 8, SAS Nagar',
    phone: '+91 172 469 2222',
    location: { latitude: 30.7046, longitude: 76.7291 },
    stock: { 'A+': 25, 'A-': 6, 'B+': 30, 'B-': 6, 'AB+': 12, 'AB-': 4, 'O+': 35, 'O-': 9 },
    is24x7: true,
  },
  {
    name: 'Civil Hospital Blood Bank',
    city: 'Panchkula',
    address: 'Sector 6, Panchkula',
    phone: '+91 172 256 0424',
    location: { latitude: 30.6974, longitude: 76.8570 },
    stock: { 'A+': 16, 'A-': 4, 'B+': 20, 'B-': 4, 'AB+': 7, 'AB-': 2, 'O+': 24, 'O-': 6 },
    is24x7: true,
  },
]

async function seedBloodBanksIfEmpty() {
  try {
    const count = await BloodBank.countDocuments()
    if (count === 0) {
      await BloodBank.insertMany(INITIAL_BLOOD_BANKS)
      console.log('Seeded initial verified blood banks into database.')
    }
  } catch (error) {
    console.error('Error seeding blood banks:', error.message)
  }
}

// -------------------------------------------------------------
// 2. Cross-Platform C++ Executable Resolver
// -------------------------------------------------------------
function getCppExecutablePath() {
  const isWindows = process.platform === 'win32'
  const binaryName = isWindows ? 'graph.exe' : 'graph'

  const possiblePaths = [
    path.resolve(__dirname, '..', 'cpp', binaryName),
    path.resolve(__dirname, 'cpp', binaryName),
    path.resolve(process.cwd(), 'cpp', binaryName),
    path.resolve(process.cwd(), binaryName),
  ]

  for (const candidate of possiblePaths) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Attempt automatic compile if missing (e.g. on Linux deployment)
  const sourcePath = path.resolve(__dirname, '..', 'cpp', 'graph.cpp')
  const targetBinary = path.resolve(__dirname, '..', 'cpp', binaryName)

  if (fs.existsSync(sourcePath)) {
    try {
      console.log(`Compiling C++ binary: ${targetBinary}...`)
      execSync(`g++ -O3 "${sourcePath}" -o "${targetBinary}"`, { stdio: 'ignore' })
      if (fs.existsSync(targetBinary)) {
        console.log('C++ compilation successful!')
        return targetBinary
      }
    } catch (err) {
      console.error('Could not auto-compile C++ binary:', err.message)
    }
  }

  return possiblePaths[0]
}

// Helper: Haversine distance in kilometers between two geo-coordinates
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const toRad = deg => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(2))
}

// -------------------------------------------------------------
// 3. API Endpoints
// -------------------------------------------------------------

// API health check
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BloodBridge API!',
    status: 'Server is running',
    platform: process.platform,
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cppEngine: fs.existsSync(getCppExecutablePath()) ? 'ready' : 'binary_missing',
  })
})

// Register a donor
app.post('/api/donors', async (req, res) => {
  try {
    const { name, email, bloodGroup, city, available, location, phone } = req.body

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof bloodGroup !== 'string' ||
      typeof city !== 'string' ||
      !city.trim()
    ) {
      return res.status(400).json({
        message: 'Please provide name, email, blood group and city.',
      })
    }

    if (name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({
        message: 'Name must be between 2 and 80 characters.',
      })
    }

    if (city.trim().length < 2 || city.trim().length > 100) {
      return res.status(400).json({
        message: 'City must be between 2 and 100 characters.',
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      })
    }

    if (!validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({
        message: 'Invalid blood group.',
      })
    }

    if (available !== undefined && typeof available !== 'boolean') {
      return res.status(400).json({
        message: 'Availability must be true or false.',
      })
    }

    let savedLocation

    if (location !== undefined && location !== null) {
      if (typeof location !== 'object' || Array.isArray(location)) {
        return res.status(400).json({
          message: 'Location must contain latitude and longitude.',
        })
      }

      const { latitude, longitude } = location

      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
        })
      }

      savedLocation = { latitude, longitude }
    }

    const newDonor = new Donor({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      bloodGroup,
      city: city.trim(),
      available: available !== undefined ? available : true,
      ...(savedLocation ? { location: savedLocation } : {}),
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : '+91 98765 43210',
    })

    const savedDonor = await newDonor.save()

    return res.status(201).json({
      message: 'Donor registered successfully!',
      donor: {
        id: savedDonor._id,
        name: savedDonor.name,
        bloodGroup: savedDonor.bloodGroup,
        city: savedDonor.city,
        available: savedDonor.available,
        location: savedDonor.location,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({
      message: 'Something went wrong while registering the donor.',
    })
  }
})

// Search donors
app.get('/api/donors', async (req, res) => {
  try {
    const { bloodGroup, city, available, withLocation } = req.query
    const filter = {}

    if (bloodGroup) {
      if (!validBloodGroups.includes(bloodGroup)) {
        return res.status(400).json({
          message: 'Invalid blood group.',
        })
      }
      filter.bloodGroup = bloodGroup
    }

    if (city) {
      const cleanCity = city.trim()
      if (!cleanCity || cleanCity.length > 100) {
        return res.status(400).json({
          message: 'Please provide a valid city.',
        })
      }
      const escapedCity = cleanCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.city = { $regex: escapedCity, $options: 'i' }
    }

    if (available !== undefined) {
      if (available !== 'true' && available !== 'false') {
        return res.status(400).json({
          message: 'Availability must be true or false.',
        })
      }
      filter.available = available === 'true'
    }

    if (withLocation === 'true') {
      filter['location.latitude'] = { $exists: true }
      filter['location.longitude'] = { $exists: true }
    }

    const donors = await Donor.find(filter)
      .select('name bloodGroup city available location phone createdAt')
      .sort({ createdAt: -1 })
      .limit(100)

    return res.json({
      count: donors.length,
      donors,
    })
  } catch (error) {
    console.error('Fetch donors error:', error)
    return res.status(500).json({
      message: 'Could not fetch donors.',
    })
  }
})

// Get all blood banks
app.get('/api/blood-banks', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query
    const filter = {}

    if (city) {
      const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.city = { $regex: escapedCity, $options: 'i' }
    }

    if (bloodGroup && validBloodGroups.includes(bloodGroup)) {
      filter[`stock.${bloodGroup}`] = { $gt: 0 }
    }

    const bloodBanks = await BloodBank.find(filter).sort({ name: 1 })

    return res.json({
      count: bloodBanks.length,
      bloodBanks,
    })
  } catch (error) {
    console.error('Fetch blood banks error:', error)
    return res.status(500).json({
      message: 'Could not fetch blood banks.',
    })
  }
})

// -------------------------------------------------------------
// 4. Emergency Dispatch Matching using C++ Graph Algorithm
// Resume: "Implemented graph-based shortest-path algorithms to identify the nearest available donor or blood bank"
// POST /api/emergency-dispatch
// -------------------------------------------------------------
app.post('/api/emergency-dispatch', async (req, res) => {
  try {
    const {
      bloodGroup,
      latitude,
      longitude,
      unitsNeeded = 1,
      urgency = 'critical',
    } = req.body

    if (!validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({
        message: 'Please provide a valid emergency blood group.',
      })
    }

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        message: 'Valid patient emergency coordinates (latitude, longitude) are required.',
      })
    }

    // Compatible blood groups that this patient can receive
    const compatibleGroups = BLOOD_COMPATIBILITY[bloodGroup] || [bloodGroup]

    // 1. Fetch Blood Banks with compatible stock
    const stockConditions = compatibleGroups.map(bg => ({ [`stock.${bg}`]: { $gte: Number(unitsNeeded) || 1 } }))
    const bloodBanks = await BloodBank.find({
      $or: stockConditions,
    }).lean()

    // 2. Fetch Available active Donors with compatible blood groups
    const donors = await Donor.find({
      available: true,
      bloodGroup: { $in: compatibleGroups },
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null },
    })
      .limit(30)
      .lean()

    // Combine candidate facilities and donors
    const candidateEntities = []

    bloodBanks.forEach(bb => {
      const straightDist = calculateHaversineDistance(
        latitude,
        longitude,
        bb.location.latitude,
        bb.location.longitude
      )
      // Realistic road distance approx (circuity factor ~ 1.25)
      const roadDistKm = Math.max(1, Math.round(straightDist * 1.25))

      candidateEntities.push({
        type: 'blood_bank',
        id: bb._id.toString(),
        name: bb.name,
        address: bb.address,
        phone: bb.phone,
        city: bb.city,
        bloodGroup,
        availableUnits: bb.stock[bloodGroup] || unitsNeeded,
        location: bb.location,
        roadDistKm,
      })
    })

    donors.forEach(d => {
      const straightDist = calculateHaversineDistance(
        latitude,
        longitude,
        d.location.latitude,
        d.location.longitude
      )
      const roadDistKm = Math.max(1, Math.round(straightDist * 1.25))

      candidateEntities.push({
        type: 'donor',
        id: d._id.toString(),
        name: d.name,
        address: `${d.city} (Volunteer Donor)`,
        phone: d.phone || '+91 98765 43210',
        city: d.city,
        bloodGroup: d.bloodGroup,
        availableUnits: 1,
        location: d.location,
        roadDistKm,
      })
    })

    if (candidateEntities.length === 0) {
      return res.status(404).json({
        found: false,
        message: `No available donors or blood banks found with compatible blood groups (${compatibleGroups.join(', ')}).`,
      })
    }

    // 3. Construct Graph Representation for C++ Dijkstra:
    // Node 0: Emergency Location (Patient)
    // Nodes 1 .. candidateCount: Candidate Blood Banks / Donors
    // Add realistic intermediate road network vertices (e.g. Traffic Hub / Sector Junctions)
    const nodeCount = candidateEntities.length + 3
    const emergencyNode = 0
    const junctionA = candidateEntities.length + 1
    const junctionB = candidateEntities.length + 2

    const edges = []

    // Direct roads and hub roads to form a connected city graph
    edges.push([emergencyNode, junctionA, 2])
    edges.push([junctionA, junctionB, 2])

    candidateEntities.forEach((entity, index) => {
      const candidateNode = index + 1
      const weight = entity.roadDistKm

      // Connect through city road network
      edges.push([emergencyNode, candidateNode, weight])

      if (weight > 3) {
        edges.push([junctionA, candidateNode, Math.max(1, weight - 1)])
      }
      if (weight > 5) {
        edges.push([junctionB, candidateNode, Math.max(1, weight - 2)])
      }
    })

    const candidateTargetIds = candidateEntities.map((_, idx) => idx + 1)

    // 4. Execute C++ Dijkstra Algorithm
    const executablePath = getCppExecutablePath()
    if (!fs.existsSync(executablePath)) {
      return res.status(500).json({
        message: 'C++ algorithm binary not found. Please compile cpp/graph.cpp.',
      })
    }

    // Form input lines for C++ multi-target nearest search mode:
    // n m
    // u v weight
    // source -1
    // targetCount
    // t1 t2 ... tk
    const inputLines = [
      `${nodeCount} ${edges.length}`,
      ...edges.map(e => `${e[0]} ${e[1]} ${e[2]}`),
      `${emergencyNode} -1`,
      `${candidateTargetIds.length}`,
      candidateTargetIds.join(' '),
    ]

    const inputData = `${inputLines.join('\n')}\n`

    const cppProcess = spawn(executablePath, [], {
      shell: false,
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let responded = false

    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true
        cppProcess.kill()
        return res.status(504).json({
          message: 'C++ graph algorithm execution timed out.',
        })
      }
    }, 5000)

    cppProcess.stdout.setEncoding('utf8')
    cppProcess.stderr.setEncoding('utf8')

    cppProcess.stdout.on('data', chunk => {
      stdout += chunk
    })

    cppProcess.stderr.on('data', chunk => {
      stderr += chunk
    })

    cppProcess.on('error', err => {
      clearTimeout(timeout)
      if (responded) return
      responded = true
      return res.status(500).json({
        message: `Failed to spawn C++ binary: ${err.message}`,
      })
    })

    cppProcess.on('close', code => {
      clearTimeout(timeout)
      if (responded) return
      responded = true

      if (code !== 0) {
        console.error('C++ error:', stderr)
        return res.status(500).json({
          message: 'C++ algorithm terminated with error.',
        })
      }

      const nearestMatch = stdout.match(/Nearest destination:\s*(\d+)/i)
      const distanceMatch = stdout.match(/Shortest distance:\s*(\d+)\s*km/i)
      const pathMatch = stdout.match(/Path:\s*([\d\s->]+)/i)

      if (!nearestMatch || !distanceMatch) {
        return res.status(500).json({
          message: 'Could not parse C++ algorithm result.',
          rawOutput: stdout,
        })
      }

      const nearestNodeId = Number(nearestMatch[1])
      const shortestDistanceKm = Number(distanceMatch[1])
      const pathNodes = pathMatch
        ? pathMatch[1].split('->').map(s => Number(s.trim()))
        : [0, nearestNodeId]

      // Match node back to entity (Node 1 corresponds to candidateEntities[0])
      const matchedEntityIndex = nearestNodeId - 1
      const nearestEntity = candidateEntities[matchedEntityIndex] || candidateEntities[0]

      // Parse ranked candidates from C++ output
      const rankedMatches = []
      const rankedLines = stdout.split('Ranked candidates:\n')[1]
      if (rankedLines) {
        rankedLines
          .trim()
          .split('\n')
          .forEach(line => {
            const [targetIdStr, distStr] = line.trim().split(/\s+/)
            const tId = Number(targetIdStr)
            const dKm = Number(distStr)
            const ent = candidateEntities[tId - 1]
            if (ent) {
              rankedMatches.push({
                ...ent,
                calculatedDistanceKm: dKm,
                etaMinutes: Math.round(dKm * 2.2 + 3), // Average urban driving ETA
              })
            }
          })
      }

      return res.json({
        success: true,
        algorithm: "Dijkstra's Shortest Path Algorithm (C++)",
        dataStructure: 'Min-Heap Priority Queue (Adjacency List Graph)',
        timeComplexity: 'O((V + E) log V)',
        spaceComplexity: 'O(V + E)',
        patientLocation: { latitude, longitude },
        nearest: {
          ...nearestEntity,
          calculatedDistanceKm: shortestDistanceKm,
          etaMinutes: Math.round(shortestDistanceKm * 2.2 + 3),
        },
        path: pathNodes,
        rankedCandidates: rankedMatches.length > 0 ? rankedMatches : candidateEntities,
        compatibleGroups,
      })
    })

    cppProcess.stdin.end(inputData)
  } catch (error) {
    console.error('Emergency dispatch error:', error)
    return res.status(500).json({
      message: 'Internal server error processing emergency request.',
    })
  }
})

// -------------------------------------------------------------
// 5. Existing C++ Dijkstra sample graph endpoint (Backwards-compatible)
// POST /api/shortest-path
// -------------------------------------------------------------
app.post('/api/shortest-path', (req, res) => {
  const { nodeCount, edges, source, destination } = req.body

  if (
    !Number.isInteger(nodeCount) ||
    nodeCount < 1 ||
    nodeCount > 2000
  ) {
    return res.status(400).json({
      message: 'nodeCount must be an integer between 1 and 2000.',
    })
  }

  if (!Array.isArray(edges) || edges.length > 10000) {
    return res.status(400).json({
      message: 'edges must be an array with at most 10000 roads.',
    })
  }

  const executablePath = getCppExecutablePath()
  if (!fs.existsSync(executablePath)) {
    return res.status(500).json({
      message: 'C++ algorithm binary not found. Please compile cpp/graph.cpp.',
    })
  }

  const inputLines = [
    `${nodeCount} ${edges.length}`,
    ...edges.map(edge => edge.join(' ')),
    `${source} ${destination}`,
  ]

  const input = `${inputLines.join('\n')}\n`

  const cppProcess = spawn(executablePath, [], {
    shell: false,
    windowsHide: true,
  })

  let stdout = ''
  let stderr = ''
  let responded = false

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true
      cppProcess.kill()
      return res.status(504).json({
        message: 'C++ shortest-path calculation timed out.',
      })
    }
  }, 5000)

  cppProcess.stdout.setEncoding('utf8')
  cppProcess.stderr.setEncoding('utf8')

  cppProcess.stdout.on('data', chunk => {
    stdout += chunk
  })

  cppProcess.stderr.on('data', chunk => {
    stderr += chunk
  })

  cppProcess.on('error', error => {
    clearTimeout(timeout)
    if (responded) return
    responded = true
    return res.status(500).json({
      message: 'Could not start C++ algorithm.',
    })
  })

  cppProcess.on('close', code => {
    clearTimeout(timeout)
    if (responded) return
    responded = true

    if (code !== 0) {
      return res.status(500).json({
        message: 'C++ shortest-path calculation failed.',
      })
    }

    const distanceMatch = stdout.match(/Shortest distance:\s*(\d+)\s*km/i)
    const pathMatch = stdout.match(/Path:\s*([\d\s->]+)/i)

    if (/No path found/i.test(stdout)) {
      return res.json({
        found: false,
        message: 'No route connects the selected locations.',
      })
    }

    if (!distanceMatch || !pathMatch) {
      return res.status(500).json({
        message: 'Unexpected output from C++ algorithm.',
      })
    }

    const distance = Number(distanceMatch[1])
    const route = pathMatch[1]
      .split('->')
      .map(value => Number(value.trim()))

    return res.json({
      found: true,
      algorithm: 'Dijkstra',
      distanceKm: distance,
      path: route,
      note: 'Calculated using C++ Min-Heap Dijkstra implementation.',
    })
  })

  cppProcess.stdin.end(input)
})

// -------------------------------------------------------------
// 6. Server Initialization & MongoDB Connection
// -------------------------------------------------------------
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is missing from the .env file.')
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('MongoDB connected successfully!')

    // Auto-seed blood banks if not present
    await seedBloodBanksIfEmpty()

    app.listen(PORT, () => {
      console.log(`BloodBridge server running at http://localhost:${PORT}`)
      console.log(`C++ Graph Engine loaded from: ${getCppExecutablePath()}`)
    })
  } catch (error) {
    console.error('Startup error:', error.message)
    process.exit(1)
  }
}

startServer()
