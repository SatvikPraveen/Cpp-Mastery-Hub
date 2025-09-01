// File: frontend/tests/components/Dashboard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Dashboard } from '../../src/components/Dashboard/Dashboard';
import * as api from '../../src/services/api';

jest.mock('../../src/services/api');

const mockApi = api as jest.Mocked<typeof api>;

describe('Dashboard', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    progress: {
      coursesCompleted: 3,
      lessonsCompleted: 25,
      exercisesSolved: 150,
      totalXP: 2500
    }
  };

  beforeEach(() => {
    mockApi.getUserProfile.mockResolvedValue(mockUser);
    mockApi.getRecentActivity.mockResolvedValue([
      {
        id: '1',
        type: 'lesson_completed',
        title: 'Variables and Data Types',
        timestamp: new Date().toISOString()
      }
    ]);
    mockApi.getUserAchievements.mockResolvedValue([
      {
        id: '1',
        name: 'First Program',
        description: 'Wrote your first C++ program',
        earnedAt: new Date().toISOString()
      }
    ]);
  });

  test('should render dashboard with user data', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back, testuser!')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument(); // courses completed
    expect(screen.getByText('25')).toBeInTheDocument(); // lessons completed
    expect(screen.getByText('150')).toBeInTheDocument(); // exercises solved
    expect(screen.getByText('2,500 XP')).toBeInTheDocument(); // total XP
  });

  test('should display recent activity', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Variables and Data Types')).toBeInTheDocument();
    });

    expect(screen.getByText('lesson_completed')).toBeInTheDocument();
  });

  test('should display achievements', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('First Program')).toBeInTheDocument();
    });

    expect(screen.getByText('Wrote your first C++ program')).toBeInTheDocument();
  });

  test('should handle loading state', () => {
    mockApi.getUserProfile.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<Dashboard />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should handle API errors gracefully', async () => {
    mockApi.getUserProfile.mockRejectedValue(new Error('API Error'));
    
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading dashboard/)).toBeInTheDocument();
    });
  });

  test('should navigate to course on quick action click', async () => {
    const mockNavigate = jest.fn();
    jest.mock('next/router', () => ({
      useRouter: () => ({
        push: mockNavigate
      })
    }));

    render(<Dashboard />);

    const continueButton = await screen.findByText('Continue Learning');
    fireEvent.click(continueButton);

    expect(mockNavigate).toHaveBeenCalledWith('/learn');
  });
});