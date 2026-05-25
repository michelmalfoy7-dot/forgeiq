-- ============================================================
-- ForgeIQ — Seed foods_library : aliments de base fitness
-- Source : Ciqual ANSES 2020 + USDA FoodData Central
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- Ajouter un index unique sur name pour permettre l'upsert
CREATE UNIQUE INDEX IF NOT EXISTS foods_library_name_unique_idx ON foods_library(name);

INSERT INTO foods_library (name, name_fr, brand, calories, protein_g, carbs_g, fat_g, fiber_g)
VALUES

-- ── ŒUFS ─────────────────────────────────────────────────────
('Egg, whole, raw',              'Oeuf entier (cru)',            NULL, 143, 13.0, 0.7, 10.0, 0.0),
('Egg, whole, boiled',           'Oeuf entier (dur)',            NULL, 155, 13.0, 1.1, 11.0, 0.0),
('Egg, whole, scrambled',        'Oeuf brouillé (nature)',       NULL, 149, 10.0, 1.6, 11.5, 0.0),
('Egg white, raw',               'Blanc d''oeuf (cru)',          NULL,  52, 11.0, 0.7,  0.2, 0.0),
('Egg white, cooked',            'Blanc d''oeuf (cuit)',         NULL,  52, 11.0, 0.7,  0.2, 0.0),
('Egg yolk, raw',                'Jaune d''oeuf (cru)',          NULL, 322, 16.0, 3.6, 27.0, 0.0),

-- ── CÉRÉALES & FÉCULENTS ─────────────────────────────────────
('Oats, rolled, dry',            'Flocons d''avoine',            NULL, 368, 13.0, 58.0,  7.0, 10.0),
('Oat flour',                    'Farine d''avoine',             NULL, 375, 13.5, 62.0,  6.5,  6.5),
('Whole wheat flour',            'Farine de blé complète',       NULL, 340, 13.0, 65.0,  2.5,  7.5),
('White flour',                  'Farine de blé (T45)',          NULL, 360, 10.0, 74.0,  1.2,  2.7),
('White rice, raw',              'Riz blanc (cru)',              NULL, 360,  7.0, 78.0,  0.7,  0.4),
('White rice, cooked',           'Riz blanc (cuit)',             NULL, 130,  2.7, 28.0,  0.3,  0.4),
('Brown rice, raw',              'Riz complet (cru)',            NULL, 370,  8.0, 76.0,  2.8,  3.5),
('Brown rice, cooked',           'Riz complet (cuit)',           NULL, 112,  2.6, 23.0,  0.9,  1.8),
('Pasta, dry',                   'Pâtes sèches',                 NULL, 370, 13.0, 72.0,  1.5,  2.5),
('Pasta, cooked',                'Pâtes cuites',                 NULL, 158,  5.5, 31.0,  0.9,  1.8),
('Quinoa, raw',                  'Quinoa (cru)',                 NULL, 368, 14.0, 64.0,  6.0,  7.0),
('Quinoa, cooked',               'Quinoa (cuit)',                NULL, 120,  4.4, 22.0,  1.9,  2.8),
('Sweet potato, raw',            'Patate douce (crue)',          NULL,  86,  1.6, 20.0,  0.1,  3.0),
('Sweet potato, cooked',         'Patate douce (cuite)',         NULL, 103,  2.3, 24.0,  0.1,  3.8),
('Potato, raw',                  'Pomme de terre (crue)',        NULL,  77,  2.0, 17.0,  0.1,  2.2),
('Potato, boiled',               'Pomme de terre (bouillie)',    NULL,  87,  1.9, 20.0,  0.1,  1.8),
('Bread, whole wheat',           'Pain complet',                 NULL, 247,  9.0, 41.0,  3.4,  6.0),
('Bread, white',                 'Pain blanc/baguette',          NULL, 265,  9.0, 50.0,  3.2,  2.3),
('Flour tortilla',               'Tortilla de blé',              NULL, 310,  8.0, 49.0,  8.0,  2.0),
('Corn tortilla',                'Tortilla de maïs',             NULL, 218,  5.7, 45.0,  2.5,  6.0),
('Buckwheat, raw',               'Sarrasin (cru)',               NULL, 343, 13.0, 71.0,  3.4,  10.0),

