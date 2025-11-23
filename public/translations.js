// 多言語対応翻訳データ
const translations = {
    ja: {
        // ページタイトルとメイン
        pageTitle: 'ウェブサイト複写＆スクリプト埋め込みツール',
        mainHeading: '🌐 ウェブサイト複写＆スクリプト埋め込みツール',
        mainDescription: '実在するウェブサイトのURLを入力して、そのサイトを複写し、\n好きな位置にFirework AIFAQスクリプトを埋め込むことができます。',
        warningLabel: '注意:',
        warningText: '自分が所有するサイトまたは許可を得たサイトでのみご使用ください。',
        
        // 言語設定
        languageSettings: 'Language Settings',
        
        // タブ
        tabUrlInput: '🌐 URL入力',
        tabSourceInput: '📝 ソースコード入力',
        
        // プロダクト選択
        productSelection: 'プロダクト選択',
        productSelectionHelp: '埋め込みたいプロダクトを選択してください（複数選択可）',
        aifaqAssistant: 'AIFAQ Assistant',
        storyBlock: 'ストーリーブロック',
        carousel: 'カルーセル',
        circleStories: 'サークルストーリーズ',
        floatingPlayer: 'フローティングプレーヤー',
        horizontalPlayer: 'ホリゾンタルプレーヤー',
        
        // Story Block用
        channelNameLabel: '📺 Channel Name',
        channelNamePlaceholder: 'チャンネル名を入力',
        channelNameHelp: 'Firework Story BlockのChannel Nameを入力してください',
        
        playlistNameLabel: '📝 Playlist ID',
        playlistNamePlaceholder: 'プレイリストIDを入力',
        playlistNameHelp: 'Firework Story BlockのPlaylist IDを入力してください',
        
        // フォームラベル
        websiteUrlLabel: '📍 ウェブサイトURL',
        websiteUrlPlaceholder: 'https://example.com',
        websiteUrlHelp: '複写したいウェブサイトのURLを入力してください',
        
        puppeteerMode: '⚡ アクセス強化モード',
        
        htmlSourceLabel: '📄 HTMLソースコード',
        htmlSourcePlaceholder: '<!DOCTYPE html>\n<html>\n<head>\n    <title>サイトタイトル</title>\n</head>\n<body>\n    ...ここにHTMLコードを貼り付けてください...\n</body>\n</html>',
        htmlSourceHelp: '💡 取得方法: 複写したいサイトで右クリック → 「ページのソースを表示」→ すべてコピー → ここに貼り付け',
        
        baseUrlLabel: '🌐 ベースURL',
        baseUrlRecommended: '（強く推奨）',
        baseUrlPlaceholder: '例: https://www.kakuyasu.co.jp',
        baseUrlHelp: 'HTMLソースコードをコピーした元のサイトのURLを入力してください。',
        baseUrlImportance: '⚠️ 重要: これにより、画像・CSS・JavaScriptなどのリソースが正しく読み込まれます。',
        baseUrlWarning: '入力しない場合、プレビュー画面が真っ白になる可能性があります。',
        
        aifaqUrlLabel: '🔗 AIFAQ Assistant Setting Page URL',
        aifaqUrlHelp: 'FreshworksのAIFAQ URLを入力してください（business_idとdomain_assistant_idが自動抽出されます）',
        
        businessIdLabel: '🏢 Business ID',
        businessIdPlaceholder: '自動入力',
        businessIdHelp: '自動抽出されます',
        
        domainAssistantIdLabel: '🔑 Domain Assistant ID',
        domainAssistantIdPlaceholder: '自動入力',
        domainAssistantIdHelp: '自動抽出されます',
        
        // ボタン
        fetchWebsiteBtn: 'ウェブサイトを取得',
        fetchingBtn: '取得中...',
        backBtn: '← 戻る',
        downloadBtn: '💾 HTMLをダウンロード',
        previewResultBtn: '👁️ スクリプト設置',
        downloadFinalBtn: '💾 HTMLをダウンロード',
        startOverBtn: '🔄 最初からやり直す',
        hostHtmlBtn: '🌐 HTMLをホスティング',
        sendSlackBtn: '📤 Slackに送信',
        copyBtn: '📋 コピー',
        copiedBtn: '✅ コピーしました！',
        sendToSlackBtn: '📤 HTMLをSlackへ送信',
        slackModalTitle: '📤 HTMLをSlackへ送信',
        slackWebhookInputLabel: 'Slack Webhook URL',
        slackWebhookInputHelp: 'Slack Webhook URLを入力してください',
        slackModalCancel: 'キャンセル',
        slackModalSend: '送信',
        
        // 設定
        settingsTitle: '⚙️ 共有設定',
        settingsDescription: 'HTMLを他の人と共有する際の設定です。後からでも設定できます。',
        slackSharingSettings: '💬 Slack共有設定',
        slackWebhookLabel: '📱 Slack Webhook URL（オプション）',
        slackWebhookPlaceholder: 'https://hooks.slack.com/services/...',
        slackWebhookHelp: 'Webhook URLを設定すると、生成したHTMLをSlackに送信できます',
        slackWebhookSmallHelp: 'Slackチャンネルに通知するためのWebhook URL（省略可）',
        slackSetupMethodTitle: '📚 Slack Webhookの設定方法',
        slackSetupPurpose: '目的:',
        slackSetupPurposeText: '生成したHTMLファイルの公開URLをSlackチャンネルに自動送信できるようになります。',
        slackCreateApp: 'Slackアプリを作成',
        slackCreateAppDesc: 'にアクセスし、「Create New App」をクリック',
        slackSelectWorkspace: 'アプリ名とワークスペースを選択',
        slackSelectWorkspaceDesc: 'アプリ名（例: HTML共有Bot）を入力し、使用するワークスペースを選択',
        slackEnableWebhooks: 'Incoming Webhooksを有効化',
        slackEnableWebhooksDesc: '左メニューから「Incoming Webhooks」を選択 → 「Activate Incoming Webhooks」をONに切り替え',
        slackAddWebhookUrl: 'Webhook URLを追加',
        slackAddWebhookUrlDesc: '「Add New Webhook to Workspace」をクリック → 送信先チャンネルを選択 → 「許可する」',
        slackCopyUrl: 'URLをコピー',
        slackCopyUrlDesc: '生成されたWebhook URL（https://hooks.slack.com/services/...）をコピーして、上の入力欄に貼り付け',
        slackDetailsLink: '詳しい手順:',
        slackOfficialDoc: 'Slack公式ドキュメント（日本語）',
        slackNote: '使い方:',
        slackNoteText: 'スクリプト埋め込み完了後に、このSlackチャンネルにHTMLの公開URLが自動送信されます。',
        fetchingImages: '画像を取得中...',
        fetchWebsite: 'ウェブサイトを取得',
        slackSetupGuide: 'Slack Webhook URLの取得方法:',
        slackStep1: 'Slackアプリを作成: https://api.slack.com/apps',
        slackStep2: 'アプリ名とワークスペースを選択',
        slackStep3: 'Incoming Webhooksを有効化',
        slackStep4: 'Webhook URLを追加',
        slackStep5: 'URLをコピー',
        
        // プレビュー画面
        previewTitle: 'スクリプト埋め込み位置を選択',
        previewInstruction: '使い方:',
        previewInstructionText: 'スクリプトを埋め込みたい位置をクリックしてください。',
        
        // 色選択
        colorPickerTitle: '🎨 このウェブサイトで使われている色（AIFAQボタン配色用の参考情報）',
        colorPickerDesc: '使用頻度が高い順に表示されています。色をクリックすると色番号をコピーできます：',
        colorCodeLabel: '選択した色番号:',
        colorCodePlaceholder: '色を選択してください',
        
        // 成功画面
        successTitle: '✅ スクリプト埋め込み完了！',
        successMessage: 'Firework AIFAQスクリプトが正常に埋め込まれました。',
        embeddedCodeTitle: '埋め込まれたコード:',
        shareTitle: '📤 生成したHTMLを共有',
        shareDescription: 'HTMLをクラウドにホスティングして、URLやQRコードで共有できます（3日間有効）',
        hostingSuccess: '✅ ホスティング成功！',
        publicUrl: '🌐 公開URL:',
        qrCode: '📱 QRコード:',
        qrCodeHelp: 'スマートフォンでスキャンしてアクセス',
        slackSuccess: '✅ Slackに送信しました！',
        
        // エラーメッセージ
        errorTitle: 'エラー',
        errorNetwork: 'ネットワークエラー',
        errorFetch: 'ウェブサイト取得エラー',
        errorInvalidUrl: '無効なURLです',
        errorMissingUrl: 'URLが指定されていません',
        errorTimeout: 'リクエストがタイムアウトしました',
        errorHtmlRequired: 'HTMLソースコードを入力してください。',
        errorInvalidHtml: '有効なHTMLではありません。',
        errorSlackWebhook: 'Slack Webhook URLを設定してください',
        
        // 確認メッセージ
        confirmEmbed: 'この位置にFirework AIFAQスクリプトを埋め込みますか？',
        confirmEmbedStoryBlock: 'この位置にFirework Story Blockスクリプトを埋め込みますか？',
        confirmEmbedCarousel: 'この位置にFirework カルーセルスクリプトを埋め込みますか？',
        confirmEmbedCircleStories: 'この位置にFirework サークルストーリーズスクリプトを埋め込みますか？',
        confirmEmbedFloatingPlayer: 'この位置にFirework フローティングプレーヤースクリプトを埋め込みますか？',
        confirmEmbedHorizontalPlayer: 'この位置にFirework ホリゾンタルプレーヤースクリプトを埋め込みますか？',
        cancelEmbed: '1つ前のスクリプト設置をキャンセル',
        confirmCancelEmbed: '最後に埋め込んだスクリプトを削除しますか？',
        confirmProxyImages: '個の画像が見つかりました。\n\n画像をプロキシ経由で取得しますか？\n（推奨: CORS制限を回避できますが、時間がかかります）',
        
        // その他
        loading: '読み込み中...',
        processing: '処理中...',
        pleaseWait: 'お待ちください...'
    },
    
    en: {
        // Page title and main
        pageTitle: 'Website Clone & Script Injection Tool',
        mainHeading: '🌐 Website Clone & Script Injection Tool',
        mainDescription: 'Enter a website URL to clone the site and\nembed Firework AIFAQ script at any position you like.',
        warningLabel: 'Warning:',
        warningText: 'Only use this tool with websites you own or have permission to use.',
        
        // Language settings
        languageSettings: 'Language Settings',
        
        // Tabs
        tabUrlInput: '🌐 URL Input',
        tabSourceInput: '📝 Source Code Input',
        
        // Product Selection
        productSelection: 'Product Selection',
        productSelectionHelp: 'Select the product(s) you want to embed (multiple selection allowed)',
        aifaqAssistant: 'AIFAQ Assistant',
        storyBlock: 'Story Block',
        carousel: 'Carousel',
        circleStories: 'Circle Stories',
        floatingPlayer: 'Floating Player',
        horizontalPlayer: 'Horizontal Player',
        
        // Story Block
        channelNameLabel: '📺 Channel Name',
        channelNamePlaceholder: 'Enter channel name',
        channelNameHelp: 'Enter the Firework Story Block Channel Name',
        
        playlistNameLabel: '📝 Playlist ID',
        playlistNamePlaceholder: 'Enter playlist ID',
        playlistNameHelp: 'Enter the Firework Story Block Playlist ID',
        
        // Form labels
        websiteUrlLabel: '📍 Website URL',
        websiteUrlPlaceholder: 'https://example.com',
        websiteUrlHelp: 'Enter the URL of the website you want to clone',
        
        puppeteerMode: '⚡ Enhanced Access Mode',
        
        htmlSourceLabel: '📄 HTML Source Code',
        htmlSourcePlaceholder: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Site Title</title>\n</head>\n<body>\n    ...Paste your HTML code here...\n</body>\n</html>',
        htmlSourceHelp: '💡 How to get: Right-click on the site → "View Page Source" → Copy all → Paste here',
        
        baseUrlLabel: '🌐 Base URL',
        baseUrlRecommended: '(Strongly Recommended)',
        baseUrlPlaceholder: 'Example: https://www.kakuyasu.co.jp',
        baseUrlHelp: 'Enter the original website URL where you copied the HTML source code from.',
        baseUrlImportance: '⚠️ Important: This ensures images, CSS, JavaScript and other resources load correctly.',
        baseUrlWarning: 'Without this, the preview screen may appear blank.',
        
        aifaqUrlLabel: '🔗 AIFAQ Assistant Setting Page URL',
        aifaqUrlHelp: 'Enter Freshworks AIFAQ URL (business_id and domain_assistant_id will be auto-extracted)',
        
        businessIdLabel: '🏢 Business ID',
        businessIdPlaceholder: 'Auto-filled',
        businessIdHelp: 'Automatically extracted',
        
        domainAssistantIdLabel: '🔑 Domain Assistant ID',
        domainAssistantIdPlaceholder: 'Auto-filled',
        domainAssistantIdHelp: 'Automatically extracted',
        
        // Buttons
        fetchWebsiteBtn: 'Fetch Website',
        fetchingBtn: 'Fetching...',
        backBtn: '← Back',
        downloadBtn: '💾 Download HTML',
        previewResultBtn: '👁️ Script Placement',
        downloadFinalBtn: '💾 Download HTML',
        startOverBtn: '🔄 Start Over',
        hostHtmlBtn: '🌐 Host HTML',
        sendSlackBtn: '📤 Send to Slack',
        copyBtn: '📋 Copy',
        copiedBtn: '✅ Copied!',
        sendToSlackBtn: '📤 Send HTML to Slack',
        slackModalTitle: '📤 Send HTML to Slack',
        slackWebhookInputLabel: 'Slack Webhook URL',
        slackWebhookInputHelp: 'Enter your Slack Webhook URL',
        slackModalCancel: 'Cancel',
        slackModalSend: 'Send',
        
        // Settings
        settingsTitle: '⚙️ Sharing Settings',
        settingsDescription: 'Settings for sharing HTML with others. You can set this up later.',
        slackSharingSettings: '💬 Slack Sharing Settings',
        slackWebhookLabel: '📱 Slack Webhook URL (Optional)',
        slackWebhookPlaceholder: 'https://hooks.slack.com/services/...',
        slackWebhookHelp: 'Set Webhook URL to send generated HTML to Slack',
        slackWebhookSmallHelp: 'Webhook URL for sending notifications to Slack channel (optional)',
        slackSetupMethodTitle: '📚 How to Set Up Slack Webhook',
        slackSetupPurpose: 'Purpose:',
        slackSetupPurposeText: 'Automatically send the public URL of generated HTML files to a Slack channel.',
        slackCreateApp: 'Create Slack App',
        slackCreateAppDesc: 'Go to the link and click "Create New App"',
        slackSelectWorkspace: 'Select App Name and Workspace',
        slackSelectWorkspaceDesc: 'Enter app name (e.g., HTML Sharing Bot) and select your workspace',
        slackEnableWebhooks: 'Enable Incoming Webhooks',
        slackEnableWebhooksDesc: 'Select "Incoming Webhooks" from left menu → Turn ON "Activate Incoming Webhooks"',
        slackAddWebhookUrl: 'Add Webhook URL',
        slackAddWebhookUrlDesc: 'Click "Add New Webhook to Workspace" → Select channel → Click "Allow"',
        slackCopyUrl: 'Copy URL',
        slackCopyUrlDesc: 'Copy the generated Webhook URL (https://hooks.slack.com/services/...) and paste it into the input field above',
        slackDetailsLink: 'Detailed instructions:',
        slackOfficialDoc: 'Slack Official Documentation (Japanese)',
        slackNote: 'How to use:',
        slackNoteText: 'After embedding the script, the public URL of HTML will be automatically sent to this Slack channel.',
        fetchingImages: 'Fetching images...',
        fetchWebsite: 'Fetch Website',
        slackSetupGuide: 'How to get Slack Webhook URL:',
        slackStep1: 'Create Slack app: https://api.slack.com/apps',
        slackStep2: 'Select app name and workspace',
        slackStep3: 'Enable Incoming Webhooks',
        slackStep4: 'Add Webhook URL',
        slackStep5: 'Copy the URL',
        
        // Preview screen
        previewTitle: 'Select Script Embed Position',
        previewInstruction: 'How to use:',
        previewInstructionText: 'Click on the position where you want to embed the script.',
        
        // Color picker
        colorPickerTitle: '🎨 Colors Used on This Website (Reference for AIFAQ Button Colors)',
        colorPickerDesc: 'Displayed in order of usage frequency. Click a color to copy its color code:',
        colorCodeLabel: 'Selected Color Code:',
        colorCodePlaceholder: 'Select a color',
        
        // Success screen
        successTitle: '✅ Script Embedding Complete!',
        successMessage: 'Firework AIFAQ script has been successfully embedded.',
        embeddedCodeTitle: 'Embedded Code:',
        shareTitle: '📤 Share Generated HTML',
        shareDescription: 'Host HTML on cloud and share via URL or QR code (Valid for 3 days)',
        hostingSuccess: '✅ Hosting Successful!',
        publicUrl: '🌐 Public URL:',
        qrCode: '📱 QR Code:',
        qrCodeHelp: 'Scan with smartphone to access',
        slackSuccess: '✅ Sent to Slack!',
        
        // Error messages
        errorTitle: 'Error',
        errorNetwork: 'Network Error',
        errorFetch: 'Website Fetch Error',
        errorInvalidUrl: 'Invalid URL',
        errorMissingUrl: 'URL not specified',
        errorTimeout: 'Request timed out',
        errorHtmlRequired: 'Please enter HTML source code.',
        errorInvalidHtml: 'Not a valid HTML.',
        errorSlackWebhook: 'Please set Slack Webhook URL',
        
        // Confirmation messages
        confirmEmbed: 'Embed Firework AIFAQ script at this position?',
        confirmEmbedStoryBlock: 'Embed Firework Story Block script at this position?',
        confirmEmbedCarousel: 'Embed Firework Carousel script at this position?',
        confirmEmbedCircleStories: 'Embed Firework Circle Stories script at this position?',
        confirmEmbedFloatingPlayer: 'Embed Firework Floating Player script at this position?',
        confirmEmbedHorizontalPlayer: 'Embed Firework Horizontal Player script at this position?',
        cancelEmbed: 'Cancel Previous Script Placement',
        confirmCancelEmbed: 'Remove the last embedded script?',
        confirmProxyImages: 'images found.\n\nFetch images via proxy?\n(Recommended: Bypasses CORS restrictions but takes time)',
        
        // Other
        loading: 'Loading...',
        processing: 'Processing...',
        pleaseWait: 'Please wait...'
    }
};

// 現在の言語を取得
let currentLanguage = 'ja';

// 翻訳を取得する関数
function t(key) {
    return translations[currentLanguage][key] || key;
}

// 言語を切り替える関数
function setLanguage(lang) {
    currentLanguage = lang;
    updatePageLanguage();
}

// ページ全体の言語を更新
function updatePageLanguage() {
    document.documentElement.lang = currentLanguage;
    document.title = t('pageTitle');
}
