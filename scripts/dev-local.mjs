import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const processes = [
  spawn(npmCommand, ['run', 'dev:api'], { stdio: 'inherit', env: process.env }),
  spawn(npmCommand, ['run', 'dev:web'], { stdio: 'inherit', env: process.env }),
]

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exitCode = exitCode
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error('Unable to start the local development services.', error)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`A local development service stopped (${signal ?? `exit ${code}`}).`)
      stop(code ?? 1)
    }
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
