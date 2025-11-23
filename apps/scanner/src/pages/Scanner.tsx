import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';
import TicketStatus from '../components/TicketStatus';
import AttendanceStats from '../components/AttendanceStats';
import apiService, { type TicketValidationResult, type AttendanceStats as AttendanceStatsType } from '../services/api';

const Scanner: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();

    const [currentTicket, setCurrentTicket] = useState<TicketValidationResult | null>(null);
    const [attendance, setAttendance] = useState<AttendanceStatsType | null>(null);
    const [checking, setChecking] = useState(false);
    const [lastScanTime, setLastScanTime] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (eventId) {
            loadAttendance();
        }
    }, [eventId]);

    const loadAttendance = async () => {
        if (!eventId) return;
        try {
            const stats = await apiService.getEventAttendance(eventId);
            setAttendance(stats);
        } catch (err) {
            console.error('Failed to load attendance:', err);
        }
    };

    const handleScan = useCallback(async (qrCode: string) => {
        // Prevent duplicate scans
        const now = Date.now();
        if (now - lastScanTime < 2000) {
            return;
        }
        setLastScanTime(now);

        try {
            setStatusMessage('Validating...');
            const ticket = await apiService.validateTicket(qrCode);
            setCurrentTicket(ticket);
            setStatusMessage('');
        } catch (err: any) {
            setStatusMessage(err.response?.data?.message || 'Ticket not found');
            setCurrentTicket(null);

            // Clear error message after 3 seconds
            setTimeout(() => setStatusMessage(''), 3000);
        }
    }, [lastScanTime]);

    const handleCheckIn = async () => {
        if (!currentTicket) return;

        setChecking(true);
        try {
            const result = await apiService.checkInTicket(currentTicket.qrCode);

            // Update ticket status to show it's been used
            setCurrentTicket({
                ...currentTicket,
                status: 'USED',
                usedAt: result.ticket.usedAt,
            });

            // Update attendance count
            if (result.event && eventId) {
                setAttendance({
                    ...attendance!,
                    attendanceCount: result.event.attendanceCount,
                    percentageAttended: (result.event.attendanceCount / attendance!.totalTickets) * 100
                });
            }

            setStatusMessage('✓ Check-in successful!');

            // Clear after 2 seconds and reset for next scan
            setTimeout(() => {
                setCurrentTicket(null);
                setStatusMessage('');
            }, 2000);

        } catch (err: any) {
            setStatusMessage('❌ ' + (err.response?.data?.message || 'Check-in failed'));
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setChecking(false);
        }
    };

    const handleGoBack = () => {
        navigate('/events');
    };

    return (
        <div className="scanner-page">
            <div className="scanner-header">
                <button onClick={handleGoBack} className="back-button">
                    ← Back to Events
                </button>
                <h1>{attendance?.eventTitle || 'Scanner'}</h1>
            </div>

            <AttendanceStats stats={attendance} />

            <div className="scanner-section">
                <QRScanner onScan={handleScan} disabled={checking} />

                {statusMessage && (
                    <div className={`status-message ${statusMessage.includes('✓') ? 'success' : statusMessage.includes('❌') ? 'error' : 'info'}`}>
                        {statusMessage}
                    </div>
                )}

                <TicketStatus
                    ticket={currentTicket}
                    onCheckIn={handleCheckIn}
                    checking={checking}
                />
            </div>
        </div>
    );
};

export default Scanner;
