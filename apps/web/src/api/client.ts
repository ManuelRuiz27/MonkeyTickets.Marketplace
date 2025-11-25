import { components as ApiComponents } from '@monomarket/contracts';

type ApiSchemas = ApiComponents['schemas'];
type ApiEvent = ApiSchemas['Event'];
type ApiOrganizer = ApiSchemas['Organizer'];
type ApiTicketTemplate = ApiSchemas['TicketTemplate'];
type ApiFeePlan = ApiSchemas['FeePlan'];
type ApiOrder = ApiSchemas['Order'];
type ApiPagination = ApiSchemas['Pagination'];
type OpenpayChargeRequest = ApiSchemas['OpenpayChargeRequest'];
type OpenpayChargeResponse = ApiSchemas['OpenpayChargeResponse'];
type MercadoPagoPreferenceRequest = ApiSchemas['MercadoPagoPreferenceRequest'];
type MercadoPagoPreferenceResponse = ApiSchemas['MercadoPagoPreferenceResponse'];

export type CheckoutSessionResponse = {
    orderId: string;
    total: number;
    currency?: string;
    expiresAt: string;
};

export type PaymentResponse = {
    paymentId: string;
    providerPaymentId: string;
    redirectUrl?: string;
    instructions?: string;
};

export type OrganizerEventInput = ApiSchemas['EventInput'] & {
    capacity?: number;
    price?: number;
    currency?: string;
    isPublic?: boolean;
    status?: string;
};

export type OrganizerTemplateInput = ApiSchemas['TicketTemplateInput'] & {
    price: number;
    currency?: string;
    quantity: number;
    eventId?: string;
};

export type FeePlanInput = ApiSchemas['FeePlanInput'];

interface AuthSnapshot {
    token?: string | null;
    user?: {
        id?: string;
        role?: string;
        organizer?: { id?: string | null } | null;
    } | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
    private buildUrl(endpoint: string, query?: Record<string, any>) {
        if (!query) {
            return `${API_BASE_URL}${endpoint}`;
        }

        const searchParams = new URLSearchParams();
        Object.entries(query)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .forEach(([key, value]) => {
                searchParams.append(key, String(value));
            });

        const queryString = searchParams.toString();
        return queryString ? `${API_BASE_URL}${endpoint}?${queryString}` : `${API_BASE_URL}${endpoint}`;
    }

    private getAuthSnapshot(): AuthSnapshot {
        const token = localStorage.getItem('authToken');
        const rawUser = localStorage.getItem('authUser');
        const user = rawUser ? JSON.parse(rawUser) : null;
        return { token, user };
    }

    private buildHeaders(options?: { organizerScope?: boolean; customHeaders?: Record<string, string> }) {
        const snapshot = this.getAuthSnapshot();
        const headers: Record<string, string> = options?.customHeaders ? { ...options.customHeaders } : {};

        if (snapshot.token) {
            headers['Authorization'] = `Bearer ${snapshot.token}`;
        }

        if (options?.organizerScope && snapshot.user?.organizer?.id) {
            headers['x-organizer-id'] = snapshot.user.organizer.id;
        }

        return headers;
    }

