#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'tools', 'asset-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const mode = process.argv[2] || 'validate';

function validate() {
  const failures = [];
  for (const entry of manifest.entries) {
    const runtime = path.join(root, manifest.runtimeRoot, entry.runtime);
    if (!fs.existsSync(runtime)) { failures.push(`${entry.id}: missing ${entry.runtime}`); continue; }
    if (entry.generatorScript && !fs.existsSync(path.join(root, entry.generatorScript))) failures.push(`${entry.id}: missing source ${entry.generatorScript}`);
    const sizeKb = fs.statSync(runtime).size / 1024;
    if (sizeKb > entry.budgetKb) failures.push(`${entry.id}: ${Math.round(sizeKb)}KB exceeds ${entry.budgetKb}KB budget`);
  }
  for (const attribution of manifest.attribution) {
    if (attribution.licenseFile && !fs.existsSync(path.join(root, attribution.licenseFile))) failures.push(`missing attribution file: ${attribution.licenseFile}`);
  }
  if (!manifest.motion?.requiredClips?.length) failures.push('motion: requiredClips is empty');
  if (!manifest.optimization?.geometry || !manifest.optimization?.textures) failures.push('manifest: add geometry and texture optimization targets');
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`Asset manifest valid (${manifest.entries.length} runtime entries, ${manifest.motion.requiredClips.length} required clips).`);
}

function report() {
  const rows = manifest.entries.map(entry => {
    const runtime = path.join(root, manifest.runtimeRoot, entry.runtime);
    const sizeKb = fs.existsSync(runtime) ? fs.statSync(runtime).size / 1024 : 0;
    return { id: entry.id, runtime: entry.runtime, sizeKb: Math.round(sizeKb), budgetKb: entry.budgetKb, status: sizeKb <= entry.budgetKb ? 'ok' : 'over-budget' };
  }).sort((a, b) => b.sizeKb - a.sizeKb);
  const totalKb = rows.reduce((sum, row) => sum + row.sizeKb, 0);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), totalKb, optimization: manifest.optimization, assets: rows }, null, 2));
}

function run(command, args) {
  if (!command) { console.error('Set the required tool environment variable first.'); process.exit(2); }
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: true });
  if (result.status) process.exit(result.status);
}

if (mode === 'validate') validate();
else if (mode === 'report') report();
else if (mode === 'generate') run(process.env.LOCAL_3D_GEN_CMD, process.argv.slice(3));
else if (mode === 'motion') run(process.execPath, [path.join(root, 'tools', 'kimodo-adapter.mjs'), ...process.argv.slice(3)]);
else if (mode === 'blender') run(process.env.BLENDER_BIN || 'blender', process.argv.slice(3));
else if (mode === 'optimize') run(process.env.GLTF_TRANSFORM_CMD || 'gltf-transform', process.argv.slice(3));
else { console.error('Usage: node tools/asset-pipeline.mjs <validate|report|generate|motion|blender|optimize>'); process.exit(2); }
