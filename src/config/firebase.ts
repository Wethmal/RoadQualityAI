import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// SafeRoute AI Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwreQmOKcBLmrYBwnrTPwkk5FxXP7xWAU",
  authDomain: "saferoute-ai-c4882.firebaseapp.com",
  databaseURL: "https://saferoute-ai-c4882-default-rtdb.firebaseio.com",
  projectId: "saferoute-ai-c4882",
  storageBucket: "saferoute-ai-c4882.firebasestorage.app",
  messagingSenderId: "167983254651",
  appId: "1:167983254651:android:9de41468888e16aa33e6de"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const database = getDatabase(app);

// Export instances
export { app, auth, database };