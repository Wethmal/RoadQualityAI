// firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBwreQmOKcBLmrYBwnrTPwkk5FxXP7xWAU",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://saferoute-ai-c4882-default-rtdb.firebaseio.com/", // Realtime Database එක සඳහා මෙය අත්‍යවශ්‍යයි
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase ආරම්භ කිරීම (Initialize)
const app = initializeApp(firebaseConfig);

// Realtime Database එකට සම්බන්ධ වීම
export const db = getDatabase(app);