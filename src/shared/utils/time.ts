/**
 * 時給計算アプリ - 時刻処理ユーティリティ
 * 時刻の変換、日跨ぎ処理、時間帯判定など
 */

import { parse, format, addDays, getDay } from 'date-fns';
import { MinutesFromMidnight, WorkSegment, NIGHT_TIME_START, NIGHT_TIME_END } from '../types/calculation';

/**
 * "HH:mm"形式の時刻を0:00からの分数に変換
 * @param timeStr "HH:mm"形式の時刻文字列（例: "22:00", "05:30"）
 * @returns 0:00からの経過分数（0〜1439）
 * @throws エラー: 不正な時刻形式の場合
 */
export function timeToMinutes(timeStr: string): MinutesFromMidnight {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Expected "HH:mm"`);
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23) {
    throw new Error(`Invalid hour: ${hours}. Must be 0-23`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minute: ${minutes}. Must be 0-59`);
  }

  return hours * 60 + minutes;
}

/**
 * 分数を"HH:mm"形式の時刻に変換
 * @param minutes 0:00からの経過分数
 * @returns "HH:mm"形式の時刻文字列
 */
export function minutesToTime(minutes: MinutesFromMidnight): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 日跨ぎ判定
 * @param startTime 開始時刻 "HH:mm"
 * @param endTime 終了時刻 "HH:mm"
 * @returns true: 日跨ぎあり（終了時刻が開始時刻より前）
 */
export function isSpanningMidnight(startTime: string, endTime: string): boolean {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end < start;
}

/**
 * 勤務時間を日跨ぎで分割
 * 開始時刻が終了時刻より後の場合、0:00で2つのセグメントに分割する
 *
 * @param startTime 勤務開始時刻 "HH:mm"
 * @param endTime 勤務終了時刻 "HH:mm"
 * @param baseDate 基準日（開始日） "YYYY-MM-DD"
 * @param holidays 祝日セット
 * @returns WorkSegment配列（日跨ぎなしの場合は1要素、ありの場合は2要素）
 */
export function splitWorkSegments(
  startTime: string,
  endTime: string,
  baseDate: string,
  holidays: Set<string>
): WorkSegment[] {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const isSpanning = endMinutes < startMinutes;

  if (!isSpanning) {
    // 日跨ぎなし: 同じ日の1セグメント
    return [
      {
        start: startMinutes,
        end: endMinutes,
        date: baseDate,
        isHoliday: isHolidayOrWeekend(baseDate, holidays),
        dayOfWeek: getDayOfWeek(baseDate),
      },
    ];
  }

  // 日跨ぎあり: 0:00で分割
  const nextDate = formatDate(addDays(parseDate(baseDate), 1));

  return [
    {
      start: startMinutes,
      end: 24 * 60, // 24:00 (1440分) = 翌日0:00
      date: baseDate,
      isHoliday: isHolidayOrWeekend(baseDate, holidays),
      dayOfWeek: getDayOfWeek(baseDate),
    },
    {
      start: 0, // 0:00
      end: endMinutes,
      date: nextDate,
      isHoliday: isHolidayOrWeekend(nextDate, holidays),
      dayOfWeek: getDayOfWeek(nextDate),
    },
  ];
}

/**
 * 指定時刻が深夜時間帯（22:00〜5:00）に含まれるか判定
 * @param minutes 0:00からの分数
 * @returns true: 深夜時間帯
 */
export function isNightTime(minutes: MinutesFromMidnight): boolean {
  // 22:00〜23:59 または 0:00〜4:59
  return minutes >= NIGHT_TIME_START || minutes < NIGHT_TIME_END;
}

/**
 * 時間帯が深夜時間帯と重なる部分を取得
 * @param start 開始時刻（分）
 * @param end 終了時刻（分）
 * @returns 深夜時間帯の分数（0の場合は重なりなし）
 */
export function getNightTimeMinutes(start: MinutesFromMidnight, end: MinutesFromMidnight): number {
  if (start >= end) {
    throw new Error('Start time must be before end time within the same day');
  }

  let nightMinutes = 0;

  // 22:00〜23:59の範囲
  if (start < 24 * 60 && end > NIGHT_TIME_START) {
    const nightStart = Math.max(start, NIGHT_TIME_START);
    const nightEnd = Math.min(end, 24 * 60);
    nightMinutes += nightEnd - nightStart;
  }

  // 0:00〜4:59の範囲
  if (start < NIGHT_TIME_END && end > 0) {
    const nightStart = Math.max(start, 0);
    const nightEnd = Math.min(end, NIGHT_TIME_END);
    nightMinutes += nightEnd - nightStart;
  }

  return nightMinutes;
}

/**
 * 日付文字列から曜日を取得
 * @param dateStr "YYYY-MM-DD"形式の日付
 * @returns 曜日（0=日曜, 1=月曜, ..., 6=土曜）
 */
export function getDayOfWeek(dateStr: string): number {
  // date-fnsのparseはタイムゾーン問題があるため、ネイティブDateを使用
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // ローカルタイムで構築
  return date.getDay();
}

/**
 * 土曜または日曜か判定
 * @param dateStr "YYYY-MM-DD"形式の日付
 * @returns true: 土日
 */
export function isWeekend(dateStr: string): boolean {
  const dayOfWeek = getDayOfWeek(dateStr);
  return dayOfWeek === 0 || dayOfWeek === 6; // 0=日曜, 6=土曜
}

/**
 * 祝日または土日か判定
 * @param dateStr "YYYY-MM-DD"形式の日付
 * @param holidays 祝日セット（"YYYY-MM-DD"形式）
 * @returns true: 祝日または土日
 */
export function isHolidayOrWeekend(dateStr: string, holidays: Set<string>): boolean {
  return holidays.has(dateStr) || isWeekend(dateStr);
}

/**
 * "YYYY-MM-DD"形式の文字列をDateオブジェクトに変換
 * @param dateStr "YYYY-MM-DD"形式の日付文字列
 * @returns Dateオブジェクト
 */
export function parseDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Dateオブジェクトを"YYYY-MM-DD"形式の文字列に変換
 * @param date Dateオブジェクト
 * @returns "YYYY-MM-DD"形式の日付文字列
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 2つの時刻の差分（分）を計算
 * ※同一日内の時刻を想定（日跨ぎは考慮しない）
 * @param startTime 開始時刻 "HH:mm"
 * @param endTime 終了時刻 "HH:mm"
 * @returns 差分（分）
 */
export function getTimeDifferenceMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end < start) {
    // 日跨ぎの場合
    return 24 * 60 - start + end;
  }

  return end - start;
}

/**
 * 分数を時間表記に変換（表示用）
 * @param minutes 分数
 * @returns "X時間Y分"形式の文字列（例: "8時間30分", "45分"）
 */
export function formatMinutesToJapanese(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  } else if (hours > 0) {
    return `${hours}時間`;
  } else {
    return `${mins}分`;
  }
}

/**
 * 年月日から日付文字列を生成
 * @param year 年（文字列または数値）
 * @param month 月（"01"〜"12"）
 * @param day 日（"01"〜"31"）
 * @returns "YYYY-MM-DD"形式の日付文字列
 */
export function buildDateString(year: string | number, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
