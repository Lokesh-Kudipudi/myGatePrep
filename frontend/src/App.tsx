import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import TopBar from './components/TopBar';
import Today from './views/Today';
import CalendarView from './views/Calendar';
import Progress from './views/Progress';
import TestDates from './views/TestDates';

const navItems = [
  { to: '/today', label: 'Td' },
  { to: '/calendar', label: 'Cal' },
  { to: '/progress', label: 'Prg' },
  { to: '/tests', label: 'Tst' },
];

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <nav className="sidebar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
            title={item.to.slice(1)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="view">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/tests" element={<TestDates />} />
        </Routes>
      </main>
    </div>
  );
}
