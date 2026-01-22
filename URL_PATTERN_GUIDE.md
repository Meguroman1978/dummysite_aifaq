# AIFAQ URL Pattern Guide

## 📋 概要

このツールは、Firework AIFAQ Assistant Setting Page URLから自動的にBusiness IDとDomain Assistant IDを抽出します。

## 🔄 対応URL形式

### 新形式（最新）✨
```
https://business.firework.com/business/{business_id}/ava/assistants/{domain_assistant_id}/overview
```

**例**:
```
https://business.firework.com/business/g201J5/ava/assistants/Nv7NLg/overview
```

**抽出結果**:
- Business ID: `g201J5`
- Domain Assistant ID: `Nv7NLg`

---

### 旧形式（従来）🔄
```
https://business.firework.com/business/{business_id}/ava/{domain_assistant_id}/overview
```

**例**:
```
https://business.firework.com/business/g201J5/ava/Nv7NLg/overview
```

**抽出結果**:
- Business ID: `g201J5`
- Domain Assistant ID: `Nv7NLg`

---

## 🎯 抽出ルール

### Business ID
- `business/` の**直後**にある文字列
- `/business/{ここ}/ava/...`

### Domain Assistant ID

#### 新形式の場合
- `assistants/` の**直後**にある文字列
- `.../ava/assistants/{ここ}/...`

#### 旧形式の場合
- `ava/` の**直後**にある文字列（`assistants`を除く）
- `.../ava/{ここ}/...`

---

## ✅ 対応するURL例

### ✨ 新形式（推奨）

| URL | Business ID | Domain Assistant ID |
|-----|-------------|---------------------|
| `https://business.firework.com/business/g201J5/ava/assistants/Nv7NLg/overview` | g201J5 | Nv7NLg |
| `https://business.firework.com/business/abc123/ava/assistants/xyz789/overview?tab=settings` | abc123 | xyz789 |
| `https://business.firework.com/business/test/ava/assistants/demo/overview#section` | test | demo |

### 🔄 旧形式（後方互換性）

| URL | Business ID | Domain Assistant ID |
|-----|-------------|---------------------|
| `https://business.firework.com/business/g201J5/ava/Nv7NLg/overview` | g201J5 | Nv7NLg |
| `https://business.firework.com/business/test123/ava/e5xrbg` | test123 | e5xrbg |
| `https://business.firework.com/business/abc/ava/def/settings?view=all` | abc | def |

---

## 📝 使用方法

1. **AIFAQ Assistant Setting Page URLを取得**
   - Firework Businessダッシュボードにアクセス
   - AVA（AIFAQ Assistant）の設定ページを開く
   - ブラウザのアドレスバーからURLをコピー

2. **ツールに入力**
   - 「🔗 AIFAQ Assistant Setting Page URL」欄にURLを貼り付け
   - 自動的にBusiness IDとDomain Assistant IDが抽出される
   - 抽出されたIDは読み取り専用フィールドに表示される

3. **確認**
   - Business IDフィールドに正しいIDが表示されているか確認
   - Domain Assistant IDフィールドに正しいIDが表示されているか確認
   - 両方のフィールドが緑色にハイライトされていれば成功 ✅

---

## 🚨 トラブルシューティング

### IDが自動抽出されない場合

**原因**: URLパターンが一致していない可能性があります

**確認項目**:
- ✅ URLが `https://business.firework.com` で始まっているか
- ✅ URLに `/business/` セグメントが含まれているか
- ✅ URLに `/ava/` セグメントが含まれているか
- ✅ 新形式の場合、`/ava/assistants/` になっているか

**対処法**:
1. URLを再度コピーして貼り付ける
2. URLに余計な空白やスペースが含まれていないか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 無効なURL例

❌ `https://firework.com/business/g201J5` - ドメインが異なる
❌ `https://business.firework.com/g201J5/ava/Nv7NLg` - `/business/`セグメントがない
❌ `https://business.firework.com/business/g201J5` - `/ava/`セグメントがない

---

## 🧪 テスト方法

### 自動テストページを使用

1. ブラウザで `test_url_extraction.html` を開く
2. 6つのテストケースが自動実行される:
   - ✅ 新形式URL（基本）
   - ✅ 新形式URL（クエリパラメータ付き）
   - ✅ 旧形式URL（基本）
   - ✅ 旧形式URL（パラメータなし）
   - ✅ 新形式URL（フラグメント付き）
   - ❌ 無効なURL

3. テスト結果を確認:
   - 緑色の背景 = 合格 ✅
   - 赤色の背景 = 不合格 ❌

### 手動テスト

1. アプリケーションを開く
2. 各URL形式をテスト:
   - 新形式URLを入力 → IDが抽出される
   - 旧形式URLを入力 → IDが抽出される
   - 無効なURLを入力 → エラーメッセージ

---

## 📊 実装の詳細

### 正規表現パターン

#### 新形式パターン（優先）
```javascript
const newPattern = /\/business\/([^\/]+)\/ava\/assistants\/([^\/?#]+)/;
```

- `([^\/]+)` - Business ID（スラッシュ以外の文字列）
- `([^\/?#]+)` - Domain Assistant ID（スラッシュ、クエリ、フラグメント以外の文字列）

#### 旧形式パターン（後方互換性）
```javascript
const oldPattern = /\/business\/([^\/]+)\/ava\/([^\/?#]+)/;
```

---

## 🔗 関連ファイル

- **`public/app.js`** - `extractIdsFromAifaqUrl()` 関数の実装
- **`public/index.html`** - URLインプットフィールドのUI
- **`test_url_extraction.html`** - 自動テストページ

---

## 📅 更新履歴

### v2.0 (2026-01-22)
- ✅ 新形式URL対応: `.../ava/assistants/...`
- ✅ 旧形式URL対応維持（後方互換性）
- ✅ 自動テストページ追加
- ✅ UIヘルプテキスト更新

### v1.0 (以前)
- ✅ 旧形式URL対応: `.../ava/...`
- ✅ 自動ID抽出機能

---

**両方のURL形式に完全対応しています！** 🎉