-- ── PROTÉINES ANIMALES — VOLAILLES ───────────────────────────
('Chicken breast, raw',          'Poitrine de poulet (crue)',    NULL, 105, 22.0,  0.0,  1.8, 0.0),
('Chicken breast, cooked',       'Poitrine de poulet (cuite)',   NULL, 165, 31.0,  0.0,  3.6, 0.0),
('Turkey breast, raw',           'Blanc de dinde (cru)',         NULL,  99, 22.0,  0.0,  1.0, 0.0),
('Turkey breast, cooked',        'Blanc de dinde (cuit)',        NULL, 135, 30.0,  0.0,  1.0, 0.0),
('Chicken thigh, raw',           'Cuisse de poulet (crue)',      NULL, 177, 19.0,  0.0, 11.0, 0.0),
('Whole chicken, cooked',        'Poulet rôti (avec peau)',      NULL, 239, 27.0,  0.0, 14.0, 0.0),

-- ── PROTÉINES ANIMALES — VIANDES ROUGES ──────────────────────
('Ground beef, 5% fat',          'Boeuf haché 5% MG',           NULL, 121, 20.0,  0.0,  5.0, 0.0),
('Ground beef, 15% fat',         'Boeuf haché 15% MG',          NULL, 215, 18.0,  0.0, 15.5, 0.0),
('Ground beef, 20% fat',         'Boeuf haché 20% MG',          NULL, 254, 17.5,  0.0, 20.0, 0.0),
('Beef steak, sirloin',          'Steak de boeuf (rumsteak)',    NULL, 174, 26.0,  0.0,  7.5, 0.0),
('Pork tenderloin, raw',         'Filet mignon de porc (cru)',   NULL, 109, 22.0,  0.0,  2.5, 0.0),
('Pork loin, cooked',            'Filet de porc (cuit)',         NULL, 188, 29.0,  0.0,  7.4, 0.0),
('Ham, cooked',                  'Jambon cuit (dégraissé)',      NULL, 105, 16.0,  1.5,  3.8, 0.0),
('Lamb, ground',                 'Agneau haché',                 NULL, 283, 17.0,  0.0, 23.0, 0.0),

-- ── POISSONS & FRUITS DE MER ──────────────────────────────────
('Salmon, raw',                  'Saumon (cru)',                 NULL, 208, 20.0,  0.0, 13.4, 0.0),
('Salmon, cooked',               'Saumon (cuit)',                NULL, 206, 28.0,  0.0,  9.3, 0.0),
('Tuna, canned in water',        'Thon au naturel (boîte)',      NULL, 103, 23.0,  0.0,  0.8, 0.0),
('Tuna, fresh, raw',             'Thon frais (cru)',             NULL, 132, 28.0,  0.0,  1.0, 0.0),
('Sardines, canned in oil',      'Sardines à l''huile (boîte)',  NULL, 208, 24.6,  0.0, 11.5, 0.0),
('Cod, raw',                     'Cabillaud (cru)',              NULL,  82, 18.0,  0.0,  0.7, 0.0),
('Tilapia, raw',                 'Tilapia (cru)',                NULL,  96, 20.0,  0.0,  1.7, 0.0),
('Shrimp, raw',                  'Crevettes (crues)',            NULL,  85, 18.0,  0.9,  0.9, 0.0),
('Mackerel, raw',                'Maquereau (cru)',              NULL, 205, 19.0,  0.0, 14.0, 0.0),

