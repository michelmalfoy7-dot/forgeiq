// ForgeIQ — Service Worker v2 (offline-ready)
// Stratégies :
//   _next/static/  → cache-first (assets immutables, hash dans le nom)
//   Navigation     → network-first + cache fallback + /offline.html
//   API / Supabase → réseau uniquement (pass-through)
//   Autres         → stale-while-revalidate

const CACHE_NAME = 'forgeiq-v2'
const OFFLINE_URL = '/offline.html'

// ── Install : pré-cache l'essentiel ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([OFFLINE_URL, '/manifest.json'])
    )
  )
  self.skipWaiting()
})

// ── Activate : nettoyer les anciens caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch : routing des stratégies ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Pass-through : requêtes non-GET, API interne, Supabase
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('anthropic')) return

  // ── 1. Assets statiques Next.js (_next/static/) → cache-first immutable ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        }).catch(() => cached ?? new Response('', { status: 503 }))
      })
    )
    return
  }

  // ── 2. Next.js image optimization → cache-first ───────────────────────────
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        }).catch(() => cached ?? new Response('', { status: 503 }))
      })
    )
    return
  }

  // ── 3. Navigation (HTML) → network-first, cache fallback, offline page ────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Mettre en cache les pages réussies (pour utilisation hors-ligne)
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached ?? caches.match(OFFLINE_URL))
        )
    )
    return
  }

  // ── 4. Icônes, fonts, images publiques → stale-while-revalidate ──────────
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone())
          return response
        }).catch(() => cached ?? new Response('', { status: 503 }))
        // Retourner le cache immédiatement si disponible, sinon attendre le réseau
        return cached ?? fetchPromise
      })
    )
  )
})

// ── Message : forcer la mise à jour du SW depuis le client ───────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

// ── Push : afficher la notification système ──────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { /* payload invalide */ }

  const title   = data.title   ?? 'ForgeIQ'
  const body    = data.body    ?? 'Nouvelle activité sur ton profil'
  const url     = data.url     ?? '/social/notifications'
  const tag     = data.tag     ?? 'forgeiq-notif'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-72.png',
      tag,
      renotify: true,
      data:     { url },
      vibrate:  [100, 50, 100],
    })
  )
})

// ── NotificationClick : ouvrir l'app sur la bonne page ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/social/notifications'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Fenêtre déjà ouverte → focus
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
