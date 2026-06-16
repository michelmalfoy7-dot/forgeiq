-- Seed Ciqual 2021 — ~200 aliments courants français
-- Colonnes : name, name_fr, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
--            serving_size_g, serving_unit, category, source,
--            sodium_mg, iron_mg, magnesium_mg, zinc_mg, calcium_mg, vitamin_d_mcg, potassium_mg, vitamin_c_mg

-- Contrainte unique sur name_fr (safe si déjà existante)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'foods_library_name_fr_unique') THEN
    ALTER TABLE foods_library ADD CONSTRAINT foods_library_name_fr_unique UNIQUE (name_fr);
  END IF;
END $$;

INSERT INTO foods_library
  (name, name_fr, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
   serving_size_g, serving_unit, category, source,
   sodium_mg, iron_mg, magnesium_mg, zinc_mg, calcium_mg, vitamin_d_mcg, potassium_mg, vitamin_c_mg)
VALUES

-- ═══════════════════════════════════════
-- VIANDES ROUGES
-- ═══════════════════════════════════════
('Beef sirloin', 'Bœuf, rumsteck', 127, 20.5, 0, 5.0, 0, 0, 100, 'g', 'viande', 'ciqual', 62, 2.0, 22, 4.5, 7, 0, 330, 0),
('Beef ribeye', 'Bœuf, entrecôte', 195, 18.8, 0, 13.2, 0, 0, 100, 'g', 'viande', 'ciqual', 58, 1.8, 20, 4.1, 7, 0, 310, 0),
('Beef tenderloin', 'Bœuf, filet', 119, 20.6, 0, 4.0, 0, 0, 100, 'g', 'viande', 'ciqual', 55, 2.1, 21, 4.4, 6, 0, 340, 0),
('Ground beef 5%', 'Bœuf haché 5% MG', 113, 20.0, 0, 5.0, 0, 0, 100, 'g', 'viande', 'ciqual', 70, 2.0, 21, 4.3, 6, 0, 330, 0),
('Ground beef 15%', 'Bœuf haché 15% MG', 187, 17.0, 0, 13.0, 0, 0, 100, 'g', 'viande', 'ciqual', 68, 1.8, 19, 4.0, 6, 0, 300, 0),
('Ground beef 20%', 'Bœuf haché 20% MG', 215, 16.5, 0, 17.0, 0, 0, 100, 'g', 'viande', 'ciqual', 65, 1.7, 18, 3.8, 6, 0, 290, 0),
('Lamb leg', 'Agneau, gigot', 145, 18.6, 0, 8.0, 0, 0, 100, 'g', 'viande', 'ciqual', 74, 1.8, 22, 3.7, 10, 0, 310, 0),
('Lamb chop', 'Agneau, côtelette', 190, 17.5, 0, 13.5, 0, 0, 100, 'g', 'viande', 'ciqual', 75, 1.6, 20, 3.5, 9, 0, 290, 0),
('Pork tenderloin', 'Porc, filet', 120, 22.5, 0, 3.5, 0, 0, 100, 'g', 'viande', 'ciqual', 60, 0.8, 24, 2.1, 5, 0, 360, 0),
('Pork chop', 'Porc, côte', 167, 18.6, 0, 10.5, 0, 0, 100, 'g', 'viande', 'ciqual', 64, 0.7, 20, 1.9, 5, 0, 330, 0),
('Veal escalope', 'Veau, escalope', 105, 20.5, 0, 3.0, 0, 0, 100, 'g', 'viande', 'ciqual', 68, 0.9, 22, 2.8, 7, 0, 360, 0),

-- ═══════════════════════════════════════
-- VOLAILLE
-- ═══════════════════════════════════════
('Chicken breast raw', 'Poulet, blanc cru', 106, 22.0, 0, 2.4, 0, 0, 100, 'g', 'viande', 'ciqual', 72, 0.4, 24, 0.8, 10, 0, 340, 0),
('Chicken thigh raw', 'Poulet, cuisse crue', 145, 18.5, 0, 7.8, 0, 0, 100, 'g', 'viande', 'ciqual', 82, 0.7, 22, 1.6, 10, 0, 290, 0),
('Chicken roasted', 'Poulet rôti', 164, 24.0, 0, 7.5, 0, 0, 100, 'g', 'viande', 'ciqual', 90, 0.9, 25, 1.7, 12, 0, 290, 0),
('Turkey breast', 'Dinde, blanc', 104, 22.8, 0, 1.7, 0, 0, 100, 'g', 'viande', 'ciqual', 68, 0.5, 24, 1.1, 10, 0, 360, 0),
('Duck breast', 'Canard, magret cru', 130, 20.5, 0, 5.5, 0, 0, 100, 'g', 'viande', 'ciqual', 75, 2.3, 19, 1.9, 9, 0, 310, 0),