-- ── PRODUITS LAITIERS ─────────────────────────────────────────
('Cottage cheese 4%',            'Cottage cheese',               NULL,  98, 11.1,  3.4,  4.3, 0.0),
('Greek yogurt, 0%',             'Yaourt grec 0%',               NULL,  59, 10.2,  3.6,  0.4, 0.0),
('Greek yogurt, full fat',       'Yaourt grec entier',           NULL, 115,  9.0,  3.9,  7.4, 0.0),
('Plain yogurt, 0%',             'Yaourt nature 0%',             NULL,  40,  5.0,  5.0,  0.1, 0.0),
('Plain yogurt, full fat',       'Yaourt nature entier',         NULL,  61,  3.5,  4.6,  3.3, 0.0),
('Skyr, 0%',                     'Skyr nature 0%',               NULL,  57, 10.0,  4.0,  0.2, 0.0),
('Fromage blanc, 0%',            'Fromage blanc 0%',             NULL,  44,  8.0,  4.0,  0.1, 0.0),
('Fromage blanc, 20%',           'Fromage blanc 20%',            NULL,  78,  7.0,  4.0,  3.7, 0.0),
('Quark, 0%',                    'Quark 0%',                     NULL,  58, 11.0,  3.5,  0.2, 0.0),
('Milk, skim',                   'Lait écrémé',                  NULL,  34,  3.5,  4.9,  0.1, 0.0),
('Milk, semi-skimmed',           'Lait demi-écrémé',             NULL,  46,  3.2,  4.7,  1.6, 0.0),
('Milk, whole',                  'Lait entier',                  NULL,  61,  3.2,  4.5,  3.5, 0.0),
('Milk, oat',                    'Lait d''avoine',               NULL,  45,  1.0,  6.5,  1.5, 0.8),
('Milk, almond, unsweetened',    'Lait d''amande (non sucré)',   NULL,  17,  0.6,  0.6,  1.4, 0.4),
('Milk, soy, unsweetened',       'Lait de soja (non sucré)',     NULL,  33,  3.3,  1.3,  1.8, 0.2),
('Mozzarella',                   'Mozzarella',                   NULL, 280, 19.0,  2.2, 21.0, 0.0),
('Parmesan, grated',             'Parmesan râpé',                NULL, 431, 38.0,  3.2, 29.0, 0.0),
('Cheddar',                      'Cheddar',                      NULL, 403, 25.0,  1.3, 33.0, 0.0),
('Feta',                         'Feta',                         NULL, 264, 14.0,  4.1, 21.0, 0.0),
('Cream cheese',                 'Fromage à la crème',           NULL, 349,  5.8,  4.1, 34.0, 0.0),
('Butter',                       'Beurre',                       NULL, 717,  0.9,  0.1, 81.0, 0.0),
('Whipped cream',                'Crème fouettée (entière)',     NULL, 300,  2.0,  2.8, 30.0, 0.0),
('Sour cream',                   'Crème fraîche épaisse',        NULL, 198,  2.5,  3.4, 19.0, 0.0),

-- ── PROTÉINES EN POUDRE ───────────────────────────────────────
('Whey protein isolate',         'Whey protéine isolat',         NULL, 370, 90.0,  4.0,  1.0, 0.0),
('Whey protein concentrate',     'Whey protéine concentrée',     NULL, 400, 75.0, 10.0,  5.0, 0.0),
('Casein protein powder',        'Protéine caséine',             NULL, 370, 80.0,  5.0,  3.0, 0.0),
('Pea protein powder',           'Protéine de pois',             NULL, 400, 80.0,  8.0,  4.0, 1.5),
('Rice protein powder',          'Protéine de riz',              NULL, 380, 78.0,  8.0,  4.0, 1.0),

-- ── LÉGUMES ──────────────────────────────────────────────────
('Spinach, raw',                 'Épinards (crus)',               NULL,  23,  2.9,  1.4,  0.4, 2.2),
('Broccoli, raw',                'Brocoli (cru)',                 NULL,  34,  2.8,  4.0,  0.4, 2.6),
('Zucchini, raw',                'Courgette (crue)',              NULL,  18,  1.2,  2.4,  0.2, 1.1),
('Carrot, raw',                  'Carotte (crue)',                NULL,  40,  0.9,  8.0,  0.2, 2.4),
('Bell pepper, red',             'Poivron rouge',                NULL,  26,  1.0,  4.2,  0.3, 2.1),
('Bell pepper, green',           'Poivron vert',                 NULL,  20,  0.9,  3.0,  0.2, 1.7),
('Tomato, raw',                  'Tomate (crue)',                 NULL,  18,  0.9,  3.0,  0.2, 1.2),
('Cucumber, raw',                'Concombre (cru)',               NULL,  15,  0.6,  2.7,  0.1, 0.5),
('Onion, raw',                   'Oignon (cru)',                  NULL,  40,  1.1,  8.6,  0.1, 1.7),
('Garlic, raw',                  'Ail (cru)',                     NULL, 149,  6.4, 33.0,  0.5, 2.1),
('Kale, raw',                    'Chou kale (cru)',               NULL,  35,  2.9,  4.4,  0.5, 4.1),
('Lettuce, romaine',             'Laitue romaine',               NULL,  17,  1.2,  2.4,  0.3, 2.1),
('Green beans, raw',             'Haricots verts (crus)',        NULL,  31,  1.8,  5.0,  0.1, 2.7),
('Mushroom, white, raw',         'Champignons de Paris (crus)',  NULL,  22,  3.1,  2.3,  0.3, 1.0),
('Cauliflower, raw',             'Chou-fleur (cru)',              NULL,  25,  1.9,  3.4,  0.3, 2.0),
('Asparagus, raw',               'Asperges (crues)',              NULL,  20,  2.2,  2.1,  0.1, 2.1),
('Edamame, cooked',              'Edamame (cuits)',               NULL, 121,  11.9, 8.9,  5.2, 5.2),
('Corn, cooked',                 'Maïs (cuit)',                   NULL,  96,  3.4, 21.0,  1.5, 2.4),
('Peas, frozen, cooked',         'Petits pois (cuits)',           NULL,  81,  5.0, 11.0,  0.4, 4.4),

