/**
 * 時給計算アプリ - Preloadスクリプト
 * Main/Rendererプロセス間のブリッジ（Context Isolation対応）
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, ElectronAPI, IPCResponse } from '../shared/types/ipc';
import { RootData } from '../shared/types/data';

/**
 * Renderer側に公開するAPI
 */
const electronAPI: ElectronAPI = {
  // 認証
  verifyPin: (pin: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_VERIFY_PIN, pin),
  createPin: (pin: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_CREATE_PIN, pin),
  changePin: (oldPin: string, newPin: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_CHANGE_PIN, oldPin, newPin),

  // データ
  loadData: (pin: string) => ipcRenderer.invoke(IPC_CHANNELS.DATA_LOAD, pin),
  saveData: (pin: string, data: RootData) => ipcRenderer.invoke(IPC_CHANNELS.DATA_SAVE, pin, data),
  dataExists: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_EXISTS),

  // 年度
  getYear: (year: string) => ipcRenderer.invoke(IPC_CHANNELS.YEAR_GET, year),
  createYear: (year: string, baseWage: number) => ipcRenderer.invoke(IPC_CHANNELS.YEAR_CREATE, year, baseWage),
  updateYearWage: (year: string, baseWage: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.YEAR_UPDATE_WAGE, year, baseWage),
  listYears: () => ipcRenderer.invoke(IPC_CHANNELS.YEAR_LIST),

  // 月
  getMonth: (year: string, month: string) => ipcRenderer.invoke(IPC_CHANNELS.MONTH_GET, year, month),
  getMonthSummary: (year: string, month: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MONTH_GET_SUMMARY, year, month),

  // 日
  getDay: (year: string, month: string, day: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DAY_GET, year, month, day),
  updateDay: (year: string, month: string, day: string, dayData) =>
    ipcRenderer.invoke(IPC_CHANNELS.DAY_UPDATE, year, month, day, dayData),
  deleteDay: (year: string, month: string, day: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DAY_DELETE, year, month, day),

  // 祝日
  loadHoliday: (year: string) => ipcRenderer.invoke(IPC_CHANNELS.HOLIDAY_LOAD, year),
  getHolidayList: () => ipcRenderer.invoke(IPC_CHANNELS.HOLIDAY_GET_LIST),

  // Firebase認証
  firebaseSignIn: () => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_SIGN_IN),
  firebaseSignOut: () => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_SIGN_OUT),
  firebaseGetUser: () => ipcRenderer.invoke(IPC_CHANNELS.FIREBASE_GET_USER),
  onFirebaseAuthStateChanged: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.FIREBASE_AUTH_STATE_CHANGED, (_, user) => {
      callback(user);
    });
  },

  // 同期
  syncUpload: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_UPLOAD),
  syncDownload: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_DOWNLOAD),
  syncFull: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_FULL),
  getSyncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS),
  checkCloudData: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_CHECK_CLOUD),
};

/**
 * window.electronApiとして公開
 */
contextBridge.exposeInMainWorld('electronApi', electronAPI);
