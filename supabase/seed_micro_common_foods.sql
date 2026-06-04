-- ─────────────────────────────────────────────────────────────────────────────
-- Seed micronutriments pour les aliments courants dans foods_library
-- Sources : ANSES / Table Ciqual 2021, USDA FoodData Central
-- Valeurs pour 100g
-- ─────────────────────────────────────────────────────────────────────────────
-- Stratégie : UPDATE uniquement les aliments déjà dans foods_library
-- Ne crée pas de doublons, ne touche pas aux macros existantes

UPDATE foods_library SET
  iron_mg      = 0.7,  magnesium_mg = 28,   zinc_mg      = 0.9,
  calcium_mg   = 11,   potassium_mg = 340,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%poulet%' AND (LOWER(name) LIKE '%blanc%' OR LOWER(name) LIKE '%filet%' OR LOWER(name) LIKE '%sein%');

UPDATE foods_library SET
  iron_mg      = 0.6,  magnesium_mg = 27,   zinc_mg      = 1.1,
  calcium_mg   = 10,   potassium_mg = 350,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%dinde%' AND (LOWER(name) LIKE '%blanc%' OR LOWER(name) LIKE '%filet%');

UPDATE foods_library SET
  iron_mg      = 1.8,  magnesium_mg = 18,   zinc_mg      = 3.2,
  calcium_mg   = 9,    potassium_mg = 270,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%boeuf%' OR LOWER(name) LIKE '%steak%' OR LOWER(name) LIKE '%viande hach%';

UPDATE foods_library SET
  iron_mg      = 1.0,  magnesium_mg = 21,   zinc_mg      = 1.5,
  calcium_mg   = 8,    potassium_mg = 300,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%porc%' OR LOWER(name) LIKE '%jambon%';

UPDATE foods_library SET
  iron_mg      = 0.3,  magnesium_mg = 27,   zinc_mg      = 0.5,
  calcium_mg   = 11,   potassium_mg = 366,  vitamin_c_mg = 0,
  vitamin_d_mcg = 11
WHERE LOWER(name) LIKE '%saumon%';

UPDATE foods_library SET
  iron_mg      = 1.0,  magnesium_mg = 24,   zinc_mg      = 0.6,
  calcium_mg   = 10,   potassium_mg = 230,  vitamin_c_mg = 0,
  vitamin_d_mcg = 1.2
WHERE LOWER(name) LIKE '%thon%';

UPDATE foods_library SET
  iron_mg      = 0.2,  magnesium_mg = 24,   zinc_mg      = 0.4,
  calcium_mg   = 16,   potassium_mg = 300,  vitamin_c_mg = 0,
  vitamin_d_mcg = 1.0
WHERE LOWER(name) LIKE '%cabillaud%' OR LOWER(name) LIKE '%merlu%' OR LOWER(name) LIKE '%colin%';

UPDATE foods_library SET
  iron_mg      = 1.8,  magnesium_mg = 10,   zinc_mg      = 1.1,
  calcium_mg   = 47,   potassium_mg = 126,  vitamin_c_mg = 0,
  vitamin_d_mcg = 1.75
WHERE LOWER(name) LIKE '%oeuf%' AND LOWER(name) NOT LIKE '%blanc%' AND LOWER(name) NOT LIKE '%jaune%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 10,   zinc_mg      = 0.1,
  calcium_mg   = 10,   potassium_mg = 130,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%blanc%' AND LOWER(name) LIKE '%oeuf%';

UPDATE foods_library SET
  iron_mg      = 3.6,  magnesium_mg = 12,   zinc_mg      = 2.3,
  calcium_mg   = 139,  potassium_mg = 109,  vitamin_c_mg = 0,
  vitamin_d_mcg = 4.94
WHERE LOWER(name) LIKE '%jaune%' AND LOWER(name) LIKE '%oeuf%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 11,   zinc_mg      = 0.5,
  calcium_mg   = 116,  potassium_mg = 170,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%skyr%' OR LOWER(name) LIKE '%fromage blanc%' OR LOWER(name) LIKE '%faisselle%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 12,   zinc_mg      = 0.5,
  calcium_mg   = 120,  potassium_mg = 170,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%yaourt%' OR LOWER(name) LIKE '%yog%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 10,   zinc_mg      = 0.4,
  calcium_mg   = 122,  potassium_mg = 152,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0.1
WHERE LOWER(name) LIKE '%lait%' AND LOWER(name) NOT LIKE '%laitue%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 13,   zinc_mg      = 0.4,
  calcium_mg   = 130,  potassium_mg = 160,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%cottage%';

UPDATE foods_library SET
  iron_mg      = 4.3,  magnesium_mg = 177,  zinc_mg      = 3.6,
  calcium_mg   = 52,   potassium_mg = 377,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%flocon%' AND LOWER(name) LIKE '%avoin%';

