import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../config/firebase';
import { User } from '../types';

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<User> => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const userData: Omit<User, 'id'> = {
      name,
      email,
      totalPoints: 0,
      rank: 0,
      status: 'active',
      registeredAt: Date.now(),
    };

    await set(ref(database, `users/${uid}`), userData);

    return { id: uid, ...userData };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const snapshot = await get(ref(database, `users/${uid}`));
    if (!snapshot.exists()) throw new Error('User data not found');

    const data = snapshot.val();
    return { id: uid, ...data };
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
};