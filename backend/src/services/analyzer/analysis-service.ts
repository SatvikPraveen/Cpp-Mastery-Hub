import { createHash } from 'crypto';

import { CacheService } from '../cache-service';
import { EngineClient, engineClient } from '../engine/engine-client';
import type {
  AnalysisOptions,
  AnalysisReport,
  CodeMetrics,
  LayoutReport,
  RuleInfo,
  TargetAbi,
} from '../engine/types';

/** Results are a pure function of (engine version, input, options), so caching is safe. */
const CACHE_TTL_SECONDS = 60 * 60;

/**
 * Caching facade over the analysis engine. All analysis is performed by the engine; this layer
 * owns only cache keys, so that repeated requests for the same snippet (common while a learner
 * re-runs a lesson) do not reach the engine.
 */
export class AnalysisService {
  constructor(
    private readonly engine: EngineClient = engineClient,
    private readonly cache: CacheService = new CacheService()
  ) {}

  analyze(code: string, options: AnalysisOptions = {}): Promise<AnalysisReport> {
    return this.cached('analyze', [code, options], () => this.engine.analyze(code, options));
  }

  metrics(code: string): Promise<CodeMetrics> {
    return this.cached('metrics', [code], () => this.engine.metrics(code));
  }

  layout(code: string, abi: TargetAbi = 'lp64', pack?: number): Promise<LayoutReport> {
    return this.cached('layout', [code, abi, pack ?? null], () => this.engine.layout(code, abi, pack));
  }

  rules(): Promise<RuleInfo[]> {
    return this.cached('rules', [], () => this.engine.rules());
  }

  static cacheKey(kind: string, parts: unknown[]): string {
    const digest = createHash('sha256').update(JSON.stringify(parts)).digest('hex');
    return `analysis:${kind}:${digest}`;
  }

  private async cached<T>(kind: string, parts: unknown[], compute: () => Promise<T>): Promise<T> {
    const key = AnalysisService.cacheKey(kind, parts);
    const hit = await this.cache.getJson<T>(key);
    if (hit !== null) return hit;
    const value = await compute();
    await this.cache.setJson(key, value, CACHE_TTL_SECONDS);
    return value;
  }
}

export const analysisService = new AnalysisService();
