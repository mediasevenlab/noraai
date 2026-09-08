#!/usr/bin/env bun

/**
 * Refuse a VPS release when the local Git source is unsafe.
 * Does not deploy, mutate remotes, or print secrets.
 */

import { execFileSync } from 'node:child_process'

function run(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

const TEMPLATE_ORIGIN = /github\.com[:/]di-sukharev\/vibe(?:\.git)?/i

const status = run(['status', '--porcelain'])
const branch = run(['status', '--short', '--branch'])
const remotes = run(['remote', '-v'])
const sha = run(['rev-parse', 'HEAD'])

const blockers = []

if (status.length > 0) {
  blockers.push('worktree is dirty (modified, deleted, or untracked files)')
}

if (!/^[0-9a-f]{40}$/i.test(sha)) {
  blockers.push('HEAD is not a full Git SHA')
}

const originLines = remotes
  .split('\n')
  .filter((line) => line.startsWith('origin') || line.startsWith('origin\t'))

if (originLines.length === 0) {
  blockers.push('origin is not configured')
} else if (originLines.some((line) => TEMPLATE_ORIGIN.test(line))) {
  blockers.push('origin still points at the vibe coding template; set the product GitHub remote before a production release')
}

console.log(branch)
console.log(`HEAD ${sha}`)

if (blockers.length > 0) {
  console.error('VPS release preflight failed:')
  for (const blocker of blockers) console.error(`- ${blocker}`)
  process.exit(1)
}

console.log('VPS release preflight passed.')
