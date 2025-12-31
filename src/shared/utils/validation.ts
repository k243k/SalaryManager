/**
 * 時給計算アプリ - バリデーション
 * 入力値検証、法定休憩チェック、業務ルール検証
 */

import { BreakPeriod } from '../types/data';
import { LegalBreakCheckResult, LEGAL_BREAK_6H, LEGAL_BREAK_8H } from '../types/calculation';
import { timeToMinutes, getTimeDifferenceMinutes } from './time';

/**
 * PIN（4桁数字）の形式検証
 * @param pin PIN文字列
 * @returns true: 正しい形式（4桁の数字）
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * 時刻形式（HH:mm）の検証
 * @param timeStr 時刻文字列
 * @returns true: 正しい形式
 */
export function isValidTimeFormat(timeStr: string): boolean {
  if (!timeStr) return false;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * 年度の検証
 * @param year 年度文字列
 * @returns true: 正しい形式（4桁の数字）
 */
export function isValidYear(year: string): boolean {
  return /^\d{4}$/.test(year) && parseInt(year, 10) >= 2000 && parseInt(year, 10) <= 2100;
}

/**
 * 月の検証
 * @param month 月文字列
 * @returns true: 正しい形式（"01"〜"12"）
 */
export function isValidMonth(month: string): boolean {
  const monthNum = parseInt(month, 10);
  return /^\d{1,2}$/.test(month) && monthNum >= 1 && monthNum <= 12;
}

/**
 * 日の検証
 * @param day 日文字列
 * @returns true: 正しい形式（"01"〜"31"）
 */
export function isValidDay(day: string): boolean {
  const dayNum = parseInt(day, 10);
  return /^\d{1,2}$/.test(day) && dayNum >= 1 && dayNum <= 31;
}

/**
 * 日付の検証（年月日の組み合わせ）
 * @param year 年
 * @param month 月
 * @param day 日
 * @returns true: 実在する日付
 */
export function isValidDate(year: string, month: string, day: string): boolean {
  if (!isValidYear(year) || !isValidMonth(month) || !isValidDay(day)) {
    return false;
  }

  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return (
    date.getFullYear() === parseInt(year, 10) &&
    date.getMonth() === parseInt(month, 10) - 1 &&
    date.getDate() === parseInt(day, 10)
  );
}

/**
 * 時給の検証
 * @param wage 時給（円）
 * @returns true: 有効な時給（0より大きく、10000以下）
 */
export function isValidWage(wage: number): boolean {
  return wage > 0 && wage <= 10000;
}

/**
 * 休憩時間の形式検証
 * @param breaks 休憩時間配列
 * @returns { valid: boolean, error?: string }
 */
export function validateBreaks(breaks: BreakPeriod[]): { valid: boolean; error?: string } {
  for (let i = 0; i < breaks.length; i++) {
    const breakPeriod = breaks[i];

    // 時刻形式チェック
    if (!isValidTimeFormat(breakPeriod.start)) {
      return { valid: false, error: `休憩${i + 1}の開始時刻が不正です: ${breakPeriod.start}` };
    }
    if (!isValidTimeFormat(breakPeriod.end)) {
      return { valid: false, error: `休憩${i + 1}の終了時刻が不正です: ${breakPeriod.end}` };
    }

    // 開始・終了の順序チェック（同一日内）
    const startMinutes = timeToMinutes(breakPeriod.start);
    const endMinutes = timeToMinutes(breakPeriod.end);

    if (startMinutes >= endMinutes) {
      return {
        valid: false,
        error: `休憩${i + 1}の時刻が不正です（開始時刻は終了時刻より前である必要があります）`,
      };
    }
  }

  return { valid: true };
}

/**
 * 勤務時間と休憩時間の整合性検証
 * @param startTime 勤務開始時刻
 * @param endTime 勤務終了時刻
 * @param breaks 休憩時間配列
 * @returns { valid: boolean, error?: string }
 */
export function validateWorkAndBreaks(
  startTime: string,
  endTime: string,
  breaks: BreakPeriod[]
): { valid: boolean; error?: string } {
  // 時刻形式チェック
  if (!isValidTimeFormat(startTime)) {
    return { valid: false, error: `勤務開始時刻が不正です: ${startTime}` };
  }
  if (!isValidTimeFormat(endTime)) {
    return { valid: false, error: `勤務終了時刻が不正です: ${endTime}` };
  }

  // 休憩時間の形式チェック
  const breaksValidation = validateBreaks(breaks);
  if (!breaksValidation.valid) {
    return breaksValidation;
  }

  // 総勤務時間の計算
  const totalWorkMinutes = getTimeDifferenceMinutes(startTime, endTime);

  // 総休憩時間の計算
  let totalBreakMinutes = 0;
  for (const breakPeriod of breaks) {
    totalBreakMinutes += getTimeDifferenceMinutes(breakPeriod.start, breakPeriod.end);
  }

  // 休憩時間が勤務時間を超えていないかチェック
  if (totalBreakMinutes >= totalWorkMinutes) {
    return {
      valid: false,
      error: `休憩時間（${totalBreakMinutes}分）が勤務時間（${totalWorkMinutes}分）以上になっています`,
    };
  }

  return { valid: true };
}

/**
 * 法定休憩時間チェック
 * @param actualWorkMinutes 実働時間（分）
 * @param breakMinutes 休憩時間（分）
 * @returns LegalBreakCheckResult
 */
export function checkLegalBreak(actualWorkMinutes: number, breakMinutes: number): LegalBreakCheckResult {
  const actualWorkHours = actualWorkMinutes / 60;

  // 6時間以下: 休憩不要
  if (actualWorkHours <= 6) {
    return {
      required: false,
      requiredMinutes: 0,
      actualMinutes: breakMinutes,
      isCompliant: true,
    };
  }

  // 6時間超〜8時間以下: 45分必要
  if (actualWorkHours <= 8) {
    const isCompliant = breakMinutes >= LEGAL_BREAK_6H;
    return {
      required: true,
      requiredMinutes: LEGAL_BREAK_6H,
      actualMinutes: breakMinutes,
      isCompliant,
      warning: isCompliant ? undefined : `実働6時間超のため、45分以上の休憩が必要です（現在: ${breakMinutes}分）`,
    };
  }

  // 8時間超: 60分必要
  const isCompliant = breakMinutes >= LEGAL_BREAK_8H;
  return {
    required: true,
    requiredMinutes: LEGAL_BREAK_8H,
    actualMinutes: breakMinutes,
    isCompliant,
    warning: isCompliant ? undefined : `実働8時間超のため、60分以上の休憩が必要です（現在: ${breakMinutes}分）`,
  };
}

/**
 * エラーメッセージの生成
 */
export const ValidationErrors = {
  INVALID_PIN: 'PINは4桁の数字で入力してください',
  INVALID_TIME_FORMAT: '時刻は"HH:mm"形式で入力してください（例: 22:00）',
  INVALID_YEAR: '年度は2000〜2100の範囲で入力してください',
  INVALID_MONTH: '月は1〜12の範囲で入力してください',
  INVALID_DAY: '日は1〜31の範囲で入力してください',
  INVALID_DATE: '存在しない日付です',
  INVALID_WAGE: '時給は1〜10000円の範囲で入力してください',
  BREAK_EXCEEDS_WORK: '休憩時間が勤務時間を超えています',
  EMPTY_START_TIME: '勤務開始時刻を入力してください',
  EMPTY_END_TIME: '勤務終了時刻を入力してください',
} as const;
