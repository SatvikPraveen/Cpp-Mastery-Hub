// File: backend/src/api/routes/analysis.ts
// Extension: .ts
// Location: backend/src/api/routes/analysis.ts

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ValidationMiddleware } from '../middleware/validation';
import { codeExecutionRateLimit } from '../middleware/ratelimit';
import { AnalysisService } from '../../services/analyzer/analysis-service';
import { logger } from '../../utils/logger';
import Joi from 'joi';

const router = Router();
const analysisService = new AnalysisService();

// Apply authentication and rate limiting
router.use(authenticateToken);
router.use(codeExecutionRateLimit);

// Schema for code analysis requests
const analyzeCodeSchema = Joi.object({
  code: Joi.string()
    .min(1)
    .max(50000)
    .required()
    .messages({
      'string.max': 'Code must not exceed 50,000 characters',
      'any.required': 'Code is required'
    }),
  language: Joi.string()
    .valid('cpp', 'c++', 'cpp11', 'cpp14', 'cpp17', 'cpp20', 'cpp23')
    .default('cpp'),
  analysisTypes: Joi.array()
    .items(Joi.string().valid('syntax', 'static', 'security', 'performance', 'style', 'complexity'))
    .default(['syntax', 'static']),
  options: Joi.object({
    includeWarnings: Joi.boolean().default(true),
    includeHints: Joi.boolean().default(true),
    strictMode: Joi.boolean().default(false),
    standard: Joi.string().valid('c++11', 'c++14', 'c++17', 'c++20', 'c++23').default('c++20')
  }).default({})
});

// Analyze C++ code
router.post('/analyze',
  ValidationMiddleware.validate(analyzeCodeSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, analysisTypes, options } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Code analysis requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        language,
        analysisTypes
      });

      // Perform code analysis
      const analysisResult = await analysisService.analyzeCode({
        code,
        language,
        analysisTypes,
        options,
        userId
      });

      res.json({
        success: true,
        analysis: analysisResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Code analysis failed:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: 'Analysis failed',
          message: error.message,
          code: 'ANALYSIS_ERROR'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  }
);

// Get AST (Abstract Syntax Tree) for code
const astSchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  includeComments: Joi.boolean().default(false),
  includeLocations: Joi.boolean().default(true)
});

router.post('/ast',
  ValidationMiddleware.validate(astSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, includeComments, includeLocations } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`AST generation requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        language
      });

      const ast = await analysisService.generateAST({
        code,
        language,
        includeComments,
        includeLocations
      });

      res.json({
        success: true,
        ast,
        metadata: {
          nodeCount: ast.nodeCount || 0,
          depth: ast.maxDepth || 0,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('AST generation failed:', error);
      res.status(400).json({
        success: false,
        error: 'AST generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Memory visualization
const memoryVisualizationSchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  visualizationType: Joi.string()
    .valid('stack', 'heap', 'memory_layout', 'data_structures', 'all')
    .default('all'),
  executionPoint: Joi.number().integer().min(0).optional()
});

router.post('/memory-visualization',
  ValidationMiddleware.validate(memoryVisualizationSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, visualizationType, executionPoint } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Memory visualization requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        visualizationType
      });

      const visualization = await analysisService.generateMemoryVisualization({
        code,
        language,
        visualizationType,
        executionPoint
      });

      res.json({
        success: true,
        visualization,
        metadata: {
          generatedAt: new Date().toISOString(),
          type: visualizationType
        }
      });

    } catch (error) {
      logger.error('Memory visualization failed:', error);
      res.status(400).json({
        success: false,
        error: 'Memory visualization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Code complexity analysis
const complexitySchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  metrics: Joi.array()
    .items(Joi.string().valid('cyclomatic', 'cognitive', 'halstead', 'maintainability'))
    .default(['cyclomatic', 'cognitive'])
});

router.post('/complexity',
  ValidationMiddleware.validate(complexitySchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, metrics } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Complexity analysis requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        metrics
      });

      const complexity = await analysisService.analyzeComplexity({
        code,
        language,
        metrics
      });

      res.json({
        success: true,
        complexity,
        recommendations: analysisService.getComplexityRecommendations(complexity),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Complexity analysis failed:', error);
      res.status(400).json({
        success: false,
        error: 'Complexity analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Security analysis
const securitySchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  checks: Joi.array()
    .items(Joi.string().valid('buffer_overflow', 'memory_leaks', 'null_pointer', 'unsafe_functions', 'all'))
    .default(['all'])
});

router.post('/security',
  ValidationMiddleware.validate(securitySchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, checks } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Security analysis requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        checks
      });

      const securityAnalysis = await analysisService.analyzeCodeSecurity({
        code,
        language,
        checks
      });

      res.json({
        success: true,
        security: securityAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Security analysis failed:', error);
      res.status(400).json({
        success: false,
        error: 'Security analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Performance analysis
const performanceSchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  optimizationLevel: Joi.string().valid('O0', 'O1', 'O2', 'O3', 'Os').default('O2')
});

router.post('/performance',
  ValidationMiddleware.validate(performanceSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, optimizationLevel } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Performance analysis requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        optimizationLevel
      });

      const performanceAnalysis = await analysisService.analyzePerformance({
        code,
        language,
        optimizationLevel
      });

      res.json({
        success: true,
        performance: performanceAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Performance analysis failed:', error);
      res.status(400).json({
        success: false,
        error: 'Performance analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get analysis history for user
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, analysisType } = req.query;

    const history = await analysisService.getAnalysisHistory({
      userId,
      page: Number(page),
      limit: Number(limit),
      analysisType: analysisType as string
    });

    res.json({
      success: true,
      history,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: history.total,
        pages: Math.ceil(history.total / Number(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to fetch analysis history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis history'
    });
  }
});

// Code suggestions and recommendations
const suggestionsSchema = Joi.object({
  code: Joi.string().min(1).max(50000).required(),
  language: Joi.string().valid('cpp', 'c++', 'cpp17', 'cpp20').default('cpp'),
  context: Joi.string().valid('beginner', 'intermediate', 'advanced').default('intermediate')
});

router.post('/suggestions',
  ValidationMiddleware.validate(suggestionsSchema),
  async (req: Request, res: Response) => {
    try {
      const { code, language, context } = req.body;
      const userId = (req as any).user?.id;

      logger.info(`Code suggestions requested by user ${userId}`, {
        userId,
        codeLength: code.length,
        context
      });

      const suggestions = await analysisService.generateCodeSuggestions({
        code,
        language,
        context
      });

      res.json({
        success: true,
        suggestions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Code suggestions failed:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to generate suggestions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;