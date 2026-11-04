import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(path.resolve(process.cwd(), '.github/workflows/release.yml'), 'utf8');

describe('release workflow provenance re-check', () => {
  it('downloads the existing manifest into a fresh directory instead of over the expected file', () => {
    expect(workflow).toContain('EXPECTED_MANIFEST="$EXPECTED_DIR/sales-release-manifest.json"');
    expect(workflow).toContain('ASSET_DIR="$RUNNER_TEMP/sales-release-assets"');
    expect(workflow).toContain('--dir "$ASSET_DIR"');
    expect(workflow).toContain('verify-manifest "$ASSET_DIR/sales-release-manifest.json"');
    expect(workflow).not.toContain('verify-manifest "$EXPECTED_MANIFEST"');
    expect(workflow).not.toContain('--dir "$RUNNER_TEMP"');
  });

  it('distinguishes a missing asset from a failed download before overwriting provenance', () => {
    expect(workflow).toContain('ASSETS=$(gh release view "$TAG"');
    expect(workflow).toContain("printf '%s\\n' \"$ASSETS\" | grep -Fx 'sales-release-manifest.json'");
    expect(workflow).toContain('Release provenance asset is missing');
  });
});
