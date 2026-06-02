import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Today from './views/Today';
import CalendarView from './views/Calendar';
import Progress from './views/Progress';
import TestDates from './views/TestDates';
import Pomodoro from './views/Pomodoro';
import { usePomodoro } from './store/usePomodoro';

export default function App() {
  const location = useLocation();
  const loadSettings = usePomodoro((s) => s.loadSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="app-shell">
      <TopBar />
      <Sidebar />
      <main className="view">
        <div key={location.pathname} className="route-fade">
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/tests" element={<TestDates />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
