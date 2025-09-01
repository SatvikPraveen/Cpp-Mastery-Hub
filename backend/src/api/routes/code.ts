// File: backend/src/api/routes/code.ts
// Extension: .ts

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

import { auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CodeExecutionService } from '../../services/compiler/execution-service';
import { StaticAnalysisService } from '../../services/analyzer/analysis-service';
import { CodeSnippetService } from '../../services/code-snippet-service';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';

const router = Router();
const codeExecutionService = new CodeExecutionService();
const staticAnalysisService = new StaticAnalysisService();
const codeSnippetService = new CodeSnippetService();

// Rate limiting for code execution to prevent abuse
const executionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many code execution requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for analysis requests
const analysisRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many analysis requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/code/execute:
 *   post:
 *     summary: Execute C++ code
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CodeExecution'
 *     responses:
 *       200:
 *         description: Code executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExecutionResult'
 */
router.post('/execute', [
  executionRateLimit,
  auth,
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('language')
    .isIn(['cpp', 'c', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'])
    .withMessage('Language must be a supported C/C++ variant'),
  body('input')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Input must be less than 10,000 characters'),
  body('compilerFlags')
    .optional()
    .isArray()
    .withMessage('Compiler flags must be an array'),
  body('compilerFlags.*')
    .isString()
    .matches(/^-[a-zA-Z0-9=_-]+$/)
    .withMessage('Invalid compiler flag format'),
  body('timeout')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Timeout must be between 1 and 30 seconds'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { code, language, input, compilerFlags, timeout } = req.body;

    logger.info('Code execution request', { 
      userId, 
      language, 
      codeLength: code.length,
      hasInput: !!input,
      flags: compilerFlags
    });

    const executionResult = await codeExecutionService.executeCode({
      code,
      language,
      input: input || '',
      compilerFlags: compilerFlags || [],
      timeout: timeout || 10,
      userId
    });

    // Track execution for analytics
    await codeExecutionService.trackExecution(userId, {
      language,
      success: executionResult.success,
      executionTime: executionResult.executionTime,
      memoryUsed: executionResult.memoryUsed
    });

    res.json({
      success: true,
      data: executionResult
    });
  } catch (error) {
    logger.error('Code execution failed', { error, userId: req.user?.id });
    next(error);
  }
});

/**
 * @swagger
 * /api/code/analyze:
 *   post:
 *     summary: Analyze C++ code for issues and improvements
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CodeAnalysis'
 *     responses:
 *       200:
 *         description: Code analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisResult'
 */
router.post('/analyze', [
  analysisRateLimit,
  auth,
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('language')
    .isIn(['cpp', 'c', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'])
    .withMessage('Language must be a supported C/C++ variant'),
  body('analysisType')
    .optional()
    .isArray()
    .withMessage('Analysis type must be an array'),
  body('analysisType.*')
    .isIn(['syntax', 'semantic', 'performance', 'security', 'style', 'complexity'])
    .withMessage('Invalid analysis type'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { code, language, analysisType } = req.body;

    logger.info('Code analysis request', { 
      userId, 
      language, 
      codeLength: code.length,
      analysisTypes: analysisType
    });

    const analysisResult = await staticAnalysisService.analyzeCode({
      code,
      language,
      analysisTypes: analysisType || ['syntax', 'semantic', 'style'],
      userId
    });

    // Track analysis for analytics
    await staticAnalysisService.trackAnalysis(userId, {
      language,
      analysisTypes: analysisType,
      issuesFound: analysisResult.issues.length,
      suggestions: analysisResult.suggestions.length
    });

    res.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    logger.error('Code analysis failed', { error, userId: req.user?.id });
    next(error);
  }
});

/**
 * @swagger
 * /api/code/visualize:
 *   post:
 *     summary: Generate code visualization data
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               visualizationType:
 *                 type: string
 *                 enum: [ast, memory, execution_flow, call_graph]
 *     responses:
 *       200:
 *         description: Visualization data generated successfully
 */
router.post('/visualize', [
  auth,
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('visualizationType')
    .isIn(['ast', 'memory', 'execution_flow', 'call_graph'])
    .withMessage('Invalid visualization type'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { code, visualizationType } = req.body;

    logger.info('Code visualization request', { 
      userId, 
      visualizationType,
      codeLength: code.length
    });

    const visualizationData = await staticAnalysisService.generateVisualization({
      code,
      type: visualizationType,
      userId
    });

    res.json({
      success: true,
      data: visualizationData
    });
  } catch (error) {
    logger.error('Code visualization failed', { error, userId: req.user?.id });
    next(error);
  }
});

/**
 * @swagger
 * /api/code/snippets:
 *   get:
 *     summary: Get user's code snippets
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for snippets
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by programming language
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Code snippets retrieved successfully
 */
router.get('/snippets', [
  auth,
  query('search').optional().isString().isLength({ max: 100 }),
  query('language').optional().isString().isLength({ max: 20 }),
  query('tags').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { search, language, tags, limit = 20, offset = 0 } = req.query;

    const snippets = await codeSnippetService.getUserSnippets(userId, {
      search: search as string,
      language: language as string,
      tags: tags ? (tags as string).split(',') : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: snippets
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/snippets:
 *   post:
 *     summary: Create a new code snippet
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCodeSnippet'
 *     responses:
 *       201:
 *         description: Code snippet created successfully
 */
router.post('/snippets', [
  auth,
  body('title')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('code')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('language')
    .isIn(['cpp', 'c', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23'])
    .withMessage('Language must be a supported C/C++ variant'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { title, description, code, language, tags, isPublic } = req.body;

    const snippet = await codeSnippetService.createSnippet(userId, {
      title,
      description,
      code,
      language,
      tags: tags || [],
      isPublic: isPublic || false
    });

    logger.info('Code snippet created', { userId, snippetId: snippet.id, title });

    res.status(201).json({
      success: true,
      data: snippet,
      message: 'Code snippet created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   get:
 *     summary: Get a specific code snippet
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snippet ID
 *     responses:
 *       200:
 *         description: Code snippet retrieved successfully
 */
router.get('/snippets/:id', [
  auth,
  param('id').isUUID().withMessage('Invalid snippet ID'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const snippetId = req.params.id;

    const snippet = await codeSnippetService.getSnippet(snippetId, userId);

    res.json({
      success: true,
      data: snippet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   put:
 *     summary: Update a code snippet
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snippet ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCodeSnippet'
 *     responses:
 *       200:
 *         description: Code snippet updated successfully
 */
router.put('/snippets/:id', [
  auth,
  param('id').isUUID().withMessage('Invalid snippet ID'),
  body('title')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('code')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50,000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const snippetId = req.params.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const updatedSnippet = await codeSnippetService.updateSnippet(
      snippetId,
      userId,
      req.body
    );

    logger.info('Code snippet updated', { userId, snippetId, updates: Object.keys(req.body) });

    res.json({
      success: true,
      data: updatedSnippet,
      message: 'Code snippet updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   delete:
 *     summary: Delete a code snippet
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snippet ID
 *     responses:
 *       200:
 *         description: Code snippet deleted successfully
 */
router.delete('/snippets/:id', [
  auth,
  param('id').isUUID().withMessage('Invalid snippet ID'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const snippetId = req.params.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    await codeSnippetService.deleteSnippet(snippetId, userId);

    logger.info('Code snippet deleted', { userId, snippetId });

    res.json({
      success: true,
      message: 'Code snippet deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/templates:
 *   get:
 *     summary: Get code templates
 *     tags: [Code]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Template category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Template difficulty level
 *     responses:
 *       200:
 *         description: Code templates retrieved successfully
 */
router.get('/templates', [
  query('category').optional().isString().isLength({ max: 50 }),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, difficulty } = req.query;

    const templates = await codeSnippetService.getTemplates({
      category: category as string,
      difficulty: difficulty as string
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/code/share/{id}:
 *   post:
 *     summary: Generate shareable link for code snippet
 *     tags: [Code]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Snippet ID
 *     responses:
 *       200:
 *         description: Shareable link generated successfully
 */
router.post('/share/:id', [
  auth,
  param('id').isUUID().withMessage('Invalid snippet ID'),
  validateRequest
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const snippetId = req.params.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const shareLink = await codeSnippetService.generateShareLink(snippetId, userId);

    res.json({
      success: true,
      data: { shareLink },
      message: 'Shareable link generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export { router as codeRouter };