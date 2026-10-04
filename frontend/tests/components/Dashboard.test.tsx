import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { Dashboard } from '../../src/components/Dashboard/Dashboard';
import { api } from '../../src/services/api';

jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'ada', email: 'ada@example.com' } }),
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/dashboard', query: {} }),
}));

jest.mock('../../src/services/api', () => ({ api: { get: jest.fn() } }));

const get = api.get as unknown as jest.Mock;

function respondWith(byUrl: Record<string, unknown>) {
  const defaults: Record<string, unknown> = { '/learning/progress': { progress: [] } };
  get.mockImplementation((url: string) =>
    Promise.resolve({ success: true, data: byUrl[url] ?? defaults[url] ?? {} })
  );
}

describe('Dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests profile, progress, recommendations and activity', async () => {
    respondWith({ '/users/me': { user: {} }, '/learning/progress': { progress: [] } });
    render(<Dashboard />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(4));
    expect(get.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/learning/progress',
      '/learning/recommendations',
      '/users/me',
      '/users/me/activity',
    ]);
  });

  it('greets the user and renders statistics and course progress', async () => {
    respondWith({
      '/users/me': { user: { statistics: { coursesInProgress: 3, codeSnippets: 12 } } },
      '/learning/progress': {
        progress: [
          {
            courseId: 'c1',
            courseTitle: 'Modern C++ Fundamentals',
            progress: 40,
            lastAccessedAt: new Date().toISOString(),
            nextLesson: { id: 'l3', title: 'Move semantics' },
          },
        ],
      },
      '/learning/recommendations': {
        recommendations: [
          { courseId: 'c2', title: 'The STL in Depth', difficulty: 'INTERMEDIATE', reason: 'next difficulty level' },
        ],
      },
    });
    render(<Dashboard />);

    expect(await screen.findByText(/ada/)).toBeInTheDocument();
    expect(screen.getByText('Courses in Progress')).toBeInTheDocument();
    expect(screen.getByText('Modern C++ Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Next: Move semantics')).toBeInTheDocument();
    expect(screen.getByText('The STL in Depth')).toBeInTheDocument();
    expect(screen.getByText('next difficulty level')).toBeInTheDocument();
  });

  it('shows a retryable error when the API fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    get.mockRejectedValue(new Error('network down'));
    render(<Dashboard />);

    expect(
      await screen.findByText('Failed to load dashboard data. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
