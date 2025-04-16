import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup as firebaseSignInWithPopup } from 'firebase/auth';

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

export { auth, provider, firebaseSignInWithPopup as signInWithPopup };