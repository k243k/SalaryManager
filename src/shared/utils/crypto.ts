/**
 * 時給計算アプリ - 暗号化モジュール
 * AES-256-GCM暗号化、PBKDF2鍵導出、PINハッシュ管理
 */

import { createHash, randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptedData } from '../types/data';

/**
 * 暗号化定数
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // GCM推奨
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000; // 反復回数
const HASH_ALGORITHM = 'sha256';

/**
 * PINからSHA-256ハッシュを生成
 * @param pin 4桁PIN
 * @returns SHA-256ハッシュ（16進数文字列）
 */
export function hashPin(pin: string): string {
  return createHash(HASH_ALGORITHM).update(pin).digest('hex');
}

/**
 * PINハッシュの検証
 * @param pin 入力されたPIN
 * @param storedHash 保存されているハッシュ
 * @returns true: 一致
 */
export function verifyPin(pin: string, storedHash: string): boolean {
  const inputHash = hashPin(pin);
  return inputHash === storedHash;
}

/**
 * PINとsaltから暗号化キーを導出（PBKDF2）
 * @param pin 4桁PIN
 * @param salt ソルト（Base64）
 * @returns 256ビットキー（Buffer）
 */
function deriveKey(pin: string, salt: Buffer): Buffer {
  return pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, KEY_LENGTH, HASH_ALGORITHM);
}

/**
 * データを暗号化
 * @param plaintext 平文（JSON文字列）
 * @param pin 4桁PIN
 * @returns 暗号化データ
 */
export function encryptData(plaintext: string, pin: string): EncryptedData {
  // PIN検証用のsalt（固定、データ暗号化とは別）
  const pinSalt = randomBytes(SALT_LENGTH);

  // データ暗号化用のsaltとIV
  const dataSalt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // 鍵導出
  const key = deriveKey(pin, dataSalt);

  // 暗号化
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: '1.0',
    pinSalt: pinSalt.toString('base64'),
    dataSalt: dataSalt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * データを復号化
 * @param encryptedData 暗号化データ
 * @param pin 4桁PIN
 * @returns 復号化された平文（JSON文字列）
 * @throws エラー: 復号化失敗（PINが間違っている、データが破損している等）
 */
export function decryptData(encryptedData: EncryptedData, pin: string): string {
  try {
    // Base64デコード
    const dataSalt = Buffer.from(encryptedData.dataSalt, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');

    // 鍵導出
    const key = deriveKey(pin, dataSalt);

    // 復号化
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('復号化に失敗しました。PINが間違っているか、データが破損しています。');
  }
}

/**
 * ランダムなPINを生成（テスト用）
 * @returns 4桁のランダムPIN
 */
export function generateRandomPin(): string {
  const pin = Math.floor(Math.random() * 10000);
  return String(pin).padStart(4, '0');
}
