/**
 * 時給計算アプリ - 日次入力テーブルコンポーネント
 * 月全体（1〜31日）のテーブル管理
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RootData, MonthData, DayData, createEmptyDayData, createEmptyMonthData } from '../../shared/types/data';
import { calculateMonthSummary } from '../../shared/utils/calculation';
import { getDayOfWeek, buildDateString, isHolidayOrWeekend } from '../../shared/utils/time';
import DailyInputRow from './DailyInputRow';

interface DailyInputTableProps {
  year: string;
  month: string;
  rootData: RootData;
  onSaveData: (data: RootData) => Promise<boolean>;
}

const DailyInputTable: React.FC<DailyInputTableProps> = ({ year, month, rootData, onSaveData }) => {
  // 月の日数を計算
  const daysInMonth = useMemo(() => {
    return new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
  }, [year, month]);

  // 年度データと基本時給・交通費を取得
  const yearData = rootData.years[year];
  const baseHourlyWage = yearData?.baseHourlyWage || 1200;
  const transportationCost = yearData?.transportationCost || 0;

  // 祝日セット
  const [holidays, setHolidays] = useState<Set<string>>(new Set());

  // 月データの初期化関数
  const initializeDaysData = useCallback(() => {
    const map = new Map<number, DayData>();
    const monthData = yearData?.months[month];
    const currentDaysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();

    for (let i = 1; i <= currentDaysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      const dayData = monthData?.days[dayStr] || createEmptyDayData();
      map.set(i, dayData);
    }

    return map;
  }, [year, month, yearData]);

  // 月データの状態
  const [daysData, setDaysData] = useState<Map<number, DayData>>(initializeDaysData);

  // 月次集計の状態
  const [monthSummary, setMonthSummary] = useState(() => {
    const monthData = yearData?.months[month];
    return monthData?.summary || { workDays: 0, totalWage: 0, totalTransportationCost: 0, monthBonus: false };
  });

  // 年/月が変更されたときにデータをリセット
  useEffect(() => {
    setDaysData(initializeDaysData());
    const monthData = yearData?.months[month];
    setMonthSummary(monthData?.summary || { workDays: 0, totalWage: 0, totalTransportationCost: 0, monthBonus: false });
  }, [year, month, initializeDaysData, yearData]);

  // 祝日を読み込む
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const response = await window.electronApi.loadHoliday(year);
        if (response.success && response.data) {
          setHolidays(new Set(response.data.holidays));
        }
      } catch (error) {
        console.error('祝日読み込みエラー:', error);
      }
    };
    loadHolidays();
  }, [year]);

  // 日データ変更時に月次集計を再計算して自動保存
  useEffect(() => {
    // 全日のデータを配列化
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayData = daysData.get(i + 1) || createEmptyDayData();
      return {
        worked: dayData.worked,
        dailyWage: dayData.calculated.dailyWage,
      };
    });

    // 月次集計を計算（交通費は年度設定から自動計算）
    const summary = calculateMonthSummary(days, transportationCost);
    setMonthSummary(summary);

    // 自動保存（デバウンス）
    const timer = setTimeout(() => {
      // rootDataを更新
      const updatedRootData = { ...rootData };

      // 年度データが存在しない場合は作成しない（既に存在するはず）
      if (!updatedRootData.years[year]) {
        return;
      }

      // 月データを更新
      if (!updatedRootData.years[year].months[month]) {
        updatedRootData.years[year].months[month] = createEmptyMonthData();
      }

      // 日データを更新
      const newDays: Record<string, DayData> = {};
      daysData.forEach((dayData, day) => {
        const dayStr = String(day).padStart(2, '0');
        newDays[dayStr] = dayData;
      });

      updatedRootData.years[year].months[month] = {
        days: newDays,
        summary,
      };

      // データ保存
      onSaveData(updatedRootData);
    }, 500);

    return () => clearTimeout(timer);
  }, [daysData, year, month, daysInMonth, rootData, onSaveData, transportationCost]);

  // 日データ変更ハンドラー
  const handleDayChange = (day: number, newData: DayData) => {
    setDaysData((prev) => {
      const next = new Map(prev);
      next.set(day, newData);
      return next;
    });
  };

  // 曜日名取得
  const getDayOfWeekLabel = (dayOfWeek: number): string => {
    const labels = ['日', '月', '火', '水', '木', '金', '土'];
    return labels[dayOfWeek];
  };

  // 土日祝日判定
  const checkIsHoliday = useCallback((dateStr: string): boolean => {
    return isHolidayOrWeekend(dateStr, holidays);
  }, [holidays]);

  return (
    <div className="card">
      <h3>日次入力</h3>

      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="daily-input-table">
          <thead>
            <tr>
              <th>日</th>
              <th>曜日</th>
              <th>出勤</th>
              <th>開始時刻</th>
              <th>終了時刻</th>
              <th>休憩</th>
              <th>実働時間</th>
              <th>日給</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayStr = String(day).padStart(2, '0');
              const dateStr = buildDateString(year, month, dayStr);
              const dayOfWeek = getDayOfWeek(dateStr);
              const dayData = daysData.get(day) || createEmptyDayData();
              const isHol = checkIsHoliday(dateStr);

              return (
                <DailyInputRow
                  key={day}
                  day={day}
                  dayData={dayData}
                  baseHourlyWage={baseHourlyWage}
                  transportationCost={transportationCost}
                  monthBonus={monthSummary.monthBonus}
                  dateStr={dateStr}
                  isHoliday={isHol}
                  dayOfWeekLabel={getDayOfWeekLabel(dayOfWeek)}
                  holidays={holidays}
                  onChange={handleDayChange}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4 style={{ marginBottom: '8px' }}>月次集計</h4>
        <p>出勤日数: {monthSummary.workDays}日</p>
        <p>月給合計: ¥{monthSummary.totalWage.toLocaleString()}</p>
        <p>交通費合計: ¥{(monthSummary.totalTransportationCost || 0).toLocaleString()}</p>
        <p style={{ fontWeight: 600, marginTop: '8px', borderTop: '1px solid #dee2e6', paddingTop: '8px' }}>
          総合計: ¥{(monthSummary.totalWage + (monthSummary.totalTransportationCost || 0)).toLocaleString()}
        </p>
        {monthSummary.monthBonus && <p className="success">✓ 月24日以上加算適用中（全日給+50円）</p>}
      </div>
    </div>
  );
};

export default DailyInputTable;
