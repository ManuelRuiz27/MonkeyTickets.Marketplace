import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to all requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    token: string;
}

export interface Event {
    id: string;
    title: string;
    startDate: string;
    venue?: string;
    address?: string;
    city?: string;
}

export interface TicketValidationResult {
    id: string;
    qrCode: string;
    status: 'VALID' | 'USED' | 'CANCELLED';
    usedAt?: string;
    event: Event;
    buyer: {
        name: string;
        email: string;
    };
    template: {
        name: string;
    };
    orderStatus: string;
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

export const apiService = {
    // Auth
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
    },

    // Events
    async getOrganizerEvents(): Promise<Event[]> {
        const response = await api.get<Event[]>('/organizer/events');
        return response.data;
    },

    // Tickets
    async validateTicket(qrCode: string): Promise<TicketValidationResult> {
        const response = await api.get<TicketValidationResult>(`/tickets/validate/${qrCode}`);
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
