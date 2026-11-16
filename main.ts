// Prism Drift — the entrypoint. It hands the game in: copies this
// repository's game/ and screenshots/ into the output directory and writes
// the dossier the judge reads, with the vendored make.fun library.
// Node 22, standard library only; no network, no build step.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/** The directory this file lives in: the repository root. */
const repoRoot = dirname(fileURLToPath(import.meta.url));
/** The grader's /output, or MAKEFUN_OUTPUT_DIR outside its container. */
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a directory tree when it exists, creating the target first. */
function copyTreeIfPresent(name) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTreeIfPresent('game');
copyTreeIfPresent('screenshots');

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes;
// the rest refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files
// in all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
