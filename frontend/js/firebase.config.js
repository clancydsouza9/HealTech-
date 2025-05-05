// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage"; // If you plan to use storage
// import { getAnalytics } from "firebase/analytics"; // If you plan to use analytics

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmDJcg39YhCZFHj10RtgyJBoeh4epRjd4",
  authDomain: "aihealthmonitor.firebaseapp.com",
  projectId: "aihealthmonitor",
  storageBucket: "aihealthmonitor.firebasestorage.app",
  messagingSenderId: "143999239568",
  appId: "1:143999239568:web:dfa5e39f51539238a6df15",
  measurementId: "G-XYTRZMJE31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
// export const storage = getStorage(app);

// Initialize Google Analytics and get a reference to the service
// export const analytics = getAnalytics(app); // If you enabled analytics