-- ═══════════════════════════════════════
-- POISSONS ET FRUITS DE MER
-- ═══════════════════════════════════════
('Salmon raw', 'Saumon cru', 179, 19.8, 0, 11.0, 0, 0, 100, 'g', 'poisson', 'ciqual', 44, 0.5, 27, 0.5, 12, 11.0, 370, 3),
('Tuna canned water', 'Thon en boîte au naturel', 93, 22.5, 0, 0.6, 0, 0, 100, 'g', 'poisson', 'ciqual', 295, 1.2, 28, 0.6, 12, 4.5, 250, 0),
('Tuna steak', 'Thon rouge', 130, 24.0, 0, 4.0, 0, 0, 100, 'g', 'poisson', 'ciqual', 50, 0.8, 31, 0.5, 8, 2.0, 320, 0),
('Cod', 'Cabillaud', 69, 15.6, 0, 0.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 65, 0.4, 26, 0.4, 20, 1.0, 340, 0),
('Pollock', 'Lieu noir', 70, 16.0, 0, 0.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 72, 0.3, 25, 0.5, 18, 1.2, 340, 0),
('Sea bream', 'Dorade', 105, 20.3, 0, 3.2, 0, 0, 100, 'g', 'poisson', 'ciqual', 64, 0.3, 27, 0.5, 32, 3.0, 380, 0),
('Sea bass', 'Bar (loup de mer)', 101, 18.6, 0, 3.4, 0, 0, 100, 'g', 'poisson', 'ciqual', 82, 0.4, 24, 0.6, 38, 2.5, 330, 0),
('Sole', 'Sole', 73, 16.9, 0, 0.8, 0, 0, 100, 'g', 'poisson', 'ciqual', 70, 0.3, 22, 0.4, 22, 2.0, 290, 0),
('Sardines canned', 'Sardines en boîte', 185, 24.6, 0, 10.4, 0, 0, 100, 'g', 'poisson', 'ciqual', 430, 2.8, 31, 1.2, 351, 8.0, 380, 0),
('Mackerel', 'Maquereau', 181, 18.6, 0, 12.4, 0, 0, 100, 'g', 'poisson', 'ciqual', 90, 1.2, 30, 0.6, 12, 16.0, 340, 0),
('Smoked salmon', 'Saumon fumé', 175, 25.4, 0, 8.1, 0, 0, 100, 'g', 'poisson', 'ciqual', 1200, 0.9, 24, 0.4, 14, 6.0, 310, 0),
('Shrimp', 'Crevettes cuites', 80, 18.0, 0, 0.9, 0, 0, 100, 'g', 'poisson', 'ciqual', 185, 0.3, 26, 1.2, 50, 0.8, 170, 0),
('Mussels', 'Moules cuites', 67, 11.5, 2.8, 1.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 290, 3.9, 28, 1.7, 33, 0.8, 280, 0),
('Scallop', 'Noix de Saint-Jacques', 75, 14.0, 3.0, 0.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 120, 0.2, 20, 0.9, 21, 0.5, 340, 2),
('Tilapia', 'Tilapia', 90, 19.2, 0, 1.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 56, 0.4, 25, 0.5, 14, 1.2, 380, 0),
('Trout', 'Truite', 149, 20.8, 0, 7.5, 0, 0, 100, 'g', 'poisson', 'ciqual', 54, 0.5, 26, 0.6, 64, 8.0, 370, 3),

-- ═══════════════════════════════════════
-- LÉGUMES
-- ═══════════════════════════════════════
('Broccoli', 'Brocoli', 35, 3.5, 3.4, 0.5, 2.6, 1.0, 100, 'g', 'légume', 'ciqual', 33, 0.7, 21, 0.4, 47, 0, 316, 89),
('Cauliflower', 'Chou-fleur', 27, 2.8, 2.9, 0.3, 2.5, 1.6, 100, 'g', 'légume', 'ciqual', 30, 0.4, 15, 0.3, 22, 0, 299, 59),
('Green beans', 'Haricots verts', 30, 2.0, 3.7, 0.2, 3.1, 1.8, 100, 'g', 'légume', 'ciqual', 5, 1.0, 25, 0.2, 37, 0, 211, 16),
('Spinach', 'Épinards crus', 23, 2.8, 1.3, 0.5, 2.2, 0.4, 100, 'g', 'légume', 'ciqual', 79, 2.7, 79, 0.5, 99, 0, 558, 28),
('Zucchini', 'Courgette', 17, 1.5, 1.7, 0.4, 1.0, 1.2, 100, 'g', 'légume', 'ciqual', 9, 0.4, 18, 0.3, 16, 0, 261, 17),
('Red pepper', 'Poivron rouge', 30, 1.0, 5.1, 0.3, 1.7, 4.0, 100, 'g', 'légume', 'ciqual', 4, 0.5, 12, 0.2, 8, 0, 211, 190),
('Green pepper', 'Poivron vert', 20, 0.9, 3.0, 0.2, 1.7, 2.5, 100, 'g', 'légume', 'ciqual', 4, 0.4, 11, 0.1, 10, 0, 175, 80),
('Cherry tomato', 'Tomate cerise', 26, 1.0, 4.0, 0.3, 1.1, 3.2, 100, 'g', 'légume', 'ciqual', 6, 0.4, 11, 0.1, 11, 0, 230, 19),
('Carrot', 'Carotte', 42, 0.9, 7.2, 0.2, 3.1, 4.9, 100, 'g', 'légume', 'ciqual', 77, 0.4, 12, 0.2, 33, 0, 320, 7),
('Beetroot', 'Betterave rouge cuite', 43, 1.8, 7.9, 0.1, 2.0, 6.5, 100, 'g', 'légume', 'ciqual', 71, 0.8, 23, 0.4, 16, 0, 325, 4),
('White cabbage', 'Chou blanc', 26, 1.5, 3.0, 0.2, 2.8, 3.0, 100, 'g', 'légume', 'ciqual', 18, 0.5, 12, 0.2, 40, 0, 246, 36),
('Onion', 'Oignon', 40, 1.0, 8.0, 0.2, 1.7, 4.7, 100, 'g', 'légume', 'ciqual', 4, 0.2, 10, 0.2, 23, 0, 157, 7),
('Garlic', 'Ail', 139, 5.7, 26.4, 0.3, 3.1, 0.5, 100, 'g', 'légume', 'ciqual', 17, 1.7, 25, 1.2, 181, 0, 401, 31),
('Button mushroom', 'Champignon de Paris', 22, 2.9, 0.6, 0.3, 1.7, 0.4, 100, 'g', 'légume', 'ciqual', 5, 0.5, 9, 0.5, 6, 0.2, 318, 4),
('Asparagus', 'Asperge', 20, 2.3, 1.5, 0.2, 2.1, 1.0, 100, 'g', 'légume', 'ciqual', 2, 1.5, 14, 0.5, 24, 0, 202, 7),
('Cucumber', 'Concombre', 13, 0.7, 1.5, 0.2, 0.8, 1.4, 100, 'g', 'légume', 'ciqual', 3, 0.3, 13, 0.2, 16, 0, 147, 3),
('Leek', 'Poireau', 30, 1.6, 4.3, 0.3, 1.8, 2.2, 100, 'g', 'légume', 'ciqual', 10, 2.1, 14, 0.1, 59, 0, 180, 12),
('Eggplant', 'Aubergine', 19, 1.0, 2.4, 0.2, 2.5, 2.0, 100, 'g', 'légume', 'ciqual', 3, 0.3, 14, 0.2, 9, 0, 229, 2),
('Avocado', 'Avocat', 161, 2.0, 0.7, 15.4, 6.7, 0.4, 100, 'g', 'légume', 'ciqual', 7, 0.6, 29, 0.6, 12, 0, 485, 10),
('Sweet corn', 'Maïs doux', 86, 3.2, 15.7, 1.4, 2.4, 3.2, 100, 'g', 'légume', 'ciqual', 15, 0.5, 26, 0.5, 2, 0, 270, 7),
('Green peas', 'Petits pois cuits', 69, 5.7, 8.6, 0.3, 5.1, 3.8, 100, 'g', 'légume', 'ciqual', 3, 1.5, 33, 0.9, 25, 0, 244, 14),
('Artichoke', 'Artichaut cuit', 51, 2.7, 8.1, 0.3, 5.4, 0.8, 100, 'g', 'légume', 'ciqual', 80, 1.3, 44, 0.5, 44, 0, 370, 8),
('Celery', 'Céleri-branche', 17, 1.0, 1.8, 0.2, 1.6, 1.7, 100, 'g', 'légume', 'ciqual', 80, 0.2, 11, 0.1, 40, 0, 260, 3),
('Fennel', 'Fenouil', 22, 1.2, 3.1, 0.2, 3.1, 1.8, 100, 'g', 'légume', 'ciqual', 52, 0.7, 17, 0.2, 49, 0, 414, 12),
('Pumpkin', 'Potiron', 21, 0.7, 4.3, 0.1, 0.5, 2.5, 100, 'g', 'légume', 'ciqual', 1, 0.4, 12, 0.3, 21, 0, 320, 9),
('Sweet potato', 'Patate douce cuite', 86, 1.6, 19.3, 0.1, 2.4, 5.6, 100, 'g', 'légume', 'ciqual', 36, 0.6, 20, 0.3, 30, 0, 337, 17),
('Potato boiled', 'Pomme de terre vapeur', 74, 2.0, 15.5, 0.1, 1.8, 0.7, 100, 'g', 'légume', 'ciqual', 7, 0.3, 20, 0.3, 12, 0, 421, 13),
('Potato baked', 'Pomme de terre cuite au four', 90, 2.5, 18.7, 0.2, 1.8, 0.8, 100, 'g', 'légume', 'ciqual', 8, 0.3, 22, 0.3, 13, 0, 450, 14),
('French fries', 'Frites surgelées cuites', 175, 3.0, 24.0, 7.5, 2.5, 0.4, 100, 'g', 'légume', 'ciqual', 250, 0.6, 16, 0.3, 10, 0, 340, 6),
('Radish', 'Radis', 16, 0.9, 1.5, 0.2, 1.5, 1.3, 100, 'g', 'légume', 'ciqual', 39, 0.3, 10, 0.1, 25, 0, 233, 22),

