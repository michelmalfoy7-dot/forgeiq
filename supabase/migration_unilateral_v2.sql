-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : marquer les exercices unilatéraux (unilateral_multiplier × 2)
-- Exécuter dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- S'assurer que la colonne is_unilateral existe (au cas où)
ALTER TABLE exercises_library
  ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Exercices unilatéraux confirmés (× 2 côtés par défaut) ──────────────────
-- Ces exercices sont faits côté droit PUIS côté gauche en pratique normale
-- L'utilisateur peut désactiver le × 2 dans l'UI si rééducation asymétrique

UPDATE exercises_library
SET is_unilateral = TRUE
WHERE slug IN (
  -- Biceps
  'bayesian-curl',
  'bayesian-curl-poulie',
  'curl-poulie-unilateral',
  'curl-cable-unilateral',
  'curl-marteau-cable',
  'curl-prise-marteau-cable',
  -- Dos / Pull
  'tirage-unilateral-cable',
  'tirage-unilateral-barre',
  'rowing-unilateral-cable',
  'rowing-unilateral-haltere',
  'bras-casse-unilateral',
  'katana-poulie',
  'katana-poulie-unilateral',
  'tirage-vertical-unilateral-cable',
  'lat-pulldown-unilateral',
  -- Épaules
  'elevation-laterale-cable-unilateral',
  'oiseau-cable-unilateral',
  'oiseau-poulie-basse-unilateral',
  'elevation-frontale-cable-unilateral',
  -- Triceps
  'kickback-cable-unilateral',
  'kickback-haltere-unilateral',
  'extension-triceps-cable-unilateral',
  'pushdown-unilateral',
  -- Pectoraux
  'fly-cable-unilateral',
  'pec-deck-unilateral',
  -- Jambes
  'leg-curl-unilateral',
  'leg-extension-unilateral',
  'hip-thrust-unilateral',
  'fente-arriere-cable',
  'abduction-cable-unilateral',
  'adduction-cable-unilateral'
);

-- Fallback : marquer tous les exercices cable avec "unilateral" dans le nom
UPDATE exercises_library
SET is_unilateral = TRUE
WHERE
  is_unilateral = FALSE
  AND (
    lower(nom_fr) LIKE '%unilatéral%'
    OR lower(nom_fr) LIKE '%unilateral%'
    OR lower(nom_en) LIKE '%single arm%'
    OR lower(nom_en) LIKE '%single-arm%'
    OR lower(nom_en) LIKE '%unilateral%'
    OR lower(nom_en) LIKE '%one arm%'
    OR lower(nom_en) LIKE '%one-arm%'
  );

-- Vérifier les résultats
SELECT id, nom_fr, nom_en, slug, is_unilateral, equipment
FROM exercises_library
WHERE is_unilateral = TRUE
ORDER BY equipment, nom_fr;
