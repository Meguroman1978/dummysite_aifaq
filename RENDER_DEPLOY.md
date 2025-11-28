# 🚀 Renderデプロイガイド（完全日本語版）

## Renderとは？

**Render**は、Node.jsアプリケーションを簡単にデプロイできる無料のクラウドプラットフォームです。
このプロジェクトには**Puppeteer**が含まれているため、Renderが最適です。

---

## ✨ Renderのメリット

| 項目 | 説明 |
|------|------|
| 💰 **完全無料** | 無料プランで利用可能 |
| ⏰ **有効期限なし** | 永続的に稼働（非アクティブ時はスリープ） |
| 🤖 **Puppeteerサポート** | ヘッドレスブラウザが動作 |
| 🔒 **自動HTTPS** | SSL証明書が自動発行 |
| 🔄 **自動デプロイ** | GitHubにpushすると自動更新 |
| 🌐 **カスタムドメイン** | 独自ドメイン設定可能 |

### ⚠️ 無料プランの制限

- **スリープ機能**: 15分間アクセスがないとスリープモード
- **再起動時間**: スリープ後の初回アクセスは30秒～1分かかる
- **月間制限**: 750時間/月の稼働時間制限

---

## 📋 デプロイ手順（5分で完了）

### ステップ1: Renderアカウント作成

1. https://render.com にアクセス
2. **「Get Started」** をクリック
3. **「Sign up with GitHub」** を選択（推奨）
4. GitHubアカウントで認証

### ステップ2: 新しいWebサービスを作成

1. Renderダッシュボードで **「New +」** ボタンをクリック
2. **「Web Service」** を選択
3. GitHubリポジトリの一覧が表示される
4. **「Meguroman1978/dummysite_aifaq」** を探して **「Connect」** をクリック

### ステップ3: サービス設定

以下の設定を入力：

| 項目 | 設定値 |
|------|--------|
| **Name** | `dummysite-aifaq`（任意の名前） |
| **Region** | `Oregon (US West)`（推奨） |
| **Branch** | `main` |
| **Root Directory** | （空欄のまま） |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | **Free** を選択 |

### ステップ4: 環境変数の設定（自動検出）

`render.yaml`ファイルがあるため、自動的に設定されます。
手動で確認したい場合：

```
NODE_VERSION = 18
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = false
```

### ステップ5: デプロイ開始！

1. **「Create Web Service」** ボタンをクリック
2. デプロイが自動的に開始されます
3. 初回は5～10分かかります（Puppeteerのインストールのため）

---

## 🎉 デプロイ完了！

デプロイが完了すると、以下のようなURLが発行されます：

```
https://dummysite-aifaq.onrender.com
```

このURLをブラウザで開けば、アプリケーションにアクセスできます！

---

## 📊 デプロイログの確認

### 成功時の表示

```
==> Building...
==> Installing dependencies
==> Build successful
==> Starting service
Server running on port 3000
```

### よくあるエラーと対処法

#### エラー1: Puppeteerのインストール失敗

```
Error: Failed to launch the browser process
```

**原因**: Chromiumのインストール失敗

**解決方法**:
1. `render.yaml`に以下が含まれているか確認：
   ```yaml
   buildCommand: npm install
   ```
2. ビルドパックが正しく設定されているか確認

#### エラー2: ポートエラー

```
Error: listen EADDRINUSE: address already in use
```

**原因**: ポート設定が間違っている

**解決方法**: `server.js`を確認し、以下のように修正：
```javascript
const PORT = process.env.PORT || 3000;
```

---

## 🔧 デプロイ後の設定

### カスタムドメインの追加

1. Renderダッシュボードでサービスを選択
2. **「Settings」** タブをクリック
3. **「Custom Domain」** セクション
4. **「Add Custom Domain」** をクリック
5. ドメイン名を入力（例: `example.com`）
6. DNSレコードを設定（指示に従う）

### 環境変数の追加

APIキーなどを追加する場合：

1. Renderダッシュボードでサービスを選択
2. **「Environment」** タブをクリック
3. **「Add Environment Variable」** をクリック
4. キーと値を入力
5. **「Save Changes」** をクリック

---

## 🔄 アプリケーションの更新方法

コードを変更した場合：

```bash
git add .
git commit -m "機能を追加"
git push origin main
```

数分後、Renderが自動的に再デプロイします！

---

## ⚡ スリープからの復帰

無料プランでは15分間アクセスがないとスリープします。

### スリープ状態の確認

- URLにアクセスすると「Service starting...」と表示
- 初回ロードに30秒～1分かかる

### スリープを防ぐ方法（オプション）

外部サービスで定期的にpingを送る：

1. **UptimeRobot**（無料）を使用
2. https://uptimerobot.com でアカウント作成
3. 監視対象URLを追加：`https://dummysite-aifaq.onrender.com`
4. 間隔：5分ごと

これで常時稼働に近い状態を維持できます。

---

## 📂 プロジェクト構成

```
/
├── server.js              # Expressサーバー（メイン）
├── public/                # 静的ファイル
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── translations.js
├── package.json           # 依存関係
├── render.yaml            # Render設定（自動デプロイ用）
└── .render-buildpacks.json # Puppeteerビルドパック
```

---

## 🛠️ トラブルシューティング

### デプロイが失敗する

**確認項目**:
1. `render.yaml`が正しく配置されているか
2. GitHubリポジトリとの連携が正常か
3. `package.json`に`express`が含まれているか

### Puppeteerが動作しない

**確認項目**:
1. `.render-buildpacks.json`が存在するか
2. 環境変数`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`が`false`か
3. ビルドログでChromiumがインストールされているか確認

### アプリケーションが起動しない

**確認項目**:
1. Start Commandが`node server.js`になっているか
2. `server.js`内のポート設定が`process.env.PORT`を使用しているか
3. ログでエラーメッセージを確認

---

## 📞 サポート

### Renderのサポート

- ドキュメント: https://render.com/docs
- コミュニティ: https://community.render.com

### このプロジェクトのサポート

- GitHub Issues: https://github.com/Meguroman1978/dummysite_aifaq/issues

---

## 🎯 次のステップ

1. ✅ Renderアカウント作成
2. ✅ GitHubリポジトリ連携
3. ✅ サービス設定
4. ✅ デプロイ開始
5. ✅ URLでアクセス確認
6. ⏩ カスタムドメイン設定（オプション）
7. ⏩ UptimeRobotで監視設定（オプション）

**おめでとうございます！🎉**
あなたのWebアプリケーションがインターネットに公開されました！

---

## 💰 有料プランへのアップグレード（オプション）

スリープ機能を無効にしたい場合：

- **Starter Plan**: $7/月
  - スリープなし
  - より高速
  - より多いリソース

無料プランでも十分使えますが、商用利用の場合は有料プランを検討してください。
