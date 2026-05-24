-- ============================================================
-- ForgeIQ — Bibliothèque d'aliments (300+ entrées)
-- Sources : CIQUAL 2020 (ANSES), USDA FoodData Central
-- Macros pour 100g de portion comestible (cru sauf indication)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

INSERT INTO foods_library (name, name_fr, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source)
VALUES

-- ============================================================
-- 🐟 POISSONS ET FRUITS DE MER
-- ============================================================

-- Poissons gras
('Salmon (Atlantic, farmed)', 'Saumon Atlantique (élevage)', 208, 20.4, 0, 13.4, 0, 0, 59, 'manual'),
('Salmon (wild)', 'Saumon sauvage', 182, 25.4, 0, 8.1, 0, 0, 55, 'manual'),
('Tuna (canned in water)', 'Thon en boîte (eau)', 116, 25.5, 0, 1.0, 0, 0, 333, 'manual'),
('Tuna (canned in oil)', 'Thon en boîte (huile)', 190, 25.4, 0, 9.7, 0, 0, 370, 'manual'),
('Tuna (fresh, bluefin)', 'Thon rouge frais', 144, 23.3, 0, 4.9, 0, 0, 39, 'manual'),
('Mackerel', 'Maquereau', 205, 18.6, 0, 13.9, 0, 0, 90, 'manual'),
('Sardines (canned in oil)', 'Sardines à l''huile', 208, 24.6, 0, 11.5, 0, 0, 505, 'manual'),
('Sardines (fresh)', 'Sardines fraîches', 135, 19.8, 0, 5.7, 0, 0, 82, 'manual'),
('Herring', 'Hareng', 158, 17.9, 0, 9.0, 0, 0, 90, 'manual'),
('Anchovies', 'Anchois', 131, 20.4, 0, 4.8, 0, 0, 3668, 'manual'),
('Trout', 'Truite', 148, 20.6, 0, 6.6, 0, 0, 52, 'manual'),
('Sea bass', 'Bar (loup de mer)', 97, 18.4, 0, 2.0, 0, 0, 68, 'manual'),
('Sea bream', 'Dorade', 100, 18.0, 0, 2.7, 0, 0, 80, 'manual'),
('Cod', 'Cabillaud', 82, 17.8, 0, 0.7, 0, 0, 54, 'manual'),
('Hake', 'Merlu', 86, 17.2, 0, 1.8, 0, 0, 72, 'manual'),
('Haddock', 'Églefin', 87, 19.0, 0, 0.7, 0, 0, 213, 'manual'),
('Pollock', 'Colin', 92, 19.5, 0, 1.0, 0, 0, 86, 'manual'),
('Tilapia', 'Tilapia', 96, 20.1, 0, 1.7, 0, 0, 56, 'manual'),
('Swordfish', 'Espadon', 121, 19.8, 0, 4.0, 0, 0, 90, 'manual'),
('Sole', 'Sole', 86, 18.0, 0, 1.2, 0, 0, 72, 'manual'),
('Pike', 'Brochet', 88, 19.3, 0, 0.7, 0, 0, 42, 'manual'),
('Perch', 'Perche', 91, 19.5, 0, 0.9, 0, 0, 67, 'manual'),

-- Fruits de mer
('Mussels', 'Moules', 86, 11.9, 3.7, 2.2, 0, 0, 286, 'manual'),
('Mussels (cooked)', 'Moules cuites', 172, 23.8, 7.4, 4.5, 0, 0, 369, 'manual'),
('Oysters', 'Huîtres', 59, 7.0, 3.3, 2.1, 0, 0, 211, 'manual'),
('Shrimp', 'Crevettes', 71, 13.6, 0.9, 1.1, 0, 0, 566, 'manual'),
('Shrimp (cooked)', 'Crevettes cuites', 99, 20.9, 0.9, 1.2, 0, 0, 943, 'manual'),
('Scallops', 'Saint-Jacques (coquilles)', 88, 17.0, 3.2, 0.8, 0, 0, 161, 'manual'),
('Squid / Calamari', 'Calamars / Encornets', 92, 15.6, 3.1, 1.4, 0, 0, 44, 'manual'),
('Octopus', 'Pieuvre', 82, 14.9, 2.2, 1.0, 0, 0, 230, 'manual'),
('Crab', 'Crabe', 83, 18.1, 0, 0.7, 0, 0, 395, 'manual'),
('Lobster', 'Homard', 89, 18.8, 1.2, 0.9, 0, 0, 296, 'manual'),
('Langoustines', 'Langoustines', 90, 18.5, 1.0, 1.2, 0, 0, 150, 'manual'),
('Clams', 'Palourdes', 74, 12.8, 2.6, 1.0, 0, 0, 56, 'manual'),
('Whelks', 'Bulots', 87, 14.6, 3.0, 1.5, 0, 0, 285, 'manual'),
('Cockles', 'Coques', 53, 9.2, 1.5, 0.6, 0, 0, 291, 'manual'),

-- ============================================================
-- 🥩 VIANDES ET VOLAILLES
-- ============================================================

