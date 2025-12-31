/**
 * 時給計算アプリ - 日給内訳モーダル
 * 日給の計算内訳を詳細表示
 */

import React from 'react';
import { WageBreakdown } from '../../shared/types/data';
import { formatMinutesToJapanese } from '../../shared/utils/time';

interface WageBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: number;
  breakdown: WageBreakdown[];
  totalWage: number;
  actualWorkMinutes: number;
}

const WageBreakdownModal: React.FC<WageBreakdownModalProps> = ({
  isOpen,
  onClose,
  day,
  breakdown,
  totalWage,
  actualWorkMinutes,
}) => {
  if (!isOpen) return null;

  // 時間帯種別の日本語ラベル
  const getTypeLabel = (type: 'normal' | 'night' | 'overtime'): string => {
    switch (type) {
      case 'normal':
        return '通常';
      case 'night':
        return '深夜';
      case 'overtime':
        return '残業';
      default:
        return type;
    }
  };

  // 時間帯種別のカラー
  const getTypeColor = (type: 'normal' | 'night' | 'overtime'): string => {
    switch (type) {
      case 'normal':
        return '#28a745';
      case 'night':
        return '#6f42c1';
      case 'overtime':
        return '#fd7e14';
      default:
        return '#333';
    }
  };

  // 各区分の金額計算
  const calculateAmount = (item: WageBreakdown): number => {
    return Math.floor((item.minutes / 60) * item.hourlyWage);
  };

  return (
    <div className="modal show">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '18px' }}>{day}日の日給内訳</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {/* サマリー */}
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#666' }}>実働時間</span>
              <span style={{ fontWeight: 600 }}>{formatMinutesToJapanese(actualWorkMinutes)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>日給合計</span>
              <span style={{ fontWeight: 700, fontSize: '20px', color: '#28a745' }}>
                ¥{totalWage.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 内訳テーブル */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>区分</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>時間帯</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>時間</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>時給</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>金額</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: getTypeColor(item.type),
                        color: 'white',
                        fontSize: '12px',
                        marginRight: '4px',
                      }}
                    >
                      {getTypeLabel(item.type)}
                    </span>
                    {item.holidayBonus && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          fontSize: '10px',
                        }}
                      >
                        休日
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px' }}>
                    {item.startTime}〜{item.endTime}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    {formatMinutesToJapanese(item.minutes)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>¥{item.hourlyWage.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                    ¥{calculateAmount(item).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <td colSpan={4} style={{ padding: '12px 8px', fontWeight: 600 }}>
                  合計
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#28a745' }}>
                  ¥{totalWage.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* 凡例 */}
          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>凡例:</strong>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#28a745',
                    borderRadius: '2px',
                    marginRight: '4px',
                  }}
                ></span>
                通常: 5:00〜22:00
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#6f42c1',
                    borderRadius: '2px',
                    marginRight: '4px',
                  }}
                ></span>
                深夜: 22:00〜5:00 (×1.25)
              </span>
              <span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#fd7e14',
                    borderRadius: '2px',
                    marginRight: '4px',
                  }}
                ></span>
                残業: 8時間超 (×1.25)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WageBreakdownModal;
