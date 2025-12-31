/**
 * 時給計算アプリ - データストア
 * 暗号化データファイルの読み書き管理
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { RootData, EncryptedData, createEmptyRootData } from '../shared/types/data';
import { encryptData, decryptData, hashPin, verifyPin } from '../shared/utils/crypto';

/**
 * データファイル名
 */
const DATA_FILE_NAME = 'data.enc';
const BACKUP_FILE_NAME = 'data.enc.bak';

/**
 * データファイルのパスを取得
 * @returns データファイルの絶対パス
 */
export function getDataFilePath(): string {
  // アプリのユーザーデータディレクトリを使用
  const userDataPath = app.getPath('userData');
  return join(userDataPath, DATA_FILE_NAME);
}

/**
 * バックアップファイルのパスを取得
 * @returns バックアップファイルの絶対パス
 */
export function getBackupFilePath(): string {
  const userDataPath = app.getPath('userData');
  return join(userDataPath, BACKUP_FILE_NAME);
}

/**
 * データファイルが存在するか確認
 * @returns true: ファイル存在
 */
export function dataFileExists(): boolean {
  return existsSync(getDataFilePath());
}

/**
 * 新規データファイルを作成
 * @param pin 4桁PIN
 * @returns 作成されたルートデータ
 */
export function createNewDataFile(pin: string): RootData {
  const pinHash = hashPin(pin);
  const rootData = createEmptyRootData(pinHash);

  // 暗号化して保存
  saveData(rootData, pin);

  return rootData;
}

/**
 * データを読み込み
 * @param pin 4桁PIN
 * @returns ルートデータ
 * @throws エラー: ファイルが存在しない、PINが間違っている等
 */
export function loadData(pin: string): RootData {
  const filePath = getDataFilePath();

  if (!existsSync(filePath)) {
    throw new Error('データファイルが見つかりません。');
  }

  try {
    // ファイル読み込み
    const fileContent = readFileSync(filePath, 'utf-8');
    const encryptedData: EncryptedData = JSON.parse(fileContent);

    // 復号化
    const decryptedJson = decryptData(encryptedData, pin);
    const rootData: RootData = JSON.parse(decryptedJson);

    // PINハッシュ検証（二重チェック）
    if (!verifyPin(pin, rootData.settings.pinHash)) {
      throw new Error('PINが一致しません。');
    }

    return rootData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`データの読み込みに失敗しました: ${error.message}`);
    }
    throw new Error('データの読み込みに失敗しました。');
  }
}

/**
 * データを保存
 * @param rootData ルートデータ
 * @param pin 4桁PIN
 */
export function saveData(rootData: RootData, pin: string): void {
  const filePath = getDataFilePath();

  try {
    // 既存ファイルがあればバックアップ作成
    if (existsSync(filePath)) {
      const backupPath = getBackupFilePath();
      copyFileSync(filePath, backupPath);
    }

    // JSON化
    const jsonData = JSON.stringify(rootData, null, 2);

    // 暗号化
    const encryptedData = encryptData(jsonData, pin);

    // ファイル書き込み
    const fileContent = JSON.stringify(encryptedData, null, 2);
    writeFileSync(filePath, fileContent, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`データの保存に失敗しました: ${error.message}`);
    }
    throw new Error('データの保存に失敗しました。');
  }
}

/**
 * PINを検証
 * @param pin 4桁PIN
 * @returns true: 正しいPIN
 */
export function verifyPinFromFile(pin: string): boolean {
  try {
    const rootData = loadData(pin);
    return verifyPin(pin, rootData.settings.pinHash);
  } catch {
    return false;
  }
}

/**
 * PINを変更
 * @param oldPin 旧PIN
 * @param newPin 新PIN
 * @throws エラー: 旧PINが間違っている等
 */
export function changePin(oldPin: string, newPin: string): void {
  // 旧PINでデータ読み込み
  const rootData = loadData(oldPin);

  // 新PINハッシュを設定
  rootData.settings.pinHash = hashPin(newPin);

  // 新PINで保存
  saveData(rootData, newPin);
}

/**
 * バックアップから復元
 * @param pin 4桁PIN
 * @returns 復元されたルートデータ
 */
export function restoreFromBackup(pin: string): RootData {
  const backupPath = getBackupFilePath();

  if (!existsSync(backupPath)) {
    throw new Error('バックアップファイルが見つかりません。');
  }

  try {
    // バックアップファイル読み込み
    const fileContent = readFileSync(backupPath, 'utf-8');
    const encryptedData: EncryptedData = JSON.parse(fileContent);

    // 復号化
    const decryptedJson = decryptData(encryptedData, pin);
    const rootData: RootData = JSON.parse(decryptedJson);

    // 現在のファイルとして保存
    saveData(rootData, pin);

    return rootData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`バックアップからの復元に失敗しました: ${error.message}`);
    }
    throw new Error('バックアップからの復元に失敗しました。');
  }
}