-- Bœuf
('Beef, ground (5% fat)', 'Bœuf haché 5% MG', 121, 20.7, 0, 4.0, 0, 0, 67, 'manual'),
('Beef, ground (10% fat)', 'Bœuf haché 10% MG', 152, 19.4, 0, 8.1, 0, 0, 67, 'manual'),
('Beef, ground (15% fat)', 'Bœuf haché 15% MG', 186, 18.2, 0, 12.5, 0, 0, 71, 'manual'),
('Beef steak (sirloin)', 'Entrecôte / Faux-filet', 175, 22.0, 0, 9.2, 0, 0, 62, 'manual'),
('Beef filet mignon', 'Filet de bœuf', 158, 22.5, 0, 7.3, 0, 0, 58, 'manual'),
('Beef roast (lean)', 'Rôti de bœuf', 144, 21.5, 0, 6.2, 0, 0, 54, 'manual'),
('Beef liver', 'Foie de bœuf', 135, 20.4, 3.9, 3.6, 0, 0, 69, 'manual'),
('Beef cheek', 'Joue de bœuf', 168, 22.0, 0, 9.0, 0, 0, 75, 'manual'),

-- Poulet
('Chicken breast (skinless)', 'Blanc de poulet (sans peau)', 110, 23.1, 0, 1.4, 0, 0, 74, 'manual'),
('Chicken breast (with skin)', 'Blanc de poulet (avec peau)', 153, 22.5, 0, 6.6, 0, 0, 74, 'manual'),
('Chicken thigh (skinless)', 'Cuisse de poulet (sans peau)', 134, 20.1, 0, 5.5, 0, 0, 82, 'manual'),
('Chicken thigh (with skin)', 'Cuisse de poulet (avec peau)', 177, 17.6, 0, 11.3, 0, 0, 79, 'manual'),
('Chicken drumstick', 'Pilon de poulet', 146, 18.7, 0, 7.4, 0, 0, 77, 'manual'),
('Chicken wing', 'Aile de poulet', 203, 18.3, 0, 13.8, 0, 0, 78, 'manual'),
('Chicken liver', 'Foie de poulet', 119, 17.1, 0.7, 4.8, 0, 0, 71, 'manual'),
('Whole chicken', 'Poulet entier', 190, 18.6, 0, 12.6, 0, 0, 70, 'manual'),

-- Dinde
('Turkey breast', 'Filet de dinde', 104, 22.3, 0, 1.0, 0, 0, 69, 'manual'),
('Turkey thigh', 'Cuisse de dinde', 128, 18.5, 0, 5.8, 0, 0, 76, 'manual'),
('Turkey, ground', 'Dinde hachée', 149, 17.4, 0, 8.3, 0, 0, 82, 'manual'),

-- Porc
('Pork tenderloin', 'Filet mignon de porc', 143, 21.9, 0, 5.9, 0, 0, 53, 'manual'),
('Pork chop', 'Côte de porc', 178, 21.0, 0, 10.2, 0, 0, 63, 'manual'),
('Pork ribs', 'Travers de porc', 297, 14.7, 0, 26.0, 0, 0, 66, 'manual'),
('Pork sausage', 'Saucisse de porc', 301, 12.3, 1.3, 27.2, 0, 0, 749, 'manual'),
('Bacon', 'Bacon / Lardons fumés', 541, 37.0, 1.4, 42.0, 0, 0, 1717, 'manual'),
('Lardons (diced bacon)', 'Lardons', 330, 14.5, 0.5, 29.6, 0, 0, 820, 'manual'),
('Ham (cooked)', 'Jambon cuit', 105, 17.0, 1.0, 3.8, 0, 0, 1200, 'manual'),
('Ham (dry-cured, jambon de Bayonne)', 'Jambon cru (Bayonne)', 193, 28.5, 0, 9.0, 0, 0, 2800, 'manual'),
('Chorizo', 'Chorizo', 455, 21.3, 2.0, 39.6, 0, 0, 1800, 'manual'),
('Merguez', 'Merguez', 295, 16.5, 2.0, 24.5, 0, 0, 1200, 'manual'),
('Andouillette', 'Andouillette', 254, 14.5, 1.5, 21.0, 0, 0, 950, 'manual'),

-- Agneau / Veau
('Lamb leg', 'Gigot d''agneau', 182, 20.6, 0, 10.7, 0, 0, 72, 'manual'),
('Lamb chops', 'Côtelettes d''agneau', 232, 18.3, 0, 17.1, 0, 0, 72, 'manual'),
('Veal cutlet', 'Escalope de veau', 109, 19.5, 0, 2.8, 0, 0, 90, 'manual'),
('Veal, ground', 'Veau haché', 148, 19.2, 0, 7.8, 0, 0, 78, 'manual'),

-- Charcuterie
('Rillettes', 'Rillettes de porc', 450, 13.5, 0.8, 43.0, 0, 0, 900, 'manual'),
('Pâté de campagne', 'Pâté de campagne', 300, 15.0, 3.5, 24.0, 0, 0, 1100, 'manual'),
('Mortadelle', 'Mortadelle', 311, 14.1, 2.5, 26.8, 0, 0, 1100, 'manual'),

-- ============================================================
-- 🥚 ŒUFS
-- ============================================================
('Egg (whole)', 'Œuf entier', 143, 12.6, 0.7, 9.5, 0, 0.6, 142, 'manual'),
('Egg white', 'Blanc d''œuf', 52, 10.9, 0.7, 0.2, 0, 0.5, 166, 'manual'),
('Egg yolk', 'Jaune d''œuf', 322, 15.9, 1.8, 26.5, 0, 0.6, 48, 'manual'),
('Hard boiled egg', 'Œuf dur', 155, 13.0, 1.1, 10.6, 0, 1.1, 124, 'manual'),

