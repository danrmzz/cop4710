import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
