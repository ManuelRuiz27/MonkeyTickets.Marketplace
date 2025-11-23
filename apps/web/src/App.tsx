import { Routes, Route } from 'react-router-dom';
import { EventList } from './pages/marketplace/EventList';
import { EventDetail } from './pages/marketplace/EventDetail';
import { Checkout } from './pages/checkout/Checkout';
import { OrganizerLogin } from './pages/organizer/Login';
import { OrganizerDashboard } from './pages/organizer/Dashboard';
import { EventPdfTemplate } from './pages/organizer/EventPdfTemplate';
import { DirectorDashboard } from './pages/director/Dashboard';
import { DirectorLogin } from './pages/director/Login';

function App() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Routes>
                {/* Public Marketplace */}
                <Route path="/" element={<EventList />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/checkout/:eventId" element={<Checkout />} />

                {/* Organizer Panel */}
                <Route path="/organizer/login" element={<OrganizerLogin />} />
                <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
                <Route path="/organizer/events/:eventId/pdf-template" element={<EventPdfTemplate />} />

                {/* Director Panel */}
                <Route path="/director/login" element={<DirectorLogin />} />
                <Route path="/director/dashboard" element={<DirectorDashboard />} />
            </Routes>
        </div>
    );
}

export default App;
