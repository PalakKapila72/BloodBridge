const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('--- Preparing C++ Graph Engine for Deployment ---')

const isWindows = process.platform === 'win32'
const binaryName = isWindows ? 'graph.exe' : 'graph'

// Candidate paths for graph.cpp source
const sourceCandidates = [
  path.resolve(__dirname, 'cpp', 'graph.cpp'),
  path.resolve(__dirname, '..', 'cpp', 'graph.cpp'),
  path.resolve(process.cwd(), 'cpp', 'graph.cpp'),
]

let foundSource = null
for (const cand of sourceCandidates) {
  if (fs.existsSync(cand)) {
    foundSource = cand
    break
  }
}

if (!foundSource) {
  console.warn('Warning: C++ source file graph.cpp not found in searched locations.')
  process.exit(0)
}

// Compile target location (inside server/cpp)
const targetDir = path.resolve(__dirname, 'cpp')
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const targetBinary = path.resolve(targetDir, binaryName)

console.log(`Compiling ${foundSource} -> ${targetBinary}...`)

try {
  execSync(`g++ -O3 "${foundSource}" -o "${targetBinary}"`, { stdio: 'inherit' })
  console.log('✓ C++ Graph Engine compiled successfully!')
} catch (err) {
  console.warn('Warning: g++ compilation failed, falling back to dynamic execution:', err.message)
}

process.exit(0)
