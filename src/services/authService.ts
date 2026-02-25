import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, database } from '../config/firebase';
import { User } from '../types';

/**
 * Register a new user and save additional profile info to Realtime Database
 */
export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const userData: User = {
      id: uid,
      name: name,
      email: email,
      totalPoints: 0,
      rank: 0,
      status: 'active',
      registeredAt: Date.now(),
    };

    // Realtime Database eke /users/{uid} path ekata user data save kirima
    await set(ref(database, `users/${uid}`), userData);

    return userData;
  } catch (error: any) {
    let errorMessage = 'Registration failed. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters.';
    }
    throw new Error(errorMessage);
  }
};

/**
 * Login user and fetch profile data from Realtime Database
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, `users/${uid}`));

    if (snapshot.exists()) {
      return snapshot.val() as User;
    } else {
      throw new Error('User profile data not found.');
    }
  } catch (error: any) {
    let errorMessage = 'Login failed. Please check your credentials.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password.';
    }
    throw new Error(errorMessage);
  }
};

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('Logout failed. Please try again.');
  }
};