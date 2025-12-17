-- Sample data for testing MonoMarket D1 database

-- Insert sample user
INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES
('user-001', 'organizer@monomarket.com', '$2b$10$hashedpassword', 'Test Organizer', 'ORGANIZER');

-- Insert sample organizer
INSERT OR IGNORE INTO organizers (id, user_id, business_name, status) VALUES
('org-001', 'user-001', 'MonoMarket Events', 'ACTIVE');

-- Insert sample events
INSERT OR IGNORE INTO events (id, organizer_id, title, description, category, venue, address, city, start_date, status, capacity, price, is_public) VALUES
('event-001', 'org-001', 'Concierto de Rock 2025', 'El mejor concierto de rock del año', 'Música', 'Arena Ciudad', 'Av. Principal 123', 'Ciudad de México', '2025-12-15T20:00:00Z', 'PUBLISHED', 500, 350.00, 1),
('event-002', 'org-001', 'Festival de Jazz', 'Disfruta del mejor jazz en vivo', 'Música', 'Teatro Nacional', 'Calle Central 456', 'Guadalajara', '2025-12-20T19:00:00Z', 'PUBLISHED', 300, 450.00, 1),
('event-003', 'org-001', 'Conferencia Tech 2025', 'Las últimas tendencias en tecnología', 'Conferencia', 'Centro de Convenciones', 'Zona Empresarial 789', 'Monterrey', '2026-01-10T09:00:00Z', 'PUBLISHED', 1000, 0.00, 1);

-- Insert sample ticket templates
INSERT OR IGNORE INTO ticket_templates (id, organizer_id, event_id, name, description, price, quantity, sold, is_complementary) VALUES
('template-001', 'org-001', 'event-001', 'General', 'Entrada general', 350.00, 400, 50, 0),
('template-002', 'org-001', 'event-001', 'VIP', 'Acceso VIP con meet & greet', 750.00, 100, 20, 0),
('template-003', 'org-001', 'event-002', 'General', 'Entrada general', 450.00, 250, 30, 0),
('template-004', 'org-001', 'event-002', 'Premium', 'Asientos premium', 650.00, 50, 10, 0),
('template-005', 'org-001', 'event-003', 'Gratuito', 'Entrada gratuita', 0.00, 1000, 100, 1);


-- Insert sample buyer
INSERT OR IGNORE INTO buyers (id, email, name, phone) VALUES
('buyer-001', 'comprador@example.com', 'Juan Pérez', '+52 55 1234 5678');

-- Insert sample order
INSERT OR IGNORE INTO orders (id, event_id, buyer_id, status, total, platform_fee_amount, organizer_income_amount, paid_at) VALUES
('order-001', 'event-001', 'buyer-001', 'PAID', 700.00, 70.00, 630.00, datetime('now'));

-- Insert sample order items
INSERT OR IGNORE INTO order_items (id, order_id, template_id, quantity, unit_price) VALUES
('item-001', 'order-001', 'template-001', 2, 350.00);

-- Insert sample tickets
INSERT OR IGNORE INTO tickets (id, order_id, template_id, qr_code, status) VALUES
('ticket-001', 'order-001', 'template-001', 'QR-CONCIERTO-001-A', 'VALID'),
('ticket-002', 'order-001', 'template-001', 'QR-CONCIERTO-001-B', 'VALID');