-- ═══════════════════════════════════════
-- LÉGUMINEUSES
-- ═══════════════════════════════════════
('Lentils cooked', 'Lentilles cuites', 116, 9.0, 17.5, 0.6, 6.9, 1.8, 100, 'g', 'légumineuse', 'ciqual', 2, 3.3, 36, 1.3, 19, 0, 369, 1),
('Chickpeas cooked', 'Pois chiches cuits', 164, 8.6, 25.0, 2.8, 7.6, 3.9, 100, 'g', 'légumineuse', 'ciqual', 7, 2.9, 48, 1.5, 49, 0, 291, 1),
('White beans cooked', 'Haricots blancs cuits', 109, 7.0, 16.8, 0.6, 6.3, 0.9, 100, 'g', 'légumineuse', 'ciqual', 2, 2.9, 45, 1.1, 69, 0, 454, 0),
('Kidney beans cooked', 'Haricots rouges cuits', 127, 8.7, 18.3, 0.5, 7.9, 1.2, 100, 'g', 'légumineuse', 'ciqual', 2, 2.5, 45, 1.1, 43, 0, 407, 0),
('Red lentils cooked', 'Lentilles corail cuites', 110, 8.0, 17.0, 0.5, 5.5, 1.5, 100, 'g', 'légumineuse', 'ciqual', 2, 3.0, 34, 1.2, 18, 0, 350, 1),
('Edamame', 'Edamame', 122, 11.9, 5.9, 5.6, 4.2, 2.2, 100, 'g', 'légumineuse', 'ciqual', 6, 2.3, 64, 1.4, 63, 0, 436, 6),
('Split peas cooked', 'Pois cassés cuits', 118, 8.3, 18.7, 0.4, 8.3, 3.3, 100, 'g', 'légumineuse', 'ciqual', 3, 1.3, 36, 1.0, 14, 0, 362, 0),
('Soy tempeh', 'Tempeh', 192, 20.3, 9.4, 10.8, 4.5, 0, 100, 'g', 'légumineuse', 'ciqual', 9, 2.7, 81, 1.1, 111, 0, 412, 0),
('Tofu firm', 'Tofu ferme', 76, 8.1, 1.9, 4.2, 0.3, 0.3, 100, 'g', 'légumineuse', 'ciqual', 7, 1.6, 30, 0.8, 138, 0, 110, 0),

