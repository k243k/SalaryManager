/**
 * 時給計算アプリ - 日給計算エンジン
 * 勤務時間から日給を計算する核となるロジック
 */

import { CalculatedResult, WageBreakdown } from '../types/data';
import {
  WageCalculationParams,
  ClassifiedTimeSegment,
  MinutesFromMidnight,
  NIGHT_TIME_START,
  NIGHT_TIME_END,
  RATE_NORMAL,
  RATE_NIGHT,
  RATE_OVERTIME,
  BONUS_HOLIDAY,
  BONUS_MONTH_24_DAYS,
  OVERTIME_THRESHOLD,
} from '../types/calculation';
import { splitWorkSegments, timeToMinutes, minutesToTime } from './time';
import { checkLegalBreak } from './validation';

/**
 * 日給計算のメイン関数
 * @param params 計算パラメータ
 * @returns 計算結果
 */
export function calculateDailyWage(params: WageCalculationParams): CalculatedResult {
  const { baseHourlyWage, monthBonus, startTime, endTime, breaks, baseDate, holidays } = params;

  // 1. 勤務時間を日跨ぎで分割
  const workSegments = splitWorkSegments(startTime, endTime, baseDate, holidays);

  // 2. 休憩時間を除外した実働時間を計算
  const actualWorkSegments = removeBreaksFromWorkSegments(workSegments, breaks);

  // 3. 実働時間を時間帯別に分類（通常/深夜/残業）
  const classifiedSegments = classifyTimeSegments(actualWorkSegments, baseHourlyWage, monthBonus);

  // 4. 日給を計算
  const { dailyWage, breakdown } = calculateWageFromSegments(classifiedSegments);

  // 5. 総実働時間を計算
  const totalActualMinutes = classifiedSegments.reduce((sum, seg) => sum + seg.minutes, 0);

  // 6. 総休憩時間を計算
  const totalBreakMinutes = breaks.reduce((sum, b) => {
    const start = timeToMinutes(b.start);
    const end = timeToMinutes(b.end);
    return sum + (end - start);
  }, 0);

  // 7. 法定休憩チェック
  const warnings: string[] = [];
  const legalBreakCheck = checkLegalBreak(totalActualMinutes, totalBreakMinutes);
  if (legalBreakCheck.warning) {
    warnings.push(legalBreakCheck.warning);
  }

  return {
    actualWorkMinutes: totalActualMinutes,
    dailyWage,
    breakdown,
  };
}

/**
 * 勤務時間セグメントから休憩時間を除外
 * @param workSegments 勤務時間セグメント
 * @param breaks 休憩時間
 * @returns 実働時間セグメント（休憩除外後）
 */
function removeBreaksFromWorkSegments(
  workSegments: Array<{ start: MinutesFromMidnight; end: MinutesFromMidnight; date: string; isHoliday: boolean }>,
  breaks: Array<{ start: string; end: string }>
): Array<{ start: MinutesFromMidnight; end: MinutesFromMidnight; date: string; isHoliday: boolean }>[] {
  const result: Array<{ start: MinutesFromMidnight; end: MinutesFromMidnight; date: string; isHoliday: boolean }>[] =
    [];

  for (const segment of workSegments) {
    const segmentPieces: Array<{
      start: MinutesFromMidnight;
      end: MinutesFromMidnight;
      date: string;
      isHoliday: boolean;
    }> = [segment];

    // 各休憩時間でセグメントを分割・除外
    for (const breakPeriod of breaks) {
      const breakStart = timeToMinutes(breakPeriod.start);
      const breakEnd = timeToMinutes(breakPeriod.end);

      const newPieces: Array<{
        start: MinutesFromMidnight;
        end: MinutesFromMidnight;
        date: string;
        isHoliday: boolean;
      }> = [];

      for (const piece of segmentPieces) {
        // 休憩時間がこのピースと重なるか判定
        if (breakEnd <= piece.start || breakStart >= piece.end) {
          // 重ならない: そのまま保持
          newPieces.push(piece);
        } else {
          // 重なる: 休憩前・休憩後に分割
          if (piece.start < breakStart) {
            newPieces.push({
              start: piece.start,
              end: Math.min(breakStart, piece.end),
              date: piece.date,
              isHoliday: piece.isHoliday,
            });
          }
          if (piece.end > breakEnd) {
            newPieces.push({
              start: Math.max(breakEnd, piece.start),
              end: piece.end,
              date: piece.date,
              isHoliday: piece.isHoliday,
            });
          }
        }
      }

      segmentPieces.length = 0;
      segmentPieces.push(...newPieces);
    }

    result.push(segmentPieces);
  }

  return result;
}

