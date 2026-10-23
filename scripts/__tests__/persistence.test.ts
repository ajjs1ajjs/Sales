import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonAtomically } from '../persistence';

let tempDir: string | undefined;
afterEach(async () => {
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('atomic JSON persistence', () => {
  it('writes complete JSON and leaves no temporary files behind', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sales-persistence-'));
    const filePath = path.join(tempDir, 'nested', 'snapshot.json');
    const expected = { games: [{ id: '1' }], lastUpdated: 'today' };
    await writeJsonAtomically(filePath, expected);
    expect(JSON.parse(await fs.readFile(filePath, 'utf8'))).toEqual(expected);
    expect(await fs.readdir(path.dirname(filePath))).toEqual(['snapshot.json']);
  });
});
