# Agent NUTRITION — ForgeIQ
> Contexte limité à ce module. Ne pas charger les autres modules.
> Référence archi globale : /CLAUDE.md

## Fichiers autorisés
- `app/(app)/nutrition/**`
- `app/(app)/checkin/**`
- `app/api/nutrition/**` (search, log, scan, photo, recipes, favorites, suggest, import-url)
- `app/api/checkin/route.ts`
- `app/api/water/log/route.ts`
- `app/api/fasting/route.ts`
- `app/api/profile/tdee/route.ts`
- `components/nutrition/**`
- `lib/utils/tdee.ts` (calcDailyTarget — SOURCE UNIQUE TDEE)
- `supabase/seed_micro_common_foods.sql`
- `supabase/usda_batch*.sql`

## Tables Supabase concernées
- `food_logs` — journal alimentaire (macros + 7 micronutriments)
- `foods_library` — base aliments (USDA + Ciqual + OFF)
- `nutrition_favorites` — favoris utilisateur
- `nutrition_recipes` — recettes custom (macros par portion)
- `recipe_ingredients` — ingrédients recettes
- `daily_logs` — check-in quotidien (poids, sommeil, steps, water_ml)
- `fasting_sessions` — jeûne intermittent (start, end, target_hours)

## Fonctionnalités du module
- Journal repas par type (petit-déj, déj, dîner, collation)
- Recherche : ILIKE + FTS français + OFF fallback
  → Tri : brut avant industriel (rawScore 0-4)
- Scanner code-barres (BarcodeDetector + zxing)
- Photo IA repas (claude-haiku, PRO uniquement)
- Favoris (sauvegarde 1-tap, tri par usage)
- Recettes custom (macros + micros calculés)
- Unités naturelles (œufs/pièces, fruits)
- Micronutriments (7 nutrients, DRI athletes)
  → Alertes intelligentes : heure > 19h + couverture ≥ 60% + ≥ 1500 kcal
  → Affiche "~?" si 0 données (jamais faux 0mg)
- Jeûne intermittent (16:8, 18:6, 20:4, OMAD, Custom)
- Hydratation (water_ml dans daily_logs)
- TDEE différencié repos/entraînement (calcDailyTarget)

## Source unique TDEE
`lib/utils/tdee.ts` → `calcDailyTarget()` — NE PAS recalculer ailleurs

## Règles
- NE PAS charger : workout, coach, programs, dashboard, auth
- source CHECK constraint : 'openfoodfacts' | 'ai_photo' | 'manual'
- Micros : WHERE NOT EXISTS avant INSERT (pas de ON CONFLICT name — pas de UNIQUE)
- Photo IA = payant uniquement (PHOTO_LIMITS.free = 0)