/**
 * 実働時間セグメントを時間帯別に分類（通常/深夜/残業）
 * 休憩控除後の実働累計で8時間超を判定し、境界で分割する
 * @param actualWorkSegments 実働時間セグメント（ネスト配列）
 * @param baseWage 基本時給
 * @param monthBonus 月24日以上加算フラグ
 * @returns 分類済みセグメント
 */
function classifyTimeSegments(
  actualWorkSegments: Array<
    { start: MinutesFromMidnight; end: MinutesFromMidnight; date: string; isHoliday: boolean }[]
  >,
  baseWage: number,
  monthBonus: boolean
): ClassifiedTimeSegment[] {
  const classified: ClassifiedTimeSegment[] = [];
  let cumulativeActualMinutes = 0; // 残業判定用の累積実働時間

  // フラット化して時系列順に並べる
  const flatSegments: Array<{
    start: MinutesFromMidnight;
    end: MinutesFromMidnight;
    date: string;
    isHoliday: boolean;
    dayIndex: number; // 日跨ぎ順序
  }> = [];

  let dayIndex = 0;
  for (const segmentGroup of actualWorkSegments) {
    for (const segment of segmentGroup) {
      flatSegments.push({ ...segment, dayIndex });
    }
    dayIndex++;
  }

  // 時系列順にソート（同じ日内では開始時刻順）
  flatSegments.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.start - b.start;
  });

  // 各セグメントを時間帯別に分割
  for (const segment of flatSegments) {
    // このセグメントを深夜/通常で分割して時系列順に並べる
    const timeZoneSegments = splitByTimeZone(segment.start, segment.end, segment.date, segment.isHoliday);

    for (const tzSeg of timeZoneSegments) {
      const mins = tzSeg.minutes;

      // 残業境界で分割が必要か判定
      const remainingUntilOvertime = OVERTIME_THRESHOLD - cumulativeActualMinutes;

      if (remainingUntilOvertime <= 0) {
        // すでに8時間超: 全て残業
        classified.push({
          type: 'overtime',
          minutes: mins,
          date: tzSeg.date,
          isHoliday: tzSeg.isHoliday,
          rate: RATE_OVERTIME,
          baseWage,
          monthBonus,
          startMinutes: tzSeg.originalStart,
          endMinutes: tzSeg.originalEnd,
        });
        cumulativeActualMinutes += mins;
      } else if (mins <= remainingUntilOvertime) {
        // このセグメント全体が8時間以内
        classified.push({
          type: tzSeg.isNight ? 'night' : 'normal',
          minutes: mins,
          date: tzSeg.date,
          isHoliday: tzSeg.isHoliday,
          rate: tzSeg.isNight ? RATE_NIGHT : RATE_NORMAL,
          baseWage,
          monthBonus,
          startMinutes: tzSeg.originalStart,
          endMinutes: tzSeg.originalEnd,
        });
        cumulativeActualMinutes += mins;
      } else {
        // 8時間境界でセグメントを分割
        const beforeOvertime = remainingUntilOvertime;
        const afterOvertime = mins - beforeOvertime;
        const splitPoint = tzSeg.originalStart + beforeOvertime;

        // 8時間以内の部分
        if (beforeOvertime > 0) {
          classified.push({
            type: tzSeg.isNight ? 'night' : 'normal',
            minutes: beforeOvertime,
            date: tzSeg.date,
            isHoliday: tzSeg.isHoliday,
            rate: tzSeg.isNight ? RATE_NIGHT : RATE_NORMAL,
            baseWage,
            monthBonus,
            startMinutes: tzSeg.originalStart,
            endMinutes: splitPoint,
          });
          cumulativeActualMinutes += beforeOvertime;
        }

        // 8時間超の部分（残業）
        if (afterOvertime > 0) {
          classified.push({
            type: 'overtime',
            minutes: afterOvertime,
            date: tzSeg.date,
            isHoliday: tzSeg.isHoliday,
            rate: RATE_OVERTIME,
            baseWage,
            monthBonus,
            startMinutes: splitPoint,
            endMinutes: tzSeg.originalEnd,
          });
          cumulativeActualMinutes += afterOvertime;
        }
      }
    }
  }

  return classified;
}

