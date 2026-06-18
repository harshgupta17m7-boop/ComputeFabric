import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA63hVILXV3saxZWItUBHxIWCVPzLgKpMk",
  authDomain: "compute-fabric-51180.firebaseapp.com",
  projectId: "compute-fabric-51180",
  storageBucket: "compute-fabric-51180.firebasestorage.app",
  messagingSenderId: "311908580378",
  appId: "1:311908580378:web:263f043e21ed905497a5a3",
  measurementId: "G-2VJ6JPZWQN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const authenticateAnonymously = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase Anonymous Auth failed", error);
    throw error;
  }
};
