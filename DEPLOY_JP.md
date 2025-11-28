# 🚀 Cloudflare Pagesデプロイガイド（日本語）

## 概要

このアプリケーションを**無料・永続的**にインターネット公開する手順です。
Cloudflare Pagesを使用すれば、サーバー費用なしで誰でもアクセス可能なWebアプリケーションを公開できます。

---

## ✨ Cloudflare Pagesのメリット

| 項目 | 説明 |
|------|------|
| 💰 **完全無料** | 無料プランで十分（クレジットカード不要） |
| ⏰ **有効期限なし** | サンドボックスと違い永続的に稼働 |
| 🌍 **グローバルCDN** | 世界中から高速アクセス |
| 🔒 **自動HTTPS** | SSL証明書が自動発行される |
| 🌐 **独自ドメイン** | 自分のドメインを設定可能 |
| 🔄 **自動デプロイ** | GitHubにpushすると自動更新 |

---

## 📋 デプロイ手順（5分で完了）

### ステップ1: Cloudflareアカウント作成

1. https://cloudflare.com にアクセス
2. 「Sign Up」をクリック
3. メールアドレスとパスワードを入力
4. メール認証を完了

### ステップ2: Cloudflare Pagesプロジェクト作成

1. Cloudflareダッシュボードにログイン
2. 左サイドバーから **「Workers & Pages」** を選択
3. **「Create application」** ボタンをクリック
4. **「Pages」** タブを選択
5. **「Connect to Git」** をクリック

### ステップ3: GitHub連携

1. **「Connect GitHub」** をクリック
2. GitHubでCloudflareを承認
3. リポジトリ一覧から **「Meguroman1978/dummysite_aifaq」** を選択
4. 「Begin setup」をクリック

### ステップ4: ビルド設定

以下の設定を入力：

| 項目 | 設定値 |
|------|--------|
| **Project name** | `dummysite-aifaq`（任意の名前） |
| **Production branch** | `main` |
| **Framework preset** | None（選択しない） |
| **Build command** | （空欄のまま） |
| **Build output directory** | `public` |
| **Root directory** | `/` |

### ステップ5: デプロイ開始

1. **「Save and Deploy」** をクリック
2. 数分待つとデプロイ完了！

---

## 🎉 完了！アクセス方法

デプロイが完了すると、以下のようなURLが発行されます：

```
https://dummysite-aifaq-xxx.pages.dev
```

このURLをブラウザで開けば、アプリケーションにアクセスできます！

---

## 🔧 デプロイ後の設定（オプション）

### カスタムドメインの設定

自分のドメイン（例: `example.com`）を使いたい場合：

1. Cloudflare Pagesプロジェクトページを開く
2. **「Custom domains」** タブをクリック
3. **「Set up a custom domain」** をクリック
4. ドメイン名を入力して設定

### 環境変数の設定

APIキーなどを設定したい場合：

1. Cloudflare Pagesプロジェクトページを開く
2. **「Settings」** → **「Environment variables」**
3. 変数名と値を入力して保存

---

## 🔄 更新方法

コードを変更して更新したい場合は、GitHubにpushするだけ：

```bash
git add .
git commit -m "更新内容"
git push origin main
```

数分後、自動的に本番環境に反映されます！

---

## 📂 プロジェクト構成

```
/
├── public/                    # 静的ファイル（HTML, CSS, JS）
│   ├── index.html            # メインHTML
│   ├── app.js                # クライアントサイドJS
│   ├── styles.css            # スタイルシート
│   └── translations.js       # 翻訳データ
│
├── functions/                 # Cloudflare Workers Functions
│   └── api/
│       ├── fetch-website.js  # ウェブサイト取得API
│       └── proxy-image.js    # 画像プロキシAPI
│
├── wrangler.toml             # Cloudflare設定
├── DEPLOYMENT.md             # 英語版デプロイガイド
└── DEPLOY_JP.md              # 日本語版デプロイガイド（このファイル）
```

---

## 🛠️ ローカル開発

ローカルでテストしたい場合：

```bash
# Cloudflare Wranglerをインストール
npm install -g wrangler

# Cloudflareにログイン
wrangler login

# ローカル開発サーバーを起動
wrangler pages dev public

# ブラウザで http://localhost:8788 を開く
```

---

## ❓ トラブルシューティング

### デプロイが失敗する

- **原因**: Build output directoryの設定ミス
- **解決**: Build output directoryが `public` になっているか確認

### APIが動作しない

- **原因**: `functions/api/`フォルダが正しくコミットされていない
- **解決**: GitHubリポジトリに `functions/` フォルダがあるか確認

### 画像が表示されない

- **原因**: CORS制限
- **解決**: `/api/proxy-image` エンドポイントを使用（自動処理）

### 403エラーが出る

- **原因**: ターゲットサイトのbot保護
- **解決**: 現在の実装では回避が困難（元のサイトの制限）

---

## 📞 サポート

問題が発生した場合：

1. GitHubのIssuesに報告
2. Cloudflare Pagesのログを確認（ダッシュボード → プロジェクト → Deployments）
3. `DEPLOYMENT.md`（英語版）も参照

---

## 🎯 次のステップ

1. ✅ Cloudflare Pagesにデプロイ
2. ✅ 発行されたURLでアクセス確認
3. ✅ 必要に応じてカスタムドメイン設定
4. ✅ GitHubにpushして自動更新を体験

**おめでとうございます！🎉**
あなたのWebアプリケーションが世界中からアクセス可能になりました！
