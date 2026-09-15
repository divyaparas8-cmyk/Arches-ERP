-- 03 — Seed data. Run after 02-SCHEMA.sql.
-- Catalog, clients, vendors and colorways are REAL and taken from the studio's current list.
-- The eight orders are illustrative but match the prototype exactly — useful for QA.

BEGIN;

-- ---------- vendors ----------
INSERT INTO vendors (name, type, loc, lead) VALUES
  ('Atelier Norte',       'Cut & Sew · Screen Print',      'Porto, PT',      '3–4 wks'),
  ('Ribeira Embroidery',  'Flat & 3D Embroidery',          'Guimarães, PT',  '2–3 wks'),
  ('Casa Tinturaria',     'Dye House · Special Wash',      'Barcelos, PT',   '1–2 wks'),
  ('Douro Packaging Co.', 'Custom Packaging & Labels',     'Porto, PT',      '2 wks'),
  ('ECONYL Mill',         'Recycled Nylon — Caps & Bags',  'Ljubljana, SI',  '4 wks'),
  ('Meridian Freight',    'Freight Forwarding',            'Felixstowe, UK', '—');

-- ---------- colorways ----------
INSERT INTO colorways (code, name, hex, vendor_name) VALUES
  ('WHT','White','#F8F7F3','Optic White'),        ('CNL','Canal','#C4BCAE','Sand 412'),
  ('BLK','Black','#1A1917','Jet 900'),            ('HTR','Heather','#B8B4AE','Melange Grey 08'),
  ('DKN','Dark Navy','#2B3240','Navy 519'),       ('MRG','Marga','#8C7B6E','Taupe 233'),
  ('AMG','Army Green','#5C6148','Olive 640'),     ('RBL','Royal Blue','#3455A4','Cobalt 288'),
  ('GRG','Grey Green','#6E7863','Thyme 611'),     ('MLB','Marble','#D4CFCA','Chalk 102'),
  ('SLB','Slate Blue','#8491AA','Denim 441'),     ('MNB','Midnight Blue','#1C2236','Midnight 540'),
  ('BLI','Black Iris','#2A2C3E','Indigo 555'),    ('SGE','Sage','#9BAF96','Sage 602'),
  ('DSK','Desert Khaki','#C0A882','Khaki 210'),   ('HTN','Hazelton','#6B6056','Walnut 318'),
  ('BKP','Black Pearl','#2D2926','Carbon 890'),   ('DRB','Dark Rum','#5A3E30','Cocoa 330'),
  ('SFP','Soft Pink','#E8C4BE','Blush 150'),      ('SFY','Soft Yellow','#EDE5C0','Butter 120');

-- ---------- blanks (base_pence = sell, cost_pence = vendor cost) ----------
INSERT INTO skus (code, name, cat, gsm, brand, vendor_id, base_pence, cost_pence) VALUES
  ('RFBK001','Regular Fit T-Shirt',      'T-Shirts','230/280','Arches Blanks', 1, 1400,  620),
  ('OSBK015','Oversized T-Shirt',        'T-Shirts','230/280','Arches Blanks', 1, 1600,  710),
  ('OSP0010','Pique Oversized T-Shirt',  'T-Shirts','265',    'Arches Blanks', 1, 1850,  840),
  ('HEBK010','Heritage T-Shirt',         'T-Shirts','230/280','Arches Blanks', 1, 1500,  675),
  ('LSBK001','Long Sleeve T-Shirt',      'T-Shirts','230',    'Arches Blanks', 1, 1900,  860),
  ('FNBK010','Fleeceback Crewneck',      'Sweats',  '400',    'Ribeira Knit',  1, 3400, 1540),
  ('RTBK001','Raglan Terry Crewneck',    'Sweats',  '380',    'Ribeira Knit',  1, 3600, 1620),
  ('FNHD010','Fleeceback Hoodie',        'Sweats',  '400',    'Ribeira Knit',  1, 4200, 1930),
  ('FZHD001','Full-Zip Hoodie',          'Sweats',  '400',    'Ribeira Knit',  1, 4600, 2150),
  ('FNPT010','Fleeceback Pant',          'Bottoms', '400',    'Ribeira Knit',  1, 3800, 1740),
  ('TRSH001','Terry Short',              'Bottoms', '380',    'Ribeira Knit',  1, 2800, 1260),
  ('STBG001','Standard Tote',            'Bags',    '—',      'Norte Mills',   1, 1200,  510),
  ('WKBG001','Weekender Tote',           'Bags',    '—',      'Norte Mills',   1, 2400, 1080),
  ('MNBG001','Mini Tote',                'Bags',    '—',      'Norte Mills',   1,  900,  380),
  ('EC6P001','ECONYL 6-Panel',           'Headwear','—',      'ECONYL',        5, 1600,  740);

