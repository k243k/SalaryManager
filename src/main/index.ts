/**
 * 時給計算アプリ - Electronメインプロセス
 * アプリケーションのエントリーポイント
 */

import { app, BrowserWindow, Menu, dialog } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { setupIPCHandlers } from './ipc-handlers';

// WSL2/Linux環境でのGPUエラーを抑制
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow: BrowserWindow | null = null;

/**
 * 自動アップデートのセットアップ
 */
function setupAutoUpdater(): void {
  // 開発環境ではスキップ
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // アップデートチェック
  autoUpdater.checkForUpdatesAndNotify();

  // アップデート利用可能時
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'アップデート',
      message: '新しいバージョンが利用可能です。バックグラウンドでダウンロードを開始します。',
      buttons: ['OK'],
    });
  });

  // ダウンロード完了時
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'アップデート準備完了',
      message: 'アップデートのダウンロードが完了しました。アプリを再起動してアップデートを適用しますか？',
      buttons: ['今すぐ再起動', '後で'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // エラー時
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });
}

/**
 * 日本語メニューを作成
 */
function createJapaneseMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ファイル',
      submenu: [
        { label: '終了', role: 'quit' },
      ],
    },
    {
      label: '編集',
      submenu: [
        { label: '元に戻す', role: 'undo' },
        { label: 'やり直し', role: 'redo' },
        { type: 'separator' },
        { label: '切り取り', role: 'cut' },
        { label: 'コピー', role: 'copy' },
        { label: '貼り付け', role: 'paste' },
        { label: '全選択', role: 'selectAll' },
      ],
    },
    {
      label: '表示',
      submenu: [
        { label: '再読み込み', role: 'reload' },
        { label: '強制再読み込み', role: 'forceReload' },
        { type: 'separator' },
        { label: '実際のサイズ', role: 'resetZoom' },
        { label: '拡大', role: 'zoomIn' },
        { label: '縮小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全画面', role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * メインウィンドウを作成
 */
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, // セキュリティ: コンテキスト分離有効
      nodeIntegration: false, // セキュリティ: Node.js統合無効
      sandbox: false, // Preloadスクリプトでfsを使うため無効
    },
    title: '時給計算アプリ',
    show: false, // 準備完了まで非表示
  });

  // HTMLファイルを読み込み
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadFile(join(__dirname, '../../public/index.html'));
    // 開発時は DevTools を自動で開く
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../../public/index.html'));
  }

  // ウィンドウの準備ができたら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * アプリケーション起動時の処理
 */
app.on('ready', () => {
  // 日本語メニューを設定
  createJapaneseMenu();

  // メインウィンドウを作成
  createMainWindow();

  // IPCハンドラーをセットアップ（メインウィンドウを渡す）
  setupIPCHandlers(mainWindow || undefined);

  // 自動アップデートをセットアップ
  setupAutoUpdater();
});

/**
 * 全てのウィンドウが閉じられたときの処理
 * macOS以外では、アプリを終了する
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * アプリがアクティブになったときの処理（macOS）
 * ウィンドウが無ければ作成
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

/**
 * アプリ終了前の処理
 */
app.on('before-quit', () => {
  // 必要に応じてクリーンアップ処理を追加
});
