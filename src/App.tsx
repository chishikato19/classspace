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
import GameHostLobby from './features/game/pages/GameHostLobby';
import GameJoinPage from './features/game/pages/GameJoinPage';
import GamePlayerLobby from './features/game/pages/GamePlayerLobby';
import GamePlayerScreen from './features/game/pages/GamePlayerScreen';
import GameResults from './features/game/pages/GameResults';
import LocalBattleArena from './features/game/pages/LocalBattleArena';
import PlickersScanner from './features/game/pages/PlickersScanner';
import QuizEditor from './features/quiz/pages/QuizEditor';
import TeacherDashboard from './features/teacher/pages/TeacherDashboard';
import RandomSelector from './features/random-selector/pages/RandomSelector';
import VideoPlayer from './features/video-player/pages/VideoPlayer';

import { StudentDashboardWrapper } from './features/shop/pages/StudentDashboard';

import ShopManager from './features/shop/pages/ShopManager';
import Settings from './features/teacher/pages/Settings';
import { timeService } from './services/timeService';

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
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<GameJoinPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Student Shop Route */}
        <Route path="/student/shop/:studentId" element={<StudentDashboardWrapper />} />

        {/* Game Routes (No Layout) */}
        <Route path="/game/lobby/:sessionId" element={<GamePlayerLobby />} />
        <Route path="/game/play/:sessionId" element={<GamePlayerScreen />} />
        <Route path="/game/host/:quizId" element={<GameHostLobby />} />
        <Route path="/game/dashboard/:sessionId" element={<GameHostDashboard />} />
        <Route path="/game/scanner/:sessionId" element={<PlickersScanner />} />
        <Route path="/game/results/:sessionId" element={<GameResults />} />
        <Route path="/game/local-battle/:quizId" element={<LocalBattleArena />} />

        {/* Protected Routes (Wrapped in Layout) */}
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/shop" element={<ShopManager />} />
          <Route path="/teacher/random-selector" element={<RandomSelector />} />
          <Route path="/teacher/video-player" element={<VideoPlayer />} />
          <Route path="/teacher/settings" element={<Settings />} />
          <Route path="/teacher/quiz/new" element={<QuizEditor />} />
          <Route path="/teacher/quiz/edit/:quizId" element={<QuizEditor />} />
          {/* Add more routes here later */}
        </Route>
      </Routes>
    </HashRouter>
  );
}