-- ---------- embellishments (price_pence = sell, cost_pence = vendor cost) ----------
INSERT INTO embellishments (code, name, vendor_id, price_pence, cost_pence) VALUES
  ('SP', 'Screen Print',        1, 350, 155),
  ('DTG','DTG Print',           1, 400, 190),
  ('FE', 'Flat Embroidery',     2, 500, 230),
  ('TE', '3D Embroidery',       2, 750, 360),
  ('CWL','Custom Woven Label',  4, 150,  55),
  ('CPK','Custom Packaging',    4, 250, 105),
  ('NL', 'Woven Neck Label',    4,  75,  28),
  ('PNL','Printed Neck Label',  4,  60,  22),
  ('CDC','Custom Dye Color',    3, 600, 280),
  ('SW', 'Special Wash',        3, 450, 205);

-- ---------- clients ----------
INSERT INTO clients (name, contact, email, loc) VALUES
  ('NTS Radio',          'Sana K.',        'merch@nts.live',      'London'),
  ('Ed Banger Records',  'Pedro W.',       'label@edbanger.net',  'Paris'),
  ('Tate Modern',        'Retail Buying',  'buying@tate.org.uk',  'London'),
  ('Eric Emanuel',       'Studio EE',      'studio@ee.com',       'New York'),
  ('Estela NYC',         'H. Vidal',       'hello@estela.nyc',    'New York'),
  ('Robertas',           'Ops Desk',       'ops@robertas.com',    'New York'),
  ('Philadelphia 76ers', 'Team Store',     'store@sixers.com',    'Philadelphia'),
  ('Felix Capital',      'Brand Team',     'brand@felixcap.com',  'London');

-- ---------- users (password for all seed accounts: set via your seed script, never commit one) ----------
-- role 'client' rows must carry client_id; internal roles must not.
INSERT INTO users (name, email, password_hash, role, client_id) VALUES
  ('A. Reyes',  'owner@arches.global',      '<bcrypt>', 'owner',      NULL),
  ('M. Duval',  'sales@arches.global',      '<bcrypt>', 'sales',      NULL),
  ('J. Costa',  'production@arches.global', '<bcrypt>', 'production', NULL),
  ('P. Okafor', 'accounts@arches.global',   '<bcrypt>', 'accounting', NULL),
  ('Tate Modern · Retail Buying', 'buying@tate.org.uk', '<bcrypt>', 'client',
     (SELECT id FROM clients WHERE name = 'Tate Modern'));

-- ---------- demo orders ----------
-- Written as a small DO block so line items and their embellishments stay readable.
-- qty / stage / colorway / embellishment sets match the prototype one-for-one.

