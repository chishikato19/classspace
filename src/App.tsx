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
import WhiteboardPage from './features/whiteboard/pages/WhiteboardPage';
import GuestDashboard from './features/guest/GuestDashboard';

import ResourceRepository from './features/resources/pages/ResourceRepository';

import { StudentDashboardWrapper } from './features/shop/pages/StudentDashboard';

import ShopManager from './features/shop/pages/ShopManager';
import Settings from './features/teacher/pages/Settings';
import { timeService } from './services/timeService';

import ProtectedRoute from './components/auth/ProtectedRoute';
import { NoiseMonitorProvider } from './contexts/NoiseMonitorContext';
import { NoiseMonitorWidget } from './components/NoiseMonitorWidget';
import { TimerProvider } from './contexts/TimerContext';
import { TimerWidget } from './components/TimerWidget';
import { CalculatorProvider } from './contexts/CalculatorContext';
import { CalculatorWidget } from './components/CalculatorWidget';

import { ErrorBoundary } from './components/ErrorBoundary';

import TeacherExamDashboard from './features/exam/pages/TeacherExamDashboard';
import ExamEditor from './features/exam/pages/ExamEditor';
import ExamJoinPage from './features/exam/pages/ExamJoinPage';
import PinRedirectPage from './features/exam/pages/PinRedirectPage';
import ExamTakingPage from './features/exam/pages/ExamTakingPage';
import ExamResultsPage from './features/exam/pages/ExamResultsPage';
import TeacherExamResultsPage from './features/exam/pages/TeacherExamResultsPage';

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
          <CalculatorProvider>
            <HashRouter>
              <NoiseMonitorWidget />
              <TimerWidget />
              <CalculatorWidget />
              <Routes>
            {/* Public Routes */}
            <Route path="/" element={<GameJoinPage />} />
            <Route path="/join" element={<GameJoinPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/guest" element={<GuestDashboard />} />
            
            {/* Student Shop Route */}
            <Route path="/student/shop/:studentId" element={<StudentDashboardWrapper />} />

            {/* Exam Public Routes */}
            <Route path="/e/:examId" element={<ExamJoinPage />} />
            <Route path="/p/:pin" element={<PinRedirectPage />} />
            <Route path="/exam/:examId/join" element={<ExamJoinPage />} />
            <Route path="/exam/:examId/take/:attemptId" element={<ExamTakingPage />} />
            <Route path="/exam/:examId/results/:attemptId" element={<ExamResultsPage />} />

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
              <Route path="/teacher/shop" element={<ShopManager />} />
              <Route path="/teacher/exams" element={<TeacherExamDashboard />} />
              <Route path="/teacher/exams/new" element={<ExamEditor />} />
              <Route path="/teacher/exams/:examId/edit" element={<ExamEditor />} />
              <Route path="/teacher/exams/:examId/results" element={<TeacherExamResultsPage />} />
              <Route path="/teacher/random-selector" element={<RandomSelector />} />
              <Route path="/teacher/video-player" element={<VideoPlayer />} />
              <Route path="/teacher/showcase" element={<ShowcaseDashboard />} />
              <Route path="/teacher/whiteboard" element={<WhiteboardPage />} />
              <Route path="/teacher/resources" element={<ResourceRepository />} />
              <Route path="/teacher/settings" element={<Settings />} />
              <Route path="/teacher/quiz/new" element={<QuizEditor />} />
              <Route path="/teacher/quiz/edit/:quizId" element={<QuizEditor />} />
              {/* Add more routes here later */}
            </Route>
          </Routes>
        </HashRouter>
        </CalculatorProvider>
      </TimerProvider>
    </NoiseMonitorProvider>
  </ErrorBoundary>
);
}
