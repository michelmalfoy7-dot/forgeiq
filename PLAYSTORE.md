# ForgeIQ — Google Play Store (TWA)
> Trusted Web Activity : ton PWA devient une vraie app Android, zéro commission, paiements via Stripe web.

---

## Checklist avant soumission

### 1. Prérequis techniques ✅ déjà fait
- [x] `manifest.json` complet (name, short_name, icons 192+512, screenshots, theme_color)
- [x] Service Worker (`sw.js`) enregistré
- [x] `/.well-known/assetlinks.json` déployé
- [x] HTTPS sur `getforgeiq.com`
- [x] `display: "standalone"` dans le manifest

### 2. Screenshots (REQUIS par Google Play)
Google Play exige **au moins 2 screenshots** en format portrait 16:9 ou 9:16.
Formats acceptés : PNG ou JPEG, min 320px, max 3840px, ratio entre 1:2 et 2:1.

Crée ces 3 screenshots avec ton téléphone ou Chrome DevTools (390×844) :
- `public/screenshots/screenshot-dashboard.png` → page /dashboard
- `public/screenshots/screenshot-workout.png` → page /workout
- `public/screenshots/screenshot-coach.png` → page /coach

**Comment faire :** Chrome → F12 → Toggle device toolbar → iPhone 14 Pro (390×844) → Ctrl+Shift+P → "Capture screenshot"

### 3. Icônes Play Store (REQUIS)
Google Play a besoin de :
- **Icône app** : 512×512 PNG (déjà `public/icons/icon-512.png`) ✅
- **Feature Graphic** : 1024×500 PNG (bannière en haut de la fiche) ← À créer

---

## Étape 1 — Générer l'APK avec PWABuilder

1. Va sur **https://www.pwabuilder.com**
2. Entre ton URL : `https://getforgeiq.com`
3. Clique **"Package for stores"**
4. Sélectionne **Android**
5. Paramètres à configurer :
   - **Package name** : `com.getforgeiq.app`
   - **App name** : `ForgeIQ`
   - **Version name** : `1.0.0`
   - **Version code** : `1`
   - **Signing** : "New" → génère un keystore (GARDE LE KEYSTORE PRÉCIEUSEMENT)
   - **Signing key alias** : `forgeiq-key`
6. Clique **"Generate"**
7. Télécharge le ZIP

---

## Étape 2 — Récupérer le SHA-256 fingerprint

Dans le ZIP téléchargé depuis PWABuilder, ouvre `build-info.json` :
```json
{
  "signingInfo": {
    "fingerprint": "AA:BB:CC:DD:EE:FF:..."
  }
}
```

Ou utilise cette commande sur le keystore généré :
```bash
keytool -list -v -keystore forgeiq-signing.keystore -alias forgeiq-key
# Copie la ligne "SHA256: XX:XX:XX:..."
```

---

## Étape 3 — Mettre à jour assetlinks.json

Remplace `REMPLACER_PAR_LE_FINGERPRINT_SHA256_DE_PWABUILDER` dans
`public/.well-known/assetlinks.json` par le vrai fingerprint :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.getforgeiq.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:11:22:33:..."
      ]
    }
  }
]
```

**Deploy sur Vercel** — puis vérifie que c'est accessible :
```
https://getforgeiq.com/.well-known/assetlinks.json
```

---

## Étape 4 — Vérifier le lien TWA

Google fournit un outil de vérification :
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://getforgeiq.com&relation=delegate_permission/common.handle_all_urls
```

Doit retourner ton package + fingerprint. Si vide → assetlinks.json mal servi.

---

## Étape 5 — Google Play Console

1. Va sur **https://play.google.com/console**
2. Crée un compte développeur (25$ une seule fois)
3. **Créer une application**
   - Nom : `ForgeIQ — Coach IA Fitness`
   - Langue : Français
   - Type : Application (pas jeu)
   - Gratuite / Payante : **Gratuite** (les achats se font sur le web)
4. **Production → Créer une nouvelle version**
   - Upload le `.aab` (Android App Bundle) du ZIP PWABuilder
5. **Contenu de l'application** (à remplir) :
   - Politique de confidentialité : `https://getforgeiq.com/privacy`
   - Public cible : 18+
   - Catégorie : Santé & remise en forme
6. **Fiche Play Store** :
   - Titre (30 car max) : `ForgeIQ — Coach Fitness IA`
   - Description courte (80 car) : `Entraînement, nutrition, progression. Ton coach IA personnel.`
   - Description longue (4000 car max) : voir template ci-dessous
   - Screenshots : 2-8 images portrait
   - Icône : `icon-512.png`
   - Feature Graphic : 1024×500px

---

## Template description Play Store (FR)

```
ForgeIQ est ton coach fitness personnel, disponible 24h/24.

🏋️ ENTRAÎNEMENT
• Logger tes séances en temps réel
• Suivre tes records personnels (PRs)
• Programmes structurés pour tous niveaux
• Suggestions de séance adaptées à ta récupération

🥗 NUTRITION
• Scan de codes-barres (base OpenFoodFacts)
• Analyse photo de tes repas par IA
• Suivi des macros : protéines, glucides, lipides
• Journal alimentaire quotidien

💤 RÉCUPÉRATION & BIOMÉTRIQUE
• Bilan quotidien en moins de 60 secondes
• Suivi sommeil, fatigue, motivation
• Tendance poids (EWMA lissée)
• Alertes intelligentes si récupération insuffisante

🤖 COACH IA PERSONNALISÉ
• Questions en langage naturel
• Réponses contextualisées (tes données, pas celles d'un inconnu)
• Adapte les recommandations à ta fatigue et ton sommeil

📊 PROGRESSION
• Graphiques de force et poids sur le temps
• Photos de progression (privées, opt-in)
• Comparaison séance vs séance précédente

Abonnement Pro disponible pour accès illimité au coach IA.
Les abonnements sont gérés via le site web getforgeiq.com.

Données privées. Hébergement européen.
```

---

## Après soumission

- Délai de review Google : **3-7 jours** pour la 1ère soumission
- Mises à jour suivantes : 2-3h (parfois instantané)
- **Garde précieusement** le fichier `.keystore` — sans lui, impossible de mettre à jour l'app

---

## iOS (plus tard)

Option recommandée : **PWABuilder iOS** (Capacitor-based)
- Compte Apple Developer : 99$/an
- Pas de boutons IAP dans l'app (Spotify model) → abonnements sur getforgeiq.com
- Guide complet : https://docs.pwabuilder.com/#/builder/ios

---

## Structure des fichiers créés

```
public/
├── .well-known/
│   └── assetlinks.json        ← SHA-256 fingerprint TWA
├── screenshots/
│   ├── screenshot-dashboard.png  ← À créer
│   ├── screenshot-workout.png    ← À créer
│   └── screenshot-coach.png      ← À créer
├── manifest.json              ← Mis à jour (screenshots, display_override)
└── icons/
    ├── icon-192.png
    └── icon-512.png           ← Icône Play Store
```
