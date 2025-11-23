import React from 'react';
import type { AttendanceStats } from '../services/api';

interface AttendanceStatsProps {
    stats: AttendanceStats | null;
    loading?: boolean;
}

const AttendanceStatsComponent: React.FC<AttendanceStatsProps> = ({ stats, loading }) => {
    if (loading) {
        return (
            <div className="attendance-stats loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="attendance-stats">
            <h3 className="stats-title">Event Attendance</h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.attendanceCount}</div>
                    <div className="stat-label">Checked In</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.totalTickets}</div>
                    <div className="stat-label">Total Tickets</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.percentageAttended.toFixed(1)}%</div>
                    <div className="stat-label">Attendance Rate</div>
                </div>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${stats.percentageAttended}%` }}
                ></div>
            </div>
        </div>
    );
};

export default AttendanceStatsComponent;
