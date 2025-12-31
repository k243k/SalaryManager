/**
 * 時給計算アプリ - IPC通信型定義
 * Main/Rendererプロセス間通信の型定義
 */

import { RootData, YearData, MonthData, DayData } from './data';
import { FirebaseUserInfo, SyncStatus, SyncResult } from './sync';

/**
 * IPCチャンネル名
 */
export const IPC_CHANNELS = {
  // 認証関連
  AUTH_VERIFY_PIN: 'auth:verify-pin',
  AUTH_CREATE_PIN: 'auth:create-pin',
  AUTH_CHANGE_PIN: 'auth:change-pin',

  // データ読込関連
  DATA_LOAD: 'data:load',
  DATA_SAVE: 'data:save',
  DATA_EXISTS: 'data:exists',

  // 年度操作
  YEAR_GET: 'year:get',
  YEAR_CREATE: 'year:create',
  YEAR_UPDATE_WAGE: 'year:update-wage',
  YEAR_LIST: 'year:list',

  // 月操作
  MONTH_GET: 'month:get',
  MONTH_GET_SUMMARY: 'month:get-summary',

  // 日操作
  DAY_GET: 'day:get',
  DAY_UPDATE: 'day:update',
  DAY_DELETE: 'day:delete',

  // 祝日マスタ
  HOLIDAY_LOAD: 'holiday:load',
  HOLIDAY_GET_LIST: 'holiday:get-list',

  // Firebase認証
  FIREBASE_SIGN_IN: 'firebase:sign-in',
  FIREBASE_SIGN_OUT: 'firebase:sign-out',
  FIREBASE_GET_USER: 'firebase:get-user',
  FIREBASE_AUTH_STATE_CHANGED: 'firebase:auth-state-changed',

  // 同期
  SYNC_UPLOAD: 'sync:upload',
  SYNC_DOWNLOAD: 'sync:download',
  SYNC_FULL: 'sync:full',
  SYNC_STATUS: 'sync:status',
  SYNC_CHECK_CLOUD: 'sync:check-cloud',
} as const;

/**
 * IPC応答の基本型
 */
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * PIN認証リクエスト
 */
export interface VerifyPinRequest {
  pin: string; // 4桁PIN
}

/**
 * PIN認証レスポンス
 */
export interface VerifyPinResponse {
  valid: boolean;
}

/**
 * PIN作成リクエスト
 */
export interface CreatePinRequest {
  pin: string; // 4桁PIN
}

/**
 * PIN変更リクエスト
 */
export interface ChangePinRequest {
  oldPin: string;
  newPin: string;
}

/**
 * データ読込リクエスト
 */
export interface LoadDataRequest {
  pin: string;
}

/**
 * データ読込レスポンス
 */
export interface LoadDataResponse {
  data: RootData;
}

/**
 * データ保存リクエスト
 */
export interface SaveDataRequest {
  pin: string;
  data: RootData;
}

/**
 * データ存在確認レスポンス
 */
export interface DataExistsResponse {
  exists: boolean;
}

/**
 * 年度取得リクエスト
 */
export interface GetYearRequest {
  year: string; // "2026"
}

/**
 * 年度取得レスポンス
 */
export interface GetYearResponse {
  yearData: YearData | null;
}

/**
 * 年度作成リクエスト
 */
export interface CreateYearRequest {
  year: string;
  baseHourlyWage: number;
}

/**
 * 年度時給更新リクエスト
 */
export interface UpdateYearWageRequest {
  year: string;
  baseHourlyWage: number;
}

/**
 * 年度一覧レスポンス
 */
export interface ListYearsResponse {
  years: string[]; // ["2026", "2027"]
}

/**
 * 月取得リクエスト
 */
export interface GetMonthRequest {
  year: string;
  month: string; // "01"〜"12"
}

/**
 * 月取得レスポンス
 */
export interface GetMonthResponse {
  monthData: MonthData | null;
}

/**
 * 月集計取得リクエスト
 */
