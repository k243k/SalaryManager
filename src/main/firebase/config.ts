/**
 * 時給計算アプリ - Firebase設定
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDTZiQAntzZrEBnA1rrFlKVkLFt_AqyOWg",
  authDomain: "nikkyu-keisan-e74f6.firebaseapp.com",
  projectId: "nikkyu-keisan-e74f6",
  storageBucket: "nikkyu-keisan-e74f6.firebasestorage.app",
  messagingSenderId: "690686855172",
  appId: "1:690686855172:web:ded02ecbfaf7982e35cd51"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Firebaseを初期化
 */
export function initializeFirebase(): void {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
}

/**
 * Firestoreインスタンスを取得
 */
export function getFirestoreDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db!;
}

/**
 * Authインスタンスを取得
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
}
