import { Router } from 'express';
import { z } from 'zod';

import { analysisService } from '../../services/analyzer/analysis-service';
import { MAX_SOURCE_BYTES } from '../../services/engine/engine-client';
import { handle, parse, stripUndefined } from '../http';
import { optionalAuth } from '../middleware/auth';
import { createIPRateLimit } from '../middleware/ratelimit';

/**
 * Static analysis endpoints backed by the cppmastery engine.
 *
 *   POST /api/analysis/analyze   diagnostics + metrics          (cppmastery.analysis/1)
 *   POST /api/analysis/metrics   metrics only
 *   POST /api/analysis/layout    struct layout + reordering     (cppmastery.layout/1)
 *   GET  /api/analysis/rules     rule catalogue with references
 *
 * Analysis never executes code, so it is available to anonymous users with a rate limit.
 */
const router = Router();

const code = z
  .string()
  .min(1, 'code must not be empty')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= MAX_SOURCE_BYTES, {
    message: `code must be at most ${MAX_SOURCE_BYTES} bytes`,
  });

const ruleId = z.string().regex(/^[a-z]+\/[a-z0-9+-]+$/, 'not a rule id');

const analyzeBody = z.object({
  code,
  options: z
    .object({
      maxCyclomatic: z.number().int().min(1).max(1000).optional(),
      maxNesting: z.number().int().min(1).max(100).optional(),
      maxFunctionLines: z.number().int().min(1).max(100_000).optional(),
      disable: z.array(ruleId).max(64).optional(),
    })
    .strict()
    .optional(),
});

const metricsBody = z.object({ code });

const layoutBody = z.object({
  code,
  abi: z.enum(['lp64', 'llp64', 'ilp32']).default('lp64'),
  pack: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8), z.literal(16)]).optional(),
});

router.use(createIPRateLimit({ windowMs: 60_000, maxRequests: 60 }));
router.use(optionalAuth);

router.post(
  '/analyze',
  handle(async (req, res) => {
    const { code: source, options } = parse(analyzeBody, req.body);
    const report = await analysisService.analyze(source, stripUndefined(options ?? {}));
    res.json({ success: true, data: report });
  })
);

router.post(
  '/metrics',
  handle(async (req, res) => {
    const { code: source } = parse(metricsBody, req.body);
    res.json({ success: true, data: await analysisService.metrics(source) });
  })
);

router.post(
  '/layout',
  handle(async (req, res) => {
    const { code: source, abi, pack } = parse(layoutBody, req.body);
    res.json({ success: true, data: await analysisService.layout(source, abi, pack) });
  })
);

router.get(
  '/rules',
  handle(async (_req, res) => {
    res.json({ success: true, data: await analysisService.rules() });
  })
);

export default router;
