/**
 * 時給計算アプリ - 日次入力行コンポーネント
 * 1日分の勤務入力UI
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DayData, BreakPeriod, CopiedShiftData, createEmptyDayData } from '../../shared/types/data';
import { formatMinutesToJapanese } from '../../shared/utils/time';
import { calculateDailyWage } from '../../shared/utils/calculation';
import { validateWorkAndBreaks } from '../../shared/utils/validation';
import { debounce } from '../../shared/utils/debounce';
import TimeInput from './TimeInput';
import BreakTimeManager from './BreakTimeManager';
import WageBreakdownModal from './WageBreakdownModal';

interface DailyInputRowProps {
  day: number;
  dayData: DayData;
  baseHourlyWage: number;
  transportationCost: number;
  monthBonus: boolean;
  dateStr: string;
  isHoliday: boolean;
  dayOfWeekLabel: string;
  holidays: Set<string>;
  onChange: (day: number, newData: DayData) => void;
  copiedData: CopiedShiftData | null;
  onCopy: (data: CopiedShiftData) => void;
  onPaste: (day: number) => void;
}

const DailyInputRow: React.FC<DailyInputRowProps> = ({
  day,
  dayData,
  baseHourlyWage,
  transportationCost,
  monthBonus,
  dateStr,
  isHoliday,
  dayOfWeekLabel,
  holidays,
  onChange,
  copiedData,
  onCopy,
  onPaste,
}) => {
  const [localData, setLocalData] = useState<DayData>(dayData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 親からのdayData変更を反映
  useEffect(() => {
    setLocalData(dayData);
  }, [dayData]);

  // デバウンス付き計算処理
  const debouncedCalculate = useMemo(
    () =>
      debounce((data: DayData) => {
        if (!data.worked || !data.startTime || !data.endTime) {
          // 出勤していないか、時刻が入力されていない場合はスキップ
          return;
        }

        // バリデーション
        const validation = validateWorkAndBreaks(data.startTime, data.endTime, data.breaks);
        if (!validation.valid) {
          // バリデーションエラーがある場合、計算せず警告を設定
          const withWarning = {
            ...data,
            warnings: [validation.error || 'エラーが発生しました'],
          };
          onChange(day, withWarning);
          return;
        }

        try {
          // 計算実行
          const result = calculateDailyWage({
            baseHourlyWage,
            monthBonus,
            startTime: data.startTime,
            endTime: data.endTime,
            breaks: data.breaks,
            baseDate: dateStr,
            holidays,
          });

          // 計算結果を反映
          const newData = {
            ...data,
            calculated: result,
            warnings: [], // 計算成功時は警告をクリア
          };

          onChange(day, newData);
        } catch (error) {
          console.error('計算エラー:', error);
          const withError = {
            ...data,
            warnings: ['計算中にエラーが発生しました'],
          };
          onChange(day, withError);
        }
      }, 500),
    [baseHourlyWage, monthBonus, dateStr, day, onChange, holidays]
  );

  // 出勤チェック変更
  const handleWorkedChange = useCallback(
    (checked: boolean) => {
      const updated = { ...localData, worked: checked };
      setLocalData(updated);

      if (!checked) {
        // 出勤オフの場合は即座に保存（計算不要）
        onChange(day, updated);
      } else {
        // 出勤オンの場合、時刻があれば計算
        if (updated.startTime && updated.endTime) {
          debouncedCalculate(updated);
        } else {
          onChange(day, updated);
        }
      }
    },
    [localData, day, onChange, debouncedCalculate]
  );

  // 時刻変更
  const handleTimeChange = useCallback(
    (field: 'startTime' | 'endTime', value: string) => {
      const updated = { ...localData, [field]: value };
      setLocalData(updated);

      // 出勤している場合のみ計算
      if (updated.worked && updated.startTime && updated.endTime) {
        debouncedCalculate(updated);
      } else {
        onChange(day, updated);
      }
    },
    [localData, day, onChange, debouncedCalculate]
  );

  // 休憩時間変更
  const handleBreaksChange = useCallback(
    (breaks: BreakPeriod[]) => {
      const updated = { ...localData, breaks };
      setLocalData(updated);

      // 出勤していて、時刻が入力されている場合のみ計算
      if (updated.worked && updated.startTime && updated.endTime) {
        debouncedCalculate(updated);
      } else {
        onChange(day, updated);
      }
    },
    [localData, day, onChange, debouncedCalculate]
  );

  // コピー処理
  const handleCopy = useCallback(() => {
    if (localData.startTime && localData.endTime) {
      onCopy({
        startTime: localData.startTime,
        endTime: localData.endTime,
        breaks: [...localData.breaks],
      });
    }
  }, [localData, onCopy]);

  // ペースト処理
  const handlePaste = useCallback(() => {
    onPaste(day);
  }, [day, onPaste]);

  // シフト削除処理
  const handleDeleteShift = useCallback(() => {
    const emptyData = createEmptyDayData();
    setLocalData(emptyData);
    onChange(day, emptyData);
  }, [day, onChange]);

  // コピー可能かどうか
  const canCopy = localData.startTime && localData.endTime;

  return (
    <tr className={isHoliday ? 'holiday-row' : ''}>
      {/* 日付 */}
      <td className="day-cell">{day}</td>

      {/* 曜日 */}
      <td className="weekday-cell">
        <span className={`weekday ${isHoliday ? 'holiday' : ''}`}>{dayOfWeekLabel}</span>
      </td>

      {/* 出勤チェック */}
      <td className="worked-cell">
        <input type="checkbox" checked={localData.worked} onChange={(e) => handleWorkedChange(e.target.checked)} />
      </td>

      {/* 開始時刻 */}
      <td className="time-cell">
        <TimeInput
          value={localData.startTime}
          onChange={(v) => handleTimeChange('startTime', v)}
          disabled={!localData.worked}
          placeholder="09:00"
        />
      </td>

      {/* 終了時刻 */}
      <td className="time-cell">
        <TimeInput
          value={localData.endTime}
          onChange={(v) => handleTimeChange('endTime', v)}
          disabled={!localData.worked}
          placeholder="18:00"
        />
      </td>

      {/* 休憩 */}
      <td className="break-cell">
        {localData.worked ? (
          <BreakTimeManager breaks={localData.breaks} onChange={handleBreaksChange} disabled={!localData.worked} />
        ) : (
          <span>-</span>
        )}
      </td>

      {/* 実働時間 */}
      <td className="work-minutes-cell">
        {localData.worked && localData.calculated.actualWorkMinutes > 0 ? (
          <div>
            <div>{formatMinutesToJapanese(localData.calculated.actualWorkMinutes)}</div>
            {localData.warnings.map((w, i) => (
              <div key={i} className="warning" style={{ fontSize: '11px', color: '#ffc107', marginTop: '2px' }}>
                ⚠ {w}
              </div>
            ))}
          </div>
        ) : (
          <span>-</span>
        )}
      </td>

      {/* 日給 */}
      <td className="wage-cell">
        {localData.worked && localData.calculated.dailyWage > 0 ? (
          <div>
            <span className="wage-amount" style={{ fontWeight: 600, color: '#28a745' }}>
              ¥{(localData.calculated.dailyWage + transportationCost).toLocaleString()}
            </span>
            {transportationCost > 0 && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                (交通費 ¥{transportationCost.toLocaleString()})
              </div>
            )}
          </div>
        ) : (
          <span>-</span>
        )}
      </td>

      {/* 操作 */}
      <td className="action-cell">
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* コピーボタン */}
          <button
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: '11px' }}
            onClick={handleCopy}
            disabled={!canCopy}
            title="この日のデータをコピー"
          >
            コピー
          </button>
          {/* ペーストボタン */}
          <button
            className="btn-secondary"
            style={{ padding: '2px 6px', fontSize: '11px' }}
            onClick={handlePaste}
            disabled={!copiedData}
            title="コピーしたデータを貼り付け"
          >
            貼付
          </button>
          {/* 内訳ボタン */}
          {localData.worked && localData.calculated.breakdown.length > 0 && (
            <button
              className="btn-secondary"
              style={{ padding: '2px 6px', fontSize: '11px' }}
              onClick={() => setIsModalOpen(true)}
            >
              内訳
            </button>
          )}
          {/* 削除ボタン */}
          {localData.worked && (
            <button
              style={{
                padding: '2px 6px',
                fontSize: '11px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              onClick={handleDeleteShift}
              title="このシフトを削除"
            >
              削除
            </button>
          )}
        </div>
      </td>

      {/* 内訳モーダル */}
      <WageBreakdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        day={day}
        breakdown={localData.calculated.breakdown}
        totalWage={localData.calculated.dailyWage}
        actualWorkMinutes={localData.calculated.actualWorkMinutes}
      />
    </tr>
  );
};

export default React.memo(DailyInputRow, (prev, next) => {
  return (
    prev.dayData === next.dayData &&
    prev.monthBonus === next.monthBonus &&
    prev.baseHourlyWage === next.baseHourlyWage &&
    prev.copiedData === next.copiedData
  );
});
