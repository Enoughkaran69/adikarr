import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup as firebaseSignInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBmfK3MGYnAokhAxMF1hdeNDkfmiP6iHFo",
  authDomain: "shubh-d5028.firebaseapp.com",
  projectId: "shubh-d5028",
  storageBucket: "shubh-d5028.firebasestorage.app",
  messagingSenderId: "486949260136",
  appId: "1:486949260136:web:596ca052d911f4304564dd",
  measurementId: "G-GXBQSXT7PR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const messaging = getMessaging(app);

export { auth, provider, firebaseSignInWithPopup as signInWithPopup, db, setPersistence, browserLocalPersistence, messaging, getToken, onMessage };