-- ============================================================
-- 🥛 PRODUITS LAITIERS
-- ============================================================

-- Laits
('Whole milk', 'Lait entier', 61, 3.2, 4.8, 3.3, 0, 4.8, 43, 'manual'),
('Semi-skimmed milk', 'Lait demi-écrémé', 46, 3.3, 4.9, 1.5, 0, 4.9, 50, 'manual'),
('Skimmed milk', 'Lait écrémé', 34, 3.4, 5.0, 0.1, 0, 5.0, 52, 'manual'),
('Oat milk (unsweetened)', 'Lait d''avoine non sucré', 40, 1.0, 6.6, 0.7, 0.3, 3.5, 90, 'manual'),
('Almond milk (unsweetened)', 'Lait d''amande non sucré', 13, 0.5, 0.3, 1.1, 0.2, 0, 72, 'manual'),
('Soy milk (unsweetened)', 'Lait de soja non sucré', 33, 3.3, 1.8, 1.8, 0.3, 1.0, 51, 'manual'),

-- Yaourts
('Plain yogurt (whole milk)', 'Yaourt nature entier', 61, 3.5, 4.7, 3.2, 0, 4.7, 46, 'manual'),
('Plain yogurt (0% fat)', 'Yaourt nature 0%', 43, 4.8, 6.0, 0.1, 0, 6.0, 50, 'manual'),
('Greek yogurt (plain)', 'Yaourt grec nature', 97, 9.0, 3.6, 5.0, 0, 3.6, 36, 'manual'),
('Greek yogurt (0% fat)', 'Yaourt grec 0%', 57, 10.0, 3.6, 0.3, 0, 3.6, 40, 'manual'),
('Skyr', 'Skyr', 63, 11.0, 4.0, 0.2, 0, 3.5, 55, 'manual'),

-- Fromages
('Brie', 'Brie', 334, 20.0, 0.5, 27.7, 0, 0.5, 560, 'manual'),
('Camembert', 'Camembert', 300, 19.8, 0.5, 24.3, 0, 0.5, 842, 'manual'),
('Comté', 'Comté', 413, 28.0, 0.3, 33.0, 0, 0.3, 700, 'manual'),
('Emmental', 'Emmental', 382, 28.5, 0.4, 29.5, 0, 0.4, 450, 'manual'),
('Cheddar', 'Cheddar', 402, 25.0, 1.3, 33.1, 0, 0.5, 621, 'manual'),
('Mozzarella (fresh)', 'Mozzarella fraîche', 253, 18.0, 2.2, 19.4, 0, 1.0, 373, 'manual'),
('Mozzarella (light)', 'Mozzarella allégée', 157, 22.6, 3.1, 5.7, 0, 1.0, 510, 'manual'),
('Parmesan', 'Parmesan', 431, 38.5, 3.2, 28.5, 0, 0.9, 1602, 'manual'),
('Feta', 'Feta', 264, 14.2, 4.1, 21.3, 0, 4.1, 1116, 'manual'),
('Cottage cheese', 'Fromage blanc (cottage)', 98, 11.1, 3.4, 4.3, 0, 3.4, 364, 'manual'),
('Fromage blanc (0%)', 'Fromage blanc 0%', 48, 8.0, 4.0, 0.4, 0, 4.0, 30, 'manual'),
('Fromage blanc (3.2%)', 'Fromage blanc 3.2%', 73, 7.5, 4.0, 3.2, 0, 4.0, 30, 'manual'),
('Ricotta', 'Ricotta', 174, 11.3, 3.0, 13.0, 0, 0.3, 84, 'manual'),
('Cream cheese', 'Fromage à tartiner', 342, 5.8, 4.1, 33.2, 0, 3.8, 321, 'manual'),
('Gruyère', 'Gruyère', 413, 29.2, 0.4, 32.9, 0, 0.4, 340, 'manual'),
('Roquefort', 'Roquefort', 369, 21.5, 2.0, 30.6, 0, 0.8, 1809, 'manual'),
('Chèvre frais', 'Chèvre frais', 230, 14.1, 0.3, 19.2, 0, 0.3, 370, 'manual'),
('Raclette', 'Raclette', 363, 24.3, 0.5, 29.5, 0, 0.5, 990, 'manual'),
('Saint-Nectaire', 'Saint-Nectaire', 330, 21.0, 0.5, 26.9, 0, 0.5, 450, 'manual'),

-- Crèmes
('Heavy cream (30%)', 'Crème fraîche 30%', 292, 2.1, 3.0, 30.0, 0, 3.0, 44, 'manual'),
('Light cream (15%)', 'Crème légère 15%', 162, 2.7, 3.5, 15.0, 0, 3.5, 44, 'manual'),
('Crème fraîche (sour cream)', 'Crème fraîche épaisse', 268, 2.4, 2.9, 27.5, 0, 2.9, 45, 'manual'),
('Butter (unsalted)', 'Beurre doux', 717, 0.9, 0.1, 81.1, 0, 0.1, 14, 'manual'),
('Butter (salted)', 'Beurre demi-sel', 717, 0.9, 0.1, 81.1, 0, 0.1, 550, 'manual'),

-- ============================================================
-- 🌾 FÉCULENTS ET CÉRÉALES
-- ============================================================

