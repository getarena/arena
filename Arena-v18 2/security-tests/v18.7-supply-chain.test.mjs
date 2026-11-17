import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
const npmrc = read('.npmrc')

assert.equal(pkg.version, '0.18.8')
assert.equal(lock.version, pkg.version)
assert.equal(lock.lockfileVersion, 3)
assert.equal(lock.packages[''].version, pkg.version)
assert.equal(pkg.private, true)
assert.equal(pkg.engines?.node, '>=20.19.0')
assert.ok(pkg.scripts['test:security:registry'])

for (const [group, dependencies] of Object.entries({ dependencies: pkg.dependencies, devDependencies: pkg.devDependencies })) {
  for (const name of Object.keys(dependencies || {})) {
    const entry = lock.packages[`node_modules/${name}`]
    assert.ok(entry, `Missing lock entry for ${group} dependency ${name}`)
    assert.match(String(entry.resolved || ''), /^https:\/\/registry\.npmjs\.org\//, `${name} must resolve from the npm registry`)
    assert.ok(entry.integrity, `${name} lock entry must include integrity`)
    assert.equal(dependencies[name], entry.version, `${name} must be exactly pinned to its lockfile version`)
  }
}

const lockEntries = Object.entries(lock.packages)
for (const [name, entry] of lockEntries) {
  if (name === '') continue
  if (entry.resolved) assert.match(String(entry.resolved), /^https:\/\/registry\.npmjs\.org\//, `${name} has a non-registry resolved URL`)
  if (entry.resolved) assert.ok(entry.integrity, `${name} has no integrity field`)
}

for (const value of [...Object.values(pkg.dependencies || {}), ...Object.values(pkg.devDependencies || {})]) {
  assert.doesNotMatch(String(value), /^(git\+|git:|file:|https?:\/\/)/i)
}

for (const forbidden of ['preinstall', 'install', 'postinstall']) {
  assert.equal(pkg.scripts[forbidden], undefined, `Unexpected install lifecycle script: ${forbidden}`)
}

for (const required of [
  'package-lock=true',
  'engine-strict=true',
  'save-exact=true',
  'audit=true',
  'fund=false',
]) assert.ok(npmrc.split(/\r?\n/).includes(required), `Missing .npmrc policy: ${required}`)


console.log('V18.7 supply-chain policy checks: PASS')
