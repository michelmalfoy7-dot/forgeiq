# Exemple — Format exercice v3 avec by_feature

## Structure complète d'un exercice dans un programme

```json
{
  "slot": "chest_incline",
  "sets": 3,
  "reps": "10-15",
  "rest_sec": 120,
  "note": "Angle 30-40°, étirement maximal en bas. Focus pectoral haut.",

  "by_feature": {
    "hammer_strength": {
      "slug": "developpe-incline-hammer-strength",
      "name_fr": "Développé Incliné Hammer Strength"
    },
    "technogym": {
      "slug": "developpe-incline-machine",
      "name_fr": "Développé Incliné Technogym"
    },
    "life_fitness": {
      "slug": "incline-machine-press",
      "name_fr": "Développé Incliné Life Fitness"
    },
    "cable_station": {
      "slug": "incline-cable-press",
      "name_fr": "Développé Incliné Câble"
    }
  },

  "by_tier": {
    "premium":  { "slug": "developpe-incline-hammer-strength", "name_fr": "Développé Incliné Machine" },
    "standard": { "slug": "incline-barbell-bench-press",       "name_fr": "Développé Incliné Haltères" },
    "home":     { "slug": "incline-barbell-bench-press",       "name_fr": "Développé Incliné Haltères" }
  }
}
```

## Résolution par salle

| Salle | Features | Exercice affiché |
|-------|----------|-----------------|
| Fitness Park | `['hammer_strength', 'technogym', ...]` | Développé Incliné Hammer Strength |
| Keep Cool | `['technogym', 'cable_station', ...]` | Développé Incliné Technogym |
| On Air | `['hammer_strength', 'life_fitness', ...]` | Développé Incliné Hammer Strength |
| Basic-Fit | `['cable_station', 'plate_loaded', ...]` | Développé Incliné Câble |
| Neoness | `['cable_station', 'plate_loaded', ...]` | Développé Incliné Câble |
| Domicile | `(aucune feature connue)` | Développé Incliné Haltères (by_tier fallback) |

## Logique de résolution (getExerciseName)

1. Si `by_feature` existe → itère sur `gymFeatures` dans l'ordre
   → retourne le premier match trouvé
2. Sinon si `by_tier` existe → utilise `gymTier` (premium/standard/home)
3. Sinon → `name_fr` (ancien format v1)

## Features disponibles (gym_equipment_profiles.features)

- `hammer_strength`     → Hammer Strength plate-loaded
- `technogym`          → Technogym (sélectorisé + guidé)
- `life_fitness`       → Life Fitness
- `cable_station`      → Stations câbles classiques
- `functional_trainer` → Functional trainer double poulie
- `plate_loaded`       → Zone poids libres (barres + haltères)
- `dumbbells`          → Haltères uniquement