-- Pains
('Bread (white baguette)', 'Baguette (pain blanc)', 262, 8.0, 55.4, 1.2, 2.3, 3.5, 500, 'manual'),
('Bread (whole wheat)', 'Pain complet', 247, 8.5, 48.3, 2.5, 6.0, 5.0, 480, 'manual'),
('Bread (rye)', 'Pain de seigle', 258, 8.5, 48.3, 3.3, 5.8, 3.5, 580, 'manual'),
('Bread (sourdough)', 'Pain au levain', 270, 9.0, 54.5, 1.5, 2.8, 2.0, 440, 'manual'),
('Pita bread', 'Pain pita', 275, 9.1, 55.7, 1.2, 2.2, 0.5, 536, 'manual'),
('Wrap / Tortilla', 'Tortilla / Wrap blé', 306, 8.6, 51.0, 6.9, 3.2, 2.2, 680, 'manual'),

-- Pâtes
('Pasta (dry, white)', 'Pâtes sèches (blanches)', 352, 12.5, 70.2, 1.5, 2.7, 2.5, 6, 'manual'),
('Pasta (dry, whole wheat)', 'Pâtes sèches complètes', 330, 13.0, 65.5, 2.2, 6.3, 3.0, 8, 'manual'),
('Pasta (cooked, white)', 'Pâtes cuites (blanches)', 131, 4.8, 25.2, 0.6, 1.0, 0.5, 2, 'manual'),
('Pasta (cooked, whole wheat)', 'Pâtes cuites complètes', 124, 5.0, 23.0, 0.8, 2.5, 1.0, 3, 'manual'),
('Gnocchi', 'Gnocchi', 151, 3.8, 30.0, 1.5, 1.4, 0.7, 400, 'manual'),

-- Riz
('Rice (white, raw)', 'Riz blanc cru', 356, 7.1, 79.1, 0.7, 0.4, 0, 2, 'manual'),
('Rice (white, cooked)', 'Riz blanc cuit', 130, 2.7, 28.2, 0.3, 0.4, 0, 1, 'manual'),
('Rice (brown, raw)', 'Riz complet cru', 367, 7.4, 77.6, 2.9, 3.5, 0, 7, 'manual'),
('Rice (brown, cooked)', 'Riz complet cuit', 112, 2.6, 23.5, 0.9, 1.8, 0, 5, 'manual'),
('Basmati rice (cooked)', 'Riz basmati cuit', 121, 3.5, 25.2, 0.4, 0.5, 0, 1, 'manual'),

-- Autres céréales
('Quinoa (cooked)', 'Quinoa cuit', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 7, 'manual'),
('Oats (rolled)', 'Flocons d''avoine', 370, 13.0, 60.4, 7.5, 9.0, 1.1, 6, 'manual'),
('Oats (cooked / porridge)', 'Porridge cuit', 71, 2.5, 12.0, 1.4, 1.7, 0.1, 49, 'manual'),
('Couscous (cooked)', 'Couscous cuit', 112, 3.8, 23.2, 0.2, 1.4, 0.1, 5, 'manual'),
('Semolina (dry)', 'Semoule sèche', 362, 12.7, 73.8, 1.1, 3.5, 0.3, 2, 'manual'),
('Bulgur (cooked)', 'Boulgour cuit', 83, 3.1, 18.6, 0.2, 4.5, 0.1, 5, 'manual'),
('Buckwheat (cooked)', 'Sarrasin cuit', 92, 3.4, 19.9, 0.6, 2.7, 0, 1, 'manual'),
('Cornflakes (plain)', 'Corn flakes (nature)', 378, 8.0, 84.5, 0.5, 2.0, 6.2, 659, 'manual'),
('Muesli (no added sugar)', 'Muesli sans sucre ajouté', 368, 10.4, 64.0, 6.5, 7.5, 22.0, 195, 'manual'),
('Granola', 'Granola', 471, 8.5, 64.0, 20.0, 5.5, 22.0, 75, 'manual'),

-- Pommes de terre
('Potato (raw)', 'Pomme de terre crue', 77, 2.0, 17.5, 0.1, 2.2, 0.8, 6, 'manual'),
('Potato (boiled)', 'Pomme de terre bouillie', 87, 1.9, 20.1, 0.1, 1.8, 0.8, 5, 'manual'),
('Potato (baked)', 'Pomme de terre au four', 93, 2.5, 21.1, 0.1, 2.2, 0.9, 10, 'manual'),
('Sweet potato (raw)', 'Patate douce crue', 86, 1.6, 20.1, 0.1, 3.0, 4.2, 55, 'manual'),
('Sweet potato (cooked)', 'Patate douce cuite', 76, 1.4, 17.7, 0.1, 2.5, 5.7, 36, 'manual'),
('French fries (oven)', 'Frites au four', 168, 2.9, 26.6, 5.3, 2.7, 1.0, 297, 'manual'),

