/**
 * 時給計算アプリ - Firebase Authentication
 * Electron用のGoogle Sign-In実装
 */

import { BrowserWindow, session } from 'electron';
import {
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

let currentUser: User | null = null;

// Google OAuth設定
const GOOGLE_CLIENT_ID = '690686855172-3sv0gdvo7cjsfis1bc3t3qhuekpmioou.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = 'https://nikkyu-keisan-e74f6.firebaseapp.com/__/auth/handler';

/**
 * Google OAuth URLを構築
 */
function buildGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'token',
    scope: 'email profile',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * URLからアクセストークンを抽出
 */
function extractTokenFromUrl(url: string): string | null {
  // URLフラグメント（#以降）からトークンを抽出
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;

  const fragment = url.substring(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  return params.get('access_token');
}

/**
 * Google Sign-In（Electronウィンドウ内でOAuth）
 */
export async function signInWithGoogle(mainWindow: BrowserWindow): Promise<User> {
  return new Promise((resolve, reject) => {
    // 新しいセッションを作成してキャッシュをクリア
    const authSession = session.fromPartition('persist:google-auth');

    const authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: true,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: authSession,
      },
    });

    // Google OAuth URLを読み込み
    const authUrl = buildGoogleAuthUrl();
    authWindow.loadURL(authUrl);

    let resolved = false;

    // ナビゲーション時にトークンをチェック
    const handleNavigation = async (url: string) => {
      if (resolved) return;

      // リダイレクトURLにアクセストークンが含まれているかチェック
      if (url.includes('access_token=') || url.includes('#access_token')) {
        const token = extractTokenFromUrl(url);
        if (token) {
          resolved = true;
          try {
            const auth = getFirebaseAuth();
            const credential = GoogleAuthProvider.credential(null, token);
            const result = await signInWithCredential(auth, credential);
            currentUser = result.user;
            authWindow.close();
            resolve(result.user);
          } catch (error) {
            authWindow.close();
            reject(error);
          }
          return;
        }
      }

      // エラーの場合
      if (url.includes('error=')) {
        resolved = true;
        authWindow.close();
        reject(new Error('認証がキャンセルされました'));
      }
    };

    // URLの変更を監視
    authWindow.webContents.on('will-redirect', (_event, url) => {
      handleNavigation(url);
    });

    authWindow.webContents.on('will-navigate', (_event, url) => {
      handleNavigation(url);
    });

    // ページ読み込み完了時もチェック（フラグメントリダイレクトの場合）
    authWindow.webContents.on('did-navigate', (_event, url) => {
      handleNavigation(url);
    });

    authWindow.webContents.on('did-navigate-in-page', (_event, url) => {
      handleNavigation(url);
    });

    authWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('認証ウィンドウが閉じられました'));
      }
    });
  });
}

/**
 * サインアウト
 */
export async function signOutFromFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
  currentUser = null;
}

/**
 * 現在のユーザーを取得
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * 認証状態の監視を開始
 */
export function setupAuthStateListener(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}