-- ═══════════════════════════════════════
-- FRUITS FRAIS
-- ═══════════════════════════════════════
('Apple', 'Pomme', 54, 0.3, 12.5, 0.2, 2.4, 10.4, 100, 'g', 'fruit', 'ciqual', 1, 0.1, 5, 0.1, 6, 0, 107, 6),
('Banana', 'Banane', 90, 1.1, 20.4, 0.2, 2.6, 12.2, 100, 'g', 'fruit', 'ciqual', 1, 0.3, 27, 0.2, 5, 0, 358, 9),
('Orange', 'Orange', 45, 0.9, 8.6, 0.2, 2.2, 8.5, 100, 'g', 'fruit', 'ciqual', 1, 0.1, 10, 0.1, 40, 0, 181, 53),
('Strawberry', 'Fraise', 33, 0.7, 5.3, 0.4, 2.0, 5.0, 100, 'g', 'fruit', 'ciqual', 1, 0.4, 13, 0.1, 16, 0, 153, 60),
('Raspberry', 'Framboise', 40, 1.2, 4.9, 0.6, 6.7, 4.4, 100, 'g', 'fruit', 'ciqual', 1, 0.7, 22, 0.4, 25, 0, 151, 26),
('Blueberry', 'Myrtille', 51, 0.7, 10.2, 0.5, 2.4, 7.3, 100, 'g', 'fruit', 'ciqual', 1, 0.3, 6, 0.2, 6, 0, 77, 10),
('Grape', 'Raisin', 68, 0.7, 15.4, 0.3, 0.9, 15.5, 100, 'g', 'fruit', 'ciqual', 3, 0.4, 7, 0.1, 10, 0, 191, 4),
('Mango', 'Mangue', 65, 0.8, 14.0, 0.4, 1.6, 13.7, 100, 'g', 'fruit', 'ciqual', 3, 0.2, 10, 0.1, 11, 0, 168, 36),
('Pineapple', 'Ananas', 53, 0.4, 12.1, 0.1, 1.4, 9.9, 100, 'g', 'fruit', 'ciqual', 1, 0.3, 12, 0.1, 13, 0, 109, 48),
('Pear', 'Poire', 56, 0.4, 12.3, 0.3, 3.1, 9.8, 100, 'g', 'fruit', 'ciqual', 1, 0.2, 7, 0.1, 11, 0, 116, 4),
('Kiwi', 'Kiwi', 57, 1.1, 9.5, 0.6, 3.0, 8.9, 100, 'g', 'fruit', 'ciqual', 5, 0.3, 17, 0.1, 34, 0, 312, 93),
('Peach', 'Pêche', 42, 0.9, 7.3, 0.3, 2.2, 6.9, 100, 'g', 'fruit', 'ciqual', 1, 0.3, 9, 0.1, 6, 0, 190, 7),
('Apricot', 'Abricot', 47, 1.4, 7.6, 0.4, 2.1, 7.1, 100, 'g', 'fruit', 'ciqual', 1, 0.4, 10, 0.2, 13, 0, 259, 10),
('Cherry', 'Cerise', 68, 1.2, 13.8, 0.4, 1.6, 11.5, 100, 'g', 'fruit', 'ciqual', 1, 0.4, 11, 0.1, 13, 0, 222, 7),
('Watermelon', 'Pastèque', 30, 0.6, 6.1, 0.2, 0.4, 5.9, 100, 'g', 'fruit', 'ciqual', 1, 0.2, 10, 0.1, 7, 0, 112, 8),
('Melon', 'Melon', 35, 0.8, 7.2, 0.2, 0.9, 6.9, 100, 'g', 'fruit', 'ciqual', 10, 0.2, 12, 0.1, 9, 0, 267, 18),
('Plum', 'Prune', 52, 0.7, 10.8, 0.3, 1.5, 9.9, 100, 'g', 'fruit', 'ciqual', 1, 0.2, 7, 0.1, 6, 0, 157, 10),
('Grapefruit', 'Pamplemousse', 42, 0.8, 7.7, 0.1, 1.7, 6.9, 100, 'g', 'fruit', 'ciqual', 1, 0.1, 9, 0.1, 22, 0, 135, 45),
('Lemon', 'Citron', 31, 1.0, 4.4, 0.5, 2.8, 3.5, 100, 'g', 'fruit', 'ciqual', 3, 0.4, 12, 0.1, 26, 0, 138, 53),
('Fig', 'Figue fraîche', 74, 0.8, 17.0, 0.3, 2.9, 16.3, 100, 'g', 'fruit', 'ciqual', 1, 0.4, 17, 0.2, 35, 0, 232, 2),

-- ═══════════════════════════════════════
-- FRUITS SECS ET OLÉAGINEUX
-- ═══════════════════════════════════════
('Almonds', 'Amandes', 575, 21.1, 5.0, 50.3, 12.2, 3.8, 30, 'g', 'oléagineux', 'ciqual', 1, 3.7, 270, 3.1, 264, 0, 705, 0),
('Walnuts', 'Noix', 658, 15.2, 3.5, 62.5, 6.7, 2.6, 30, 'g', 'oléagineux', 'ciqual', 2, 2.9, 158, 3.1, 98, 0, 441, 1),
('Peanuts', 'Cacahuètes', 580, 25.0, 9.7, 46.5, 8.0, 4.3, 30, 'g', 'oléagineux', 'ciqual', 18, 2.0, 184, 3.3, 54, 0, 705, 0),
('Cashews', 'Noix de cajou', 580, 16.9, 22.4, 45.1, 3.3, 5.7, 30, 'g', 'oléagineux', 'ciqual', 12, 6.7, 292, 5.8, 37, 0, 660, 0),
('Hazelnuts', 'Noisettes', 646, 14.2, 5.0, 61.3, 9.6, 4.3, 30, 'g', 'oléagineux', 'ciqual', 1, 4.7, 163, 2.4, 114, 0, 680, 6),
('Pistachios', 'Pistaches', 571, 21.2, 12.8, 45.8, 10.6, 7.8, 30, 'g', 'oléagineux', 'ciqual', 6, 4.2, 121, 2.2, 107, 0, 1025, 5),
('Pumpkin seeds', 'Graines de courge', 559, 30.2, 10.7, 45.8, 6.0, 1.4, 30, 'g', 'oléagineux', 'ciqual', 9, 8.8, 592, 7.8, 46, 0, 809, 2),
('Sunflower seeds', 'Graines de tournesol', 584, 20.8, 20.0, 51.5, 8.6, 2.3, 30, 'g', 'oléagineux', 'ciqual', 3, 5.3, 325, 5.0, 78, 0, 645, 1),
('Chia seeds', 'Graines de chia', 490, 16.5, 7.7, 30.7, 34.4, 0, 15, 'g', 'oléagineux', 'ciqual', 16, 7.7, 335, 4.6, 631, 0, 407, 1),
('Flax seeds', 'Graines de lin', 534, 18.3, 1.5, 42.2, 27.3, 0, 15, 'g', 'oléagineux', 'ciqual', 30, 5.7, 392, 4.3, 255, 0, 813, 0),
('Dried raisins', 'Raisins secs', 301, 2.7, 67.1, 0.5, 4.5, 59.2, 30, 'g', 'fruit séché', 'ciqual', 11, 1.9, 32, 0.2, 50, 0, 749, 4),
('Dried apricots', 'Abricots secs', 243, 3.4, 53.0, 0.5, 7.3, 53.0, 30, 'g', 'fruit séché', 'ciqual', 10, 2.7, 32, 0.4, 55, 0, 1162, 1),
('Dates', 'Dattes', 282, 2.5, 66.5, 0.4, 8.7, 63.4, 30, 'g', 'fruit séché', 'ciqual', 2, 1.0, 54, 0.3, 64, 0, 696, 0),
('Prunes', 'Pruneaux', 241, 2.2, 56.0, 0.4, 7.1, 38.1, 30, 'g', 'fruit séché', 'ciqual', 2, 0.9, 41, 0.3, 43, 0, 745, 1),
('Peanut butter', 'Beurre de cacahuète', 590, 25.0, 20.0, 49.9, 6.0, 9.2, 30, 'g', 'oléagineux', 'ciqual', 389, 1.9, 154, 2.9, 49, 0, 649, 0),
('Almond butter', 'Purée d''amande', 614, 21.2, 7.5, 55.7, 12.5, 4.3, 30, 'g', 'oléagineux', 'ciqual', 7, 3.9, 270, 2.9, 266, 0, 746, 0),