export interface GetMonthSummaryRequest {
  year: string;
  month: string;
}

/**
 * 月集計取得レスポンス
 */
export interface GetMonthSummaryResponse {
  workDays: number;
  totalWage: number;
  monthBonus: boolean;
}

/**
 * 日取得リクエスト
 */
export interface GetDayRequest {
  year: string;
  month: string;
  day: string; // "01"〜"31"
}

/**
 * 日取得レスポンス
 */
export interface GetDayResponse {
  dayData: DayData | null;
}

/**
 * 日更新リクエスト
 */
export interface UpdateDayRequest {
  year: string;
  month: string;
  day: string;
  dayData: DayData;
}

/**
 * 日削除リクエスト
 */
export interface DeleteDayRequest {
  year: string;
  month: string;
  day: string;
}

/**
 * 祝日読込リクエスト
 */
export interface LoadHolidayRequest {
  year: string; // "2026"
}

/**
 * 祝日読込レスポンス
 */
export interface LoadHolidayResponse {
  holidays: string[]; // ["2026-01-01", "2026-01-13", ...]
}

/**
 * 祝日一覧取得レスポンス
 */
export interface GetHolidayListResponse {
  holidays: Record<string, string[]>; // { "2026": ["2026-01-01", ...], ... }
}

/**
 * Preload APIの型定義
 * window.electronApi として公開される
 */
export interface ElectronAPI {
  // 認証
  verifyPin: (pin: string) => Promise<IPCResponse<VerifyPinResponse>>;
  createPin: (pin: string) => Promise<IPCResponse<void>>;
  changePin: (oldPin: string, newPin: string) => Promise<IPCResponse<void>>;

  // データ
  loadData: (pin: string) => Promise<IPCResponse<LoadDataResponse>>;
  saveData: (pin: string, data: RootData) => Promise<IPCResponse<void>>;
  dataExists: () => Promise<IPCResponse<DataExistsResponse>>;

  // 年度
  getYear: (year: string) => Promise<IPCResponse<GetYearResponse>>;
  createYear: (year: string, baseWage: number) => Promise<IPCResponse<void>>;
  updateYearWage: (year: string, baseWage: number) => Promise<IPCResponse<void>>;
  listYears: () => Promise<IPCResponse<ListYearsResponse>>;

  // 月
  getMonth: (year: string, month: string) => Promise<IPCResponse<GetMonthResponse>>;
  getMonthSummary: (year: string, month: string) => Promise<IPCResponse<GetMonthSummaryResponse>>;

  // 日
  getDay: (year: string, month: string, day: string) => Promise<IPCResponse<GetDayResponse>>;
  updateDay: (year: string, month: string, day: string, dayData: DayData) => Promise<IPCResponse<void>>;
  deleteDay: (year: string, month: string, day: string) => Promise<IPCResponse<void>>;

  // 祝日
  loadHoliday: (year: string) => Promise<IPCResponse<LoadHolidayResponse>>;
  getHolidayList: () => Promise<IPCResponse<GetHolidayListResponse>>;

  // Firebase認証
  firebaseSignIn: () => Promise<IPCResponse<FirebaseUserInfo>>;
  firebaseSignOut: () => Promise<IPCResponse<void>>;
  firebaseGetUser: () => Promise<IPCResponse<FirebaseUserInfo | null>>;
  onFirebaseAuthStateChanged: (callback: (user: FirebaseUserInfo | null) => void) => void;

  // 同期
  syncUpload: () => Promise<IPCResponse<void>>;
  syncDownload: () => Promise<IPCResponse<boolean>>;
  syncFull: () => Promise<IPCResponse<SyncResult>>;
  getSyncStatus: () => Promise<IPCResponse<SyncStatus>>;
  checkCloudData: () => Promise<IPCResponse<boolean>>;
}

/**
 * Window型拡張
 */
declare global {
  interface Window {
    electronApi: ElectronAPI;
  }
}
