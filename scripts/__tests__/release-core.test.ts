import { describe, expect, it } from 'vitest';
import {
  assertReleaseCommandSucceeded,
  classifyCachedDiffExitCode,
  createReleaseProvenance,
  findReleaseForSource,
  validateReleaseVersion,
  verifyReleaseProvenance,
} from '../release-core';

const sourceSha = '0123456789abcdef0123456789abcdef01234567';
const artifactSha = 'abcdef0123456789abcdef0123456789abcdef01';

describe('release state and provenance', () => {
  it('distinguishes no-op, changed, and failed cached diff states', () => {
    expect(classifyCachedDiffExitCode(0)).toBe('unchanged');
    expect(classifyCachedDiffExitCode(1)).toBe('changed');
    expect(() => classifyCachedDiffExitCode(128)).toThrow(/failed/);
  });

  it('stops on failed commit or push results', () => {
    expect(() => assertReleaseCommandSucceeded(0, 'commit')).not.toThrow();
    expect(() => assertReleaseCommandSucceeded(1, 'push')).toThrow(/push failed/);
  });

  it('validates release versions and binds a manifest to both commits', () => {
    expect(validateReleaseVersion('1.2.3')).toBe('1.2.3');
    expect(() => validateReleaseVersion('v1.2.3')).toThrow(/Invalid release version/);
    const manifest = createReleaseProvenance('1.2.3', sourceSha, artifactSha, '2026-10-23T12:00:00.000Z');
    expect(verifyReleaseProvenance(manifest, { version: '1.2.3', sourceSha, artifactSha })).toEqual(manifest);
    expect(() => verifyReleaseProvenance(manifest, { version: '1.2.3', sourceSha: artifactSha })).toThrow(/does not match/);
    expect(() => createReleaseProvenance('1.2.3', 'bad', artifactSha)).toThrow(/SHA/);
  });

  it('finds an unreconciled release by its exact source commit marker', () => {
    const release = { tagName: 'sales-v1.2.3', body: `Source commit: ${sourceSha}\nArtifact commit: ${artifactSha}` };
    expect(findReleaseForSource([{ tagName: 'sales-v1.2.2', body: '' }, release], sourceSha)).toEqual(release);
    expect(findReleaseForSource([release], artifactSha)).toBeUndefined();
  });
});