-- ============================================================
-- 🫘 LÉGUMINEUSES
-- ============================================================
('Lentils (red, cooked)', 'Lentilles corail cuites', 116, 9.0, 20.1, 0.4, 5.5, 1.0, 4, 'manual'),
('Lentils (green/brown, cooked)', 'Lentilles vertes cuites', 116, 9.0, 19.6, 0.4, 7.9, 1.0, 4, 'manual'),
('Chickpeas (canned, drained)', 'Pois chiches (boîte, égouttés)', 121, 7.2, 19.7, 2.1, 5.0, 2.6, 240, 'manual'),
('Chickpeas (cooked)', 'Pois chiches cuits', 164, 8.9, 27.4, 2.6, 7.6, 4.8, 7, 'manual'),
('Black beans (cooked)', 'Haricots noirs cuits', 132, 8.9, 23.7, 0.5, 8.7, 0.3, 2, 'manual'),
('Kidney beans (cooked)', 'Haricots rouges cuits', 127, 8.7, 22.8, 0.5, 7.4, 0.3, 2, 'manual'),
('White beans (cooked)', 'Haricots blancs cuits', 139, 9.7, 25.1, 0.5, 6.3, 0.5, 2, 'manual'),
('Edamame', 'Edamame', 121, 11.9, 8.9, 5.2, 5.2, 2.2, 6, 'manual'),
('Tofu (firm)', 'Tofu ferme', 76, 8.1, 1.9, 4.2, 0.3, 0.4, 7, 'manual'),
('Tofu (silken)', 'Tofu soyeux', 55, 5.3, 1.9, 2.7, 0, 1.2, 9, 'manual'),
('Tempeh', 'Tempeh', 193, 19.0, 9.4, 10.8, 0, 0, 9, 'manual'),
('Soy protein (isolate)', 'Protéine de soja (isolat)', 338, 80.7, 5.0, 3.4, 2.8, 1.2, 300, 'manual'),
('Green peas (frozen)', 'Petits pois surgelés', 77, 5.1, 13.6, 0.4, 5.1, 5.7, 3, 'manual'),
('Green peas (canned)', 'Petits pois en boîte', 69, 4.4, 11.9, 0.4, 4.5, 4.4, 214, 'manual'),
('Broad beans', 'Fèves', 88, 7.9, 13.8, 0.6, 5.8, 1.7, 41, 'manual'),

-- ============================================================
-- 🥦 LÉGUMES
-- ============================================================

-- Légumes verts
('Broccoli', 'Brocoli', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33, 'manual'),
('Spinach (raw)', 'Épinards crus', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 'manual'),
('Spinach (cooked)', 'Épinards cuits', 23, 2.9, 3.8, 0.3, 2.2, 0.4, 70, 'manual'),
('Green beans', 'Haricots verts', 31, 1.8, 7.1, 0.1, 2.7, 3.3, 6, 'manual'),
('Asparagus', 'Asperges', 20, 2.2, 3.7, 0.1, 2.1, 1.9, 2, 'manual'),
('Courgette / Zucchini', 'Courgette', 17, 1.2, 3.1, 0.2, 1.0, 2.5, 8, 'manual'),
('Cucumber', 'Concombre', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 'manual'),
('Celery', 'Céleri branche', 17, 0.7, 3.5, 0.2, 1.6, 1.8, 80, 'manual'),
('Leek', 'Poireau', 61, 1.5, 14.2, 0.3, 1.8, 3.9, 10, 'manual'),
('Artichoke', 'Artichaut', 53, 2.9, 10.5, 0.2, 5.4, 1.0, 77, 'manual'),
('Peas (sugar snap)', 'Pois gourmands', 42, 2.8, 7.5, 0.2, 2.6, 4.0, 4, 'manual'),
('Fennel', 'Fenouil', 31, 1.2, 7.3, 0.2, 2.7, 3.9, 52, 'manual'),
('Kale', 'Chou kale', 49, 4.3, 8.8, 0.9, 3.6, 2.3, 38, 'manual'),
('Brussels sprouts', 'Choux de Bruxelles', 43, 3.4, 8.9, 0.3, 3.8, 2.2, 25, 'manual'),
('Cabbage (white)', 'Chou blanc', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18, 'manual'),
('Cabbage (red)', 'Chou rouge', 29, 1.4, 6.8, 0.2, 2.1, 3.8, 27, 'manual'),
('Cauliflower', 'Chou-fleur', 25, 1.9, 5.0, 0.3, 2.0, 1.9, 30, 'manual'),
('Bok choy', 'Bok choy / Pak-choï', 13, 1.5, 2.2, 0.2, 1.0, 1.2, 65, 'manual'),

-- Légumes rouges/orange
('Carrot', 'Carotte', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69, 'manual'),
('Red bell pepper', 'Poivron rouge', 31, 1.0, 6.0, 0.3, 2.1, 4.2, 2, 'manual'),
('Green bell pepper', 'Poivron vert', 20, 0.9, 4.6, 0.2, 1.7, 2.4, 3, 'manual'),
('Yellow bell pepper', 'Poivron jaune', 27, 1.0, 6.3, 0.2, 0.9, 5.3, 2, 'manual'),
('Tomato', 'Tomate', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 'manual'),
('Cherry tomatoes', 'Tomates cerises', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 'manual'),
('Tomato (canned, crushed)', 'Tomates concassées en boîte', 32, 1.5, 6.5, 0.5, 1.5, 4.5, 220, 'manual'),
('Beet (cooked)', 'Betterave cuite', 43, 1.6, 9.6, 0.2, 2.8, 6.8, 65, 'manual'),
('Butternut squash', 'Courge butternut', 45, 1.0, 11.7, 0.1, 2.0, 2.2, 4, 'manual'),
('Pumpkin', 'Potiron / Citrouille', 26, 1.0, 6.5, 0.1, 0.5, 2.8, 1, 'manual'),

