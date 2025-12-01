/**
 * Cloudflare Workers Environment
 * Defines bindings for D1, KV, R2, and environment variables
 */
export interface Env {
    // D1 Database
    DB: D1Database;

    // KV Namespace for caching
    CACHE: KVNamespace;

    // R2 Bucket for assets
    ASSETS: R2Bucket;

    // Environment variables
    JWT_SECRET: string;
}

/**
 * CORS headers for API responses
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight requests
 */
function handleOptions(): Response {
    return new Response(null, {
        headers: corsHeaders,
    });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: any, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
        },
    });
}

/**
 * Handle errors and return formatted response
 */
function errorResponse(message: string, status: number = 500): Response {
    return jsonResponse({ error: message }, status);
}

/**
 * Get events list with caching
 */
async function getEvents(env: Env): Promise<Response> {
    try {
        // Check cache first
        const cacheKey = 'events:published';
        const cached = await env.CACHE.get(cacheKey, 'json');

        if (cached) {
            return jsonResponse({
                data: cached,
                cached: true
            });
        }

        // Query D1 database
        const { results } = await env.DB.prepare(`
      SELECT 
        id, 
        title, 
        description, 
        category, 
        venue, 
        city, 
        start_date, 
        end_date, 
        cover_image, 
        capacity, 
        price, 
        currency,
        attendance_count
      FROM events 
      WHERE status = 'PUBLISHED' 
        AND is_public = 1
      ORDER BY start_date ASC
      LIMIT 50
    `).all();

        // Cache for 5 minutes
        await env.CACHE.put(cacheKey, JSON.stringify(results), {
            expirationTtl: 300,
        });

        return jsonResponse({
            data: results,
            cached: false
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        return errorResponse('Failed to fetch events');
    }
}

/**
 * Get single event by ID
 */
async function getEventById(env: Env, eventId: string): Promise<Response> {
    try {
        // Check cache first
        const cacheKey = `event:${eventId}`;
        const cached = await env.CACHE.get(cacheKey, 'json');

        if (cached) {
            return jsonResponse({
                data: cached,
                cached: true
            });
        }

        // Query event details
        const event = await env.DB.prepare(`
      SELECT 
        e.id, 
        e.title, 
        e.description, 
        e.category, 
        e.venue, 
        e.address,
        e.city, 
        e.start_date, 
        e.end_date, 
        e.cover_image, 
        e.capacity, 
        e.price, 
        e.currency,
        e.max_tickets_per_purchase,
        e.attendance_count,
        o.business_name as organizer_name
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id = ? 
        AND e.status = 'PUBLISHED'
        AND e.is_public = 1
    `).bind(eventId).first();

        if (!event) {
            return errorResponse('Event not found', 404);
        }

        // Get ticket templates for this event
        const { results: templates } = await env.DB.prepare(`
      SELECT 
        id,
        name,
        description,
        price,
        currency,
        quantity,
        sold,
        is_complementary
      FROM ticket_templates
      WHERE event_id = ?
      ORDER BY price ASC
    `).bind(eventId).all();

        const eventData = {
            ...event,
            templates,
        };

        // Cache for 5 minutes
        await env.CACHE.put(cacheKey, JSON.stringify(eventData), {
            expirationTtl: 300,
        });

        return jsonResponse({
            data: eventData,
            cached: false
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        return errorResponse('Failed to fetch event');
    }
}

/**
 * Main Worker fetch handler
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleOptions();
        }

        // Health check endpoint
        if (path === '/api/health') {
            return jsonResponse({
                ok: true,
                timestamp: new Date().toISOString(),
                worker: 'monomarket-api'
            });
        }

        // Events list endpoint
        if (path === '/api/events' && request.method === 'GET') {
            return getEvents(env);
        }

        // Single event endpoint
        const eventMatch = path.match(/^\/api\/events\/([a-zA-Z0-9-]+)$/);
        if (eventMatch && request.method === 'GET') {
            const eventId = eventMatch[1];
            return getEventById(env, eventId);
        }

        // 404 for unknown routes
        return errorResponse('Not found', 404);
    },
};
