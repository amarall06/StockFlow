import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Execute o build antes: check-performance valida os arquivos realmente gerados.
const checks = readdirSync(new URL('.', import.meta.url)).filter(name => /^check-.*\.mjs$/.test(name)).sort()
let failures = 0
for (const name of checks) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(name, import.meta.url))], { stdio: 'inherit' })
  if (result.status !== 0) failures++
}
const lab = spawnSync(process.execPath, ['--test', 'tests/outflow-lab/server.test.mjs'], { stdio: 'inherit' })
if (lab.status !== 0) failures++
if (failures) process.exitCode = 1
