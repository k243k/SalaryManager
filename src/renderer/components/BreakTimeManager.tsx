/**
 * 時給計算アプリ - 休憩時間管理コンポーネント
 * 複数休憩時間の追加・削除・編集
 */

import React from 'react';
import { BreakPeriod } from '../../shared/types/data';
import TimeInput from './TimeInput';

interface BreakTimeManagerProps {
  breaks: BreakPeriod[];
  onChange: (breaks: BreakPeriod[]) => void;
  disabled?: boolean;
}

const BreakTimeManager: React.FC<BreakTimeManagerProps> = ({ breaks, onChange, disabled = false }) => {
  const handleAddBreak = () => {
    if (breaks.length >= 5) {
      alert('休憩は最大5件まで登録できます');
      return;
    }

    const newBreaks = [
      ...breaks,
      {
        start: '',
        end: '',
      },
    ];
    onChange(newBreaks);
  };

  const handleRemoveBreak = (index: number) => {
    const newBreaks = breaks.filter((_, i) => i !== index);
    onChange(newBreaks);
  };

  const handleBreakChange = (index: number, field: 'start' | 'end', value: string) => {
    const newBreaks = [...breaks];
    newBreaks[index] = {
      ...newBreaks[index],
      [field]: value,
    };
    onChange(newBreaks);
  };

  // 総休憩時間を計算（分）
  const getTotalBreakMinutes = (): number => {
    return breaks.reduce((total, b) => {
      if (!b.start || !b.end) return total;

      const startMatch = b.start.match(/^(\d{1,2}):(\d{2})$/);
      const endMatch = b.end.match(/^(\d{1,2}):(\d{2})$/);

      if (!startMatch || !endMatch) return total;

      const startMinutes = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
      const endMinutes = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);

      if (endMinutes > startMinutes) {
        return total + (endMinutes - startMinutes);
      }

      return total;
    }, 0);
  };

  const totalMinutes = getTotalBreakMinutes();

  if (breaks.length === 0) {
    return (
      <div className="break-manager">
        <button
          type="button"
          className="btn-add-break"
          onClick={handleAddBreak}
          disabled={disabled}
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            backgroundColor: '#f8f9fa',
            border: '1px dashed #ced4da',
            borderRadius: '3px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          + 休憩追加
        </button>
      </div>
    );
  }

  return (
    <div className="break-manager" style={{ minWidth: '150px' }}>
      <div className="break-list">
        {breaks.map((breakItem, index) => (
          <div key={index} className="break-item" style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '4px' }}>
            <TimeInput
              value={breakItem.start}
              onChange={(v) => handleBreakChange(index, 'start', v)}
              disabled={disabled}
              placeholder="12:00"
            />
            <span style={{ fontSize: '11px' }}>〜</span>
            <TimeInput
              value={breakItem.end}
              onChange={(v) => handleBreakChange(index, 'end', v)}
              disabled={disabled}
              placeholder="13:00"
            />
            <button
              type="button"
              className="btn-remove-break"
              onClick={() => handleRemoveBreak(index)}
              disabled={disabled}
              style={{
                padding: '2px 6px',
                fontSize: '12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        {breaks.length < 5 && (
          <button
            type="button"
            className="btn-add-break-small"
            onClick={handleAddBreak}
            disabled={disabled}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#f8f9fa',
              border: '1px dashed #ced4da',
              borderRadius: '3px',
              marginTop: '2px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            + 追加
          </button>
        )}
      </div>
      {totalMinutes > 0 && (
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          合計: {totalMinutes}分
        </div>
      )}
    </div>
  );
};

export default BreakTimeManager;