-- ═══════════════════════════════════════
-- CÉRÉALES, PÂTES, RIZ
-- ═══════════════════════════════════════
('Oats', 'Flocons d''avoine', 372, 13.3, 58.0, 7.0, 9.4, 1.0, 100, 'g', 'céréale', 'ciqual', 2, 4.6, 129, 3.6, 54, 0, 362, 0),
('Pasta raw', 'Pâtes crues', 350, 13.0, 67.0, 1.8, 3.0, 2.0, 100, 'g', 'céréale', 'ciqual', 6, 1.8, 53, 1.4, 21, 0, 223, 0),
('Pasta cooked', 'Pâtes cuites', 158, 5.8, 30.1, 0.9, 1.8, 0.6, 100, 'g', 'céréale', 'ciqual', 3, 0.8, 24, 0.6, 9, 0, 44, 0),
('White rice raw', 'Riz blanc cru', 356, 6.7, 77.5, 0.7, 0.4, 0, 100, 'g', 'céréale', 'ciqual', 5, 0.8, 25, 1.4, 28, 0, 115, 0),
('White rice cooked', 'Riz blanc cuit', 130, 2.5, 27.8, 0.3, 0.3, 0, 100, 'g', 'céréale', 'ciqual', 1, 0.2, 8, 0.5, 10, 0, 35, 0),
('Brown rice cooked', 'Riz complet cuit', 132, 2.6, 26.8, 0.9, 1.8, 0, 100, 'g', 'céréale', 'ciqual', 4, 0.4, 44, 0.6, 10, 0, 79, 0),
('Quinoa cooked', 'Quinoa cuit', 120, 4.4, 21.3, 1.9, 2.8, 0, 100, 'g', 'céréale', 'ciqual', 7, 1.5, 64, 1.1, 17, 0, 172, 0),
('Bulgur cooked', 'Boulgour cuit', 83, 3.1, 15.8, 0.2, 3.5, 0, 100, 'g', 'céréale', 'ciqual', 5, 0.9, 32, 0.7, 10, 0, 68, 0),
('Couscous cooked', 'Couscous cuit', 112, 3.8, 23.2, 0.2, 1.4, 0, 100, 'g', 'céréale', 'ciqual', 6, 0.4, 8, 0.3, 8, 0, 58, 0),
('White bread', 'Pain blanc', 264, 8.8, 51.5, 2.7, 2.7, 2.9, 100, 'g', 'pain', 'ciqual', 530, 2.7, 24, 0.7, 152, 0, 119, 0),
('Wholegrain bread', 'Pain complet', 241, 8.5, 42.9, 3.0, 6.5, 3.7, 100, 'g', 'pain', 'ciqual', 400, 2.5, 68, 1.5, 54, 0, 248, 0),
('Rye bread', 'Pain de seigle', 258, 8.5, 48.0, 1.7, 6.2, 2.9, 100, 'g', 'pain', 'ciqual', 560, 2.0, 40, 1.8, 73, 0, 280, 0),
('Baguette', 'Baguette', 272, 9.0, 54.0, 1.7, 2.7, 2.3, 100, 'g', 'pain', 'ciqual', 490, 1.8, 22, 0.7, 34, 0, 110, 0),
('Brioche', 'Brioche', 373, 9.0, 52.0, 14.0, 1.5, 13.5, 100, 'g', 'pain', 'ciqual', 320, 1.5, 16, 0.7, 60, 0.4, 120, 0),
('Muesli', 'Muesli', 366, 9.1, 63.2, 7.4, 6.0, 28.5, 100, 'g', 'céréale', 'ciqual', 40, 4.5, 100, 2.5, 75, 0, 450, 5),
('Cornflakes', 'Corn flakes', 370, 7.5, 81.0, 0.9, 3.3, 6.8, 100, 'g', 'céréale', 'ciqual', 620, 6.7, 14, 0.4, 3, 0, 100, 17),
('Oat bran', 'Son d''avoine', 246, 17.3, 26.6, 7.0, 15.4, 1.5, 100, 'g', 'céréale', 'ciqual', 4, 5.4, 235, 3.1, 58, 0, 566, 0),
('Rice cake', 'Galette de riz', 393, 7.5, 85.5, 2.7, 1.9, 0.8, 100, 'g', 'céréale', 'ciqual', 30, 0.8, 50, 1.5, 5, 0, 100, 0),
('Wheat tortilla', 'Tortilla de blé', 300, 8.2, 51.0, 5.5, 2.8, 2.5, 100, 'g', 'pain', 'ciqual', 560, 2.0, 20, 0.6, 90, 0, 130, 0),
('Buckwheat cooked', 'Sarrasin cuit', 92, 3.4, 19.9, 0.6, 2.7, 0, 100, 'g', 'céréale', 'ciqual', 4, 0.8, 51, 0.7, 7, 0, 88, 0),