-- ── FRUITS ───────────────────────────────────────────────────
('Banana',                       'Banane',                       NULL,  89,  1.1, 22.0,  0.3, 2.6),
('Apple',                        'Pomme',                        NULL,  52,  0.3, 13.0,  0.2, 2.4),
('Strawberry',                   'Fraise',                       NULL,  32,  0.7,  7.7,  0.3, 2.0),
('Blueberry',                    'Myrtille',                     NULL,  57,  0.7, 14.0,  0.3, 2.4),
('Orange',                       'Orange',                       NULL,  47,  0.9, 11.0,  0.1, 2.4),
('Mango',                        'Mangue',                       NULL,  60,  0.8, 15.0,  0.4, 1.6),
('Pineapple',                    'Ananas',                       NULL,  50,  0.5, 13.0,  0.1, 1.4),
('Kiwi',                         'Kiwi',                         NULL,  61,  1.1, 15.0,  0.5, 3.0),
('Watermelon',                   'Pastèque',                     NULL,  30,  0.6,  7.6,  0.2, 0.4),
('Raspberry',                    'Framboise',                    NULL,  52,  1.2, 12.0,  0.7, 6.5),
('Grape',                        'Raisin',                       NULL,  69,  0.7, 18.0,  0.2, 0.9),
('Peach',                        'Pêche',                        NULL,  39,  0.9,  9.5,  0.3, 1.5),
('Pear',                         'Poire',                        NULL,  57,  0.4, 15.0,  0.1, 3.1),
('Avocado',                      'Avocat',                       NULL, 160,  2.0,  9.0, 15.0, 6.7),
('Lemon',                        'Citron',                       NULL,  29,  1.1,  9.3,  0.3, 2.8),

-- ── LÉGUMINEUSES ─────────────────────────────────────────────
('Lentils, cooked',              'Lentilles (cuites)',            NULL, 116,  9.0, 20.0,  0.4, 8.0),
('Lentils, red, raw',            'Lentilles corail (crues)',     NULL, 353, 26.0, 59.0,  1.1, 7.9),
('Chickpeas, cooked',            'Pois chiches (cuits)',          NULL, 164,  8.9, 27.0,  2.6, 7.6),
('Chickpeas, canned',            'Pois chiches (boîte)',          NULL, 119,  7.0, 17.0,  1.8, 5.3),
('Kidney beans, cooked',         'Haricots rouges (cuits)',      NULL, 127,  8.7, 22.0,  0.5, 6.4),
('Black beans, cooked',          'Haricots noirs (cuits)',       NULL, 132,  8.9, 24.0,  0.5, 8.7),
('Soybeans, cooked',             'Soja (cuit)',                   NULL, 173, 16.6,  9.9,  9.0, 6.0),
('Tofu, firm',                   'Tofu ferme',                   NULL,  83,  9.0,  2.0,  4.8, 0.3),
('Tofu, silken',                 'Tofu soyeux',                  NULL,  55,  4.8,  2.0,  2.7, 0.1),
('Tempeh',                       'Tempeh',                       NULL, 195, 19.0, 10.0, 11.0, 0.0),

