import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ReleaseProvenance {
  schemaVersion: 1;
  version: string;
  sourceSha: string;
  artifactSha: string;
  createdAt: string;
}

export interface ReleaseSummary {
  tagName: string;
  body?: string | null;
}

export function validateReleaseVersion(version: string): string {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Invalid release version "${version}"; expected x.y.z semver.`);
  }
  return version;
}

export function classifyCachedDiffExitCode(exitCode: number): 'unchanged' | 'changed' {
  if (exitCode === 0) return 'unchanged';
  if (exitCode === 1) return 'changed';
  throw new Error(`git diff --cached failed (${exitCode}).`);
}

export function assertReleaseCommandSucceeded(exitCode: number, operation: string): void {
  if (exitCode !== 0) throw new Error(`${operation} failed (${exitCode}).`);
}

export function createReleaseProvenance(
  version: string,
  sourceSha: string,
  artifactSha: string,
  createdAt = new Date().toISOString(),
): ReleaseProvenance {
  validateReleaseVersion(version);
  for (const [label, sha] of [['source', sourceSha], ['artifact', artifactSha]] as const) {
    if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error(`Invalid ${label} commit SHA.`);
  }
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('Invalid release timestamp.');
  return { schemaVersion: 1, version, sourceSha: sourceSha.toLowerCase(), artifactSha: artifactSha.toLowerCase(), createdAt };
}

export function verifyReleaseProvenance(
  raw: unknown,
  expected: { version: string; sourceSha: string; artifactSha?: string },
): ReleaseProvenance {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Release provenance is missing or malformed.');
  const manifest = raw as Partial<ReleaseProvenance>;
  if (manifest.schemaVersion !== 1 || typeof manifest.version !== 'string' || typeof manifest.sourceSha !== 'string' ||
      typeof manifest.artifactSha !== 'string' || typeof manifest.createdAt !== 'string' || manifest.version !== expected.version ||
      manifest.sourceSha?.toLowerCase() !== expected.sourceSha.toLowerCase() ||
      (expected.artifactSha && manifest.artifactSha?.toLowerCase() !== expected.artifactSha.toLowerCase())) {
    throw new Error('Existing release tag does not match this source/build. Refusing to reuse the version.');
  }
  return createReleaseProvenance(manifest.version, manifest.sourceSha, manifest.artifactSha, manifest.createdAt);
}

export function findReleaseForSource(releases: ReleaseSummary[], sourceSha: string): ReleaseSummary | undefined {
  const marker = `source commit: ${sourceSha.toLowerCase()}`;
  return releases.find((release) => (release.body ?? '').toLowerCase().includes(marker));
}

function runCli(args: string[]): void {
  const [command, ...values] = args;
  if (command === 'validate-version') {
    console.log(validateReleaseVersion(values[0] ?? ''));
    return;
  }
  if (command === 'write-manifest') {
    const [version, sourceSha, artifactSha, filePath] = values;
    if (!filePath) throw new Error('Manifest output path is required.');
    const manifest = createReleaseProvenance(version, sourceSha, artifactSha);
    fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return;
  }
  if (command === 'verify-manifest') {
    const [filePath, version, sourceSha, artifactSha] = values;
    if (!filePath) throw new Error('Manifest input path is required.');
    const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
    verifyReleaseProvenance(manifest, { version, sourceSha, ...(artifactSha ? { artifactSha } : {}) });
    return;
  }
  throw new Error(`Unknown release provenance command "${command ?? ''}".`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
