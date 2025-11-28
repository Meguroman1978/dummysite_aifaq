# デプロイメントガイド

このプロジェクトをCloudflare Pagesにデプロイする方法を説明します。

## 前提条件

- GitHubアカウント
- Cloudflareアカウント（無料）

## デプロイ手順

### 1. Cloudflareアカウントの作成

1. [Cloudflare](https://cloudflare.com)にアクセス
2. 「Sign Up」から無料アカウントを作成

### 2. Cloudflare Pagesでプロジェクトを作成

1. Cloudflareダッシュボードにログイン
2. 左メニューから「Workers & Pages」を選択
3. 「Create application」→「Pages」→「Connect to Git」をクリック
4. GitHubと連携し、`Meguroman1978/dummysite_aifaq`リポジトリを選択
5. ビルド設定：
   - **Framework preset**: None
   - **Build command**: **(Leave completely empty - do not enter anything)**
   - **Build output directory**: `public`
   - **Root directory**: `/`
6. Click「Save and Deploy」

**⚠️ IMPORTANT**: The Build command field must be **completely empty**. Do not enter any command.

### 3. デプロイ完了

数分後、以下のようなURLでアクセス可能になります：
```
https://dummysite-aifaq.pages.dev
```

### 4. カスタムドメインの設定（オプション）

1. Cloudflare Pagesプロジェクトの「Custom domains」タブ
2. 「Set up a custom domain」をクリック
3. 所有するドメインを入力して設定

## アーキテクチャ

### フォルダ構成

```
/
├── public/              # 静的ファイル（HTML, CSS, JS）
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── functions/           # Cloudflare Workers Functions
│   └── api/
│       ├── fetch-website.js  # ウェブサイト取得API
│       └── proxy-image.js    # 画像プロキシAPI
├── wrangler.toml        # Cloudflare設定
└── package.json
```

### 動作の仕組み

- **静的ファイル**: `public/`フォルダがCloudflare Pages CDNで配信
- **API**: `functions/api/`以下のファイルがCloudflare Workersとして実行
- **エンドポイント**: 
  - `https://your-site.pages.dev/` → index.html
  - `https://your-site.pages.dev/api/fetch-website` → fetch-website.js
  - `https://your-site.pages.dev/api/proxy-image` → proxy-image.js

## ローカル開発

Cloudflare Wranglerを使用してローカルでテスト可能：

```bash
# Wranglerをインストール
npm install -g wrangler

# ログイン
wrangler login

# ローカル開発サーバーを起動
wrangler pages dev public
```

## トラブルシューティング

### Deployment fails with "wrangler deploy" error

**Problem**: Build command is trying to run `wrangler deploy`
**Solution**: 
1. Go to Cloudflare Dashboard → Your Project → Settings → Builds
2. Set "Build command" to **completely empty** (no text at all)
3. Save and retry deployment

### デプロイが失敗する場合

1. GitHubリポジトリが正しく連携されているか確認
2. ビルド設定が正しいか確認（Build output directory: `public`, Build command: empty）

### APIが動作しない場合

1. `functions/api/`フォルダが正しく配置されているか確認
2. Cloudflare Pagesのログを確認（ダッシュボード → プロジェクト → Deployments）

### CORS エラーが発生する場合

- Cloudflare Workers Functionsは自動的にCORSヘッダーを追加しています
- ブラウザのコンソールでエラー詳細を確認

## 代替デプロイ方法

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にアクセス
2. GitHubリポジトリをインポート
3. 自動的にデプロイされます

### Renderでのデプロイ

1. [Render](https://render.com)にアクセス
2. 「New Web Service」を選択
3. GitHubリポジトリを連携
4. 設定：
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
