/**
 * 時給計算アプリ - PIN認証コンポーネント
 * 既存データのPIN入力または新規PIN作成
 */

import React, { useState, useEffect } from 'react';
import { RootData } from '../../shared/types/data';

interface PinAuthProps {
  onAuthSuccess: (pin: string, data: RootData) => void;
}

const PinAuth: React.FC<PinAuthProps> = ({ onAuthSuccess }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfNewUser();
  }, []);

  /**
   * 新規ユーザーかチェック
   */
  const checkIfNewUser = async () => {
    try {
      const response = await window.electronApi.dataExists();
      if (response.success && response.data) {
        setIsNewUser(!response.data.exists);
      }
    } catch (error) {
      console.error('データ確認エラー:', error);
    }
  };

  /**
   * PIN入力ハンドラー
   */
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  /**
   * PIN確認入力ハンドラー
   */
  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setConfirmPin(value);
    setError('');
  };

  /**
   * 既存ユーザーのログイン処理
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 4) {
      setError('PINは4桁で入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // データ読込
      const response = await window.electronApi.loadData(pin);

      if (response.success && response.data) {
        // 認証成功
        onAuthSuccess(pin, response.data.data);
      } else {
        setError(response.error || 'PINが間違っています');
      }
    } catch (error) {
      setError('認証に失敗しました');
      console.error('認証エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 新規ユーザーのPIN作成処理
   */
  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 4) {
      setError('PINは4桁で入力してください');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINが一致しません');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 新規データファイル作成
      const createResponse = await window.electronApi.createPin(pin);

      if (!createResponse.success) {
        setError(createResponse.error || 'PIN作成に失敗しました');
        setLoading(false);
        return;
      }

      // 作成したデータを読込
      const loadResponse = await window.electronApi.loadData(pin);

      if (loadResponse.success && loadResponse.data) {
        // 認証成功
        onAuthSuccess(pin, loadResponse.data.data);
      } else {
        setError('データ読込に失敗しました');
      }
    } catch (error) {
      setError('PIN作成に失敗しました');
      console.error('PIN作成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
        <h1 style={{ marginBottom: '24px', textAlign: 'center', color: '#333' }}>
          {isNewUser ? '時給計算アプリ - 初期設定' : '時給計算アプリ'}
        </h1>

        <form onSubmit={isNewUser ? handleCreatePin : handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="pin" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {isNewUser ? '4桁のPINを設定してください' : 'PINを入力してください'}
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="0000"
              maxLength={4}
              autoFocus
              disabled={loading}
              style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
            />
          </div>

          {isNewUser && (
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="confirmPin" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                PINを再入力してください
              </label>
              <input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={handleConfirmPinChange}
                placeholder="0000"
                maxLength={4}
                disabled={loading}
                style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
              />
            </div>
          )}

          {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || pin.length !== 4 || (isNewUser && confirmPin.length !== 4)}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            {loading ? '処理中...' : isNewUser ? 'PIN を作成' : 'ログイン'}
          </button>

          {isNewUser && (
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
              <p>※PINは忘れないように保管してください</p>
              <p>※PINを忘れるとデータにアクセスできなくなります</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PinAuth;
