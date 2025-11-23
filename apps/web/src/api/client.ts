/**
 * Type-safe API client for MonoMarket Tickets
 * Uses types generated from OpenAPI contracts
 */

// NOTE: This is a basic implementation. In production, you would:
// 1. Use openapi-typescript to generate types
// 2. Use openapi-fetch or similar for runtime client
// 3. Add error handling and interceptors

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const token = localStorage.getItem('authToken');

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...(options?.headers || {}),
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        return response.json();
    }

    // Public endpoints
    public async getEvents() {
        return this.request('/public/events');
    }

    public async getEventById(id: string) {
        return this.request(`/public/events/${id}`);
    }

    // Auth endpoints
    public async login(email: string, password: string) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    public async register(data: {
        email: string;
        password: string;
        name: string;
        businessName: string;
    }) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Checkout
    public async checkout(data: {
        eventId: string;
        templateId: string;
        quantity: number;
        email: string;
        name: string;
        phone: string;
    }) {
        return this.request('/checkout', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PDF Template Upload (Organizer)
    public async uploadPdfTemplate(eventId: string, formData: FormData) {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/organizer/events/${eventId}/pdf-template`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData, // Don't set Content-Type, browser handles multipart
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        return response.json();
    }

    public async getOrganizerEvents() {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/organizer/events`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        return response.json();
    }

    // Add more methods as needed based on OpenAPI spec
}

export const apiClient = new ApiClient();