-- Légumes blancs/alliacés
('Onion', 'Oignon', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4, 'manual'),
('Garlic', 'Ail', 149, 6.4, 33.1, 0.5, 2.1, 1.0, 17, 'manual'),
('Shallot', 'Échalote', 72, 2.5, 16.8, 0.1, 3.2, 7.9, 12, 'manual'),
('Mushrooms (white button)', 'Champignons de Paris', 22, 3.1, 3.3, 0.3, 1.0, 2.0, 5, 'manual'),
('Mushrooms (portobello)', 'Champignons portobello', 22, 2.1, 3.9, 0.4, 1.3, 2.5, 8, 'manual'),
('Shiitake mushrooms', 'Champignons shiitake', 34, 2.2, 6.8, 0.5, 2.5, 2.4, 9, 'manual'),
('Radish', 'Radis', 16, 0.7, 3.4, 0.1, 1.6, 1.9, 39, 'manual'),
('Turnip', 'Navet', 28, 0.9, 6.4, 0.1, 1.8, 3.8, 67, 'manual'),
('Celeriac', 'Céleri-rave', 42, 1.5, 9.2, 0.3, 1.8, 1.6, 100, 'manual'),
('Corn (sweet, cooked)', 'Maïs doux cuit', 96, 3.4, 21.3, 1.5, 2.4, 4.5, 15, 'manual'),
('Avocado', 'Avocat', 160, 2.0, 8.5, 14.7, 6.7, 0.7, 7, 'manual'),
('Eggplant / Aubergine', 'Aubergine', 25, 1.0, 5.9, 0.2, 3.0, 3.5, 2, 'manual'),

-- Salades
('Lettuce (iceberg)', 'Salade iceberg', 14, 0.9, 3.0, 0.1, 1.2, 2.0, 10, 'manual'),
('Lettuce (romaine)', 'Salade romaine', 17, 1.2, 3.3, 0.3, 2.1, 1.2, 8, 'manual'),
('Arugula / Rocket', 'Roquette', 25, 2.6, 3.7, 0.7, 1.6, 2.1, 27, 'manual'),
('Mixed salad greens', 'Mesclun', 21, 1.8, 3.5, 0.4, 1.8, 1.8, 38, 'manual'),
('Endive (chicory)', 'Endive', 17, 0.9, 4.0, 0.1, 3.1, 0.2, 22, 'manual'),

-- ============================================================
-- 🍎 FRUITS
-- ============================================================

-- Fruits frais
('Apple', 'Pomme', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1, 'manual'),
('Banana', 'Banane', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1, 'manual'),
('Orange', 'Orange', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, 'manual'),
('Strawberry', 'Fraises', 32, 0.7, 7.7, 0.3, 2.0, 4.9, 1, 'manual'),
('Blueberry', 'Myrtilles', 57, 0.7, 14.5, 0.3, 2.4, 9.9, 1, 'manual'),
('Raspberry', 'Framboises', 52, 1.2, 11.9, 0.7, 6.5, 4.4, 1, 'manual'),
('Grape', 'Raisins', 67, 0.6, 17.2, 0.4, 0.9, 16.3, 2, 'manual'),
('Kiwi', 'Kiwi', 61, 1.1, 14.7, 0.5, 3.0, 8.9, 3, 'manual'),
('Mango', 'Mangue', 60, 0.8, 15.0, 0.4, 1.6, 13.7, 1, 'manual'),
('Pineapple', 'Ananas', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1, 'manual'),
('Watermelon', 'Pastèque', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 1, 'manual'),
('Melon (cantaloupe)', 'Melon', 34, 0.8, 8.2, 0.2, 0.9, 7.9, 16, 'manual'),
('Peach', 'Pêche', 39, 0.9, 9.5, 0.3, 1.5, 8.4, 0, 'manual'),
('Nectarine', 'Nectarine', 44, 1.1, 10.6, 0.3, 1.7, 7.7, 0, 'manual'),
('Plum', 'Prune', 46, 0.7, 11.4, 0.3, 1.4, 9.9, 0, 'manual'),
('Cherry', 'Cerises', 63, 1.1, 16.0, 0.2, 2.1, 12.8, 0, 'manual'),
('Pear', 'Poire', 57, 0.4, 15.2, 0.1, 3.1, 9.8, 1, 'manual'),
('Apricot', 'Abricot', 48, 1.4, 11.1, 0.4, 2.0, 9.2, 1, 'manual'),
('Lemon', 'Citron', 29, 1.1, 9.3, 0.3, 2.8, 2.5, 2, 'manual'),
('Lime', 'Citron vert', 30, 0.7, 10.5, 0.2, 2.8, 1.7, 2, 'manual'),
('Grapefruit', 'Pamplemousse', 42, 0.8, 10.7, 0.1, 1.6, 6.9, 0, 'manual'),
('Pomegranate', 'Grenade', 83, 1.7, 18.7, 1.2, 4.0, 13.7, 3, 'manual'),
('Papaya', 'Papaye', 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8, 'manual'),
('Passion fruit', 'Fruit de la passion', 97, 2.2, 23.4, 0.7, 10.4, 11.2, 28, 'manual'),
('Clementine', 'Clémentine', 47, 0.9, 12.0, 0.2, 1.7, 9.2, 1, 'manual'),
('Fig (fresh)', 'Figue fraîche', 74, 0.8, 19.2, 0.3, 2.9, 16.3, 1, 'manual'),