-- ═══════════════════════════════════════
-- PRODUITS LAITIERS
-- ═══════════════════════════════════════
('Whole milk', 'Lait entier', 65, 3.2, 4.7, 3.6, 0, 4.7, 100, 'ml', 'laitage', 'ciqual', 43, 0.1, 10, 0.4, 119, 0.1, 152, 1),
('Semi-skimmed milk', 'Lait demi-écrémé', 47, 3.3, 4.9, 1.6, 0, 4.9, 100, 'ml', 'laitage', 'ciqual', 47, 0.0, 10, 0.4, 122, 0.1, 155, 1),
('Skimmed milk', 'Lait écrémé', 36, 3.6, 4.9, 0.1, 0, 4.9, 100, 'ml', 'laitage', 'ciqual', 52, 0.0, 11, 0.4, 125, 0.1, 160, 1),
('Plain yogurt', 'Yaourt nature', 59, 4.7, 4.6, 2.2, 0, 4.6, 100, 'g', 'laitage', 'ciqual', 75, 0.1, 14, 0.6, 145, 0, 185, 0),
('Greek yogurt 0%', 'Yaourt grec 0% MG', 59, 10.0, 4.6, 0.1, 0, 4.6, 100, 'g', 'laitage', 'ciqual', 40, 0.1, 11, 0.4, 110, 0, 140, 0),
('Greek yogurt full', 'Yaourt grec entier', 133, 9.0, 5.4, 8.7, 0, 5.4, 100, 'g', 'laitage', 'ciqual', 45, 0.1, 11, 0.4, 110, 0, 141, 0),
('Quark 0%', 'Fromage blanc 0% MG', 47, 7.3, 3.9, 0.2, 0, 3.9, 100, 'g', 'laitage', 'ciqual', 40, 0.1, 9, 0.4, 95, 0, 140, 0),
('Quark 3.8%', 'Fromage blanc 3.8% MG', 77, 7.2, 4.4, 3.8, 0, 4.4, 100, 'g', 'laitage', 'ciqual', 48, 0.1, 10, 0.4, 100, 0, 130, 0),
('Skyr', 'Skyr', 63, 11.0, 4.0, 0.2, 0, 4.0, 100, 'g', 'laitage', 'ciqual', 45, 0.1, 12, 0.4, 130, 0, 150, 0),
('Crème fraîche 30%', 'Crème fraîche 30% MG', 292, 2.3, 3.5, 30.0, 0, 3.5, 100, 'g', 'laitage', 'ciqual', 38, 0.1, 8, 0.2, 96, 0.1, 122, 0),
('Light crème fraîche', 'Crème fraîche allégée 15%', 166, 2.8, 3.2, 15.0, 0, 3.2, 100, 'g', 'laitage', 'ciqual', 45, 0.1, 8, 0.2, 100, 0, 128, 0),
('Butter', 'Beurre', 730, 0.6, 0.6, 82.0, 0, 0.6, 100, 'g', 'matière grasse', 'ciqual', 630, 0.0, 2, 0.1, 24, 1.2, 26, 0),

-- ═══════════════════════════════════════
-- FROMAGES
-- ═══════════════════════════════════════
('Emmental', 'Emmental', 384, 28.0, 0, 30.2, 0, 0, 30, 'g', 'fromage', 'ciqual', 450, 0.2, 36, 4.4, 1010, 0.3, 88, 0),
('Comté', 'Comté', 413, 27.0, 0, 34.0, 0, 0, 30, 'g', 'fromage', 'ciqual', 548, 0.2, 41, 4.5, 1026, 0.4, 91, 0),
('Camembert', 'Camembert', 263, 18.6, 0.7, 20.6, 0, 0, 30, 'g', 'fromage', 'ciqual', 637, 0.3, 15, 2.6, 350, 0.1, 162, 0),
('Brie', 'Brie', 319, 20.0, 0.3, 26.0, 0, 0, 30, 'g', 'fromage', 'ciqual', 700, 0.3, 19, 2.8, 450, 0.2, 152, 0),
('Mozzarella', 'Mozzarella', 280, 18.4, 1.6, 22.0, 0, 0, 30, 'g', 'fromage', 'ciqual', 600, 0.1, 20, 2.9, 505, 0.1, 76, 0),
('Mozzarella light', 'Mozzarella allégée', 170, 17.0, 2.0, 10.0, 0, 0, 30, 'g', 'fromage', 'ciqual', 420, 0.1, 15, 1.5, 310, 0, 60, 0),
('Parmesan', 'Parmesan', 432, 35.6, 0, 32.6, 0, 0, 15, 'g', 'fromage', 'ciqual', 1520, 0.8, 44, 2.8, 1184, 0.5, 92, 0),
('Cheddar', 'Cheddar', 410, 25.4, 0.1, 34.3, 0, 0, 30, 'g', 'fromage', 'ciqual', 640, 0.3, 28, 3.1, 720, 0.3, 98, 0),
('Feta', 'Feta', 264, 14.2, 1.2, 22.5, 0, 0, 30, 'g', 'fromage', 'ciqual', 1116, 0.4, 19, 2.9, 493, 0.2, 62, 0),
('Fresh goat cheese', 'Chèvre frais', 194, 12.4, 1.2, 15.8, 0, 0, 30, 'g', 'fromage', 'ciqual', 320, 0.9, 14, 0.6, 213, 0.1, 102, 0),
('Ricotta', 'Ricotta', 130, 8.0, 3.8, 8.8, 0, 0, 100, 'g', 'fromage', 'ciqual', 84, 0.4, 11, 1.2, 207, 0.1, 105, 0),
('Cottage cheese', 'Cottage cheese', 98, 12.5, 2.7, 4.3, 0, 2.7, 100, 'g', 'fromage', 'ciqual', 364, 0.1, 8, 0.4, 83, 0.1, 104, 0),
('Raclette', 'Raclette', 356, 24.0, 0, 28.5, 0, 0, 30, 'g', 'fromage', 'ciqual', 720, 0.1, 33, 3.8, 900, 0.2, 109, 0),
('Roquefort', 'Roquefort', 379, 19.5, 0, 33.1, 0, 0, 30, 'g', 'fromage', 'ciqual', 1809, 0.4, 29, 2.0, 530, 0.2, 121, 0),

