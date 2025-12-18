import { Routes, Route } from 'react-router-dom';
import { Toaster } from './hooks/useToast';
import { EventList } from './pages/marketplace/EventList';
import { EventDetail } from './pages/marketplace/EventDetail';
import { Checkout } from './pages/checkout/Checkout';
import { CheckoutSuccess } from './pages/checkout/CheckoutSuccess';
import { OrganizerLogin } from './pages/organizer/Login';
import { EventPdfTemplate } from './pages/organizer/EventPdfTemplate';
import { DirectorLogin } from './pages/director/Login';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { OrganizerDashboard } from './pages/organizer/Dashboard';
import { OrganizerEventsPage } from './pages/organizer/Events';
import { OrganizerSalesPage } from './pages/organizer/Sales';
import { OrganizerTemplatesPage } from './pages/organizer/Templates';
import { CreateEventPage } from './pages/organizer/CreateEvent';
import { EditEventPage } from './pages/organizer/EditEvent';
import { DirectorDashboardPage } from './pages/director/Dashboard';
import { DirectorOrganizersPage } from './pages/director/Organizers';
import { DirectorFeePlansPage } from './pages/director/FeePlans';
import { DirectorOrdersPage } from './pages/director/Orders';
import { DirectorOrderDetailPage } from './pages/director/OrderDetail';
import { RPDashboardPage } from './pages/organizer/RPDashboard';
import { RPTicketGeneratorPage } from './pages/public/RPTicketGenerator';
import { RPLogin } from './pages/rp/RPLogin';
import { RPDashboard } from './pages/rp/RPDashboard';
import { RPProtectedRoute } from './components/guards/RPProtectedRoute';

function App() {
    return (
        <>
            <Toaster />
            <div className="min-h-screen bg-gray-50">
                <Routes>
                    {/* Public Marketplace */}
                    <Route path="/" element={<EventList />} />
                    <Route path="/events/:eventId" element={<EventDetail />} />
                    <Route path="/events/unlisted/:token" element={<EventDetail />} />
                    <Route path="/checkout/:eventId" element={<Checkout />} />
                    <Route path="/checkout/success" element={<CheckoutSuccess />} />

                    {/* RP V1 - DEPRECATED (kept for backward compatibility) */}
                    <Route path="/rp/:rpCode" element={<RPTicketGeneratorPage />} />

                    {/* RP V2 - New System */}
                    <Route path="/rp/login" element={<RPLogin />} />
                    <Route
                        path="/rp/dashboard"
                        element={
                            <RPProtectedRoute>
                                <RPDashboard />
                            </RPProtectedRoute>
                        }
                    />

                    {/* Organizer Panel */}
                    <Route path="/organizer/login" element={<OrganizerLogin />} />
                    <Route
                        path="/organizer/dashboard"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <OrganizerDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <OrganizerEventsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events/create"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <CreateEventPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events/:eventId/edit"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <EditEventPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events/:eventId/sales"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <OrganizerSalesPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/templates"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <OrganizerTemplatesPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events/:eventId/pdf-template"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <EventPdfTemplate />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organizer/events/:eventId/rp-dashboard"
                        element={
                            <ProtectedRoute roles={['ORGANIZER']} redirectTo="/organizer/login">
                                <RPDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Director Panel */}
                    <Route path="/director/login" element={<DirectorLogin />} />
                    <Route
                        path="/director/dashboard"
                        element={
                            <ProtectedRoute roles={['DIRECTOR']} redirectTo="/director/login">
                                <DirectorDashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/director/organizers"
                        element={
                            <ProtectedRoute roles={['DIRECTOR']} redirectTo="/director/login">
                                <DirectorOrganizersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/director/fee-plans"
                        element={
                            <ProtectedRoute roles={['DIRECTOR']} redirectTo="/director/login">
                                <DirectorFeePlansPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/director/orders"
                        element={
                            <ProtectedRoute roles={['DIRECTOR']} redirectTo="/director/login">
                                <DirectorOrdersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/director/orders/:orderId"
                        element={
                            <ProtectedRoute roles={['DIRECTOR']} redirectTo="/director/login">
                                <DirectorOrderDetailPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
        </>
    );
}

export default App;
