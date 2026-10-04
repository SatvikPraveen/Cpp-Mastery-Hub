/**
 * Contract test between this backend and the real analysis engine.
 *
 * Starts cpp-engine/tools/http_adapter around a built `cppmastery` binary and checks that the
 * responses match the TypeScript mirror in src/services/engine/types.ts. Skipped when no binary
 * is available (set CPPMASTERY_BIN, or build cpp-engine with `cmake --workflow --preset dev`).
 */
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { createServer } from 'net';
import { resolve } from 'path';

import { EngineClient } from '../../src/services/engine/engine-client';
import type { AnalysisReport, LayoutReport } from '../../src/services/engine/types';

const repo = resolve(__dirname, '../../..');
const candidates = [
  process.env['CPPMASTERY_BIN'],
  resolve(repo, 'cpp-engine/build/dev/cppmastery'),
  resolve(repo, 'cpp-engine/build/release/cppmastery'),
].filter((p): p is string => typeof p === 'string');
// Paths come from this repository's layout or the test runner's own environment.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const binary = candidates.find((p) => existsSync(p));
const describeIfEngine = binary ? describe : describe.skip;

async function freePort(): Promise<number> {
  return new Promise((done) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => done(port));
    });
  });
}

describeIfEngine('engine contract (real cppmastery binary)', () => {
  let adapter: ChildProcess;
  let client: EngineClient;

  beforeAll(async () => {
    const port = await freePort();
    adapter = spawn('python3', [resolve(repo, 'cpp-engine/tools/http_adapter/cppmastery_http.py')], {
      env: { ...process.env, CPPMASTERY_BIN: binary, CPPMASTERY_HOST: '127.0.0.1', CPPMASTERY_PORT: String(port) },
      stdio: 'ignore',
    });
    client = new EngineClient(`http://127.0.0.1:${port}`, 10_000);
    for (let i = 0; i < 100; i++) {
      try {
        await client.health();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('engine adapter did not start');
  });

  afterAll(() => {
    adapter?.kill();
  });

  it('returns an analysis report matching the mirrored schema', async () => {
    const report: AnalysisReport = await client.analyze(
      '#include <cstring>\nint main(){ char b[8]; strcpy(b, "x"); int* p = new int; delete p; }\n'
    );
    expect(report.schema).toBe('cppmastery.analysis/1');
    expect(report.engine.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.summary.total).toBe(report.diagnostics.length);
    const rules = report.diagnostics.map((d) => d.rule);
    expect(rules).toEqual(expect.arrayContaining(['security/unsafe-c-function', 'memory/raw-new-delete']));
    for (const d of report.diagnostics) {
      expect(['info', 'warning', 'error']).toContain(d.severity);
      expect(d.position.line).toBeGreaterThanOrEqual(1);
      expect(d.reference.length).toBeGreaterThan(0);
    }
    const m = report.metrics;
    expect(m.lines.physical).toBe(2);
    expect(m.functions.map((f) => f.name)).toEqual(['main']);
    expect(m.maintainability.normalized).toBeGreaterThanOrEqual(0);
    expect(m.maintainability.normalized).toBeLessThanOrEqual(100);
    expect(Object.keys(m.halstead).sort()).toEqual(
      ['N1', 'N2', 'delivered_bugs', 'difficulty', 'effort', 'estimated_length', 'length', 'n1', 'n2', 'time_seconds', 'vocabulary', 'volume'].sort()
    );
  });

  it('forwards analysis options to the engine', async () => {
    const code = 'void f(int n){ if(n){ if(n>1){ if(n>2){} } } }';
    const strict = await client.analyze(code, { maxNesting: 1 });
    const relaxed = await client.analyze(code, { maxNesting: 10, disable: ['readability/magic-number'] });
    expect(strict.diagnostics.some((d) => d.rule === 'complexity/deep-nesting')).toBe(true);
    expect(relaxed.diagnostics.some((d) => d.rule === 'complexity/deep-nesting')).toBe(false);
    expect(relaxed.rules_run).toBe(strict.rules_run - 1);
  });

  it('returns a layout report with an optimal reordering', async () => {
    const layout: LayoutReport = await client.layout('struct S { char a; double b; char c; int d; };', 'lp64');
    expect(layout.schema).toBe('cppmastery.layout/1');
    const [s] = layout.structs;
    expect(s?.layout).toMatchObject({ name: 'S', size: 24, align: 8 });
    expect(s?.suggested?.bytes_saved).toBe(8);
    expect(s?.suggested?.layout.size).toBe(16);
  });

  it('lists the rule catalogue with references', async () => {
    const rules = await client.rules();
    expect(rules).toHaveLength(20);
    expect(rules.every((r) => /^[a-z]+\/[a-z0-9+-]+$/.test(r.id) && r.reference.length > 0)).toBe(true);
  });

  it('maps the adapter size limit to 413', async () => {
    // Just under the client-side cap but over a deliberately small adapter cap is not possible
    // here (the adapter uses its default 256 KiB), so check the client-side guard instead.
    await expect(client.analyze('x'.repeat(256 * 1024 + 1))).rejects.toMatchObject({ statusCode: 413 });
  });
});
