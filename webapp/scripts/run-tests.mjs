import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function listTests(glob) {
  return Array.from(new Bun.Glob(glob).scanSync({ cwd: root })).sort()
}

const colocated = listTests('src/**/*.test.ts')
const hybrid = listTests('tests/hybrid-*.test.ts')
const rest = listTests('tests/**/*.{test.ts,test.tsx}').filter(
  (file) => !file.replaceAll('\\', '/').includes('/hybrid-'),
)

async function run(files) {
  if (files.length === 0) return
  const proc = Bun.spawn([process.execPath, 'test', ...files], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const code = await proc.exited
  if (code !== 0) process.exit(code)
}

await run([...rest, ...colocated])
for (const file of hybrid) {
  await run([file])
}

