import { Router } from 'express';
import { z } from 'zod';

import { analysisService } from '../../services/analyzer/analysis-service';
import { codeSnippetService } from '../../services/code-snippet-service';
import { MAX_SOURCE_BYTES } from '../../services/engine/engine-client';
import { ApiError } from '../../utils/errors';
import { handle, parse, requireUserId, stripUndefined } from '../http';
import { auth, hasRoleAtLeast, optionalAuth } from '../middleware/auth';
import { createIPRateLimit } from '../middleware/ratelimit';

/**
 * Code editor endpoints: snippet storage, engine-backed analysis and starter templates.
 *
 * Code *execution* is deliberately not available: it needs the sandbox described in
 * docs/research/threat-model.md, which does not exist yet. `/execute` answers 501 so clients can
 * show an accurate message instead of failing obscurely.
 */
const router = Router();

const source = z
  .string()
  .min(1)
  .refine((s) => Buffer.byteLength(s, 'utf8') <= MAX_SOURCE_BYTES, {
    message: `code must be at most ${MAX_SOURCE_BYTES} bytes`,
  });
const id = z.object({ id: z.string().min(1).max(64) });
const listQuery = z.object({
  search: z.string().max(100).optional(),
  language: z.string().max(20).optional(),
  tag: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
const snippetBody = z.object({
  title: z.string().trim().min(1).max(200),
  code: source,
  language: z.enum(['cpp', 'c']).default('cpp'),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  isPublic: z.boolean().optional(),
});

router.use(createIPRateLimit({ windowMs: 60_000, maxRequests: 120 }));

router.post('/execute', (_req, res) => {
  res.status(501).json({
    success: false,
    message:
      'Code execution is not available: it requires an isolated sandbox that is not yet ' +
      'implemented. Static analysis (POST /api/code/analyze) is available.',
    code: 'EXECUTION_NOT_IMPLEMENTED',
  });
});

router.post(
  '/analyze',
  handle(async (req, res) => {
    const { code } = parse(z.object({ code: source }), req.body);
    res.json({ success: true, data: await analysisService.analyze(code) });
  })
);

router.post(
  '/visualize',
  handle(async (req, res) => {
    const body = parse(
      z.object({ code: source, abi: z.enum(['lp64', 'llp64', 'ilp32']).default('lp64') }),
      req.body
    );
    res.json({ success: true, data: await analysisService.layout(body.code, body.abi) });
  })
);

router.get(
  '/snippets',
  handle(async (req, res) => {
    const query = parse(listQuery, req.query);
    res.json({ success: true, data: await codeSnippetService.listPublic(stripUndefined(query)) });
  })
);

router.get(
  '/snippets/mine',
  auth,
  handle(async (req, res) => {
    const query = parse(listQuery, req.query);
    res.json({
      success: true,
      data: await codeSnippetService.listMine(requireUserId(req), stripUndefined(query)),
    });
  })
);

router.get(
  '/snippets/recent',
  handle(async (_req, res) => {
    const page = await codeSnippetService.listPublic({ limit: 10, offset: 0 });
    res.json({ success: true, data: page.items });
  })
);

router.get(
  '/snippets/popular',
  handle(async (_req, res) => {
    res.json({ success: true, data: await codeSnippetService.popular(10) });
  })
);

router.get(
  '/snippets/:id',
  optionalAuth,
  handle(async (req, res) => {
    const { id: snippetId } = parse(id, req.params);
    res.json({ success: true, data: await codeSnippetService.get(snippetId, req.user?.id) });
  })
);

router.post(
  '/snippets',
  auth,
  handle(async (req, res) => {
    const body = parse(snippetBody, req.body);
    const snippet = await codeSnippetService.create(requireUserId(req), stripUndefined(body));
    res.status(201).json({ success: true, data: snippet });
  })
);

router.patch(
  '/snippets/:id',
  auth,
  handle(async (req, res) => {
    const { id: snippetId } = parse(id, req.params);
    const body = parse(snippetBody.partial(), req.body);
    if (Object.keys(body).length === 0) throw new ApiError(400, 'No fields to update');
    res.json({
      success: true,
      data: await codeSnippetService.update(snippetId, requireUserId(req), stripUndefined(body)),
    });
  })
);

router.delete(
  '/snippets/:id',
  auth,
  handle(async (req, res) => {
    const { id: snippetId } = parse(id, req.params);
    const isAdmin = req.user !== undefined && hasRoleAtLeast(req.user, 'ADMIN');
    await codeSnippetService.remove(snippetId, requireUserId(req), isAdmin);
    res.status(204).end();
  })
);

router.post(
  '/snippets/:id/like',
  auth,
  handle(async (req, res) => {
    const { id: snippetId } = parse(id, req.params);
    res.json({ success: true, data: { likes: await codeSnippetService.like(snippetId, requireUserId(req)) } });
  })
);

router.delete(
  '/snippets/:id/like',
  auth,
  handle(async (req, res) => {
    const { id: snippetId } = parse(id, req.params);
    res.json({ success: true, data: { likes: await codeSnippetService.unlike(snippetId, requireUserId(req)) } });
  })
);

/** Starter programs shown in the editor's "New from template" menu. */
const TEMPLATES = [
  {
    id: 'hello-world',
    title: 'Hello, world',
    difficulty: 'beginner',
    code: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world\\n";\n    return 0;\n}\n',
  },
  {
    id: 'raii-file',
    title: 'RAII file handle',
    difficulty: 'intermediate',
    code:
      '#include <fstream>\n#include <string>\n\nint main() {\n    std::ofstream out("notes.txt");\n' +
      '    out << "closed automatically\\n";\n    return 0;\n}  // out is flushed and closed here\n',
  },
  {
    id: 'padding',
    title: 'Struct padding',
    difficulty: 'intermediate',
    code:
      'struct Padded {\n    char tag;\n    double value;\n    char flag;\n    int count;\n};\n\n' +
      '// Try the memory-layout view: reordering saves 8 bytes on LP64.\n',
  },
  {
    id: 'move-semantics',
    title: 'Move semantics',
    difficulty: 'advanced',
    code:
      '#include <string>\n#include <utility>\n#include <vector>\n\nint main() {\n' +
      '    std::vector<std::string> names;\n    std::string name(1000, \'x\');\n' +
      '    names.push_back(std::move(name));  // no copy of the buffer\n    return 0;\n}\n',
  },
] as const;

router.get('/templates', (req, res) => {
  const { difficulty } = parse(
    z.object({ difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional() }),
    req.query
  );
  res.json({
    success: true,
    data: difficulty ? TEMPLATES.filter((t) => t.difficulty === difficulty) : TEMPLATES,
  });
});

export default router;
