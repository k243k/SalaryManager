/**
 * 時給計算アプリ - 同期設定コンポーネント
 * Googleログインとクラウド同期のUI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FirebaseUserInfo, SyncStatus, SyncResult } from '../../shared/types/sync';
import { RootData } from '../../shared/types/data';

interface SyncSettingsProps {
  onDataUpdate: () => void;
}

const SyncSettings: React.FC<SyncSettingsProps> = ({ onDataUpdate }) => {
  const [user, setUser] = useState<FirebaseUserInfo | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 初期化時に現在のユーザーを取得
  useEffect(() => {
    loadCurrentUser();

    // 認証状態の変化を監視
    window.electronApi.onFirebaseAuthStateChanged((userData) => {
      setUser(userData);
    });
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await window.electronApi.firebaseGetUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (e) {
      console.error('Failed to get current user:', e);
    }
  };

  // Googleログイン
  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await window.electronApi.firebaseSignIn();
      if (response.success && response.data) {
        setUser(response.data);
        setMessage('ログインしました');

        // 初回ログイン時に自動同期
        await handleSync();
      } else {
        setError(response.error || 'ログインに失敗しました');
      }
    } catch (e) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ログアウト
  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await window.electronApi.firebaseSignOut();
      setUser(null);
      setMessage('ログアウトしました');
    } catch (e) {
      setError('ログアウトに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 同期実行
  const handleSync = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setSyncStatus('syncing');
    setError(null);
    setMessage(null);

    try {
      const response = await window.electronApi.syncFull();
      if (response.success && response.data) {
        const result = response.data as SyncResult;
        setSyncStatus('success');

        switch (result.action) {
          case 'uploaded':
            setMessage('ローカルデータをクラウドにアップロードしました');
            break;
          case 'downloaded':
            setMessage('クラウドからデータをダウンロードしました');
            onDataUpdate(); // データが更新されたことを親に通知
            break;
          case 'no-change':
            setMessage('同期済みです');
            break;
          case 'conflict':
            setError('データの競合が発生しました');
            break;
        }
      } else {
        setSyncStatus('error');
        setError(response.error || '同期に失敗しました');
      }
    } catch (e) {
      setSyncStatus('error');
      setError('同期に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user, onDataUpdate]);

  // 同期状態のラベル
  const getSyncStatusLabel = () => {
    switch (syncStatus) {
      case 'syncing':
        return '同期中...';
      case 'success':
        return '同期完了';
      case 'error':
        return 'エラー';
      case 'offline':
        return 'オフライン';
      default:
        return '';
    }
  };

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 style={{ marginTop: 0 }}>クラウド同期</h3>

      {!user ? (
        // 未ログイン時
        <div>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Googleアカウントでログインすると、複数のPCでデータを同期できます。
            データは暗号化されたままクラウドに保存されます。
          </p>
          <button
            className="btn-primary"
            onClick={handleSignIn}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
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
        </div>
      ) : (
        // ログイン済み
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
            }}
          >
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  marginRight: '12px',
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{user.displayName || 'ユーザー'}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
            </div>
            {syncStatus && syncStatus !== 'idle' && (
              <span
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  backgroundColor:
                    syncStatus === 'success'
                      ? '#d4edda'
                      : syncStatus === 'error'
                        ? '#f8d7da'
                        : '#fff3cd',
                  color:
                    syncStatus === 'success'
                      ? '#155724'
                      : syncStatus === 'error'
                        ? '#721c24'
                        : '#856404',
                }}
              >
                {getSyncStatusLabel()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={handleSync}
              disabled={loading}
            >
              {loading ? '同期中...' : '今すぐ同期'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleSignOut}
              disabled={loading}
            >
              ログアウト
            </button>
          </div>
        </div>
      )}

      {/* メッセージ表示 */}
      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {message}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default SyncSettings;
