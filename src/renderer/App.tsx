/**
 * 時給計算アプリ - Appコンポーネント
 * ルートコンポーネント：PIN認証とメインビューの切り替え
 */

import React, { useState, useEffect } from 'react';
import { RootData } from '../shared/types/data';
import PinAuth from './components/PinAuth';
import MainView from './components/MainView';

type AppState = 'loading' | 'auth' | 'authenticated';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('loading');
  const [rootData, setRootData] = useState<RootData | null>(null);
  const [currentPin, setCurrentPin] = useState<string>('');

  useEffect(() => {
    checkDataExists();
  }, []);

  /**
   * データファイルの存在確認
   */
  const checkDataExists = async () => {
    try {
      const response = await window.electronApi.dataExists();
      if (response.success && response.data) {
        // ファイルが存在する場合は認証画面へ
        setState('auth');
      } else {
        // ファイルが存在しない場合も認証画面へ（新規作成フロー）
        setState('auth');
      }
    } catch (error) {
      console.error('データ確認エラー:', error);
      setState('auth');
    }
  };

  /**
   * 認証成功時のハンドラー
   */
  const handleAuthSuccess = (pin: string, data: RootData) => {
    setCurrentPin(pin);
    setRootData(data);
    setState('authenticated');
  };

  /**
   * データ保存ハンドラー
   */
  const handleSaveData = async (updatedData: RootData) => {
    try {
      const response = await window.electronApi.saveData(currentPin, updatedData);
      if (response.success) {
        setRootData(updatedData);
        return true;
      } else {
        console.error('データ保存エラー:', response.error);
        alert(`データ保存に失敗しました: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error('データ保存エラー:', error);
      alert('データ保存中にエラーが発生しました');
      return false;
    }
  };

  /**
   * ログアウトハンドラー
   */
  const handleLogout = () => {
    setCurrentPin('');
    setRootData(null);
    setState('auth');
  };

  // ローディング中
  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // 認証画面
  if (state === 'auth') {
    return <PinAuth onAuthSuccess={handleAuthSuccess} />;
  }

  // メイン画面
  if (state === 'authenticated' && rootData) {
    return <MainView rootData={rootData} onSaveData={handleSaveData} onLogout={handleLogout} />;
  }

  // フォールバック
  return (
    <div style={{ padding: '20px' }}>
      <p>エラーが発生しました。アプリを再起動してください。</p>
    </div>
  );
};

export default App;
