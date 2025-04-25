importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

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
