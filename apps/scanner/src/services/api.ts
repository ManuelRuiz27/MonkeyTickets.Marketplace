import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not defined');
}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to all requests if available
api.interceptors.request.use((config) => {
    const staffToken = localStorage.getItem('staffToken');
    if (staffToken) {
        config.headers['x-staff-token'] = staffToken;
    }
    return config;
});

export interface Event {
    id: string;
    title: string;
    startDate: string;
    venue?: string;
    address?: string;
    city?: string;
}

export interface TicketVerificationResult {
    ticket: {
        id: string;
        qrCode: string;
        status: string;
        usedAt?: string;
        template: { name: string };
    };
    buyer: {
        name: string;
        email: string;
    };
    event: Event;
    orderStatus: string;
    reservedUntil?: string;
}

export interface CheckInResult {
    success: boolean;
    ticket: {
        id: string;
        qrCode: string;
        status: string;
        usedAt: string;
        buyer: {
            name: string;
            email: string;
        };
        template: {
            name: string;
        };
    };
    event: {
        id: string;
        title: string;
        attendanceCount: number;
    };
}

export interface AttendanceStats {
    eventId: string;
    eventTitle: string;
    attendanceCount: number;
    totalTickets: number;
    percentageAttended: number;
}

export interface StaffSessionInfo {
    sessionId: string;
    event: Event;
    organizer: {
        id: string;
        businessName: string;
    };
    expiresAt: string;
}

export const apiService = {
    async verifyStaffToken(token: string): Promise<StaffSessionInfo> {
        const response = await api.post<StaffSessionInfo>('/staff/sessions/verify', { token });
        localStorage.setItem('staffToken', token);
        localStorage.setItem('staffSession', JSON.stringify(response.data));
        return response.data;
    },

    logout() {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffSession');
    },

    async getStaffEvents(): Promise<Event[]> {
        const response = await api.get<Event[]>('/tickets/staff/events');
        return response.data;
    },

    async validateTicket(token: string): Promise<TicketVerificationResult> {
        const response = await api.get<TicketVerificationResult>(`/tickets/verify/${token}`);
        return response.data;
    },

    async checkInTicket(qrCode: string): Promise<CheckInResult> {
        const response = await api.post<CheckInResult>(`/tickets/check-in/${qrCode}`);
        return response.data;
    },

    async getEventAttendance(eventId: string): Promise<AttendanceStats> {
        const response = await api.get<AttendanceStats>(`/tickets/event/${eventId}/attendance`);
        return response.data;
    },
};

export default apiService;
