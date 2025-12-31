/**
 * 時給計算アプリ - IPCハンドラー
 * Main/Rendererプロセス間通信のハンドラー実装
 */

import { ipcMain } from 'electron';
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

/**
 * IPCハンドラーをセットアップ
 */
export function setupIPCHandlers(): void {
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
