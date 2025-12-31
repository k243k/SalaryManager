/**
 * 時給計算アプリ - 同期関連の型定義
 */

/**
 * 同期状態
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

/**
 * Firebaseユーザー情報
 */
export interface FirebaseUserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * クラウドに保存するデータ構造
 */
export interface CloudData {
  userId: string;
  encryptedData: string;
  version: string;
  updatedAt: Date;
  deviceId: string;
  checksum: string;
}

/**
 * 同期結果
 */
export interface SyncResult {
  action: 'uploaded' | 'downloaded' | 'no-change' | 'conflict';
  message?: string;
}

/**
 * 同期コンフリクト情報
 */
export interface SyncConflict {
  localUpdatedAt: string;
  cloudUpdatedAt: string;
}
