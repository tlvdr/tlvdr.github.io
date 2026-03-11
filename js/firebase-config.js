// ==============================================
// Firebase Configuration
// ==============================================
// INSTRUCTIONS: Replace the values below with your
// own Firebase project config from the Firebase Console.
// Go to: Firebase Console > Project Settings > General
// Scroll down to "Your apps" > Web app config
// ==============================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDb0OuVcTOt-1QLXasNKmpWoeYqt_Y9nMg",
  authDomain: "tessa-portfolio-be709.firebaseapp.com",
  projectId: "tessa-portfolio-be709",
  storageBucket: "tessa-portfolio-be709.firebasestorage.app",
  messagingSenderId: "149386000371",
  appId: "1:149386000371:web:90d3f1db1378aef0e68486",
  measurementId: "G-5B5SS01QKQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
