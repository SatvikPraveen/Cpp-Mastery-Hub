import axios, { AxiosError, type AxiosInstance } from 'axios';

import { cppEngineConfig } from '../../config';
import { ApiError } from '../../utils/errors';

import type {
  AnalysisOptions,
  AnalysisReport,
  CodeMetrics,
  LayoutReport,
  RuleInfo,
  TargetAbi,
} from './types';

/** Largest source accepted from a client; the engine adapter enforces its own cap as well. */
export const MAX_SOURCE_BYTES = 256 * 1024;

/**
 * Client for the analysis engine's HTTP adapter (cpp-engine/tools/http_adapter).
 *
 * The adapter is a thin wrapper around the `cppmastery` CLI (ADR-0005); this client adds
 * input limits, typed results and a uniform mapping of transport failures to API errors.
 * The engine never compiles or executes submitted code.
 */
export class EngineClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string = cppEngineConfig.url, timeoutMs: number = cppEngineConfig.timeout) {
    this.http = axios.create({
      baseURL,
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json' },
      // The adapter answers 4xx/5xx with a JSON error body; handle them ourselves.
      validateStatus: () => true,
    });
  }

  async health(): Promise<{ status: string; engine: string }> {
    return this.request('get', '/health');
  }

  async rules(): Promise<RuleInfo[]> {
    const report = await this.request<AnalysisReport>('get', '/rules');
    return report.rules ?? [];
  }

  async analyze(code: string, options: AnalysisOptions = {}): Promise<AnalysisReport> {
    EngineClient.checkSource(code);
    const config: Record<string, unknown> = {};
    if (options.maxCyclomatic !== undefined) config['max_cc'] = options.maxCyclomatic;
    if (options.maxNesting !== undefined) config['max_nesting'] = options.maxNesting;
    if (options.maxFunctionLines !== undefined) config['max_lines'] = options.maxFunctionLines;
    if (options.disable && options.disable.length > 0) config['disable'] = options.disable;
    return this.request('post', '/analyze', { code, config });
  }

  async metrics(code: string): Promise<CodeMetrics> {
    EngineClient.checkSource(code);
    return this.request('post', '/metrics', { code });
  }

  async layout(code: string, abi: TargetAbi = 'lp64', pack?: number): Promise<LayoutReport> {
    EngineClient.checkSource(code);
    return this.request('post', '/layout', pack === undefined ? { code, abi } : { code, abi, pack });
  }

  static checkSource(code: string): void {
    if (Buffer.byteLength(code, 'utf8') > MAX_SOURCE_BYTES) {
      throw new ApiError(413, `Source exceeds ${MAX_SOURCE_BYTES} bytes`);
    }
  }

  private async request<T>(method: 'get' | 'post', path: string, body?: unknown): Promise<T> {
    let response;
    try {
      response = await this.http.request<unknown>({ method, url: path, data: body });
    } catch (error) {
      throw EngineClient.transportError(error);
    }
    if (response.status >= 200 && response.status < 300) {
      return response.data as T;
    }
    const message =
      typeof response.data === 'object' && response.data !== null && 'error' in response.data
        ? String((response.data as { error: unknown }).error)
        : `Analysis engine responded with HTTP ${response.status}`;
    // Client errors are the caller's fault and are passed through; anything else is upstream.
    const status = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw new ApiError(status, message);
  }

  private static transportError(error: unknown): ApiError {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ApiError(504, 'Analysis engine timed out');
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return new ApiError(503, 'Analysis engine is unavailable');
      }
    }
    return new ApiError(502, 'Analysis engine request failed');
  }
}

export const engineClient = new EngineClient();
