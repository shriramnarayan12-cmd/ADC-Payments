import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbl2GlBosoBB4_xo7BdvJTHlOSoJ7AjT4",
  authDomain: "adc-portal-29fb3.firebaseapp.com",
  projectId: "adc-portal-29fb3",
  storageBucket: "adc-portal-29fb3.firebasestorage.app",
  messagingSenderId: "206138284974",
  appId: "1:206138284974:web:944f4d5147e7743fce463f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log('Firebase Handshake Successful!');
