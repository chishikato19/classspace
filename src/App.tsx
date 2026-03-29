/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SetupRequired from './components/SetupRequired';
import { isFirebaseConfigured } from './config/firebase';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import LoginPage from './features/auth/pages/LoginPage';
import GameHostDashboard from './features/game/pages/GameHostDashboard';
import OralQuizDashboard from './features/game/pages/OralQuizDashboard';
import GameHostLobby from './features/game/pages/GameHostLobby';
import GameJoinPage from './features/game/pages/GameJoinPage';
import GamePlayerLobby from './features/game/pages/GamePlayerLobby';
import GamePlayerScreen from './features/game/pages/GamePlayerScreen';
import GameResults from './features/game/pages/GameResults';
import LocalBattleArena from './features/game/pages/LocalBattleArena';
import OralQuizSetup from './features/game/pages/OralQuizSetup';
import PlickersScanner from './features/game/pages/PlickersScanner';
import QuizEditor from './features/quiz/pages/QuizEditor';
import TeacherDashboard from './features/teacher/pages/TeacherDashboard';
import RandomSelector from './features/random-selector/pages/RandomSelector';
import VideoPlayer from './features/video-player/pages/VideoPlayer';
import ShowcaseDashboard from './features/showcase/pages/ShowcaseDashboard';

import ClassSessionDashboard from './features/teacher/pages/ClassSessionDashboard';

import { StudentDashboardWrapper } from './features/shop/pages/StudentDashboard';

import ShopManager from './features/shop/pages/ShopManager';
import Settings from './features/teacher/pages/Settings';
import { timeService } from './services/timeService';

import ProtectedRoute from './components/auth/ProtectedRoute';
import { NoiseMonitorProvider } from './contexts/NoiseMonitorContext';
import { NoiseMonitorWidget } from './components/NoiseMonitorWidget';
import { TimerProvider } from './contexts/TimerContext';
import { TimerWidget } from './components/TimerWidget';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    if (isFirebaseConfigured) {
      timeService.synchronize();
    }
  }, []);

  if (!isFirebaseConfigured) {
    return <SetupRequired />;
  }

  return (
    <ErrorBoundary>
      <NoiseMonitorProvider>
        <TimerProvider>
          <HashRouter>
            <NoiseMonitorWidget />
            <TimerWidget />
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<GameJoinPage />} />
            <Route path="/join" element={<GameJoinPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            {/* Student Shop Route */}
            <Route path="/student/shop/:studentId" element={<StudentDashboardWrapper />} />

            {/* Game Routes (No Layout) */}
            <Route path="/game/lobby/:sessionId" element={<GamePlayerLobby />} />
            <Route path="/game/play/:sessionId" element={<GamePlayerScreen />} />
            
            {/* Protected Game Routes */}
            <Route path="/game/host/:quizId" element={<ProtectedRoute><GameHostLobby /></ProtectedRoute>} />
            <Route path="/game/dashboard/:sessionId" element={<ProtectedRoute><GameHostDashboard /></ProtectedRoute>} />
            <Route path="/game/oral-quiz-setup/:quizId" element={<ProtectedRoute><OralQuizSetup /></ProtectedRoute>} />
            <Route path="/game/oral-quiz/:sessionId" element={<ProtectedRoute><OralQuizDashboard /></ProtectedRoute>} />
            <Route path="/game/scanner/:sessionId" element={<ProtectedRoute><PlickersScanner /></ProtectedRoute>} />
            <Route path="/game/results/:sessionId" element={<ProtectedRoute><GameResults /></ProtectedRoute>} />
            <Route path="/game/local-battle/:quizId" element={<ProtectedRoute><LocalBattleArena /></ProtectedRoute>} />
            {/* Protected Routes (Wrapped in Layout) */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/class-session/:sessionId" element={<ClassSessionDashboard />} />
              <Route path="/teacher/shop" element={<ShopManager />} />
              <Route path="/teacher/random-selector" element={<RandomSelector />} />
              <Route path="/teacher/video-player" element={<VideoPlayer />} />
              <Route path="/teacher/showcase" element={<ShowcaseDashboard />} />
              <Route path="/teacher/settings" element={<Settings />} />
              <Route path="/teacher/quiz/new" element={<QuizEditor />} />
              <Route path="/teacher/quiz/edit/:quizId" element={<QuizEditor />} />
              {/* Add more routes here later */}
            </Route>
          </Routes>
        </HashRouter>
      </TimerProvider>
    </NoiseMonitorProvider>
  </ErrorBoundary>
);
}
