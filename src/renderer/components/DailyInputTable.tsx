/**
 * 時給計算アプリ - 日次入力テーブルコンポーネント
 * 月全体（1〜31日）のテーブル管理
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RootData, MonthData, DayData, CopiedShiftData, ShiftTemplate, createEmptyDayData, createEmptyMonthData } from '../../shared/types/data';
import { calculateMonthSummary, calculateDailyWage } from '../../shared/utils/calculation';
import { getDayOfWeek, buildDateString, isHolidayOrWeekend } from '../../shared/utils/time';
import { validateWorkAndBreaks } from '../../shared/utils/validation';
import DailyInputRow from './DailyInputRow';
import BulkInputModal from './BulkInputModal';

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

  // コピーされたシフトデータ
  const [copiedData, setCopiedData] = useState<CopiedShiftData | null>(null);

  // 一括入力モーダル
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // テンプレート保存モーダル
  const [isTemplateSaveOpen, setIsTemplateSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

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

  // コピーハンドラー
  const handleCopy = useCallback((data: CopiedShiftData) => {
    setCopiedData(data);
  }, []);

  // ペーストハンドラー
  const handlePaste = useCallback((day: number) => {
    if (!copiedData) return;

    const dayStr = String(day).padStart(2, '0');
    const dateStr = buildDateString(year, month, dayStr);

    // ペーストしたデータで日給を計算
    const validation = validateWorkAndBreaks(copiedData.startTime, copiedData.endTime, copiedData.breaks);

    let newDayData: DayData = {
      worked: true,
      startTime: copiedData.startTime,
      endTime: copiedData.endTime,
      breaks: [...copiedData.breaks],
      warnings: validation.valid ? [] : [validation.error || 'エラー'],
      calculated: { actualWorkMinutes: 0, dailyWage: 0, breakdown: [] },
    };

    if (validation.valid) {
      try {
        const result = calculateDailyWage({
          baseHourlyWage,
          monthBonus: monthSummary.monthBonus,
          startTime: copiedData.startTime,
          endTime: copiedData.endTime,
          breaks: copiedData.breaks,
          baseDate: dateStr,
          holidays,
        });
        newDayData.calculated = result;
      } catch (error) {
        console.error('計算エラー:', error);
        newDayData.warnings = ['計算中にエラーが発生しました'];
      }
    }

    handleDayChange(day, newDayData);
  }, [copiedData, year, month, baseHourlyWage, monthSummary.monthBonus, holidays, handleDayChange]);

  // 一括入力適用ハンドラー
  const handleBulkApply = useCallback((
    startTime: string,
    endTime: string,
    breaks: { start: string; end: string }[],
    targetDays: number[]
  ) => {
    for (const day of targetDays) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = buildDateString(year, month, dayStr);

      const validation = validateWorkAndBreaks(startTime, endTime, breaks);

      let newDayData: DayData = {
        worked: true,
        startTime,
        endTime,
        breaks: [...breaks],
        warnings: validation.valid ? [] : [validation.error || 'エラー'],
        calculated: { actualWorkMinutes: 0, dailyWage: 0, breakdown: [] },
      };

      if (validation.valid) {
        try {
          const result = calculateDailyWage({
            baseHourlyWage,
            monthBonus: monthSummary.monthBonus,
            startTime,
            endTime,
            breaks,
            baseDate: dateStr,
            holidays,
          });
          newDayData.calculated = result;
        } catch (error) {
          console.error('計算エラー:', error);
          newDayData.warnings = ['計算中にエラーが発生しました'];
        }
      }

      setDaysData((prev) => {
        const next = new Map(prev);
        next.set(day, newDayData);
        return next;
      });
    }
    setIsBulkModalOpen(false);
  }, [year, month, baseHourlyWage, monthSummary.monthBonus, holidays]);

  // テンプレート保存ハンドラー
  const handleSaveTemplate = useCallback(() => {
    if (!copiedData || !templateName.trim()) return;

    const newTemplate: ShiftTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      startTime: copiedData.startTime,
      endTime: copiedData.endTime,
      breaks: [...copiedData.breaks],
    };

    const updatedRootData = { ...rootData };
    if (!updatedRootData.years[year].templates) {
      updatedRootData.years[year].templates = [];
    }
    updatedRootData.years[year].templates.push(newTemplate);
    onSaveData(updatedRootData);
    setIsTemplateSaveOpen(false);
    setTemplateName('');
  }, [copiedData, templateName, rootData, year, onSaveData]);

  // テンプレート適用ハンドラー
  const handleApplyTemplate = useCallback((template: ShiftTemplate) => {
    setCopiedData({
      startTime: template.startTime,
      endTime: template.endTime,
      breaks: [...template.breaks],
    });
  }, []);

  // テンプレート削除ハンドラー
  const handleDeleteTemplate = useCallback((templateId: string) => {
    const updatedRootData = { ...rootData };
    if (updatedRootData.years[year].templates) {
      updatedRootData.years[year].templates = updatedRootData.years[year].templates.filter(
        (t) => t.id !== templateId
      );
      onSaveData(updatedRootData);
    }
  }, [rootData, year, onSaveData]);

  // テンプレート一覧
  const templates = yearData?.templates || [];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0 }}>日次入力</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* コピー状態表示 */}
          {copiedData && (
            <span style={{ fontSize: '12px', color: '#28a745', padding: '4px 8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              コピー中: {copiedData.startTime}〜{copiedData.endTime}
            </span>
          )}
          {/* テンプレートドロップダウン */}
          {templates.length > 0 && (
            <select
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '14px' }}
              value=""
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value);
                if (template) handleApplyTemplate(template);
              }}
            >
              <option value="">テンプレート選択</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.startTime}〜{t.endTime})
                </option>
              ))}
            </select>
          )}
          {/* テンプレート保存ボタン */}
          {copiedData && (
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '14px' }}
              onClick={() => setIsTemplateSaveOpen(true)}
            >
              テンプレ保存
            </button>
          )}
          {/* 一括入力ボタン */}
          <button
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '14px' }}
            onClick={() => setIsBulkModalOpen(true)}
          >
            一括入力
          </button>
        </div>
      </div>

      {/* テンプレート保存モーダル */}
      {isTemplateSaveOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', minWidth: '300px' }}>
            <h4 style={{ marginTop: 0 }}>テンプレート保存</h4>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {copiedData?.startTime}〜{copiedData?.endTime}
            </p>
            <input
              type="text"
              placeholder="テンプレート名（例: 夜勤）"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setIsTemplateSaveOpen(false); setTemplateName(''); }}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート管理（削除） */}
      {templates.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {templates.map((t) => (
            <span
              key={t.id}
              style={{
                fontSize: '11px', padding: '2px 8px', backgroundColor: '#f0f0f0', borderRadius: '12px',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}
            >
              {t.name}
              <button
                onClick={() => handleDeleteTemplate(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  fontSize: '14px', color: '#999', lineHeight: 1
                }}
                title="削除"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

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
                  copiedData={copiedData}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
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

      {/* 一括入力モーダル */}
      <BulkInputModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        year={year}
        month={month}
        daysInMonth={daysInMonth}
        holidays={holidays}
        onApply={handleBulkApply}
      />
    </div>
  );
};

export default DailyInputTable;
