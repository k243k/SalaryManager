/**
 * 時給計算アプリ - IPCハンドラー
 * Main/Rendererプロセス間通信のハンドラー実装
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS, IPCResponse } from '../shared/types/ipc';
import {
  dataFileExists,
  loadData,
  saveData,
  createNewDataFile,
  verifyPinFromFile,
  changePin,
} from './store';
import { RootData, createEmptyYearData, createEmptyMonthData } from '../shared/types/data';
import { loadHolidaysFromFile, createHolidaySet } from '../shared/utils/holiday';
import { initializeFirebase } from './firebase/config';
import { signInWithGoogle, signOutFromFirebase, getCurrentUser, setupAuthStateListener } from './firebase/auth';
import { uploadToCloud, downloadFromCloud, syncData, getSyncStatus, checkCloudData } from './firebase/sync';

let mainWindowRef: BrowserWindow | null = null;

/**
 * IPCハンドラーをセットアップ
 */
export function setupIPCHandlers(mainWindow?: BrowserWindow): void {
  if (mainWindow) {
    mainWindowRef = mainWindow;
  }

  // 認証関連
  setupAuthHandlers();

  // データ関連
  setupDataHandlers();

  // 年度操作
  setupYearHandlers();

  // 月操作
  setupMonthHandlers();

  // 日操作
  setupDayHandlers();

  // 祝日マスタ
  setupHolidayHandlers();

  // Firebase関連
  setupFirebaseHandlers();
}

/**
 * 認証関連ハンドラー
 */
function setupAuthHandlers(): void {
  // PIN検証
  ipcMain.handle(IPC_CHANNELS.AUTH_VERIFY_PIN, async (_, pin: string): Promise<IPCResponse> => {
    try {
      const valid = verifyPinFromFile(pin);
      return { success: true, data: { valid } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'PIN検証に失敗しました' };
    }
  });

  // PIN作成
  ipcMain.handle(IPC_CHANNELS.AUTH_CREATE_PIN, async (_, pin: string): Promise<IPCResponse> => {
    try {
      createNewDataFile(pin);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'PIN作成に失敗しました' };
    }
  });

  // PIN変更
  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHANGE_PIN,
    async (_, oldPin: string, newPin: string): Promise<IPCResponse> => {
      try {
        changePin(oldPin, newPin);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'PIN変更に失敗しました' };
      }
    }
  );
}

/**
 * データ関連ハンドラー
 */
function setupDataHandlers(): void {
  // データ存在確認
  ipcMain.handle(IPC_CHANNELS.DATA_EXISTS, async (): Promise<IPCResponse> => {
    try {
      const exists = dataFileExists();
      return { success: true, data: { exists } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'データ確認に失敗しました' };
    }
  });

  // データ読込
  ipcMain.handle(IPC_CHANNELS.DATA_LOAD, async (_, pin: string): Promise<IPCResponse> => {
    try {
      const data = loadData(pin);
      return { success: true, data: { data } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'データ読込に失敗しました' };
    }
  });

  // データ保存
  ipcMain.handle(IPC_CHANNELS.DATA_SAVE, async (_, pin: string, data: RootData): Promise<IPCResponse> => {
    try {
      saveData(data, pin);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'データ保存に失敗しました' };
    }
  });
}

/**
 * 年度操作ハンドラー
 */
function setupYearHandlers(): void {
  // 年度取得
  ipcMain.handle(IPC_CHANNELS.YEAR_GET, async (_, year: string): Promise<IPCResponse> => {
    try {
      // 注: データは常にメモリに保持されているわけではないので、
      // Rendererから渡されるか、別の方法で管理する必要がある
      // ここでは簡略化のため、エラーを返す
      return { success: false, error: 'この操作はRendererプロセスで実装してください' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '年度取得に失敗しました' };
    }
  });

  // 年度一覧
  ipcMain.handle(IPC_CHANNELS.YEAR_LIST, async (): Promise<IPCResponse> => {
    try {
      // 同上
      return { success: false, error: 'この操作はRendererプロセスで実装してください' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '年度一覧取得に失敗しました' };
    }
  });
}

/**
 * 月操作ハンドラー
 */
