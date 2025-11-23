import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService, { type Event } from '../services/api';

const EventSelect: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const data = await apiService.getOrganizerEvents();
            setEvents(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                setError('Failed to load events');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEvent = (eventId: string) => {
        navigate(`/scanner/${eventId}`);
    };

    const handleLogout = () => {
        apiService.logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="event-select-page loading">
                <div className="spinner"></div>
                <p>Loading events...</p>
            </div>
        );
    }

    return (
        <div className="event-select-page">
            <div className="event-select-header">
                <h1>Select Event to Scan</h1>
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {events.length === 0 ? (
                <div className="no-events">
                    <p>No events found</p>
                    <p className="subtitle">Create an event to start scanning tickets</p>
                </div>
            ) : (
                <div className="events-grid">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="event-card"
                            onClick={() => handleSelectEvent(event.id)}
                        >
                            <h3 className="event-title">{event.title}</h3>
                            <div className="event-details">
                                <p className="event-date">
                                    {new Date(event.startDate).toLocaleDateString('es-MX', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                                {event.venue && (
                                    <p className="event-venue">📍 {event.venue}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EventSelect;
