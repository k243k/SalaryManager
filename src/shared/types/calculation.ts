/**
 * 時給計算アプリ - 計算関連型定義
 * 計算ロジックで使用する型定義
 */

/**
 * 時刻（分単位）
 * 0:00を0とし、23:59を1439とする
 */
export type MinutesFromMidnight = number;

/**
 * 時間帯種別
 */
export type TimeSegmentType = 'normal' | 'night' | 'overtime';

/**
 * 時間帯セグメント
 * 計算処理で使用する時間の区間
 */
export interface TimeSegment {
  start: MinutesFromMidnight; // 開始時刻（分）
  end: MinutesFromMidnight; // 終了時刻（分）
  date: string; // 日付 "YYYY-MM-DD"
  isHoliday: boolean; // 土日祝フラグ
}

/**
 * 勤務時間セグメント
 * 日跨ぎで分割された勤務時間
 */
export interface WorkSegment extends TimeSegment {
  dayOfWeek: number; // 曜日 (0=日曜, 6=土曜)
}

/**
 * 休憩時間セグメント
 */
export interface BreakSegment extends TimeSegment {
  originalStart: string; // 元の休憩開始時刻 "HH:mm"
  originalEnd: string; // 元の休憩終了時刻 "HH:mm"
}

/**
 * 計算用時間帯区分
 * 実働時間を時間帯ごとに分類したもの
 */
export interface ClassifiedTimeSegment {
  type: TimeSegmentType; // 時間帯種別
  minutes: number; // 時間数（分）
  date: string; // 日付
  isHoliday: boolean; // 土日祝フラグ
  rate: number; // 割増率 (1.0, 1.25)
  baseWage: number; // 基本時給（円）
  monthBonus: boolean; // 月24日以上加算適用フラグ
  startMinutes: number; // 開始時刻（分）
  endMinutes: number; // 終了時刻（分）
}

/**
 * 時給計算パラメータ
 */
export interface WageCalculationParams {
  baseHourlyWage: number; // 基本時給（円）
  monthBonus: boolean; // 月24日以上加算（+50円）
  startTime: string; // 勤務開始時刻 "HH:mm"
  endTime: string; // 勤務終了時刻 "HH:mm"
  breaks: Array<{ start: string; end: string }>; // 休憩時間
  baseDate: string; // 基準日 "YYYY-MM-DD"
  holidays: Set<string>; // 祝日セット (YYYY-MM-DD形式)
}

/**
 * 計算結果（中間）
 */
export interface CalculationIntermediate {
  workSegments: WorkSegment[]; // 勤務時間セグメント（日跨ぎ分割済み）
  breakSegments: BreakSegment[]; // 休憩時間セグメント
  actualWorkSegments: ClassifiedTimeSegment[]; // 実働時間（休憩除外後、時間帯分類済み）
  totalActualMinutes: number; // 総実働時間（分）
  warnings: string[]; // 警告メッセージ
}

/**
 * 法定休憩チェック結果
 */
export interface LegalBreakCheckResult {
  required: boolean; // 法定休憩が必要か
  requiredMinutes: number; // 必要な休憩時間（分）
  actualMinutes: number; // 実際の休憩時間（分）
  isCompliant: boolean; // 法定休憩を満たしているか
  warning?: string; // 警告メッセージ
}

/**
 * 深夜時間帯定義
 * 22:00 (1320分) 〜 5:00 (300分)
 */
export const NIGHT_TIME_START: MinutesFromMidnight = 22 * 60; // 1320
export const NIGHT_TIME_END: MinutesFromMidnight = 5 * 60; // 300

/**
 * 割増率定義
 */
export const RATE_NORMAL = 1.0; // 通常
export const RATE_NIGHT = 1.25; // 深夜・8時間超
export const RATE_OVERTIME = 1.25; // 残業（8時間超）

/**
 * 加算額定義
 */
export const BONUS_HOLIDAY = 50; // 土日祝加算（円）
export const BONUS_MONTH_24_DAYS = 50; // 月24日以上加算（円）

/**
 * 法定休憩時間定義
 */
export const LEGAL_BREAK_6H = 45; // 6時間超で45分
export const LEGAL_BREAK_8H = 60; // 8時間超で60分（実質1時間）

/**
 * 残業判定基準（分）
 */
export const OVERTIME_THRESHOLD = 8 * 60; // 480分（8時間）
