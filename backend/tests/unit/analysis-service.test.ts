import { AnalysisService } from '../../src/services/analyzer/analysis-service';
import { CacheService, MemoryStore } from '../../src/services/cache-service';
import type { EngineClient } from '../../src/services/engine/engine-client';
import { sampleReport } from '../helpers/stub-engine';

function fakeEngine() {
  return {
    analyze: jest.fn().mockResolvedValue(sampleReport),
    metrics: jest.fn().mockResolvedValue(sampleReport.metrics),
    layout: jest.fn().mockResolvedValue({ schema: 'cppmastery.layout/1', abi: { name: 'lp64', pointer_size: 8 }, structs: [] }),
    rules: jest.fn().mockResolvedValue([]),
  };
}

describe('AnalysisService', () => {
  it('serves repeated identical requests from the cache', async () => {
    const engine = fakeEngine();
    const service = new AnalysisService(engine as unknown as EngineClient, new CacheService(new MemoryStore()));
    await service.analyze('int main(){}');
    await service.analyze('int main(){}');
    expect(engine.analyze).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on code, options and endpoint', async () => {
    const engine = fakeEngine();
    const service = new AnalysisService(engine as unknown as EngineClient, new CacheService(new MemoryStore()));
    await service.analyze('a');
    await service.analyze('b');
    await service.analyze('a', { maxNesting: 2 });
    await service.layout('a', 'lp64');
    await service.layout('a', 'ilp32');
    expect(engine.analyze).toHaveBeenCalledTimes(3);
    expect(engine.layout).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const engine = fakeEngine();
    engine.metrics.mockRejectedValueOnce(new Error('down'));
    const service = new AnalysisService(engine as unknown as EngineClient, new CacheService(new MemoryStore()));
    await expect(service.metrics('x')).rejects.toThrow('down');
    await expect(service.metrics('x')).resolves.toEqual(sampleReport.metrics);
    expect(engine.metrics).toHaveBeenCalledTimes(2);
  });

  it('produces stable, collision-resistant cache keys', () => {
    expect(AnalysisService.cacheKey('analyze', ['x', {}])).toBe(AnalysisService.cacheKey('analyze', ['x', {}]));
    expect(AnalysisService.cacheKey('analyze', ['x'])).not.toBe(AnalysisService.cacheKey('metrics', ['x']));
    expect(AnalysisService.cacheKey('analyze', ['x'])).toMatch(/^analysis:analyze:[0-9a-f]{64}$/);
  });
});
