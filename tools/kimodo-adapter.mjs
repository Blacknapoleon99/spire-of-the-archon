#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const prompt = process.argv.slice(2).join(' ') || 'first-person wizard casting a controlled arcane spell, stable feet, readable hands';
const outputDir = process.env.KIMODO_OUTPUT_DIR || path.resolve('assets/generated/motion');
fs.mkdirSync(outputDir, { recursive: true });
const command = process.env.KIMODO_CMD;
if (!command) {
  console.error('KIMODO_CMD is not configured. Install the local Kimodo.cpp/kimodo_gen build, then set KIMODO_CMD.');
  process.exit(2);
}

// Kimodo accepts text plus optional constraints. The adapter deliberately keeps
// the command configurable because local CUDA/CPU builds expose different flags.
const args = ['--prompt', prompt, '--duration', process.env.KIMODO_DURATION || '2.0', '--num_samples', '1', '--output_dir', outputDir];
const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Kimodo motion written to ${outputDir}; retarget through Blender before GLB export.`);

