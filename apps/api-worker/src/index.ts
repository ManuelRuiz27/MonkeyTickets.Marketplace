import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
 * Register a new user and organizer
 */
async function register(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { email, password, name, businessName } = body;

        if (!email || !password || !name || !businessName) {
            return errorResponse('Missing required fields: email, password, name, businessName', 400);
        }

        // Check if user exists
        const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingUser) {
            return errorResponse('User already exists', 409);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();
        const organizerId = crypto.randomUUID();

        // Transaction to create user and organizer
        await env.DB.batch([
            env.DB.prepare('INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)')
                .bind(userId, email, hashedPassword, name, 'ORGANIZER'),
            env.DB.prepare('INSERT INTO organizers (id, user_id, business_name, status) VALUES (?, ?, ?, ?)')
                .bind(organizerId, userId, businessName, 'ACTIVE')
        ]);

        const token = jwt.sign({ sub: userId, email, role: 'ORGANIZER', organizerId }, env.JWT_SECRET, { expiresIn: '7d' });

        return jsonResponse({
            user: { id: userId, email, name, role: 'ORGANIZER', organizer: { id: organizerId } },
            token
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        return errorResponse('Registration failed: ' + error.message);
    }
}

/**
 * Login user
 */
async function login(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { email, password } = body;

        if (!email || !password) {
            return errorResponse('Missing email or password', 400);
        }

        const user = await env.DB.prepare(`
            SELECT u.*, o.id as organizer_id 
            FROM users u 
            LEFT JOIN organizers o ON u.id = o.user_id 
            WHERE u.email = ?
        `).bind(email).first();

        if (!user) {
            return errorResponse('Invalid credentials', 401);
        }

        const valid = await bcrypt.compare(password, user.password as string);
        if (!valid) {
            return errorResponse('Invalid credentials', 401);
        }

        const token = jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            organizerId: user.organizer_id
        }, env.JWT_SECRET, { expiresIn: '7d' });

        return jsonResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                organizer: user.organizer_id ? { id: user.organizer_id } : null
            },
            token
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return errorResponse('Login failed: ' + error.message);
    }
}

/**
 * Main Worker fetch handler
 */
export default {
    async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
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

        // Auth endpoints
        if (path === '/api/auth/register' && request.method === 'POST') {
            return register(request, env);
        }

        if (path === '/api/auth/login' && request.method === 'POST') {
            return login(request, env);
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
