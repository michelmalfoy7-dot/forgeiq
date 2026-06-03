import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité de ForgeIQ — comment nous collectons, utilisons et protégeons vos données.',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '3 juin 2026'
const CONTACT_EMAIL = 'hello@getforgeiq.com'
const APP_URL = 'https://getforgeiq.com'

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-[720px] mx-auto px-5 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm mb-6 inline-block" style={{ color: 'var(--fiq-accent)' }}>
            ← Retour à ForgeIQ
          </Link>
          <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--fiq-text)' }}>
            Politique de confidentialité
          </h1>
          <p className="text-sm" style={{ color: 'var(--fiq-muted)' }}>
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-8" style={{ color: 'var(--fiq-text)', lineHeight: '1.7', fontSize: '15px' }}>

          {/* Intro */}
          <section>
            <p>
              ForgeIQ (&ldquo;nous&rdquo;, &ldquo;notre&rdquo;) exploite l&rsquo;application web et mobile accessible à l&rsquo;adresse{' '}
              <a href={APP_URL} style={{ color: 'var(--fiq-accent)' }}>{APP_URL}</a>.
              La présente politique décrit comment nous collectons, utilisons et protégeons vos données personnelles
              lorsque vous utilisez notre service.
            </p>
          </section>

          {/* 1. Données collectées */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              1. Données collectées
            </h2>
            <p className="mb-3">Nous collectons les données suivantes :</p>
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données de compte</p>
                <p style={{ color: 'var(--fiq-muted)' }}>Adresse e-mail, prénom, mot de passe (chiffré via Supabase Auth).</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données de profil et objectifs</p>
                <p style={{ color: 'var(--fiq-muted)' }}>Âge, taille, poids, sexe, niveau de forme, objectif fitness, équipement disponible, fréquence d&rsquo;entraînement.</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données de santé et de bien-être</p>
                <p style={{ color: 'var(--fiq-muted)' }}>
                  Poids quotidien, qualité du sommeil, niveau de fatigue, tension artérielle (optionnelle), nombre de pas,
                  journaux alimentaires, apports en macronutriments et micronutriments, consommation d&rsquo;eau,
                  sessions de jeûne intermittent.
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données d&rsquo;entraînement</p>
                <p style={{ color: 'var(--fiq-muted)' }}>Séances d&rsquo;entraînement, exercices, séries, charges, répétitions, records personnels, tonnage total.</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Photos de progression (opt-in)</p>
                <p style={{ color: 'var(--fiq-muted)' }}>
                  Les photos de progression ne sont collectées que si vous choisissez explicitement de les ajouter.
                  Elles sont stockées de façon privée et ne sont jamais partagées ni utilisées à des fins commerciales.
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données d&rsquo;utilisation</p>
                <p style={{ color: 'var(--fiq-muted)' }}>Pages visitées, fonctionnalités utilisées, données d&rsquo;événements anonymisées à des fins d&rsquo;amélioration du produit.</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                <p className="font-semibold mb-1">Données de paiement</p>
                <p style={{ color: 'var(--fiq-muted)' }}>
                  Les informations de carte bancaire sont traitées directement par Stripe et ne transitent jamais par nos serveurs.
                  Nous conservons uniquement votre statut d&rsquo;abonnement et l&rsquo;identifiant client Stripe.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Utilisation des données */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              2. Utilisation des données
            </h2>
            <p className="mb-3">Vos données sont utilisées pour :</p>
            <ul className="space-y-2 list-none">
              {[
                'Fournir et personnaliser les recommandations de votre Coach IA',
                'Calculer vos besoins caloriques et en macronutriments (TDEE)',
                'Suivre votre progression (poids lissé EWMA, records personnels, volume musculaire)',
                'Générer des suggestions de séances adaptées à votre récupération',
                'Gérer votre abonnement et les paiements',
                'Améliorer le service sur la base de données d&rsquo;utilisation agrégées et anonymisées',
                'Vous envoyer des communications transactionnelles (confirmation d&rsquo;inscription, factures)',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: 'var(--fiq-accent)' }}>✓</span>
                  <span style={{ color: 'var(--fiq-muted)' }}>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4" style={{ color: 'var(--fiq-muted)' }}>
              Nous ne vendons pas vos données personnelles à des tiers. Nous n&rsquo;utilisons pas vos données de santé
              à des fins publicitaires.
            </p>
          </section>

          {/* 3. Sous-traitants */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              3. Services tiers (sous-traitants)
            </h2>
            <p className="mb-4" style={{ color: 'var(--fiq-muted)' }}>
              Nous faisons appel aux prestataires suivants, chacun soumis à ses propres politiques de confidentialité :
            </p>
            <div className="space-y-3">
              {[
                { name: 'Supabase', role: 'Base de données, authentification et stockage de fichiers', link: 'https://supabase.com/privacy' },
                { name: 'Anthropic', role: 'Moteur du Coach IA (traitement des messages pour générer des recommandations)', link: 'https://www.anthropic.com/privacy' },
                { name: 'Stripe', role: 'Traitement des paiements et gestion des abonnements', link: 'https://stripe.com/privacy' },
                { name: 'Vercel', role: 'Hébergement de l&rsquo;application et des API', link: 'https://vercel.com/legal/privacy-policy' },
                { name: 'Resend', role: 'Envoi des e-mails transactionnels', link: 'https://resend.com/legal/privacy-policy' },
                { name: 'PostHog', role: 'Analyse d&rsquo;utilisation anonymisée (stockage EU, sans cookies tiers)', link: 'https://posthog.com/privacy' },
              ].map(({ name, role, link }) => (
                <div key={name} className="rounded-xl p-4 flex justify-between items-center gap-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
                  <div>
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm" style={{ color: 'var(--fiq-muted)' }} dangerouslySetInnerHTML={{ __html: role }} />
                  </div>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs shrink-0" style={{ color: 'var(--fiq-accent)' }}>
                    Politique →
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Conservation */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              4. Conservation des données
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              Vos données sont conservées tant que votre compte est actif. Si vous supprimez votre compte,
              l&rsquo;ensemble de vos données personnelles est effacé dans un délai de 30 jours,
              à l&rsquo;exception des données de facturation conservées 7 ans conformément aux obligations légales.
            </p>
          </section>

          {/* 5. Sécurité */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              5. Sécurité
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              Toutes les données sont chiffrées en transit (TLS) et au repos. L&rsquo;accès aux données est
              contrôlé par des politiques de sécurité au niveau des lignes (Row Level Security) : seul vous
              avez accès à vos propres données. Les mots de passe ne sont jamais stockés en clair.
            </p>
          </section>

          {/* 6. Droits */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              6. Vos droits (RGPD)
            </h2>
            <p className="mb-3" style={{ color: 'var(--fiq-muted)' }}>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul className="space-y-2">
              {[
                { droit: 'Accès', desc: 'Obtenir une copie de vos données personnelles' },
                { droit: 'Rectification', desc: 'Corriger des données inexactes depuis la page Profil' },
                { droit: 'Suppression', desc: 'Demander l&rsquo;effacement de votre compte et de vos données' },
                { droit: 'Portabilité', desc: 'Recevoir vos données dans un format structuré' },
                { droit: 'Opposition', desc: 'Vous opposer au traitement de vos données à des fins d&rsquo;analyse' },
              ].map(({ droit, desc }) => (
                <li key={droit} className="flex gap-3 items-start">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--fiq-accent)' }}>{droit}</span>
                  <span style={{ color: 'var(--fiq-muted)' }} dangerouslySetInnerHTML={{ __html: `— ${desc}` }} />
                </li>
              ))}
            </ul>
            <p className="mt-4" style={{ color: 'var(--fiq-muted)' }}>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--fiq-accent)' }}>{CONTACT_EMAIL}</a>.
              Vous pouvez également supprimer votre compte directement depuis{' '}
              <Link href="/profile" style={{ color: 'var(--fiq-accent)' }}>Paramètres → Supprimer mon compte</Link>.
            </p>
          </section>

          {/* 7. Cookies */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              7. Cookies et stockage local
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              Nous utilisons des cookies strictement nécessaires au maintien de votre session d&rsquo;authentification.
              PostHog utilise le localStorage (pas de cookies tiers) pour les statistiques d&rsquo;utilisation.
              Nous n&rsquo;utilisons pas de cookies publicitaires ni de traceurs inter-sites.
            </p>
          </section>

          {/* 8. Enfants */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              8. Mineurs
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              ForgeIQ est destiné aux personnes âgées de 16 ans et plus. Nous ne collectons pas sciemment
              de données provenant de mineurs de moins de 16 ans. Si vous pensez qu&rsquo;un mineur a créé
              un compte, contactez-nous afin que nous procédions à la suppression.
            </p>
          </section>

          {/* 9. Modifications */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              9. Modifications de cette politique
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              Nous pouvons mettre à jour cette politique périodiquement. En cas de modification substantielle,
              nous vous en informerons par e-mail ou via une notification dans l&rsquo;application.
              La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--fiq-text)' }}>
              10. Contact
            </h2>
            <p style={{ color: 'var(--fiq-muted)' }}>
              Pour toute question relative à la protection de vos données personnelles :
            </p>
            <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--fiq-card)', border: '1px solid var(--fiq-border)' }}>
              <p className="font-semibold">ForgeIQ</p>
              <p style={{ color: 'var(--fiq-muted)' }}>
                E-mail :{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--fiq-accent)' }}>{CONTACT_EMAIL}</a>
              </p>
              <p style={{ color: 'var(--fiq-muted)' }}>Site : <a href={APP_URL} style={{ color: 'var(--fiq-accent)' }}>{APP_URL}</a></p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 text-center text-sm" style={{ borderTop: '1px solid var(--fiq-border)', color: 'var(--fiq-muted)' }}>
          <p>© {new Date().getFullYear()} ForgeIQ. Tous droits réservés.</p>
          <Link href="/" className="mt-2 inline-block" style={{ color: 'var(--fiq-accent)' }}>
            Retour à l&rsquo;application
          </Link>
        </div>

      </div>
    </div>
  )
}
