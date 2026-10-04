import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import type { AddressInfo } from 'net';

export type StubHandler = (req: IncomingMessage, body: unknown, res: ServerResponse) => void;

export interface StubEngine {
  url: string;
  calls: Array<{ path: string; body: unknown }>;
  close: () => Promise<void>;
}

/** Minimal HTTP server standing in for the engine adapter. */
export async function startStubEngine(handler: StubHandler): Promise<StubEngine> {
  const calls: StubEngine['calls'] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const body: unknown = raw ? JSON.parse(raw) : undefined;
      calls.push({ path: req.url ?? '', body });
      handler(req, body, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export function json(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/** A schema-conforming analysis report with one diagnostic. */
export const sampleReport = {
  schema: 'cppmastery.analysis/1',
  engine: { version: '2.0.0', revision: 'test' },
  elapsed_us: 12,
  rules_run: 20,
  summary: { errors: 1, warnings: 0, infos: 0, total: 1 },
  diagnostics: [
    {
      rule: 'security/unsafe-c-function',
      severity: 'error',
      category: 'security',
      position: { line: 1, column: 25 },
      length: 4,
      message: "Call to unsafe C function 'gets'.",
      suggestion: 'Use std::getline.',
      reference: 'CERT C STR31-C',
    },
  ],
  metrics: {
    lines: { physical: 1, code: 1, comment: 0, blank: 0, mixed: 0 },
    tokens: 12,
    includes: 0,
    classes: 0,
    comment_ratio: 0,
    halstead: {
      n1: 5,
      n2: 3,
      N1: 7,
      N2: 5,
      vocabulary: 8,
      length: 12,
      estimated_length: 16.4,
      volume: 36,
      difficulty: 4.2,
      effort: 151,
      time_seconds: 8.4,
      delivered_bugs: 0.012,
    },
    cyclomatic: { total: 1, max: 1, mean: 1 },
    max_nesting: 0,
    maintainability: { raw: 140, normalized: 81.9, with_comments: 140 },
    functions: [],
  },
} as const;