-- ═══════════════════════════════════════
-- ŒUFS
-- ═══════════════════════════════════════
('Egg white', 'Blanc d''œuf', 49, 10.9, 0.3, 0.1, 0, 0.3, 100, 'g', 'œuf', 'ciqual', 166, 0.1, 9, 0.0, 7, 0, 163, 0),
('Egg yolk', 'Jaune d''œuf', 339, 15.7, 0.9, 29.4, 0, 0.9, 100, 'g', 'œuf', 'ciqual', 48, 2.9, 10, 2.1, 129, 4.2, 109, 0),
('Scrambled eggs', 'Œufs brouillés', 170, 11.5, 1.5, 13.0, 0, 1.5, 100, 'g', 'œuf', 'ciqual', 280, 1.9, 11, 1.1, 75, 1.6, 130, 0),

-- ═══════════════════════════════════════
-- HUILES ET MATIÈRES GRASSES
-- ═══════════════════════════════════════
('Olive oil', 'Huile d''olive', 884, 0, 0, 100, 0, 0, 10, 'ml', 'matière grasse', 'ciqual', 2, 0.1, 0, 0, 1, 0, 1, 0),
('Coconut oil', 'Huile de coco', 884, 0, 0, 100, 0, 0, 10, 'ml', 'matière grasse', 'ciqual', 0, 0, 0, 0, 0, 0, 0, 0),
('Rapeseed oil', 'Huile de colza', 884, 0, 0, 100, 0, 0, 10, 'ml', 'matière grasse', 'ciqual', 0, 0, 0, 0, 0, 13.0, 0, 0),
('Sunflower oil', 'Huile de tournesol', 884, 0, 0, 100, 0, 0, 10, 'ml', 'matière grasse', 'ciqual', 0, 0, 0, 0, 0, 0, 0, 0),

-- ═══════════════════════════════════════
-- CHARCUTERIES
-- ═══════════════════════════════════════
('Cooked ham', 'Jambon blanc (sans couenne)', 115, 16.5, 1.5, 5.0, 0, 1.2, 100, 'g', 'charcuterie', 'ciqual', 1050, 0.5, 15, 1.4, 12, 0.1, 210, 0),
('Dry-cured ham', 'Jambon de Parme', 217, 29.0, 0, 12.0, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 2140, 1.3, 22, 2.2, 12, 0, 330, 0),
('Sausage', 'Saucisson sec', 405, 24.0, 2.0, 34.0, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 1790, 1.8, 20, 3.4, 16, 0.2, 298, 0),
('Chorizo', 'Chorizo', 378, 22.7, 1.5, 31.2, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 1650, 1.5, 20, 3.0, 8, 0.1, 290, 0),
('Bacon', 'Lardons fumés', 340, 17.0, 0, 30.0, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 1200, 0.7, 14, 1.6, 8, 0.2, 230, 0),
('Frankfurt sausage', 'Saucisse de Francfort', 257, 11.8, 2.5, 23.0, 0, 1.5, 100, 'g', 'charcuterie', 'ciqual', 810, 0.8, 10, 1.4, 12, 0.2, 185, 0),
('Salami', 'Salami', 405, 22.0, 1.0, 35.0, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 1890, 1.8, 20, 3.0, 12, 0.2, 290, 0),
('Merguez', 'Merguez', 288, 18.5, 1.0, 23.5, 0, 0, 100, 'g', 'charcuterie', 'ciqual', 890, 1.5, 18, 2.5, 10, 0, 260, 0),

-- ═══════════════════════════════════════
-- SAUCES ET CONDIMENTS
-- ═══════════════════════════════════════
('Ketchup', 'Ketchup', 106, 1.5, 24.0, 0.1, 0.5, 21.5, 15, 'ml', 'sauce', 'ciqual', 960, 0.5, 12, 0.2, 14, 0, 280, 4),
('Mustard', 'Moutarde', 68, 4.2, 5.5, 3.5, 3.2, 1.5, 15, 'g', 'sauce', 'ciqual', 1120, 1.8, 28, 0.6, 58, 0, 152, 0),
('Mayonnaise', 'Mayonnaise', 680, 1.7, 2.5, 74.0, 0, 1.5, 15, 'g', 'sauce', 'ciqual', 640, 0.3, 3, 0.2, 15, 0.4, 45, 0),
('Soy sauce', 'Sauce soja', 60, 7.7, 6.8, 0, 0.4, 1.5, 15, 'ml', 'sauce', 'ciqual', 5720, 1.8, 40, 0.3, 18, 0, 350, 0),
('Balsamic vinegar', 'Vinaigre balsamique', 88, 0.5, 17.0, 0, 0, 14.0, 15, 'ml', 'sauce', 'ciqual', 23, 0.7, 12, 0.1, 27, 0, 112, 0),
('Hummus', 'Houmous', 186, 7.5, 14.3, 11.1, 5.1, 1.7, 100, 'g', 'sauce', 'ciqual', 450, 2.9, 47, 1.5, 40, 0, 283, 0),
('Tomato sauce', 'Sauce tomate basilic', 52, 2.0, 7.5, 1.8, 1.5, 5.0, 100, 'g', 'sauce', 'ciqual', 380, 0.8, 15, 0.3, 20, 0, 340, 12),
('Pesto', 'Pesto basilic', 371, 7.3, 3.2, 37.0, 2.5, 1.8, 30, 'g', 'sauce', 'ciqual', 750, 1.5, 32, 0.7, 100, 0, 185, 3),

