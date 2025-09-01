// File: frontend/src/services/analytics.ts
// Extension: .ts (TypeScript Service)

import { apiService } from './api';
import { storageService } from './storage';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: Date;
  page?: string;
  referrer?: string;
  userAgent?: string;
}

export interface PageViewEvent {
  page: string;
  title?: string;
  referrer?: string;
  duration?: number;
  timestamp?: Date;
}

export interface UserAction {
  action: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

export interface LearningEvent {
  type: 'lesson_start' | 'lesson_complete' | 'quiz_start' | 'quiz_complete' | 'course_enroll' | 'course_complete';
  courseId?: string;
  lessonId?: string;
  quizId?: string;
  score?: number;
  timeSpent?: number;
  attempts?: number;
}

export interface CodeEvent {
  type: 'code_execute' | 'code_save' | 'code_share' | 'code_fork' | 'code_analyze';
  language: string;
  linesOfCode?: number;
  executionTime?: number;
  success?: boolean;
  errorType?: string;
}

export interface CommunityEvent {
  type: 'post_create' | 'post_like' | 'comment_create' | 'user_follow' | 'forum_visit';
  postId?: string;
  commentId?: string;
  targetUserId?: string;
  category?: string;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;
  private eventQueue: AnalyticsEvent[] = [];
  private pageStartTime: number = Date.now();
  private performanceObserver?: PerformanceObserver;
  private readonly maxQueueSize = 50;
  private readonly flushInterval = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceTracking();
    this.startPeriodicFlush();
    this.setupBeforeUnload();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.trackPerformance();
      }, 0);
    });

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry);
          }
        });

        this.performanceObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        console.warn('Performance observer not fully supported:', error);
      }
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.track('performance_metric', {
            metric: 'first_contentful_paint',
            value: entry.startTime,
            page: window.location.pathname
          });
        }
        break;

      case 'largest-contentful-paint':
        this.track('performance_metric', {
          metric: 'largest_contentful_paint',
          value: entry.startTime,
          page: window.location.pathname
        });
        break;

      case 'first-input':
        this.track('performance_metric', {
          metric: 'first_input_delay',
          value: (entry as any).processingStart - entry.startTime,
          page: window.location.pathname
        });
        break;

      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.track('performance_metric', {
            metric: 'cumulative_layout_shift',
            value: (entry as any).value,
            page: window.location.pathname
          });
        }
        break;
    }
  }

  private trackPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart
      };

      this.track('page_performance', {
        ...metrics,
        page: window.location.pathname,
        connectionType: (navigator as any).connection?.effectiveType,
        deviceMemory: (navigator as any).deviceMemory
      });
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.trackPageView(window.location.pathname, document.title, Date.now() - this.pageStartTime);
      this.flush(true); // Force immediate flush
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });
  }

  // Public methods
  initialize(userId?: string, options: { enabled?: boolean } = {}): void {
    this.userId = userId;
    this.isEnabled = options.enabled !== false;

    // Load user preferences
    const userPrefs = storageService.getUserPreference('analytics_preferences', {
      enabled: true,
      trackPerformance: true,
      trackErrors: true
    });

    this.isEnabled = this.isEnabled && userPrefs.enabled;

    this.track('analytics_initialized', {
      userId,
      sessionId: this.sessionId,
      preferences: userPrefs
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.track('user_identified', { userId });
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      },
      userId: this.userId,
      timestamp: new Date()
    };

    this.eventQueue.push(analyticsEvent);

    // Auto-flush if queue is getting large
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  trackPageView(page: string, title?: string, duration?: number): void {
    this.track('page_view', {
      page,
      title: title || document.title,
      duration,
      timestamp: new Date()
    });

    this.pageStartTime = Date.now();
  }

  trackUserAction(action: UserAction): void {
    this.track('user_action', {
      action: action.action,
      category: action.category,
      label: action.label,
      value: action.value,
      ...action.properties
    });
  }

  trackLearningEvent(event: LearningEvent): void {
    this.track('learning_event', {
      type: event.type,
      courseId: event.courseId,
      lessonId: event.lessonId,
      quizId: event.quizId,
      score: event.score,
      timeSpent: event.timeSpent,
      attempts: event.attempts
    });
  }

  trackCodeEvent(event: CodeEvent): void {
    this.track('code_event', {
      type: event.type,
      language: event.language,
      linesOfCode: event.linesOfCode,
      executionTime: event.executionTime,
      success: event.success,
      errorType: event.errorType
    });
  }

  trackCommunityEvent(event: CommunityEvent): void {
    this.track('community_event', {
      type: event.type,
      postId: event.postId,
      commentId: event.commentId,
      targetUserId: event.targetUserId,
      category: event.category
    });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  trackConversion(event: string, value?: number, currency?: string): void {
    this.track('conversion', {
      event,
      value,
      currency: currency || 'USD'
    });
  }

  trackSearch(query: string, category?: string, resultsCount?: number): void {
    this.track('search', {
      query,
      category,
      resultsCount
    });
  }

  trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    this.track('feature_usage', {
      feature,
      ...properties
    });
  }

  // Time tracking
  startTimer(timerName: string): void {
    storageService.setAppState(`timer_${timerName}`, Date.now());
  }

  endTimer(timerName: string, properties?: Record<string, any>): number {
    const startTime = storageService.getAppState(`timer_${timerName}`, Date.now());
    const duration = Date.now() - startTime;
    
    this.track('timer', {
      name: timerName,
      duration,
      ...properties
    });

    storageService.removeAppState(`timer_${timerName}`);
    return duration;
  }

  // Cohort and A/B testing
  trackExperiment(experimentName: string, variant: string, properties?: Record<string, any>): void {
    this.track('experiment', {
      experiment: experimentName,
      variant,
      ...properties
    });
  }

  trackCohort(cohortName: string, properties?: Record<string, any>): void {
    this.track('cohort', {
      cohort: cohortName,
      ...properties
    });
  }

  // Custom events for specific features
  trackLessonProgress(courseId: string, lessonId: string, progressPercent: number): void {
    this.trackLearningEvent({
      type: 'lesson_start',
      courseId,
      lessonId
    });

    this.track('lesson_progress', {
      courseId,
      lessonId,
      progressPercent
    });
  }

  trackQuizAttempt(courseId: string, lessonId: string, quizId: string, score: number, timeSpent: number): void {
    this.trackLearningEvent({
      type: 'quiz_complete',
      courseId,
      lessonId,
      quizId,
      score,
      timeSpent
    });
  }

  trackCodeExecution(language: string, success: boolean, executionTime: number, linesOfCode: number): void {
    this.trackCodeEvent({
      type: 'code_execute',
      language,
      success,
      executionTime,
      linesOfCode
    });
  }

  trackSocialAction(action: 'like' | 'share' | 'comment' | 'follow', targetType: 'post' | 'user' | 'snippet', targetId: string): void {
    this.trackCommunityEvent({
      type: action === 'follow' ? 'user_follow' : action === 'like' ? 'post_like' : 'comment_create',
      ...(targetType === 'post' && { postId: targetId }),
      ...(targetType === 'user' && { targetUserId: targetId })
    });
  }

  // Batch operations
  async flush(immediate: boolean = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await apiService.post('/analytics/events', { events }, {
        timeout: immediate ? 5000 : 15000
      });
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      
      // Re-add events to queue if not immediate flush
      if (!immediate && this.eventQueue.length < this.maxQueueSize) {
        this.eventQueue.unshift(...events.slice(0, this.maxQueueSize - this.eventQueue.length));
      }
    }
  }

  // Configuration
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    storageService.setUserPreference('analytics_preferences', {
      ...storageService.getUserPreference('analytics_preferences', {}),
      enabled
    });
  }

  isTrackingEnabled(): boolean {
    return this.isEnabled;
  }

  // Data privacy
  clearData(): void {
    this.eventQueue = [];
    storageService.removeUserPreference('analytics_preferences');
    this.track('analytics_data_cleared');
  }

  exportData(): AnalyticsEvent[] {
    return [...this.eventQueue];
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.flush(true);
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();

// Convenience functions
export const analytics = {
  // Basic tracking
  track: (event: string, properties?: Record<string, any>) => analyticsService.track(event, properties),
  
  // Page tracking
  page: (page: string, title?: string) => analyticsService.trackPageView(page, title),
  
  // User identification
  identify: (userId: string) => analyticsService.setUserId(userId),
  
  // Specialized tracking
  action: (action: UserAction) => analyticsService.trackUserAction(action),
  learning: (event: LearningEvent) => analyticsService.trackLearningEvent(event),
  code: (event: CodeEvent) => analyticsService.trackCodeEvent(event),
  community: (event: CommunityEvent) => analyticsService.trackCommunityEvent(event),
  error: (error: Error, context?: Record<string, any>) => analyticsService.trackError(error, context),
  
  // Timing
  time: {
    start: (name: string) => analyticsService.startTimer(name),
    end: (name: string, properties?: Record<string, any>) => analyticsService.endTimer(name, properties)
  },
  
  // Configuration
  enable: () => analyticsService.setEnabled(true),
  disable: () => analyticsService.setEnabled(false),
  isEnabled: () => analyticsService.isTrackingEnabled()
};

// Auto-initialize error tracking
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    analyticsService.trackError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    analyticsService.trackError(new Error(`Unhandled promise rejection: ${event.reason}`), {
      type: 'unhandledrejection'
    });
  });
}

export default analyticsService;