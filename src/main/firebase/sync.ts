/**
 * 時給計算アプリ - 同期マネージャー
 * Firestoreとのデータ同期を管理
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreDb } from './config';
import { getCurrentUser } from './auth';
import { CloudData, SyncStatus, SyncResult } from '../../shared/types/sync';
import { getDataFilePath } from '../store';
import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

const COLLECTION_NAME = 'userData';
let syncStatus: SyncStatus = 'idle';
let deviceId: string | null = null;

/**
 * デバイスIDを取得または生成
 */
function getDeviceId(): string {
  if (deviceId) return deviceId;

  const deviceIdPath = join(app.getPath('userData'), 'device-id');
  if (existsSync(deviceIdPath)) {
    deviceId = readFileSync(deviceIdPath, 'utf-8').trim();
  } else {
    deviceId = randomBytes(16).toString('hex');
    writeFileSync(deviceIdPath, deviceId, 'utf-8');
  }
  return deviceId;
}

/**
 * チェックサムを計算
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 同期状態を取得
 */
export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

/**
 * クラウドにデータをアップロード
 */
export async function uploadToCloud(): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ログインが必要です');
  }

  syncStatus = 'syncing';

  try {
    const db = getFirestoreDb();
    const filePath = getDataFilePath();

    if (!existsSync(filePath)) {
      throw new Error('ローカルデータが見つかりません');
    }

    // ローカルの暗号化データを読み込み
    const encryptedContent = readFileSync(filePath, 'utf-8');

    const cloudData: Omit<CloudData, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
      userId: user.uid,
      encryptedData: encryptedContent,
      version: '1.0',
      updatedAt: serverTimestamp(),
      deviceId: getDeviceId(),
      checksum: calculateChecksum(encryptedContent),
    };

    // Firestoreに保存
    await setDoc(doc(db, COLLECTION_NAME, user.uid), cloudData);

    syncStatus = 'success';
  } catch (error) {
    syncStatus = 'error';
    throw error;
  }
}

/**
 * クラウドからデータをダウンロード
 */
export async function downloadFromCloud(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ログインが必要です');
  }

  syncStatus = 'syncing';

  try {
    const db = getFirestoreDb();
    const docRef = doc(db, COLLECTION_NAME, user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      syncStatus = 'success';
      return false; // クラウドにデータなし
    }

    const cloudData = docSnap.data() as CloudData;

    // チェックサム検証
    const checksum = calculateChecksum(cloudData.encryptedData);
    if (checksum !== cloudData.checksum) {
      throw new Error('データの整合性エラー');
    }

    // 暗号化データをローカルに保存
    const filePath = getDataFilePath();
    writeFileSync(filePath, cloudData.encryptedData, 'utf-8');

    syncStatus = 'success';
    return true;
  } catch (error) {
    syncStatus = 'error';
    throw error;
  }
}

/**
 * 双方向同期
 */
export async function syncData(): Promise<SyncResult> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('ログインが必要です');
  }

  syncStatus = 'syncing';

  try {
    const db = getFirestoreDb();
    const docRef = doc(db, COLLECTION_NAME, user.uid);
    const docSnap = await getDoc(docRef);

    const filePath = getDataFilePath();
    const localExists = existsSync(filePath);

    // クラウドにデータがない場合
    if (!docSnap.exists()) {
      if (localExists) {
        await uploadToCloud();
        syncStatus = 'success';
        return { action: 'uploaded', message: 'ローカルデータをクラウドにアップロードしました' };
      }
      syncStatus = 'success';
      return { action: 'no-change', message: 'データがありません' };
    }

    const cloudData = docSnap.data() as CloudData;

    // ローカルにデータがない場合
    if (!localExists) {
      await downloadFromCloud();
      syncStatus = 'success';
      return { action: 'downloaded', message: 'クラウドからデータをダウンロードしました' };
    }

    // 両方にデータがある場合 - チェックサムで比較
    const localContent = readFileSync(filePath, 'utf-8');
    const localChecksum = calculateChecksum(localContent);

    // 同じデータなら何もしない
    if (localChecksum === cloudData.checksum) {
      syncStatus = 'success';
      return { action: 'no-change', message: '同期済みです' };
    }

    // 異なるデバイスからの更新 - ローカルを優先してアップロード
    // (シンプルな実装: 常にローカルが正とする)
    await uploadToCloud();
    syncStatus = 'success';
    return { action: 'uploaded', message: 'ローカルデータでクラウドを更新しました' };

  } catch (error) {
    syncStatus = 'error';
    throw error;
  }
}

/**
 * クラウドにデータがあるかチェック
 */
export async function checkCloudData(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }

  try {
    const db = getFirestoreDb();
    const docRef = doc(db, COLLECTION_NAME, user.uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch {
    return false;
  }
}
