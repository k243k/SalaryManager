/**
 * 時給計算アプリ - 時刻入力コンポーネント
 * HH:mm形式の時刻入力とバリデーション
 */

import React, { useState, useEffect } from 'react';
import { isValidTimeFormat } from '../../shared/utils/validation';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, placeholder = '00:00', disabled = false }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);

  // 親からのvalue変更を反映
  useEffect(() => {
    setLocalValue(value);
    if (value) {
      setIsInvalid(!isValidTimeFormat(value));
    } else {
      setIsInvalid(false);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // バリデーション
    if (newValue) {
      const valid = isValidTimeFormat(newValue);
      setIsInvalid(!valid);

      // 有効な形式の場合は親に通知
      if (valid) {
        onChange(newValue);
      }
    } else {
      setIsInvalid(false);
      onChange('');
    }
  };

  const handleBlur = () => {
    if (!localValue) return;

    // 4桁連続入力: "2200" → "22:00"
    const fourDigitMatch = localValue.match(/^(\d{4})$/);
    if (fourDigitMatch) {
      const hours = fourDigitMatch[1].substring(0, 2);
      const minutes = fourDigitMatch[1].substring(2, 4);
      const formatted = `${hours}:${minutes}`;
      if (isValidTimeFormat(formatted)) {
        setLocalValue(formatted);
        setIsInvalid(false);
        onChange(formatted);
        return;
      }
    }

    // 3桁入力: "930" → "09:30"
    const threeDigitMatch = localValue.match(/^(\d{3})$/);
    if (threeDigitMatch) {
      const hours = threeDigitMatch[1].substring(0, 1).padStart(2, '0');
      const minutes = threeDigitMatch[1].substring(1, 3);
      const formatted = `${hours}:${minutes}`;
      if (isValidTimeFormat(formatted)) {
        setLocalValue(formatted);
        setIsInvalid(false);
        onChange(formatted);
        return;
      }
    }

    // 既存: "9:30" → "09:30" のように補完
    if (isValidTimeFormat(localValue)) {
      const match = localValue.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2];
        const formatted = `${hours}:${minutes}`;
        setLocalValue(formatted);
        onChange(formatted);
      }
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={5}
      className={`time-input ${isInvalid ? 'invalid' : ''}`}
      style={{
        width: '70px',
        padding: '4px 6px',
        fontSize: '13px',
        textAlign: 'center',
        border: isInvalid ? '1px solid #dc3545' : '1px solid #ced4da',
        backgroundColor: isInvalid ? '#fff5f5' : 'white',
        borderRadius: '4px',
      }}
    />
  );
};

export default TimeInput;
