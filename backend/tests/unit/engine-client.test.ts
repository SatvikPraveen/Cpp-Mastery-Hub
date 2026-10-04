import { EngineClient, MAX_SOURCE_BYTES } from '../../src/services/engine/engine-client';
import { ApiError } from '../../src/utils/errors';
import { json, sampleReport, startStubEngine } from '../helpers/stub-engine';

describe('EngineClient', () => {
  it('posts code and options in the adapter format and returns the report', async () => {
    const stub = await startStubEngine((_req, _body, res) => json(res, 200, sampleReport));
    try {
      const client = new EngineClient(stub.url, 2000);
      const report = await client.analyze('int main(){}', { maxCyclomatic: 5, disable: ['readability/goto'] });
      expect(report.summary.errors).toBe(1);
      expect(stub.calls[0]).toEqual({
        path: '/analyze',
        body: { code: 'int main(){}', config: { max_cc: 5, disable: ['readability/goto'] } },
      });
    } finally {
      await stub.close();
    }
  });

  it('passes engine 4xx through and maps 5xx to 502', async () => {
    let status = 413;
    const stub = await startStubEngine((_req, _body, res) => json(res, status, { error: 'too big', status }));
    try {
      const client = new EngineClient(stub.url, 2000);
      await expect(client.metrics('x')).rejects.toMatchObject({ statusCode: 413, message: 'too big' });
      status = 500;
      await expect(client.metrics('x')).rejects.toMatchObject({ statusCode: 502 });
    } finally {
      await stub.close();
    }
  });

  it('reports an unreachable engine as 503', async () => {
    const client = new EngineClient('http://127.0.0.1:9', 1000);
    await expect(client.health()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('reports a slow engine as 504', async () => {
    const stub = await startStubEngine(() => {
      /* never respond */
    });
    try {
      const client = new EngineClient(stub.url, 200);
      await expect(client.rules()).rejects.toMatchObject({ statusCode: 504 });
    } finally {
      await stub.close();
    }
  });

  it('rejects oversize sources before any network call', async () => {
    const client = new EngineClient('http://127.0.0.1:9', 1000);
    const big = 'x'.repeat(MAX_SOURCE_BYTES + 1);
    await expect(client.analyze(big)).rejects.toBeInstanceOf(ApiError);
    await expect(client.analyze(big)).rejects.toMatchObject({ statusCode: 413 });
  });

  it('counts the byte length of multi-byte UTF-8, not characters', () => {
    const almost = 'é'.repeat(MAX_SOURCE_BYTES / 2); // 2 bytes each: exactly at the limit
    expect(() => EngineClient.checkSource(almost)).not.toThrow();
    expect(() => EngineClient.checkSource(`${almost}é`)).toThrow(ApiError);
  });
});
