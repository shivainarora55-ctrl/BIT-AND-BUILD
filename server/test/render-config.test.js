import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const renderConfigUrl = new URL('../../render.yaml', import.meta.url);

describe('Render static-site configuration', () => {
  test('publishes the Vite frontend for the production service', async () => {
    const renderConfig = await readFile(fileURLToPath(renderConfigUrl), 'utf8');

    expect(renderConfig).toMatch(/name: bit-and-build\r?\n/);
    expect(renderConfig).toMatch(/runtime: static/);
    expect(renderConfig).toMatch(/rootDir: client/);
    expect(renderConfig).toMatch(/buildCommand: npm ci && npm run build/);
    expect(renderConfig).toMatch(/staticPublishPath: dist/);
    expect(renderConfig).toMatch(/source: \/\*/);
    expect(renderConfig).toMatch(/destination: \/index\.html/);
  });
});
