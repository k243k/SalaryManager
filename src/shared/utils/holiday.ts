/**
 * 時給計算アプリ - 祝日マスタ管理
 * 年度別の祝日マークダウンファイルを読み込み、祝日セットを生成
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 祝日ファイルのパスを取得
 * @param year 年度（"2026"など）
 * @returns ファイルパス
 */
export function getHolidayFilePath(year: string): string {
  // Docsディレクトリの祝日リストファイル
  // __dirname = dist/main/ → dist/ → project root/Docs
  return join(__dirname, '..', '..', 'Docs', `祝日リスト_${year}.md`);
}

/**
 * 祝日マークダウンファイルから祝日一覧を読み込む
 * @param year 年度
 * @returns 祝日の配列（"YYYY-MM-DD"形式）
 */
export function loadHolidaysFromFile(year: string): string[] {
  const filePath = getHolidayFilePath(year);

  // ファイルが存在しない場合は空配列を返す
  if (!existsSync(filePath)) {
    console.warn(`祝日ファイルが見つかりません: ${filePath}`);
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseHolidayMarkdown(content, year);
  } catch (error) {
    console.error(`祝日ファイルの読み込みに失敗しました: ${filePath}`, error);
    return [];
  }
}

/**
 * マークダウン形式の祝日リストをパース
 * 対応フォーマット:
 * 1. | 月 | 日 | 祝日名 | (旧形式)
 * 2. | YYYY/MM/DD | 祝日名 | (新形式)
 *
 * @param markdown マークダウン文字列
 * @param year 年度
 * @returns 祝日の配列（"YYYY-MM-DD"形式）
 */
export function parseHolidayMarkdown(markdown: string, year: string): string[] {
  const holidays: string[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    // テーブル行の判定（"|"で区切られている）
    if (!line.trim().startsWith('|')) continue;
    if (line.includes('---')) continue; // ヘッダー区切り行をスキップ

    // "|"で分割
    const columns = line
      .split('|')
      .map((col) => col.trim())
      .filter((col) => col !== '');

    if (columns.length < 2) continue;

    const firstCol = columns[0];

    // 新形式: | YYYY/MM/DD | 祝日名 |
    const dateMatch = firstCol.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (dateMatch) {
      const matchedYear = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      // 年度が一致する場合のみ追加
      if (matchedYear === year) {
        holidays.push(`${matchedYear}-${month}-${day}`);
      }
      continue;
    }

    // 旧形式: | 月 | 日 | 祝日名 |
    if (columns.length >= 3) {
      const month = columns[0];
      const day = columns[1];

      // 月・日が数字かチェック
      if (/^\d+$/.test(month) && /^\d+$/.test(day)) {
        const monthStr = month.padStart(2, '0');
        const dayStr = day.padStart(2, '0');
        holidays.push(`${year}-${monthStr}-${dayStr}`);
      }
    }
  }

  return holidays;
}

/**
 * 祝日配列をSetに変換（高速検索用）
 * @param holidays 祝日配列
 * @returns 祝日Set
 */
export function createHolidaySet(holidays: string[]): Set<string> {
  return new Set(holidays);
}

/**
 * 複数年度の祝日を一括読み込み
 * @param years 年度の配列
 * @returns 年度別祝日マップ { "2026": Set<string>, ... }
 */
export function loadHolidaysForYears(years: string[]): Record<string, Set<string>> {
  const holidayMap: Record<string, Set<string>> = {};

  for (const year of years) {
    const holidays = loadHolidaysFromFile(year);
    holidayMap[year] = createHolidaySet(holidays);
  }

  return holidayMap;
}

/**
 * 日付が祝日かチェック
 * @param dateStr 日付（"YYYY-MM-DD"形式）
 * @param holidaySet 祝日Set
 * @returns true: 祝日
 */
export function isHoliday(dateStr: string, holidaySet: Set<string>): boolean {
  return holidaySet.has(dateStr);
}