-- ═══════════════════════════════════════
-- BOISSONS ET LAITAGES VÉGÉTAUX
-- ═══════════════════════════════════════
('Almond milk', 'Lait d''amande', 24, 0.5, 2.5, 1.4, 0.4, 2.5, 100, 'ml', 'boisson', 'ciqual', 70, 0.3, 6, 0.1, 120, 0, 67, 0),
('Soy milk', 'Lait de soja', 38, 3.0, 3.0, 1.9, 0.3, 2.5, 100, 'ml', 'boisson', 'ciqual', 55, 0.6, 19, 0.2, 25, 0, 120, 0),
('Oat milk', 'Lait d''avoine', 44, 1.0, 7.5, 1.5, 0.8, 3.5, 100, 'ml', 'boisson', 'ciqual', 48, 0.2, 11, 0.2, 120, 0, 60, 0),
('Orange juice', 'Jus d''orange pur jus', 44, 0.7, 9.7, 0.1, 0.2, 8.8, 100, 'ml', 'boisson', 'ciqual', 1, 0.2, 11, 0.1, 11, 0, 200, 50),
('Apple juice', 'Jus de pomme', 45, 0.1, 10.5, 0, 0, 9.9, 100, 'ml', 'boisson', 'ciqual', 3, 0.1, 3, 0.1, 8, 0, 101, 2),
('Protein shake (whey)', 'Shaker protéiné whey', 110, 22.0, 4.0, 2.0, 0, 3.0, 300, 'ml', 'boisson', 'ciqual', 120, 0.5, 30, 1.5, 170, 0, 180, 0),

-- ═══════════════════════════════════════
-- PROTÉINES EN POUDRE ET COMPLÉMENTS
-- ═══════════════════════════════════════
('Whey protein', 'Whey protéine concentrate', 375, 75.0, 7.5, 4.5, 0, 5.0, 30, 'g', 'complément', 'ciqual', 130, 0.5, 42, 1.4, 200, 0, 350, 0),
('Whey isolate', 'Whey protéine isolat', 365, 85.0, 4.0, 2.0, 0, 2.0, 30, 'g', 'complément', 'ciqual', 75, 0.4, 38, 1.2, 130, 0, 300, 0),
('Casein protein', 'Caséine micelaire', 370, 74.0, 8.0, 4.0, 0, 4.5, 30, 'g', 'complément', 'ciqual', 180, 0.4, 40, 1.5, 380, 0, 280, 0),
('Creatine', 'Créatine monohydrate', 0, 0, 0, 0, 0, 0, 5, 'g', 'complément', 'ciqual', 0, 0, 0, 0, 0, 0, 0, 0),

-- ═══════════════════════════════════════
-- CONFISERIES ET SNACKS
-- ═══════════════════════════════════════
('Dark chocolate 70%', 'Chocolat noir 70%', 580, 6.7, 35.5, 46.5, 11.9, 23.0, 30, 'g', 'confiserie', 'ciqual', 10, 8.3, 228, 2.8, 53, 0, 559, 0),
('Milk chocolate', 'Chocolat au lait', 545, 7.6, 55.5, 32.3, 2.4, 52.6, 30, 'g', 'confiserie', 'ciqual', 100, 1.5, 58, 0.9, 220, 0.2, 384, 0),
('Crisps', 'Chips nature', 536, 6.4, 52.1, 34.0, 4.4, 0.5, 30, 'g', 'snack', 'ciqual', 560, 1.4, 31, 0.6, 14, 0, 900, 19),
('Honey', 'Miel', 304, 0.4, 79.5, 0, 0.2, 76.6, 20, 'g', 'condiment', 'ciqual', 4, 0.4, 2, 0.1, 6, 0, 52, 1),
('Jam', 'Confiture de fraises', 270, 0.5, 67.0, 0.1, 0.5, 65.0, 20, 'g', 'condiment', 'ciqual', 9, 0.2, 4, 0.0, 16, 0, 82, 2),
('Cereal bar', 'Barre céréalière', 390, 6.5, 67.0, 11.5, 3.0, 30.0, 35, 'g', 'snack', 'ciqual', 120, 2.0, 30, 0.8, 60, 0, 170, 2),
('Rice protein bar', 'Barre protéinée', 350, 30.0, 40.0, 8.5, 2.5, 14.0, 60, 'g', 'snack', 'ciqual', 200, 1.5, 35, 1.5, 120, 0, 200, 0),

-- ═══════════════════════════════════════
-- PLATS PRÉPARÉS COURANTS
-- ═══════════════════════════════════════
('Lasagna bolognese', 'Lasagnes bolognaise', 130, 7.0, 13.5, 5.0, 1.2, 3.0, 300, 'g', 'plat', 'ciqual', 430, 1.0, 15, 1.2, 80, 0, 280, 3),
('Hachis parmentier', 'Hachis parmentier', 105, 6.5, 11.0, 4.0, 1.0, 2.0, 300, 'g', 'plat', 'ciqual', 380, 0.8, 14, 1.0, 40, 0, 260, 5),
('Tuna sandwich', 'Sandwich thon mayo', 235, 12.0, 30.0, 7.5, 1.5, 3.0, 180, 'g', 'plat', 'ciqual', 580, 1.0, 20, 0.7, 80, 0, 200, 2),
('Chicken Caesar salad', 'Salade César poulet', 145, 12.0, 8.0, 7.5, 1.5, 2.5, 200, 'g', 'plat', 'ciqual', 420, 0.8, 20, 1.0, 80, 0, 320, 5),

ON CONFLICT ON CONSTRAINT foods_library_name_fr_unique DO NOTHING;
