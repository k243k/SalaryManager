/**
 * 時給計算アプリ - PIN認証コンポーネント
 * 既存データのPIN入力、新規PIN作成、またはクラウドから復元
 */

import React, { useState, useEffect } from 'react';
import { RootData } from '../../shared/types/data';
import { FirebaseUserInfo } from '../../shared/types/sync';

interface PinAuthProps {
  onAuthSuccess: (pin: string, data: RootData) => void;
}

type RestoreMode = 'select' | 'new' | 'restore' | null;

const PinAuth: React.FC<PinAuthProps> = ({ onAuthSuccess }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // クラウド復元用State
  const [restoreMode, setRestoreMode] = useState<RestoreMode>(null);
  const [cloudUser, setCloudUser] = useState<FirebaseUserInfo | null>(null);
  const [cloudDataExists, setCloudDataExists] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

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

  /**
   * Googleログイン処理
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await window.electronApi.firebaseSignIn();
      if (response.success && response.data) {
        setCloudUser(response.data);

        // クラウドにデータがあるかチェック
        const checkResponse = await window.electronApi.checkCloudData();
        if (checkResponse.success) {
          setCloudDataExists(checkResponse.data === true);
          if (!checkResponse.data) {
            setError('クラウドにデータがありません。新しく作成してください。');
          }
        }
      } else {
        setError(response.error || 'ログインに失敗しました');
      }
    } catch (error) {
      setError('ログインに失敗しました');
      console.error('Googleログインエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * クラウドからダウンロード処理
   */
  const handleDownloadFromCloud = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await window.electronApi.syncDownload();
      if (response.success && response.data) {
        setDownloaded(true);
        setIsNewUser(false); // 既存ユーザーとして扱う
      } else {
        setError(response.error || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      setError('ダウンロードに失敗しました');
      console.error('ダウンロードエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 戻るボタン処理
   */
  const handleBack = () => {
    setRestoreMode(null);
    setCloudUser(null);
    setCloudDataExists(false);
    setDownloaded(false);
    setError('');
    setPin('');
  };

  // ========== 新規ユーザー: 選択画面 ==========
  if (isNewUser && restoreMode === null) {
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
          <h1 style={{ marginBottom: '16px', textAlign: 'center', color: '#333' }}>
            時給計算アプリ
          </h1>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>
            このデバイスにデータがありません
          </p>

          <button
            className="btn-primary"
            onClick={() => setRestoreMode('new')}
            style={{ width: '100%', padding: '14px', fontSize: '16px', marginBottom: '12px' }}
          >
            新しく作成する
          </button>

          <button
            className="btn-secondary"
            onClick={() => setRestoreMode('restore')}
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            クラウドから復元する
          </button>

          <p style={{ marginTop: '20px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
            別のPCで使っていた場合は「クラウドから復元」を選択してください
          </p>
        </div>
      </div>
    );
  }

  // ========== クラウド復元画面 ==========
  if (restoreMode === 'restore') {
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
            クラウドから復元
          </h1>

          {/* ダウンロード完了後: PIN入力 */}
          {downloaded ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
                データをダウンロードしました
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="pin" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  PINを入力してください
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

              {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || pin.length !== 4}
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              >
                {loading ? '処理中...' : 'ログイン'}
              </button>
            </form>
          ) : cloudUser ? (
            // ログイン済み: データ確認・ダウンロード
            <div>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {cloudUser.photoURL && (
                    <img
                      src={cloudUser.photoURL}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: '50%' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 500 }}>{cloudUser.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{cloudUser.email}</div>
                  </div>
                </div>
              </div>

              {cloudDataExists ? (
                <div>
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
                    クラウドにデータがあります
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleDownloadFromCloud}
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                  >
                    {loading ? 'ダウンロード中...' : 'ダウンロード'}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '12px', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
                  クラウドにデータがありません
                </div>
              )}

              {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}
            </div>
          ) : (
            // 未ログイン: Googleログインボタン
            <div>
              <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                Googleアカウントでログインして、クラウドに保存したデータを復元します
              </p>

              <button
                className="btn-primary"
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  '処理中...'
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Googleでログイン
                  </>
                )}
              </button>

              {error && <div className="error" style={{ marginTop: '16px' }}>{error}</div>}
            </div>
          )}

          {/* 戻るボタン */}
          <button
            onClick={handleBack}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px',
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  // ========== 通常の認証画面（既存ユーザー or 新規作成選択後） ==========
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
          {isNewUser || restoreMode === 'new' ? '時給計算アプリ - 初期設定' : '時給計算アプリ'}
        </h1>

        <form onSubmit={isNewUser || restoreMode === 'new' ? handleCreatePin : handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="pin" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {isNewUser || restoreMode === 'new' ? '4桁のPINを設定してください' : 'PINを入力してください'}
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

          {(isNewUser || restoreMode === 'new') && (
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
            disabled={loading || pin.length !== 4 || ((isNewUser || restoreMode === 'new') && confirmPin.length !== 4)}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            {loading ? '処理中...' : (isNewUser || restoreMode === 'new') ? 'PIN を作成' : 'ログイン'}
          </button>

          {(isNewUser || restoreMode === 'new') && (
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
              <p>※PINは忘れないように保管してください</p>
              <p>※PINを忘れるとデータにアクセスできなくなります</p>
            </div>
          )}
        </form>

        {/* 新規作成からの戻るボタン */}
        {restoreMode === 'new' && (
          <button
            onClick={handleBack}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '10px',
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← 戻る
          </button>
        )}
      </div>
    </div>
  );
};

export default PinAuth;