-- Fruits secs
('Dates', 'Dattes', 277, 1.8, 74.5, 0.2, 6.7, 66.5, 1, 'manual'),
('Raisins (dried)', 'Raisins secs', 296, 3.1, 79.2, 0.5, 3.7, 59.2, 26, 'manual'),
('Dried apricot', 'Abricots secs', 241, 3.4, 62.6, 0.5, 7.3, 53.0, 10, 'manual'),
('Prune (dried plum)', 'Pruneaux', 240, 2.2, 63.9, 0.4, 7.1, 38.1, 2, 'manual'),
('Cranberries (dried)', 'Canneberges séchées', 308, 0.1, 82.4, 1.1, 5.3, 72.6, 6, 'manual'),

-- ============================================================
-- 🥜 NOIX, GRAINES ET OLÉAGINEUX
-- ============================================================
('Almonds', 'Amandes', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1, 'manual'),
('Walnuts', 'Noix', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2, 'manual'),
('Cashews', 'Noix de cajou', 553, 18.2, 30.2, 43.8, 3.3, 5.9, 12, 'manual'),
('Pistachios', 'Pistaches', 560, 20.2, 27.2, 45.3, 10.6, 7.7, 1, 'manual'),
('Peanuts', 'Arachides / Cacahuètes', 567, 25.8, 16.1, 49.2, 8.5, 4.7, 18, 'manual'),
('Hazelnuts', 'Noisettes', 628, 15.0, 16.7, 60.8, 9.7, 4.3, 0, 'manual'),
('Macadamia nuts', 'Noix de macadamia', 718, 7.9, 13.8, 75.8, 8.6, 4.6, 5, 'manual'),
('Pecan nuts', 'Noix de pécan', 691, 9.2, 13.9, 71.9, 9.6, 4.0, 0, 'manual'),
('Pumpkin seeds', 'Graines de courge', 559, 30.2, 10.7, 49.1, 6.0, 1.3, 7, 'manual'),
('Sunflower seeds', 'Graines de tournesol', 584, 20.8, 20.0, 51.5, 8.6, 2.6, 9, 'manual'),
('Chia seeds', 'Graines de chia', 486, 16.5, 42.1, 30.7, 34.4, 0, 16, 'manual'),
('Flaxseeds', 'Graines de lin', 534, 18.3, 28.9, 42.2, 27.3, 1.5, 30, 'manual'),
('Hemp seeds', 'Graines de chanvre', 553, 31.6, 8.7, 48.8, 4.0, 1.5, 5, 'manual'),
('Sesame seeds', 'Graines de sésame', 573, 17.7, 23.5, 49.7, 11.8, 0.3, 11, 'manual'),
('Peanut butter', 'Beurre de cacahuète', 598, 22.0, 20.0, 51.1, 6.0, 8.3, 450, 'manual'),
('Almond butter', 'Purée d''amande', 614, 21.0, 19.0, 56.0, 10.5, 4.4, 2, 'manual'),

-- ============================================================
-- 🫙 MATIÈRES GRASSES ET HUILES
-- ============================================================
('Olive oil', 'Huile d''olive', 884, 0, 0, 100, 0, 0, 2, 'manual'),
('Sunflower oil', 'Huile de tournesol', 884, 0, 0, 100, 0, 0, 0, 'manual'),
('Rapeseed / Canola oil', 'Huile de colza', 884, 0, 0, 100, 0, 0, 0, 'manual'),
('Coconut oil', 'Huile de coco', 892, 0, 0, 99.1, 0, 0, 0, 'manual'),
('Ghee', 'Ghee (beurre clarifié)', 900, 0, 0, 99.8, 0, 0, 2, 'manual'),
('Margarine', 'Margarine', 717, 0.2, 0.4, 80.0, 0, 0.2, 653, 'manual'),
('Mayonnaise', 'Mayonnaise', 680, 1.3, 2.6, 75.0, 0, 1.2, 635, 'manual'),
('Hummus', 'Houmous', 166, 7.9, 14.3, 9.6, 6.0, 0.9, 379, 'manual'),

-- ============================================================
-- 🍫 SUCRES, CONFISERIES ET EXTRAS
-- ============================================================
('Honey', 'Miel', 304, 0.3, 82.4, 0, 0.2, 82.1, 4, 'manual'),
('White sugar', 'Sucre blanc', 400, 0, 100, 0, 0, 100, 1, 'manual'),
('Brown sugar', 'Sucre roux / Cassonade', 380, 0, 98.1, 0, 0, 97.0, 28, 'manual'),
('Dark chocolate (70%+)', 'Chocolat noir (70%+)', 598, 7.8, 45.9, 42.6, 10.9, 23.0, 20, 'manual'),
('Milk chocolate', 'Chocolat au lait', 535, 7.7, 59.4, 29.7, 3.4, 56.9, 79, 'manual'),
('White chocolate', 'Chocolat blanc', 539, 5.9, 59.2, 32.1, 0, 58.3, 90, 'manual'),
('Dark chocolate powder', 'Cacao en poudre non sucré', 228, 19.6, 57.9, 13.7, 33.0, 0, 21, 'manual'),
('Jam / Jelly', 'Confiture (toutes)', 250, 0.4, 64.6, 0.1, 0.8, 55.0, 22, 'manual'),
('Nutella', 'Nutella', 539, 6.3, 57.5, 30.9, 3.4, 56.3, 107, 'manual'),
('Cookie (plain)', 'Biscuit sec (type petit beurre)', 458, 7.5, 72.5, 16.0, 2.5, 29.0, 350, 'manual'),

