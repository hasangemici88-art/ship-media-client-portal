DELETE FROM customer_notes WHERE customer_id = 'SMD-1781475869806';
DELETE FROM customers WHERE customer_id = 'SMD-1781475869806';

INSERT INTO customers (customer_id, first_name, last_name, phone_number, email, address, service_requested, lead_source, submission_date, assigned_staff, current_status)
VALUES
('LIVA-1781450526351', 'Baba', '—', '9054718344', 'tamseelaasif@hotmail.com', 'Markham', 'roller_blinds - replacing', 'Livablinds.com form', '2026-06-14T15:22:06.351Z', 'Unassigned', 'New Lead'),
('LIVA-1781466040610', 'Michel', '—', '5145827383', 'michellarocque19@gmail.com', 'Pointe-À-la-croix', 'roller_blinds - new_home', 'Livablinds.com form', '2026-06-14T19:40:40.610Z', 'Unassigned', 'New Lead');

INSERT INTO customer_notes (id, customer_id, body, user_name, created_at)
VALUES
('imp-1781450526351', 'LIVA-1781450526351', 'Imported from Livablinds email notification on 2026-06-14.', 'Import', '2026-06-14T15:22:06.351Z'),
('imp-1781466040610', 'LIVA-1781466040610', 'Imported from Livablinds email notification on 2026-06-14.', 'Import', '2026-06-14T19:40:40.610Z');
