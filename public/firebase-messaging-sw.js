importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const CACHE_NAME = 'shubh-cache-v1';
const STATIC_ASSETS_CACHE_NAME = 'shubh-static-assets-cache-v1';
const DATA_CACHE_NAME = 'shubh-data-cache-v1';

const firebaseConfig = {
  apiKey: "AIzaSyBmfK3MGYnAokhAxMF1hdeNDkfmiP6iHFo",
  authDomain: "shubh-d5028.firebaseapp.com",
  projectId: "shubh-d5028",
  storageBucket: "shubh-d5028.firebasestorage.app",
  messagingSenderId: "486949260136",
  appId: "1:486949260136:web:596ca052d911f4304564dd",
  measurementId: "G-GXBQSXT7PR"
};

firebase.initializeApp(firebaseConfig);

// Static assets to cache on installation
const staticAssetsToCache = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  // Add other static assets here (CSS, JS, images)
];


// Install event: Cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(STATIC_ASSETS_CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(staticAssetsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME && cacheName !== STATIC_ASSETS_CACHE_NAME && cacheName !== DATA_CACHE_NAME;
        }).map((cacheName) => {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event: Stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
      return;
  }
  event.respondWith(
    caches.open(DATA_CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if(networkResponse.ok && !event.request.url.includes('firebase')){
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err=>{
          console.log("error fecthing data: ",err)
        })
        // Return the cached response if it exists, otherwise return the network response
        return cachedResponse || fetchedResponse;
      })
    })
  );
});



const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

