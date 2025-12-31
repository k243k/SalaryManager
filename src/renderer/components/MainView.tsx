/**
 * 時給計算アプリ - メインビューコンポーネント
 * 年度・月選択と日次入力テーブル表示
 */

import React, { useState, useMemo } from 'react';
import { RootData, createEmptyYearData, createEmptyMonthData } from '../../shared/types/data';
import DailyInputTable from './DailyInputTable';

interface MainViewProps {
  rootData: RootData;
  onSaveData: (data: RootData) => Promise<boolean>;
  onLogout: () => void;
}

const MainView: React.FC<MainViewProps> = ({ rootData, onSaveData, onLogout }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('01');
  const [baseWage, setBaseWage] = useState<string>('1200');
  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [isEditingWage, setIsEditingWage] = useState(false);
  const [editWageValue, setEditWageValue] = useState<string>('');
  const [isEditingTransportation, setIsEditingTransportation] = useState(false);
  const [editTransportationValue, setEditTransportationValue] = useState<string>('');
  const [baseTransportation, setBaseTransportation] = useState<string>('0');

  // 既存年度 + 現在年±3年を選択肢として生成
  const availableYears = useMemo(() => {
    const existingYears = Object.keys(rootData.years);
    const rangeYears = Array.from({ length: 7 }, (_, i) => (currentYear - 3 + i).toString());
    const allYears = new Set([...existingYears, ...rangeYears]);
    return Array.from(allYears).sort();
  }, [rootData.years, currentYear]);

  const hasSelectedYear = rootData.years[selectedYear];

  /**
   * 年度作成ハンドラー
   */
  const handleCreateYear = async () => {
    const wage = parseInt(baseWage, 10);
    if (isNaN(wage) || wage <= 0) {
      alert('正しい時給を入力してください');
      return;
    }

    const transportation = parseInt(baseTransportation, 10) || 0;

    const newData = { ...rootData };
    newData.years[selectedYear] = createEmptyYearData(wage, transportation);

    const success = await onSaveData(newData);
    if (success) {
      setIsCreatingYear(false);
    }
  };

  /**
   * 時給編集開始ハンドラー
   */
  const handleStartEditWage = () => {
    const yearData = rootData.years[selectedYear];
    if (yearData) {
      setEditWageValue(yearData.baseHourlyWage.toString());
      setIsEditingWage(true);
    }
  };

  /**
   * 時給保存ハンドラー
   */
  const handleSaveWage = async () => {
    const wage = parseInt(editWageValue, 10);
    if (isNaN(wage) || wage <= 0) {
      alert('正しい時給を入力してください');
      return;
    }

    const newData = { ...rootData };
    if (newData.years[selectedYear]) {
      newData.years[selectedYear].baseHourlyWage = wage;
      const success = await onSaveData(newData);
      if (success) {
        setIsEditingWage(false);
      }
    }
  };

  /**
   * 交通費編集開始ハンドラー
   */
  const handleStartEditTransportation = () => {
    const yearData = rootData.years[selectedYear];
    if (yearData) {
      setEditTransportationValue((yearData.transportationCost || 0).toString());
      setIsEditingTransportation(true);
    }
  };

  /**
   * 交通費保存ハンドラー
   */
  const handleSaveTransportation = async () => {
    const cost = parseInt(editTransportationValue, 10) || 0;
    if (cost < 0) {
      alert('正しい交通費を入力してください');
      return;
    }

    const newData = { ...rootData };
    if (newData.years[selectedYear]) {
      newData.years[selectedYear].transportationCost = cost;
      const success = await onSaveData(newData);
      if (success) {
        setIsEditingTransportation(false);
      }
    }
  };

  /**
   * 月データ表示
   */
  const renderMonthView = () => {
    if (!hasSelectedYear) {
      return (
        <div className="card">
          <h2>{selectedYear}年度</h2>
          <p>この年度のデータはまだ作成されていません。</p>
          {isCreatingYear ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>基本時給（円）</label>
                <input
                  type="number"
                  value={baseWage}
                  onChange={(e) => setBaseWage(e.target.value)}
                  style={{ width: '200px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>交通費（円/日）</label>
                <input
                  type="number"
                  value={baseTransportation}
                  onChange={(e) => setBaseTransportation(e.target.value)}
                  style={{ width: '200px' }}
                />
              </div>
              <div>
                <button className="btn-primary" onClick={handleCreateYear} style={{ marginRight: '8px' }}>
                  作成
                </button>
                <button className="btn-secondary" onClick={() => setIsCreatingYear(false)}>
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setIsCreatingYear(true)} style={{ marginTop: '12px' }}>
              年度を作成
            </button>
          )}
        </div>
      );
    }

    const yearData = rootData.years[selectedYear];
    const monthData = yearData.months[selectedMonth];

    return (
      <div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{selectedYear}年 {selectedMonth}月</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isEditingWage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>基本時給:</span>
                  <input
                    type="number"
                    value={editWageValue}
                    onChange={(e) => setEditWageValue(e.target.value)}
                    style={{ width: '80px', padding: '4px 8px' }}
                  />
                  <span>円</span>
                  <button
                    className="btn-primary"
                    onClick={handleSaveWage}
                    style={{ padding: '4px 12px', fontSize: '14px' }}
                  >
                    保存
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditingWage(false)}
                    style={{ padding: '4px 12px', fontSize: '14px' }}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>基本時給: ¥{yearData.baseHourlyWage}</span>
                  <button
                    className="btn-secondary"
                    onClick={handleStartEditWage}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    編集
                  </button>
                </div>
              )}
              {isEditingTransportation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>交通費:</span>
                  <input
                    type="number"
                    value={editTransportationValue}
                    onChange={(e) => setEditTransportationValue(e.target.value)}
                    style={{ width: '80px', padding: '4px 8px' }}
                  />
                  <span>円/日</span>
                  <button
                    className="btn-primary"
                    onClick={handleSaveTransportation}
                    style={{ padding: '4px 12px', fontSize: '14px' }}
                  >
                    保存
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditingTransportation(false)}
                    style={{ padding: '4px 12px', fontSize: '14px' }}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>交通費: ¥{yearData.transportationCost || 0}/日</span>
                  <button
                    className="btn-secondary"
                    onClick={handleStartEditTransportation}
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    編集
                  </button>
                </div>
              )}
              <button className="btn-secondary" onClick={onLogout}>
                ログアウト
              </button>
            </div>
          </div>
        </div>

        {monthData ? (
          <div className="card">
            <h3>月次集計</h3>
            <p>出勤日数: {monthData.summary.workDays}日</p>
            <p>月給合計: ¥{monthData.summary.totalWage.toLocaleString()}</p>
            <p>交通費合計: ¥{(monthData.summary.totalTransportationCost || 0).toLocaleString()}</p>
            <p style={{ fontWeight: 600 }}>
              総合計: ¥{(monthData.summary.totalWage + (monthData.summary.totalTransportationCost || 0)).toLocaleString()}
            </p>
            {monthData.summary.monthBonus && <p className="success">✓ 月24日以上加算適用中（全日給+50円）</p>}
          </div>
        ) : (
          <div className="card">
            <p>この月のデータはまだありません</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              日次入力を行うことでデータが作成されます
            </p>
          </div>
        )}

        <DailyInputTable
          year={selectedYear}
          month={selectedMonth}
          rootData={rootData}
          onSaveData={onSaveData}
        />
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '16px 24px' }}>
        <h1 style={{ fontSize: '20px' }}>時給計算アプリ</h1>
      </div>

      {/* コントロールパネル */}
      <div style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* 年度選択 */}
          <div>
            <label style={{ marginRight: '8px', fontWeight: '500' }}>年度:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              {availableYears.map((year) => {
                const hasData = rootData.years[year];
                return (
                  <option key={year} value={year}>
                    {year}年{!hasData ? '（新規）' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 月選択タブ */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Array.from({ length: 12 }, (_, i) => {
              const month = String(i + 1).padStart(2, '0');
              const isActive = month === selectedMonth;
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: isActive ? '#007bff' : 'white',
                    color: isActive ? 'white' : '#333',
                    border: '1px solid ' + (isActive ? '#007bff' : '#dee2e6'),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {i + 1}月
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>{renderMonthView()}</div>
    </div>
  );
};

export default MainView;