-- ── MATIÈRES GRASSES & OLÉAGINEUX ─────────────────────────────
('Olive oil',                    'Huile d''olive',                NULL, 884,  0.0,  0.0, 100.0, 0.0),
('Coconut oil',                  'Huile de coco',                 NULL, 892,  0.0,  0.0, 100.0, 0.0),
('Canola oil',                   'Huile de colza',                NULL, 884,  0.0,  0.0, 100.0, 0.0),
('Peanut butter, natural',       'Beurre de cacahuète (naturel)', NULL, 588, 25.0, 20.0, 50.0, 6.0),
('Almond butter',                'Beurre d''amande',              NULL, 614, 21.0, 19.0, 56.0, 11.0),
('Almonds, raw',                 'Amandes (crues)',               NULL, 579, 21.0, 22.0, 50.0, 12.5),
('Walnuts',                      'Noix',                          NULL, 654, 15.0, 14.0, 65.0, 6.7),
('Cashews, raw',                 'Noix de cajou',                 NULL, 553, 18.0, 30.0, 44.0, 3.3),
('Peanuts, raw',                 'Cacahuètes (crues)',            NULL, 567, 26.0, 16.0, 49.0, 8.5),
('Chia seeds',                   'Graines de chia',               NULL, 486, 17.0, 42.0, 31.0, 34.0),
('Flaxseeds',                    'Graines de lin',                NULL, 534, 18.0, 29.0, 42.0, 27.0),
('Sunflower seeds',              'Graines de tournesol',          NULL, 584, 21.0, 20.0, 51.0, 8.6),
('Pumpkin seeds',                'Graines de courge',             NULL, 559, 30.0, 11.0, 49.0, 6.0),

-- ── DIVERS / CONDITIONNEMENTS ─────────────────────────────────
('Honey',                        'Miel',                          NULL, 304,  0.3, 82.0,  0.0, 0.2),
('Maple syrup',                  'Sirop d''érable',               NULL, 260,  0.0, 67.0,  0.1, 0.0),
('Sugar, white',                 'Sucre blanc',                   NULL, 387,  0.0, 100.0, 0.0, 0.0),
('Sugar, brown',                 'Sucre roux (cassonade)',        NULL, 377,  0.0, 97.0,  0.0, 0.0),
('Cocoa powder, unsweetened',    'Cacao en poudre non sucré',    NULL, 228, 19.6, 58.0, 13.7, 33.2),
('Dark chocolate 70%',           'Chocolat noir 70%',             NULL, 598,  7.8, 46.0, 43.0, 10.9),
('Protein bar (generic)',        'Barre protéinée (générique)',   NULL, 350, 30.0, 30.0, 10.0,  5.0),
('Rice cakes, plain',            'Galettes de riz nature',        NULL, 387,  7.0, 82.0,  2.8,  2.5),
('Oat bran',                     'Son d''avoine',                  NULL, 246, 17.3, 66.2,  7.0, 15.4),
('Wheat bran',                   'Son de blé',                    NULL, 216, 15.6, 65.0,  4.3, 42.8),
('Coconut flour',                'Farine de coco',                NULL, 400, 18.0, 60.0, 14.0, 38.0),
('Erythritol',                   'Érythritol',                    NULL,  20,  0.0, 100.0, 0.0,  0.0),
('Stevia powder',                'Stévia en poudre',              NULL,   0,  0.0,  0.0,  0.0,  0.0),
('Psyllium husk',                'Psyllium (coques)',              NULL, 220,  3.0, 88.0,  1.4, 85.0),
('Baking powder',                'Levure chimique',               NULL, 100,  0.0, 28.0,  0.0,  0.0),
('Baking soda',                  'Bicarbonate de soude',          NULL,   0,  0.0,  0.0,  0.0,  0.0)

ON CONFLICT (name) DO UPDATE SET
  name_fr  = EXCLUDED.name_fr,
  calories = EXCLUDED.calories,
  protein_g = EXCLUDED.protein_g,
  carbs_g   = EXCLUDED.carbs_g,
  fat_g     = EXCLUDED.fat_g,
  fiber_g   = EXCLUDED.fiber_g;

-- Vérification
SELECT COUNT(*) AS total_aliments FROM foods_library;
