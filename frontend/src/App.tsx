import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Today from './views/Today';
import CalendarView from './views/Calendar';
import Progress from './views/Progress';
import TestDates from './views/TestDates';

export default function App() {
  const location = useLocation();
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
          </Routes>
        </div>
      </main>
    </div>
  );
}