function setupMonthHandlers(): void {
  // 月取得
  ipcMain.handle(
    IPC_CHANNELS.MONTH_GET,
    async (_, year: string, month: string): Promise<IPCResponse> => {
      try {
        // Rendererプロセスで実装
        return { success: false, error: 'この操作はRendererプロセスで実装してください' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : '月取得に失敗しました' };
      }
    }
  );

  // 月集計取得
  ipcMain.handle(
    IPC_CHANNELS.MONTH_GET_SUMMARY,
    async (_, year: string, month: string): Promise<IPCResponse> => {
      try {
        // Rendererプロセスで実装
        return { success: false, error: 'この操作はRendererプロセスで実装してください' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : '月集計取得に失敗しました' };
      }
    }
  );
}

/**
 * 日操作ハンドラー
 */
function setupDayHandlers(): void {
  // 日取得
  ipcMain.handle(
    IPC_CHANNELS.DAY_GET,
    async (_, year: string, month: string, day: string): Promise<IPCResponse> => {
      try {
        // Rendererプロセスで実装
        return { success: false, error: 'この操作はRendererプロセスで実装してください' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : '日取得に失敗しました' };
      }
    }
  );

  // 日更新は実際にはデータ全体の保存で処理するため、省略
}

/**
 * 祝日マスタハンドラー
 */
function setupHolidayHandlers(): void {
  // 祝日読込
  ipcMain.handle(IPC_CHANNELS.HOLIDAY_LOAD, async (_, year: string): Promise<IPCResponse> => {
    try {
      const holidays = loadHolidaysFromFile(year);
      return { success: true, data: { holidays } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '祝日読込に失敗しました' };
    }
  });

  // 祝日一覧取得（複数年度）
  ipcMain.handle(IPC_CHANNELS.HOLIDAY_GET_LIST, async (): Promise<IPCResponse> => {
    try {
      // 実装は必要に応じて
      return { success: true, data: { holidays: {} } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '祝日一覧取得に失敗しました' };
    }
  });
}

/**
 * Firebase関連ハンドラー
 */
function setupFirebaseHandlers(): void {
  // Firebase初期化
  initializeFirebase();

  // Google Sign-In
  ipcMain.handle(IPC_CHANNELS.FIREBASE_SIGN_IN, async (): Promise<IPCResponse> => {
    try {
      if (!mainWindowRef) {
        throw new Error('ウィンドウが初期化されていません');
      }
      const user = await signInWithGoogle(mainWindowRef);
      return {
        success: true,
        data: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'ログインに失敗しました' };
    }
  });

  // Sign Out
  ipcMain.handle(IPC_CHANNELS.FIREBASE_SIGN_OUT, async (): Promise<IPCResponse> => {
    try {
      await signOutFromFirebase();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'ログアウトに失敗しました' };
    }
  });

  // Get Current User
  ipcMain.handle(IPC_CHANNELS.FIREBASE_GET_USER, async (): Promise<IPCResponse> => {
    const user = getCurrentUser();
    if (user) {
      return {
        success: true,
        data: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      };
    }
    return { success: true, data: null };
  });

  // 同期: アップロード
  ipcMain.handle(IPC_CHANNELS.SYNC_UPLOAD, async (): Promise<IPCResponse> => {
    try {
      await uploadToCloud();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'アップロードに失敗しました' };
    }
  });

  // 同期: ダウンロード
  ipcMain.handle(IPC_CHANNELS.SYNC_DOWNLOAD, async (): Promise<IPCResponse> => {
    try {
      const downloaded = await downloadFromCloud();
      return { success: true, data: downloaded };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'ダウンロードに失敗しました' };
    }
  });

  // 同期: 双方向
  ipcMain.handle(IPC_CHANNELS.SYNC_FULL, async (): Promise<IPCResponse> => {
    try {
      const result = await syncData();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '同期に失敗しました' };
    }
  });

  // 同期状態取得
  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, async (): Promise<IPCResponse> => {
    return { success: true, data: getSyncStatus() };
  });

  // クラウドデータ確認
  ipcMain.handle(IPC_CHANNELS.SYNC_CHECK_CLOUD, async (): Promise<IPCResponse> => {
    try {
      const exists = await checkCloudData();
      return { success: true, data: exists };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'クラウドデータ確認に失敗しました' };
    }
  });

  // 認証状態の変化をRendererに通知
  if (mainWindowRef) {
    setupAuthStateListener((user) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send(
          IPC_CHANNELS.FIREBASE_AUTH_STATE_CHANGED,
          user
            ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
              }
            : null
        );
      }
    });
  }
}
