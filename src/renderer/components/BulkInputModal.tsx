/**
 * 時給計算アプリ - 一括入力モーダルコンポーネント
 * 複数日に同じシフトを一括適用
 */

import React, { useState, useCallback, useMemo } from 'react';
import { BreakPeriod } from '../../shared/types/data';
import { getDayOfWeek, buildDateString, isHolidayOrWeekend } from '../../shared/utils/time';
import TimeInput from './TimeInput';
import BreakTimeManager from './BreakTimeManager';

interface BulkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: string;
  month: string;
  daysInMonth: number;
  holidays: Set<string>;
  onApply: (
    startTime: string,
    endTime: string,
    breaks: BreakPeriod[],
    targetDays: number[]
  ) => void;
}

type TargetMode = 'weekdays' | 'all' | 'custom';

const BulkInputModal: React.FC<BulkInputModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  daysInMonth,
  holidays,
  onApply,
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breaks, setBreaks] = useState<BreakPeriod[]>([]);
  const [targetMode, setTargetMode] = useState<TargetMode>('weekdays');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 月〜金

  // 曜日ラベル
  const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  // 各日の曜日を計算
  const dayInfos = useMemo(() => {
    const result: { day: number; dayOfWeek: number; isHoliday: boolean }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = buildDateString(year, month, dayStr);
      const dayOfWeek = getDayOfWeek(dateStr);
      const isHol = isHolidayOrWeekend(dateStr, holidays);
      result.push({ day, dayOfWeek, isHoliday: isHol });
    }
    return result;
  }, [year, month, daysInMonth, holidays]);

  // 対象日を計算
  const targetDays = useMemo(() => {
    switch (targetMode) {
      case 'weekdays':
        // 平日のみ（土日祝を除く）
        return dayInfos
          .filter((info) => !info.isHoliday)
          .map((info) => info.day);
      case 'all':
        // 全日
        return dayInfos.map((info) => info.day);
      case 'custom':
        // 選択した曜日のみ
        return dayInfos
          .filter((info) => selectedWeekdays.includes(info.dayOfWeek))
          .map((info) => info.day);
      default:
        return [];
    }
  }, [targetMode, dayInfos, selectedWeekdays]);

  // 曜日選択切り替え
  const toggleWeekday = useCallback((dayOfWeek: number) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(dayOfWeek)) {
        return prev.filter((d) => d !== dayOfWeek);
      } else {
        return [...prev, dayOfWeek];
      }
    });
  }, []);

  // 適用ハンドラー
  const handleApply = useCallback(() => {
    if (!startTime || !endTime || targetDays.length === 0) return;
    onApply(startTime, endTime, breaks, targetDays);
  }, [startTime, endTime, breaks, targetDays, onApply]);

  // リセット
  const handleClose = useCallback(() => {
    setStartTime('');
    setEndTime('');
    setBreaks([]);
    setTargetMode('weekdays');
    setSelectedWeekdays([1, 2, 3, 4, 5]);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0 }}>一括入力</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          複数の日に同じシフトを一括で入力します。
        </p>

        {/* 時刻入力 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            勤務時間
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <TimeInput
              value={startTime}
              onChange={setStartTime}
              placeholder="開始時刻"
            />
            <span>〜</span>
            <TimeInput
              value={endTime}
              onChange={setEndTime}
              placeholder="終了時刻"
            />
          </div>
        </div>

        {/* 休憩入力 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            休憩時間
          </label>
          <BreakTimeManager breaks={breaks} onChange={setBreaks} disabled={false} />
        </div>

        {/* 対象日選択 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            適用対象
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'weekdays'}
                onChange={() => setTargetMode('weekdays')}
              />
              平日のみ
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'all'}
                onChange={() => setTargetMode('all')}
              />
              全日
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="targetMode"
                checked={targetMode === 'custom'}
                onChange={() => setTargetMode('custom')}
              />
              曜日指定
            </label>
          </div>

          {/* 曜日選択（custom mode） */}
          {targetMode === 'custom' && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
              {weekdayLabels.map((label, index) => (
                <button
                  key={index}
                  onClick={() => toggleWeekday(index)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: selectedWeekdays.includes(index)
                      ? '2px solid #007bff'
                      : '1px solid #ced4da',
                    backgroundColor: selectedWeekdays.includes(index)
                      ? '#007bff'
                      : 'white',
                    color: selectedWeekdays.includes(index)
                      ? 'white'
                      : index === 0
                        ? '#dc3545'
                        : index === 6
                          ? '#007bff'
                          : '#333',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 対象日プレビュー */}
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
            適用対象: {targetDays.length}日
          </div>
          <div style={{ fontSize: '12px', color: '#666', maxHeight: '60px', overflowY: 'auto' }}>
            {targetDays.length > 0
              ? targetDays.map((d) => `${d}日`).join('、')
              : '対象日がありません'}
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={handleClose}>
            キャンセル
          </button>
          <button
            className="btn-primary"
            onClick={handleApply}
            disabled={!startTime || !endTime || targetDays.length === 0}
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkInputModal;