    private async request<T>(
        endpoint: string,
        init: RequestInit = {},
        options?: { query?: Record<string, any>; organizerScope?: boolean },
    ): Promise<T> {
        const url = this.buildUrl(endpoint, options?.query);
        const isFormData = init.body instanceof FormData;

        const headers = this.buildHeaders({
            organizerScope: options?.organizerScope,
            customHeaders: isFormData ? init.headers as Record<string, string> | undefined : {
                'Content-Type': 'application/json',
                ...(init.headers as Record<string, string> | undefined),
            },
        });

        const response = await fetch(url, {
            ...init,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const hasBody = response.headers.get('Content-Type')?.includes('application/json');
        return hasBody ? (response.json() as Promise<T>) : (undefined as T);
    }

    // Auth
    public async login(email: string, password: string) {
        return this.request<{ user: ApiSchemas['User']; token: string }>('/auth/login', {
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
        return this.request<{ user: ApiSchemas['User']; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Public events
    public async getEvents() {
        return this.request<{ data?: ApiEvent[]; pagination?: ApiPagination }>('/public/events');
    }

    public async getEventById(id: string) {
        return this.request<ApiEvent>(`/public/events/${id}`);
    }

    // Checkout + payments
    public async createCheckoutSession(data: {
        eventId: string;
        tickets: { templateId: string; quantity: number }[];
        name: string;
        email: string;
        phone: string;
    }) {
        return this.request<CheckoutSessionResponse>('/checkout/session', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                buyer: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                },
            }),
        });
    }

    public async payOrder(data: {
        orderId: string;
        provider: 'mercadopago';
        method: 'card' | 'google_pay' | 'apple_pay' | 'spei' | 'oxxo';
        token: string;
        installments?: number;
    }) {
        return this.request<PaymentResponse>('/payments/pay', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    public async createOpenpayCharge(body: OpenpayChargeRequest) {
        return this.request<OpenpayChargeResponse>('/payments/openpay/charge', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    public async createMercadoPagoPreference(body: MercadoPagoPreferenceRequest) {
        return this.request<MercadoPagoPreferenceResponse>('/payments/mercadopago/preference', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    // Organizer - events
    public async getOrganizerEvents() {
        return this.request<ApiEvent[]>('/organizer/events', {}, { organizerScope: true });
    }

    public async createOrganizerEvent(body: OrganizerEventInput) {
        return this.request<ApiEvent>(
            '/organizer/events',
            {
                method: 'POST',
                body: JSON.stringify(body),
            },
            { organizerScope: true },
        );
    }

    public async updateOrganizerEvent(eventId: string, body: Partial<OrganizerEventInput>) {
        return this.request<ApiEvent>(
            `/organizer/events/${eventId}`,
            {
                method: 'PUT',
                body: JSON.stringify(body),
            },
            { organizerScope: true },
        );
    }

    public async deleteOrganizerEvent(eventId: string) {
        return this.request<void>(`/organizer/events/${eventId}`, { method: 'DELETE' }, { organizerScope: true });
    }

    public async getOrganizerEventOrders(eventId: string) {
        return this.request<ApiOrder[]>(
            `/organizer/events/${eventId}/orders`,
            {},
            { organizerScope: true },
        );
    }

    public async assignTemplateToEvent(eventId: string, templateId: string) {
        return this.request<ApiTicketTemplate>(
            `/organizer/events/${eventId}/template`,
            {
                method: 'PUT',
                body: JSON.stringify({ templateId }),
            },
            { organizerScope: true },
        );
    }

    // Organizer - templates
    public async getOrganizerTemplates() {
        return this.request<ApiTicketTemplate[]>(
            '/organizer/templates',
            {},
            { organizerScope: true },
        );
    }

    public async createOrganizerTemplate(body: OrganizerTemplateInput) {
        return this.request<ApiTicketTemplate>(
            '/organizer/templates',
            {
                method: 'POST',
                body: JSON.stringify(body),
            },
            { organizerScope: true },
        );
    }

    public async deleteOrganizerTemplate(templateId: string) {
        return this.request<void>(
            `/organizer/templates/${templateId}`,
            { method: 'DELETE' },
            { organizerScope: true },
        );
    }

    public async resendOrganizerTickets(orderId: string) {
        return this.request<{ status: string }>(
            `/organizer/orders/${orderId}/resend-tickets`,
            { method: 'POST' },
            { organizerScope: true },
        );
    }

    // Reuse existing upload endpoint for QR coordinates
    public async uploadPdfTemplate(eventId: string, formData: FormData) {
        const headers = this.buildHeaders({ organizerScope: true });
        const response = await fetch(`${API_BASE_URL}/organizer/events/${eventId}/pdf-template`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        return response.json();
    }

    // Director - metrics
    public async getDirectorOverview(query?: { from?: string; to?: string }) {
        return this.request<{
            totalGrossSales: number;
            platformRevenue: number;
            totalTicketsSold: number;
            activeEvents: number;
            activeOrganizers: number;
        }>('/director/metrics/overview', {}, { query });
    }

    public async getDirectorTopOrganizers(query?: { from?: string; to?: string; limit?: number }) {
        return this.request<
            {
                organizerId: string;
                businessName: string;
                totalRevenue: number;
                ticketsSold: number;
            }[]
        >('/director/metrics/top-organizers', {}, { query });
    }

    public async getDirectorTopEvents(query?: { from?: string; to?: string; limit?: number }) {
        return this.request<
            {
                eventId: string;
                title: string;
                organizerId: string | null;
                organizerName: string | null;
                totalRevenue: number;
                ticketsSold: number;
            }[]
        >('/director/metrics/top-events', {}, { query });
    }

    // Director - organizers
    public async getDirectorOrganizers(query?: { page?: number; pageSize?: number }) {
        return this.request<{
            data: ApiOrganizer[];
            meta: { page: number; pageSize: number; total: number };
        }>('/director/organizers', {}, { query });
    }

    public async getDirectorOrganizer(id: string) {
        return this.request<ApiOrganizer & {
            sales?: { totalRevenue: number; totalTickets: number };
            events?: ApiEvent[];
        }>(`/director/organizers/${id}`);
    }

    public async updateDirectorOrganizerStatus(id: string, status: string) {
        return this.request<ApiOrganizer>(`/director/organizers/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    }

    public async updateDirectorOrganizerFeePlan(id: string, feePlanId?: string) {
        return this.request<ApiOrganizer>(`/director/organizers/${id}/fee-plan`, {
            method: 'PUT',
            body: JSON.stringify({ feePlanId }),
        });
    }

    // Director - fee plans
    public async getDirectorFeePlans(query?: { page?: number; pageSize?: number }) {
        return this.request<{
            data: ApiFeePlan[];
            meta: { page: number; pageSize: number; total: number };
        }>('/director/fee-plans', {}, { query });
    }

    public async createDirectorFeePlan(body: FeePlanInput) {
        return this.request<ApiFeePlan>('/director/fee-plans', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    public async updateDirectorFeePlan(id: string, body: Partial<FeePlanInput>) {
        return this.request<ApiFeePlan>(`/director/fee-plans/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    public async deleteDirectorFeePlan(id: string) {
        return this.request<void>(`/director/fee-plans/${id}`, {
            method: 'DELETE',
        });
    }

    // Director - orders
    public async searchDirectorOrders(query?: {
        orderId?: string;
        email?: string;
        eventId?: string;
        organizerId?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }) {
        return this.request<{
            data: ApiOrder[];
            meta: { page: number; pageSize: number; total: number };
        }>('/director/orders', {}, { query });
    }

    public async getDirectorOrder(id: string) {
        return this.request<{
            order: ApiOrder;
            logs: { legalLogs: any[]; emailLogs: any[] };
        }>(`/director/orders/${id}`);
    }

    public async resendDirectorTickets(id: string) {
        return this.request<{ status: string }>(`/director/orders/${id}/resend-tickets`, {
            method: 'POST',
        });
    }
}

export const apiClient = new ApiClient();
