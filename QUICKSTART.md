# 🚀 クイックスタート - Cloudflare Pagesデプロイ

## エラーが出た方へ

以下のエラーが出た場合：
```
Executing user deploy command: npx wrangler deploy
```

**原因**: ビルドコマンドの設定が間違っています。

---

## ✅ 正しい設定方法

### Cloudflareダッシュボードで設定を修正

1. **Cloudflare Dashboard**を開く
2. **Workers & Pages** → あなたのプロジェクトを選択
3. **Settings** タブをクリック
4. **Builds and deployments** セクションを開く

### 正しい設定値：

| 項目 | 正しい設定 |
|------|------------|
| **Build command** | **完全に空欄**（何も入力しない） |
| **Build output directory** | `public` |
| **Root directory** | `/` |

### 重要なポイント

⚠️ **Build command**フィールドは：
- ❌ `echo 'No build needed'` ← ダメ
- ❌ `npx wrangler deploy` ← ダメ  
- ❌ 何かしらのコマンド ← ダメ
- ✅ **完全に空欄** ← 正解！

---

## 📝 手順

1. Cloudflareダッシュボードで Settings → Builds and deployments
2. Build command を見つける
3. **完全に空にする**（何も入力しない）
4. Build output directory に `public` を入力
5. Save changes
6. Deployments タブ → Retry deployment

---

## 🎯 なぜ空欄にするのか？

このプロジェクトは：
- ✅ ビルドステップが不要（静的ファイルが既に`public/`にある）
- ✅ `functions/`フォルダがCloudflare Workersとして自動デプロイされる
- ✅ トランスパイル不要（Vanilla JavaScript使用）

つまり、**何もビルドする必要がない**ため、Build commandは空欄が正解です。

---

## 🔄 再デプロイ

設定を修正したら：

1. **Deployments** タブを開く
2. 最新の失敗したデプロイを探す
3. **Retry deployment** ボタンをクリック

数分で完了します！

---

## 成功時の表示

```
✔ Uploading... (X files)
✔ Success! Deployed to https://your-project.pages.dev
```

---

## まだエラーが出る場合

### Build output directoryの確認

`public` フォルダが正しく設定されているか確認：
- ❌ `./public` ← スラッシュ不要
- ❌ `/public` ← スラッシュ不要
- ✅ `public` ← 正解

### Gitブランチの確認

Production branchが `main` になっているか確認

---

## 📞 サポート

それでも解決しない場合は、GitHubのIssuesで報告してください。
エラーログ全体をコピーして貼り付けてください。