/**
 * セグメントを深夜/通常の時間帯で分割し、時系列順に返す
 */
function splitByTimeZone(
  start: MinutesFromMidnight,
  end: MinutesFromMidnight,
  date: string,
  isHoliday: boolean
): Array<{ minutes: number; date: string; isHoliday: boolean; isNight: boolean; originalStart: number; originalEnd: number }> {
  const result: Array<{ minutes: number; date: string; isHoliday: boolean; isNight: boolean; originalStart: number; originalEnd: number }> =
    [];

  // 境界点を収集
  const boundaries = [start, end];

  // 深夜時間帯境界: 22:00 (1320分) と 5:00 (300分)
  if (start < NIGHT_TIME_END && end > 0) {
    // 0:00〜5:00 の範囲内
    if (NIGHT_TIME_END > start && NIGHT_TIME_END < end) {
      boundaries.push(NIGHT_TIME_END);
    }
  }
  if (start < NIGHT_TIME_START && end > NIGHT_TIME_START) {
    boundaries.push(NIGHT_TIME_START);
  }
  if (start < 24 * 60 && end > 24 * 60) {
    boundaries.push(24 * 60);
  }

  // 境界点をソート
  const sortedBoundaries = [...new Set(boundaries)].sort((a, b) => a - b);

  // 各区間を処理
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];
    const minutes = segEnd - segStart;

    if (minutes > 0) {
      const isNight = isNightTime(segStart);
      result.push({
        minutes,
        date,
        isHoliday,
        isNight,
        originalStart: segStart,
        originalEnd: segEnd,
      });
    }
  }

  // 時系列順（開始時刻順）でソート
  result.sort((a, b) => a.originalStart - b.originalStart);

  return result;
}

/**
 * 指定時刻が深夜時間帯（22:00〜5:00）かどうか判定
 */
function isNightTime(minutes: MinutesFromMidnight): boolean {
  // 22:00〜23:59 または 0:00〜4:59
  return minutes >= NIGHT_TIME_START || minutes < NIGHT_TIME_END;
}

/**
 * 分類済みセグメントから日給と内訳を計算
 */
function calculateWageFromSegments(
  segments: ClassifiedTimeSegment[]
): { dailyWage: number; breakdown: WageBreakdown[] } {
  let totalWage = 0;
  const breakdown: WageBreakdown[] = [];

  for (const segment of segments) {
    // 基本時給の決定
    let hourlyWage = segment.baseWage;

    // 月24日以上加算
    if (segment.monthBonus) {
      hourlyWage += BONUS_MONTH_24_DAYS;
    }

    // 土日祝加算
    const holidayBonus = segment.isHoliday;
    if (holidayBonus) {
      hourlyWage += BONUS_HOLIDAY;
    }

    // 割増率適用
    const finalWage = hourlyWage * segment.rate;

    // 分数から時間に変換して金額計算
    const wage = (finalWage * segment.minutes) / 60;

    totalWage += wage;

    // 内訳に追加
    breakdown.push({
      date: segment.date,
      type: segment.type,
      minutes: segment.minutes,
      rate: segment.rate,
      holidayBonus,
      hourlyWage: finalWage,
      startTime: minutesToTime(segment.startMinutes),
      endTime: minutesToTime(segment.endMinutes),
    });
  }

  return {
    dailyWage: Math.round(totalWage), // 円単位で四捨五入
    breakdown,
  };
}

/**
 * 月集計の計算
 * @param days 月内の全日データ
 * @param transportationCostPerDay 1日あたりの交通費
 * @returns 出勤日数、月給合計、交通費合計、月24日以上フラグ
 */
export function calculateMonthSummary(
  days: Array<{ worked: boolean; dailyWage: number }>,
  transportationCostPerDay: number = 0
): {
  workDays: number;
  totalWage: number;
  totalTransportationCost: number;
  monthBonus: boolean;
} {
  const workDays = days.filter((d) => d.worked).length;
  const totalWage = days.reduce((sum, d) => sum + (d.worked ? d.dailyWage : 0), 0);
  const totalTransportationCost = workDays * transportationCostPerDay;
  const monthBonus = workDays >= 24;

  return {
    workDays,
    totalWage,
    totalTransportationCost,
    monthBonus,
  };
}