-- ============================================================
-- 🥤 BOISSONS
-- ============================================================
('Water (still)', 'Eau plate', 0, 0, 0, 0, 0, 0, 10, 'manual'),
('Coffee (black)', 'Café noir', 2, 0.3, 0, 0, 0, 0, 4, 'manual'),
('Espresso', 'Espresso', 9, 0.6, 1.5, 0.2, 0, 0, 14, 'manual'),
('Tea (black, unsweetened)', 'Thé noir (sans sucre)', 1, 0.1, 0.3, 0, 0, 0, 3, 'manual'),
('Orange juice (fresh)', 'Jus d''orange frais', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 1, 'manual'),
('Apple juice', 'Jus de pomme', 46, 0.1, 11.5, 0.1, 0.1, 10.9, 4, 'manual'),
('Beer (lager, 5%)', 'Bière blonde (5%)', 43, 0.5, 3.6, 0, 0, 0, 11, 'manual'),
('Red wine (12%)', 'Vin rouge (12%)', 85, 0.1, 2.7, 0, 0, 0.9, 6, 'manual'),
('White wine (12%)', 'Vin blanc (12%)', 82, 0.1, 2.6, 0, 0, 0.6, 7, 'manual'),
('Whey protein shake (in water)', 'Shake protéine whey (eau)', 40, 8.0, 2.0, 0.5, 0, 1.5, 60, 'manual'),

-- ============================================================
-- 🏋️ SUPPLÉMENTS SPORTIFS
-- ============================================================
('Whey protein (concentrate)', 'Whey protéine (concentrée)', 380, 75.0, 8.0, 6.5, 0, 5.0, 170, 'manual'),
('Whey protein (isolate)', 'Whey protéine (isolat)', 370, 85.0, 4.5, 2.0, 0, 3.0, 140, 'manual'),
('Casein protein', 'Caséine', 364, 79.0, 4.5, 3.0, 0, 2.0, 230, 'manual'),
('Creatine monohydrate', 'Créatine monohydrate', 0, 0, 0, 0, 0, 0, 0, 'manual'),
('BCAA powder', 'BCAA poudre', 200, 50.0, 0, 0, 0, 0, 0, 'manual'),

-- ============================================================
-- 🍽️ PLATS ET PRÉPARATIONS COURANTS
-- ============================================================
('Lentil soup', 'Soupe de lentilles', 71, 4.8, 11.5, 0.5, 3.0, 1.5, 390, 'manual'),
('Vegetable soup', 'Soupe de légumes', 38, 1.5, 7.0, 0.6, 1.5, 2.5, 380, 'manual'),
('Tomato soup', 'Soupe de tomate', 60, 1.8, 10.5, 1.5, 1.0, 5.5, 490, 'manual'),
('Bolognese sauce', 'Sauce bolognaise', 130, 8.5, 7.5, 7.5, 1.5, 4.5, 500, 'manual'),
('Tomato sauce (plain)', 'Sauce tomate simple', 55, 2.0, 9.0, 1.2, 1.8, 5.5, 350, 'manual'),
('Pizza Margherita', 'Pizza margherita', 265, 11.0, 33.0, 10.0, 2.0, 3.5, 640, 'manual'),
('Quiche Lorraine', 'Quiche lorraine', 290, 9.5, 16.5, 21.5, 0.5, 2.0, 590, 'manual'),
('Omelette (plain)', 'Omelette nature', 154, 10.6, 0.5, 12.0, 0, 0.4, 164, 'manual'),
('Crêpe (plain)', 'Crêpe nature', 210, 6.0, 28.0, 8.5, 0.8, 3.5, 270, 'manual'),
('Waffles', 'Gaufres', 291, 6.9, 40.0, 12.0, 1.3, 8.0, 395, 'manual'),
('Pancakes', 'Pancakes', 227, 6.4, 28.0, 10.0, 0.9, 6.5, 380, 'manual'),
('Couscous (dish with vegetables)', 'Couscous complet (avec légumes)', 160, 8.0, 22.0, 5.0, 3.0, 3.5, 420, 'manual'),
('Ratatouille', 'Ratatouille', 45, 1.5, 7.5, 1.5, 2.5, 4.5, 300, 'manual'),
('Taboulé', 'Taboulé', 130, 3.0, 20.5, 4.5, 2.0, 2.5, 310, 'manual'),

-- ============================================================
-- 🌿 CONDIMENTS ET SAUCES
-- ============================================================
('Ketchup', 'Ketchup', 112, 1.7, 27.5, 0.1, 0.6, 22.7, 1040, 'manual'),
('Mustard (Dijon)', 'Moutarde de Dijon', 66, 4.4, 5.3, 3.3, 1.0, 0.9, 1135, 'manual'),
('Soy sauce', 'Sauce soja', 53, 8.1, 4.9, 0, 0.8, 0.4, 5493, 'manual'),
('Hot sauce (Tabasco style)', 'Sauce piquante', 12, 0.5, 1.9, 0.3, 0, 0.9, 3770, 'manual'),
('Vinegar (white)', 'Vinaigre blanc', 18, 0, 0.6, 0, 0, 0, 2, 'manual'),
('Vinegar (balsamic)', 'Vinaigre balsamique', 88, 0.5, 17.0, 0, 0, 15.5, 23, 'manual'),
('Tomato paste', 'Concentré de tomate', 82, 4.3, 18.8, 0.5, 4.0, 12.2, 780, 'manual')

ON CONFLICT DO NOTHING;

-- ============================================================
-- Mise à jour des index full-text pour la recherche
-- ============================================================
-- (Les index sont créés dans nutrition_schema.sql, pas besoin de les recréer)