INSERT INTO orders (id, seq, client_id, contact, stage, weeks, shipping_pence, progress, prod_start, tracking, carrier) VALUES
  ('ARC-1053',1053,(SELECT id FROM clients WHERE name='Eric Emanuel'),      'Studio EE',     0,6,     0,  0,NULL,NULL,NULL),
  ('ARC-1055',1055,(SELECT id FROM clients WHERE name='Philadelphia 76ers'),'Team Store',    1,8,     0,  0,NULL,NULL,NULL),
  ('ARC-1051',1051,(SELECT id FROM clients WHERE name='Tate Modern'),       'Retail Buying', 2,5,     0,  0,NULL,NULL,NULL),
  ('ARC-1049',1049,(SELECT id FROM clients WHERE name='Estela NYC'),        'H. Vidal',      3,6,     0,  0,NULL,NULL,NULL),
  ('ARC-1048',1048,(SELECT id FROM clients WHERE name='Robertas'),          'Ops Desk',      4,4,     0,  0,NULL,NULL,NULL),
  ('ARC-1042',1042,(SELECT id FROM clients WHERE name='NTS Radio'),         'Merch',         5,5, 34000, 40,'2026-06-20',NULL,NULL),
  ('ARC-1045',1045,(SELECT id FROM clients WHERE name='Ed Banger Records'), 'Label',         6,5, 42000,100,'2026-06-10',NULL,NULL),
  ('ARC-1039',1039,(SELECT id FROM clients WHERE name='Felix Capital'),     'Brand',         7,4, 28000,100,'2026-05-26','4471 9920 118','DHL Express');

INSERT INTO line_items (order_id, position, sku_code, color_code, qty, override_pence) VALUES
  ('ARC-1053',1,'OSBK015','BLK',300,NULL),
  ('ARC-1053',2,'RFBK001','WHT',150,NULL),
  ('ARC-1055',1,'FNHD010','BLK',500,3800),   -- overridden unit sell £38.00
  ('ARC-1051',1,'HEBK010','BKP',400,NULL),
  ('ARC-1051',2,'STBG001','CNL',600,NULL),
  ('ARC-1049',1,'FNBK010','AMG',250,NULL),
  ('ARC-1048',1,'RFBK001','WHT',200,NULL),
  ('ARC-1042',1,'OSBK015','DKN',500,NULL),
  ('ARC-1042',2,'FNHD010','DKN',250,NULL),
  ('ARC-1045',1,'HEBK010','BLK',350,NULL),
  ('ARC-1039',1,'FZHD001','MNB',120,NULL);

INSERT INTO line_embellishments (line_id, emb_code)
SELECT l.id, e.code FROM line_items l
JOIN (VALUES
  ('ARC-1053',1,'SP'),('ARC-1053',1,'CWL'),
  ('ARC-1053',2,'SP'),
  ('ARC-1055',1,'TE'),('ARC-1055',1,'CWL'),('ARC-1055',1,'CPK'),
  ('ARC-1051',1,'SP'),('ARC-1051',1,'PNL'),
  ('ARC-1051',2,'SP'),
  ('ARC-1049',1,'FE'),('ARC-1049',1,'CWL'),
  ('ARC-1048',1,'DTG'),
  ('ARC-1042',1,'SP'),('ARC-1042',1,'CWL'),('ARC-1042',1,'CPK'),
  ('ARC-1042',2,'SP'),('ARC-1042',2,'CWL'),
  ('ARC-1045',1,'SP'),('ARC-1045',1,'PNL'),('ARC-1045',1,'SW'),
  ('ARC-1039',1,'FE'),('ARC-1039',1,'CWL'),('ARC-1039',1,'CPK')
) AS e(order_id, position, code)
  ON e.order_id = l.order_id AND e.position = l.position;

-- artwork records for the order sitting at the artwork stage
INSERT INTO artworks (line_id, ver, approved)
SELECT id, CASE WHEN position = 1 THEN 2 ELSE 1 END, position = 2
FROM line_items WHERE order_id = 'ARC-1051';

INSERT INTO xero_records (order_id, kind, ref, status, note) VALUES
  ('ARC-1049','deposit',NULL,      'queued','Deposit invoice drafted — not yet pushed'),
  ('ARC-1048','deposit','INV-2048','synced','Awaiting payment in Xero'),
  ('ARC-1042','deposit','INV-2042','synced','Deposit payment reconciled Jun 18'),
  ('ARC-1045','deposit','INV-2045','synced','Deposit reconciled · balance invoice draft'),
  ('ARC-1039','deposit','INV-2039','synced','Paid in full · reconciled Jun 24');

COMMIT;
