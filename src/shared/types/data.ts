/**
 * 時給計算アプリ - データ構造型定義
 * 要件定義書と詳細設計書に基づく型定義
 */

/**
 * ルートデータ構造
 * アプリ全体のデータを保持
 */
export interface RootData {
  settings: Settings;
  years: Record<string, YearData>; // キー: "2026", "2027"など
}

/**
 * 設定情報
 */
export interface Settings {
  pinHash: string;
  createdAt: string; // ISO 8601形式: "YYYY-MM-DDTHH:mm:ss"
}

/**
 * 年度データ
 */
export interface YearData {
  baseHourlyWage: number; // 基本時給（円）
  transportationCost: number; // 交通費（円/日）
  months: Record<string, MonthData>; // キー: "01"〜"12"
}

/**
 * 月データ
 */
export interface MonthData {
  days: Record<string, DayData>; // キー: "01"〜"31"
  summary: MonthSummary;
}

/**
 * 日データ
 */
export interface DayData {
  worked: boolean; // 出勤有無
  startTime: string; // 開始時刻 "HH:mm" (例: "22:00")
  endTime: string; // 終了時刻 "HH:mm" (例: "10:00")
  breaks: BreakPeriod[]; // 休憩時間（複数可）
  warnings: string[]; // 警告メッセージ（法定休憩未満など）
  calculated: CalculatedResult; // 計算結果
}

/**
 * 休憩時間
 */
export interface BreakPeriod {
  start: string; // 開始時刻 "HH:mm"
  end: string; // 終了時刻 "HH:mm"
}

/**
 * 計算結果
 */
export interface CalculatedResult {
  actualWorkMinutes: number; // 実働時間（分）
  dailyWage: number; // 日給（円）
  breakdown: WageBreakdown[]; // 内訳
}

/**
 * 日給計算の内訳
 */
export interface WageBreakdown {
  date: string; // 日付 "YYYY-MM-DD"
  type: 'normal' | 'night' | 'overtime'; // 時間帯種別
  minutes: number; // 時間数（分）
  rate: number; // 割増率 (1.0, 1.25など)
  holidayBonus: boolean; // 土日祝加算（+50円）が適用されているか
  hourlyWage: number; // この区分の時給（円）
  startTime: string; // 開始時刻 "HH:mm"
  endTime: string; // 終了時刻 "HH:mm"
}

/**
 * 月集計
 */
export interface MonthSummary {
  workDays: number; // 出勤日数
  totalWage: number; // 月給合計（円）
  totalTransportationCost: number; // 交通費合計（円）
  monthBonus: boolean; // 月24日以上加算が適用されているか
}

/**
 * 暗号化データ
 * data.encファイルの形式
 */
export interface EncryptedData {
  version: string; // データフォーマットバージョン (例: "1.0")
  pinSalt: string; // PIN検証用salt (Base64)
  dataSalt: string; // データ暗号化用salt (Base64)
  iv: string; // 初期化ベクトル (Base64)
  ciphertext: string; // 暗号化されたJSONデータ (Base64)
  tag: string; // GCM認証タグ (Base64)
}

/**
 * 初期データ生成用ヘルパー
 */
export function createEmptyRootData(pinHash: string): RootData {
  return {
    settings: {
      pinHash,
      createdAt: new Date().toISOString(),
    },
    years: {},
  };
}

export function createEmptyYearData(baseHourlyWage: number = 1200, transportationCost: number = 0): YearData {
  return {
    baseHourlyWage,
    transportationCost,
    months: {},
  };
}

export function createEmptyMonthData(): MonthData {
  return {
    days: {},
    summary: {
      workDays: 0,
      totalWage: 0,
      totalTransportationCost: 0,
      monthBonus: false,
    },
  };
}

export function createEmptyDayData(): DayData {
  return {
    worked: false,
    startTime: '',
    endTime: '',
    breaks: [],
    warnings: [],
    calculated: {
      actualWorkMinutes: 0,
      dailyWage: 0,
      breakdown: [],
    },
  };
}