UPDATE foods_library SET
  iron_mg      = 0.5,  magnesium_mg = 25,   zinc_mg      = 0.8,
  calcium_mg   = 5,    potassium_mg = 35,   vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%riz%' AND LOWER(name) NOT LIKE '%lait%';

UPDATE foods_library SET
  iron_mg      = 1.2,  magnesium_mg = 28,   zinc_mg      = 0.8,
  calcium_mg   = 12,   potassium_mg = 92,   vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%pât%' OR LOWER(name) LIKE '%pasta%' OR LOWER(name) LIKE '%spaghett%';

UPDATE foods_library SET
  iron_mg      = 4.7,  magnesium_mg = 197,  zinc_mg      = 3.1,
  calcium_mg   = 47,   potassium_mg = 563,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%quinoa%';

UPDATE foods_library SET
  iron_mg      = 7.1,  magnesium_mg = 35,   zinc_mg      = 0.9,
  calcium_mg   = 36,   potassium_mg = 731,  vitamin_c_mg = 3,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%lentille%';

UPDATE foods_library SET
  iron_mg      = 2.9,  magnesium_mg = 48,   zinc_mg      = 1.5,
  calcium_mg   = 49,   potassium_mg = 291,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%pois chiche%';

UPDATE foods_library SET
  iron_mg      = 2.2,  magnesium_mg = 45,   zinc_mg      = 1.2,
  calcium_mg   = 65,   potassium_mg = 400,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%haricot%' OR LOWER(name) LIKE '%flageolet%';

UPDATE foods_library SET
  iron_mg      = 2.7,  magnesium_mg = 79,   zinc_mg      = 0.5,
  calcium_mg   = 99,   potassium_mg = 558,  vitamin_c_mg = 28,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%épinard%';

UPDATE foods_library SET
  iron_mg      = 0.7,  magnesium_mg = 21,   zinc_mg      = 0.4,
  calcium_mg   = 47,   potassium_mg = 316,  vitamin_c_mg = 89,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%brocoli%';

UPDATE foods_library SET
  iron_mg      = 1.0,  magnesium_mg = 57,   zinc_mg      = 1.2,
  calcium_mg   = 57,   potassium_mg = 450,  vitamin_c_mg = 62,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%chou%' AND (LOWER(name) LIKE '%kale%' OR LOWER(name) LIKE '%frisé%' OR LOWER(name) LIKE '%vert%');

UPDATE foods_library SET
  iron_mg      = 0.2,  magnesium_mg = 10,   zinc_mg      = 0.2,
  calcium_mg   = 17,   potassium_mg = 195,  vitamin_c_mg = 6,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%tomate%';

UPDATE foods_library SET
  iron_mg      = 0.3,  magnesium_mg = 12,   zinc_mg      = 0.2,
  calcium_mg   = 11,   potassium_mg = 358,  vitamin_c_mg = 8,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%banane%';

UPDATE foods_library SET
  iron_mg      = 0.1,  magnesium_mg = 5,    zinc_mg      = 0.1,
  calcium_mg   = 6,    potassium_mg = 107,  vitamin_c_mg = 5,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%pomme%' AND LOWER(name) NOT LIKE '%pomme de terre%';

UPDATE foods_library SET
  iron_mg      = 2.7,  magnesium_mg = 270,  zinc_mg      = 5.6,
  calcium_mg   = 270,  potassium_mg = 728,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%amande%';

UPDATE foods_library SET
  iron_mg      = 1.9,  magnesium_mg = 158,  zinc_mg      = 3.4,
  calcium_mg   = 98,   potassium_mg = 441,  vitamin_c_mg = 1,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%noix de cajou%' OR LOWER(name) LIKE '%cajou%';

UPDATE foods_library SET
  iron_mg      = 0.4,  magnesium_mg = 19,   zinc_mg      = 0.3,
  calcium_mg   = 12,   potassium_mg = 422,  vitamin_c_mg = 6,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%pomme de terre%' OR LOWER(name) LIKE '%patate douce%';

-- Huile d'olive (pas de micros significatifs hors vitamine E non trackée)
UPDATE foods_library SET
  iron_mg      = 0,    magnesium_mg = 0,    zinc_mg      = 0,
  calcium_mg   = 0,    potassium_mg = 0,    vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%huile%';

-- Pain (valeurs moyennes)
UPDATE foods_library SET
  iron_mg      = 1.8,  magnesium_mg = 25,   zinc_mg      = 0.8,
  calcium_mg   = 23,   potassium_mg = 110,  vitamin_c_mg = 0,
  vitamin_d_mcg = 0
WHERE LOWER(name) LIKE '%pain%';

-- ─────────────────────────────────────────────────────────────────────────────
-- Vérification : nombre d'aliments mis à jour avec micro data
-- ─────────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS aliments_avec_micro
FROM foods_library
WHERE iron_mg IS NOT NULL;
