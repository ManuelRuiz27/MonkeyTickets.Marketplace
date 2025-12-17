import { components as ApiComponents } from '@monomarket/contracts';

type ApiSchemas = ApiComponents['schemas'];
type ApiEvent = ApiSchemas['Event'];
type ApiOrganizer = ApiSchemas['Organizer'];
type ApiTicketTemplate = ApiSchemas['TicketTemplate'];
type ApiFeePlan = ApiSchemas['FeePlan'];
type ApiOrder = ApiSchemas['Order'];
type ApiPagination = ApiSchemas['Pagination'];

export type CheckoutSessionResponse = {
    orderId: string;
    total: number;
    currency?: string;
    expiresAt: string;
};

export type CheckoutOrderSummary = {
    orderId: string;
    total: number;
    currency: string;
    buyer: {
        name?: string | null;
        email: string;
        phone?: string | null;
    };
};

export type ManualOrderCompletionResponse = {
    orderId: string;
    tickets: { id: string }[];
};

export type OrganizerEventInput = ApiSchemas['EventInput'] & {
    capacity?: number;
    price?: number;
    currency?: string;
    isPublic?: boolean;
    isUnlisted?: boolean;
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

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
    throw new Error('VITE_API_URL is not defined');
}

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
    public async getEvents(params?: {
        search?: string;
        category?: string;
        city?: string;
        minPrice?: number;
        maxPrice?: number;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        const query: Record<string, any> = {};
        if (params) {
            if (params.search) query.search = params.search;
            if (params.category) query.category = params.category;
            if (params.city) query.city = params.city;
            if (params.minPrice !== undefined) query.priceMin = params.minPrice;
            if (params.maxPrice !== undefined) query.priceMax = params.maxPrice;
            if (params.startDate) query.dateFrom = params.startDate;
            if (params.endDate) query.dateTo = params.endDate;
            if (params.page) query.page = params.page;
            if (params.limit) query.limit = params.limit;
        }
        return this.request<{ data?: ApiEvent[]; pagination?: ApiPagination }>('/public/events', {}, { query });
    }

    public async getEventById(id: string) {
        return this.request<ApiEvent>(`/public/events/${id}`);
    }

    public async getUnlistedEventByToken(token: string) {
        return this.request<ApiEvent>(`/public/events/unlisted/${token}`);
    }

    // Checkout + payments
    public async createCheckoutSession(data: {
        eventId: string;
        tickets: { templateId: string; quantity: number }[];
        name: string;
        email: string;
        phone: string;
        captchaToken?: string;
    }) {
        return this.request<CheckoutSessionResponse>('/checkout/session', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    public async getCheckoutOrder(orderId: string) {
        return this.request<CheckoutOrderSummary>(`/checkout/orders/${orderId}`);
    }

    public async completeManualOrder(orderId: string) {
        return this.request<ManualOrderCompletionResponse>(`/checkout/orders/${orderId}/manual-complete`, {
            method: 'POST',
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

    // Organizer - Dashboard & Metrics
    public async getOrganizerSummary() {
        return this.request<{
            organizerId: string;
            businessName: string;
            status: string;
            stats: {
                totalEvents: number;
                activeEvents: number;
                totalOrders: number;
                totalRevenue: number;
            };
            cortesias: {
                used: number;
                totalAllowed: number;
                remaining: number;
            };
        }>('/organizer/dashboard', {}, { organizerScope: true });
    }

    public async getEventMetrics(eventId: string) {
        return this.request<{
            event: any;
            sales: any;
            attendance: any;
            templates: any[];
        }>(`/organizer/events/${eventId}/metrics`, {}, { organizerScope: true });
    }

    public async getCortesiasStats() {
        return this.request<{
            used: number;
            totalAllowed: number;
            remaining: number;
        }>('/organizer/cortesias/stats', {}, { organizerScope: true });
    }

    public async generateCortesias(eventId: string, data: { quantity: number; buyerName: string; buyerEmail: string; buyerPhone?: string }) {
        return this.request(
            `/organizer/events/${eventId}/cortesias`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            { organizerScope: true }
        );
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

    // RP - Gestión de RPs (Organizer)
    public async createRP(eventId: string, data: { name: string; email: string; phone?: string; maxTickets?: number }) {
        return this.request<{
            id: string;
            code: string;
            name: string;
            email: string;
            phone?: string;
            maxTickets?: number;
            isActive: boolean;
            shareLink: string;
        }>(`/organizer/events/${eventId}/rps`, {
            method: 'POST',
            body: JSON.stringify(data),
        }, { organizerScope: true });
    }

    public async listRPs(eventId: string) {
        return this.request<Array<{
            id: string;
            name: string;
            email: string;
            phone?: string;
            code: string;
            isActive: boolean;
            maxTickets?: number;
            ticketsGenerated: number;
            ticketsUsed: number;
            conversionRate: number;
            shareLink: string;
            createdAt: string;
        }>>(`/organizer/events/${eventId}/rps`, {}, { organizerScope: true });
    }

    public async updateRP(rpId: string, data: { name?: string; email?: string; phone?: string; maxTickets?: number | null; isActive?: boolean }) {
        return this.request(`/organizer/rps/${rpId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }, { organizerScope: true });
    }

    public async deleteRP(rpId: string) {
        return this.request<{ message: string }>(`/organizer/rps/${rpId}`, {
            method: 'DELETE',
        }, { organizerScope: true });
    }

    public async getRPMetrics(rpId: string) {
        return this.request<{
            rp: {
                id: string;
                name: string;
                code: string;
                ticketsGenerated: number;
                ticketsUsed: number;
                conversionRate: number;
            };
            tickets: Array<{
                id: string;
                status: string;
                guestName: string;
                guestEmail: string;
                usedAt?: string;
                createdAt: string;
            }>;
        }>(`/organizer/rps/${rpId}/metrics`, {}, { organizerScope: true });
    }

    public async getRPDashboard(eventId: string) {
        return this.request<{
            event: { id: string; title: string };
            summary: {
                totalRPs: number;
                activeRPs: number;
                totalTicketsGenerated: number;
                totalTicketsUsed: number;
                avgConversion: number;
                noShowRate: number;
            };
            rps: Array<{
                id: string;
                name: string;
                code: string;
                email: string;
                phone?: string;
                isActive: boolean;
                maxTickets?: number;
                ticketsGenerated: number;
                ticketsUsed: number;
                conversionRate: number;
                ranking: number;
                createdAt: string;
            }>;
        }>(`/organizer/events/${eventId}/rps/dashboard`, {}, { organizerScope: true });
    }

    public async exportRPReport(eventId: string) {
        return this.request(`/organizer/events/${eventId}/rps/dashboard/export`, {}, { organizerScope: true });
    }

    // RP - Endpoints públicos
    public async getRPInfo(rpCode: string) {
        return this.request<{
            rp: {
                name: string;
                code: string;
                isActive: boolean;
                ticketsGenerated: number;
                maxTickets?: number;
            };
            event: {
                id: string;
                title: string;
                description?: string;
                startDate: string;
                endDate?: string;
                venue?: string;
                address?: string;
                city?: string;
                coverImage?: string;
            };
        }>(`/rp/${rpCode}/info`);
    }

    public async generateRPTicket(rpCode: string, data: { name: string; email: string; phone?: string }) {
        const headers = this.buildHeaders();
        const response = await fetch(`${API_BASE_URL}/rp/${rpCode}/generate-ticket`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || response.statusText;
            throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }

        // Retorna el PDF como blob
        return response.blob();
    }

    public async getRPTickets(rpCode: string) {
        return this.request<{
            rp: {
                name: string;
                code: string;
                ticketsGenerated: number;
                ticketsUsed: number;
            };
            tickets: Array<{
                id: string;
                status: string;
                guestName: string;
                guestEmail: string;
                usedAt?: string;
                createdAt: string;
            }>;
        }>(`/rp/${rpCode}/tickets`);
    }

}

export const apiClient = new ApiClient();
