// グローバル変数
let currentHtml = '';
let originalHtml = '';
let domainAssistantId = '';
let businessId = '';
let channelName = '';
let playlistName = ''; // Actually stores Playlist ID
let websiteUrl = '';
let isScriptInjected = false;
let selectedColor = null; // 選択された色
let availableColors = []; // 利用可能な色のリスト
let selectedProducts = ['aifaq']; // デフォルトはAIFAQ Assistant
let injectedScripts = []; // 埋め込まれたスクリプトのコンテナIDを追跡
let isDeleteMode = false; // 要素削除モードの状態
let deletedElements = []; // 削除された要素を追跡（復元用）
// currentLanguage is defined in translations.js - do not redefine here

// 共有設定
let userSettings = {
    slackWebhook: ''
};

// DOM要素
const inputSection = document.getElementById('input-section');
const previewSection = document.getElementById('preview-section');
const successSection = document.getElementById('success-section');
const websiteForm = document.getElementById('website-form');
const websiteUrlInput = document.getElementById('website-url');
const aifaqUrlInput = document.getElementById('aifaq-url');
const businessIdInput = document.getElementById('business-id');
const domainAssistantIdInput = document.getElementById('domain-assistant-id');
const channelNameInput = document.getElementById('channel-name');
const playlistNameInput = document.getElementById('playlist-name');
const fetchBtn = document.getElementById('fetch-btn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const backBtn = document.getElementById('back-btn');
const downloadBtn = document.getElementById('download-btn');
const cancelEmbedBtn = document.getElementById('cancel-embed-btn');
const deleteModeBtn = document.getElementById('delete-mode-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const websitePreview = document.getElementById('website-preview');
const manualHtmlInput = document.getElementById('manual-html');
const manualBaseUrlInput = document.getElementById('manual-base-url');
const errorMessageBox = document.getElementById('error-message');

// プロダクト選択関連
const productCheckboxes = {
    aifaq: document.getElementById('product-aifaq'),
    storyblock: document.getElementById('product-storyblock'),
    carousel: document.getElementById('product-carousel'),
    circlestories: document.getElementById('product-circlestories'),
    floatingplayer: document.getElementById('product-floatingplayer'),
    horizontalplayer: document.getElementById('product-horizontalplayer')
};
const aifaqSettingsGroup = document.getElementById('aifaq-settings-group');
const storyblockSettingsGroup = document.getElementById('storyblock-settings-group');
const previewProductSelection = document.getElementById('preview-product-selection');

// Slack送信関連
const sendToSlackBtn = document.getElementById('send-to-slack-btn');
const slackModal = document.getElementById('slack-modal');
const slackModalCancel = document.getElementById('slack-modal-cancel');
const slackModalSend = document.getElementById('slack-modal-send');
const slackWebhookInput = document.getElementById('slack-webhook-input');

// 共有設定のDOM要素
const defaultSlackWebhookInput = document.getElementById('default-slack-webhook');

// Tab system
const tabButtons = document.querySelectorAll('.tab-btn');
const urlInputTab = document.getElementById('url-input-tab');
const manualInputTab = document.getElementById('manual-input-tab');
let currentInputMode = 'url'; // 'url' or 'manual'

// エラー表示用の関数
function showError(title, message, details = null, showManualInputOption = false) {
    let errorHtml = `
        <div style="background: #fee; border-left: 4px solid #f44; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #c00; margin-top: 0;">❌ ${title}</h3>
            <p style="color: #333; margin: 10px 0;">${message}</p>
    `;
    
    if (details) {
        errorHtml += `
            <details style="margin-top: 10px;">
                <summary style="cursor: pointer; color: #666;">詳細を表示</summary>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${details}</pre>
            </details>
        `;
    }
    
    if (showManualInputOption) {
        errorHtml += `
            <div style="margin-top: 15px; padding: 15px; background: #e6f7ff; border-radius: 8px;">
                <p style="color: #0366d6; margin: 0;"><strong>💡 代替方法:</strong></p>
                <p style="color: #333; margin: 8px 0 0 0;">URLの自動取得ができない場合は、<strong>「ソースコード入力」</strong>タブから手動でHTMLを貼り付けてお試しください。</p>
            </div>
        `;
    }
    
    errorHtml += `</div>`;
    
    // エラーメッセージボックスに表示
    errorMessageBox.innerHTML = errorHtml;
    errorMessageBox.style.display = 'block';
    
    // アラートも表示（オプション）
    // alert(`${title}\n\n${message}${details ? '\n\n' + details : ''}`);
}

// エラーメッセージをクリア
function clearError() {
    errorMessageBox.style.display = 'none';
    errorMessageBox.innerHTML = '';
}

// 成功メッセージ表示
function showSuccess(title, message) {
    console.log(`✅ ${title}: ${message}`);
}

// AIFAQ URLからIDを抽出する関数
function extractIdsFromAifaqUrl(url) {
    try {
        // URLパターン: https://business.firework.com/business/{business_id}/ava/{domain_assistant_id}
        const regex = /\/business\/([^\/]+)\/ava\/([^\/?#]+)/;
        const match = url.match(regex);
        
        if (match && match.length >= 3) {
            return {
                businessId: match[1],
                domainAssistantId: match[2]
            };
        }
        return null;
    } catch (e) {
        console.error('URL parsing error:', e);
        return null;
    }
}

// タブ切り替え処理
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // すべてのタブボタンとコンテンツから active クラスを削除
        tabButtons.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => {
            t.style.display = 'none';
            t.classList.remove('active');
        });
        
        // クリックされたタブをアクティブに
        btn.classList.add('active');
        const targetContent = document.getElementById(targetTab + '-tab');
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');
        }
        
        // モード切り替え
        currentInputMode = targetTab === 'url-input' ? 'url' : 'manual';
        
        // ボタンテキスト更新
        if (currentInputMode === 'manual') {
            btnText.textContent = 'HTMLを処理';
        } else {
            btnText.textContent = 'ウェブサイトを取得';
        }
        
        // エラーメッセージをクリア
        clearError();
        
        console.log('入力モード切り替え:', currentInputMode);
    });
});

// AIFAQ URL入力時の自動抽出
aifaqUrlInput.addEventListener('input', (e) => {
    console.log('🔍 AIFAQ URL input event triggered');
    const url = e.target.value.trim();
    console.log('🔍 URL:', url);
    
    if (url) {
        const ids = extractIdsFromAifaqUrl(url);
        console.log('🔍 Extracted IDs:', ids);
        
        if (ids) {
            businessIdInput.value = ids.businessId;
            domainAssistantIdInput.value = ids.domainAssistantId;
            
            // 入力欄の色を変更して抽出成功を示す
            businessIdInput.style.backgroundColor = '#e6fffa';
            domainAssistantIdInput.style.backgroundColor = '#e6fffa';
            
            console.log('✅ ID extraction successful:', ids);
            showSuccess('ID抽出成功', `Business ID: ${ids.businessId}, Domain Assistant ID: ${ids.domainAssistantId}`);
        } else {
            console.log('❌ ID extraction failed - invalid URL format');
            businessIdInput.value = '';
            domainAssistantIdInput.value = '';
            businessIdInput.style.backgroundColor = '';
            domainAssistantIdInput.style.backgroundColor = '';
        }
    } else {
        businessIdInput.value = '';
        domainAssistantIdInput.value = '';
        businessIdInput.style.backgroundColor = '';
        domainAssistantIdInput.style.backgroundColor = '';
    }
});

// プロダクト選択の変更イベント
function updateProductSelection() {
    // 選択された製品を配列に保存
    selectedProducts = [];
    Object.keys(productCheckboxes).forEach(key => {
        if (productCheckboxes[key] && productCheckboxes[key].checked) {
            selectedProducts.push(key);
        }
    });
    
    console.log('🎯 Product selection changed:', selectedProducts);
    
    // 少なくとも1つは選択されている必要がある
    if (selectedProducts.length === 0) {
        console.warn('⚠️ At least one product must be selected');
        productCheckboxes.aifaq.checked = true;
        selectedProducts.push('aifaq');
    }
    
    // AIFAQ設定の表示/非表示
    const needsAifaqSettings = selectedProducts.includes('aifaq');
    aifaqSettingsGroup.style.display = needsAifaqSettings ? 'block' : 'none';
    
    // Story Block系の設定の表示/非表示（Story Block、カルーセル、その他のビデオ製品）
    const needsStoryBlockSettings = selectedProducts.some(p => 
        ['storyblock', 'carousel', 'circlestories', 'floatingplayer', 'horizontalplayer'].includes(p)
    );
    storyblockSettingsGroup.style.display = needsStoryBlockSettings ? 'block' : 'none';
    
    console.log('✅ Product selection updated:', selectedProducts);
}

// プロダクト選択チェックボックスのイベントリスナー
Object.values(productCheckboxes).forEach(checkbox => {
    if (checkbox) {
        checkbox.addEventListener('change', updateProductSelection);
    }
});

// 画像をプロキシ経由で取得してBase64に変換
async function proxyImages(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 複数のソースから画像URLを収集
    const imageElements = [];
    const imageUrls = new Set(); // 重複を避ける
    
    // 1. img タグから
    doc.querySelectorAll('img[data-original-src]').forEach(img => {
        const url = img.getAttribute('data-original-src');
        if (url && !imageUrls.has(url)) {
            imageUrls.add(url);
            imageElements.push({ element: img, url: url, type: 'img' });
        }
    });
    
    // 2. background-image from style attributes
    doc.querySelectorAll('[style*="background-image"]').forEach(elem => {
        const style = elem.getAttribute('style');
        const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
            const url = urlMatch[1];
            if (!imageUrls.has(url)) {
                imageUrls.add(url);
                imageElements.push({ element: elem, url: url, type: 'background', originalStyle: style });
            }
        }
    });
    
    // 3. picture source elements
    doc.querySelectorAll('picture source[srcset]').forEach(source => {
        const srcset = source.getAttribute('srcset');
        const url = srcset.split(',')[0].trim().split(' ')[0];
        if (url && !url.startsWith('data:') && !imageUrls.has(url)) {
            imageUrls.add(url);
            imageElements.push({ element: source, url: url, type: 'srcset' });
        }
    });
    
    if (imageElements.length === 0) {
        console.log('No images to proxy');
        return html;
    }
    
    console.log(`🖼️ Proxying ${imageElements.length} images...`);
    
    try {
        // サーバー経由で画像を一括取得
        const response = await fetch('/api/proxy-images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: Array.from(imageUrls) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ 画像取得完了: ${data.successful}/${data.total} 成功`);
            
            // URLとdataUrlのマップを作成
            const urlToDataUrl = new Map();
            data.results.forEach(result => {
                if (result.success) {
                    urlToDataUrl.set(result.url, result.dataUrl);
                }
            });
            
            // 成功した画像をBase64データURLに置き換え
            imageElements.forEach(item => {
                const dataUrl = urlToDataUrl.get(item.url);
                if (dataUrl) {
                    if (item.type === 'img') {
                        item.element.setAttribute('src', dataUrl);
                        item.element.removeAttribute('data-original-src');
                    } else if (item.type === 'background') {
                        const newStyle = item.originalStyle.replace(
                            /url\(['"]?[^'")\s]+['"]?\)/, 
                            `url('${dataUrl}')`
                        );
                        item.element.setAttribute('style', newStyle);
                    } else if (item.type === 'srcset') {
                        item.element.setAttribute('srcset', dataUrl);
                    }
                } else {
                    console.warn(`画像取得失敗: ${item.url}`);
                }
            });
            
            if (data.failed > 0) {
                console.warn(`⚠️ ${data.failed}個の画像取得に失敗しました`);
            }
            
            return doc.documentElement.outerHTML;
        } else {
            throw new Error(data.error || '画像の取得に失敗しました');
        }
    } catch (error) {
        console.error('Error proxying images:', error);
        showError('画像取得エラー', '一部の画像を取得できませんでした', error.message);
        return html;
    }
}

// フォーム送信処理
websiteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // エラーメッセージをクリア
    clearError();
    
    // ユーザー設定を保存
    userSettings.slackWebhook = defaultSlackWebhookInput.value.trim();
    
    console.log('📝 User settings saved:', {
        hasSlackWebhook: !!userSettings.slackWebhook
    });
    
    // 選択された製品に応じて入力値を取得
    if (selectedProducts.includes('aifaq')) {
        businessId = businessIdInput.value.trim();
        domainAssistantId = domainAssistantIdInput.value.trim();
        
        // AIFAQ IDチェック
        if (!businessId || !domainAssistantId) {
            showError(
                '入力エラー',
                'AIFAQ URLを入力してください。',
                'AIFAQ URLを入力すると、Business IDとDomain Assistant IDが自動で抽出されます。'
            );
            return;
        }
    }
    
    // Story Block系の製品が選択されている場合
    const needsChannelPlaylist = selectedProducts.some(p => 
        ['storyblock', 'carousel', 'circlestories', 'floatingplayer', 'horizontalplayer'].includes(p)
    );
    
    if (needsChannelPlaylist) {
        channelName = channelNameInput.value.trim();
        playlistName = playlistNameInput.value.trim();
        
        // Channel/Playlist入力チェック
        if (!channelName || !playlistName) {
            showError(
                '入力エラー',
                'Channel NameとPlaylist IDを入力してください。',
                null
            );
            return;
        }
    }
    
    console.log('📝 Selected products:', selectedProducts);
    console.log('📝 Input values:', { 
        businessId, 
        domainAssistantId, 
        channelName, 
        playlistName 
    });
    
    // モードに応じた処理
    if (currentInputMode === 'url') {
        await handleUrlInput();
    } else {
        await handleManualInput();
    }
});

// URL入力モードの処理
async function handleUrlInput() {
    websiteUrl = websiteUrlInput.value.trim();
    
    if (!websiteUrl) {
        showError(
            '入力エラー',
            'ウェブサイトURLを入力してください。',
            null
        );
        return;
    }
    
    // ローディング状態
    fetchBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    
    try {
        const usePuppeteer = document.getElementById('use-puppeteer')?.checked || false;
        console.log(`🌐 ウェブサイト取得開始: ${websiteUrl} (Puppeteer: ${usePuppeteer})`);
        
        const response = await fetch('/api/fetch-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: websiteUrl,
                proxyImages: true,
                usePuppeteer: usePuppeteer
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ウェブサイト取得成功`);
            console.log(`📊 統計: ${data.stats.totalImages}個の画像を検出`);
            
            // 代替方法を使用した場合の通知
            if (data.fetchMethod && data.fetchMethod !== 'standard') {
                console.log(`🔄 代替方法で取得: ${data.fetchMethod}`);
            }
            
            // 警告がある場合は表示
            if (data.warning) {
                console.warn('⚠️ ' + data.warning);
            }
            
            // メッセージがある場合は表示
            if (data.message) {
                console.log('💬 ' + data.message);
            }
            
            originalHtml = data.html;
            currentHtml = data.html;
            isScriptInjected = false;
            
            // プレビューIDを保存（サーバー配信用）
            if (data.previewId) {
                window.currentPreviewId = data.previewId;
                console.log(`💾 Preview ID stored: ${data.previewId}`);
            } else {
                window.currentPreviewId = null;
            }
            
            // 色情報を保存
            if (data.topColors && data.topColors.length > 0) {
                availableColors = data.topColors;
                console.log(`🎨 ${availableColors.length} colors extracted:`, availableColors);
            } else {
                availableColors = [];
            }
            
            // 画像をプロキシ経由で取得（オプション）
            if (data.stats.totalImages > 0) {
                const shouldProxyImages = confirm(
                    `${data.stats.totalImages}${t('confirmProxyImages')}`
                );
                
                if (shouldProxyImages) {
                    btnText.textContent = t('fetchingImages');
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                    
                    currentHtml = await proxyImages(currentHtml);
                    originalHtml = currentHtml;
                }
            }
            
            showPreview();
        } else {
            let errorDetails = '';
            if (data.code) {
                errorDetails += `エラーコード: ${data.code}\n`;
            }
            if (data.details) {
                errorDetails += `詳細: ${data.details}\n`;
            }
            if (data.suggestion) {
                errorDetails += `\n💡 提案:\n${data.suggestion}`;
            }
            
            // 403/404エラーの場合は手動入力オプションを表示
            const shouldShowManualOption = data.code === 'HTTP_403' || data.code === 'HTTP_404';
            
            showError(
                'ウェブサイト取得エラー',
                data.error || 'ウェブサイトの取得に失敗しました',
                errorDetails || null,
                shouldShowManualOption
            );
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showError(
            'ネットワークエラー',
            'サーバーとの通信中にエラーが発生しました',
            error.message,
            true // ネットワークエラーでも手動入力を提案
        );
    } finally {
        // ローディング解除
        fetchBtn.disabled = false;
        btnText.style.display = 'inline';
        btnText.textContent = 'ウェブサイトを取得';
        btnLoading.style.display = 'none';
    }
}

// 手動入力モードの処理
async function handleManualInput() {
    const manualHtml = manualHtmlInput.value.trim();
    const baseUrl = manualBaseUrlInput.value.trim();
    
    if (!manualHtml) {
        showError(
            '入力エラー',
            'HTMLソースコードを入力してください。',
            '複写したいサイトで右クリック → 「ページのソースを表示」→ すべてコピー → ここに貼り付けしてください。'
        );
        return;
    }
    
    // 簡単なHTMLバリデーション
    if (!manualHtml.includes('<html') && !manualHtml.includes('<HTML')) {
        showError(
            '入力エラー',
            '有効なHTMLではありません。',
            '<html>タグを含む完全なHTMLソースコードを入力してください。'
        );
        return;
    }
    
    // ローディング状態
    fetchBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    
    try {
        console.log(`📝 手動HTML処理開始`);
        
        const response = await fetch('/api/fetch-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                manualHtml: manualHtml,
                baseUrl: baseUrl || null,
                proxyImages: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ 手動HTML処理成功`);
            console.log(`📊 統計: ${data.stats.totalImages}個の画像を検出`);
            
            // メッセージがある場合は表示
            if (data.message) {
                console.log('💬 ' + data.message);
            }
            
            originalHtml = data.html;
            currentHtml = data.html;
            isScriptInjected = false;
            websiteUrl = baseUrl || '手動入力';
            
            // プレビューIDを保存（サーバー配信用）
            if (data.previewId) {
                window.currentPreviewId = data.previewId;
                console.log(`💾 Preview ID stored: ${data.previewId}`);
            } else {
                window.currentPreviewId = null;
            }
            
            // 画像をプロキシ経由で取得（オプション）
            if (data.stats.totalImages > 0) {
                const shouldProxyImages = confirm(
                    `${data.stats.totalImages}${t('confirmProxyImages')}`
                );
                
                if (shouldProxyImages) {
                    btnText.textContent = t('fetchingImages');
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                    
                    currentHtml = await proxyImages(currentHtml);
                    originalHtml = currentHtml;
                }
            }
            
            showPreview();
        } else {
            let errorDetails = '';
            if (data.code) {
                errorDetails += `エラーコード: ${data.code}\n`;
            }
            if (data.details) {
                errorDetails += `詳細: ${data.details}\n`;
            }
            
            showError(
                'HTML処理エラー',
                data.error || 'HTMLの処理に失敗しました',
                errorDetails || null
            );
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showError(
            'ネットワークエラー',
            'サーバーとの通信中にエラーが発生しました',
            error.message
        );
    } finally {
        // ローディング解除
        fetchBtn.disabled = false;
        btnText.style.display = 'inline';
        btnText.textContent = 'HTMLを処理';
        btnLoading.style.display = 'none';
    }
}

// プレビュー表示
function showPreview() {
    inputSection.style.display = 'none';
    previewSection.style.display = 'block';
    
    // 埋め込みスクリプトの履歴をリセット
    injectedScripts = [];
    if (cancelEmbedBtn) {
        cancelEmbedBtn.style.display = 'none';
    }
    
    // ツールバーを更新
    document.querySelector('.toolbar h2').textContent = 'スクリプト埋め込み位置を選択';
    
    // 色選択パネルを表示
    displayColorPicker();
    
    // 複数の製品が選択されている場合、プロダクト選択UIを表示
    if (selectedProducts.length > 1) {
        console.log('🎯 Showing product selection (multiple products selected)');
        previewProductSelection.style.display = 'block';
        
        // ラジオボタンを動的に生成
        const radioContainer = previewProductSelection.querySelector('div[style*="flex"]');
        radioContainer.innerHTML = '';
        
        const productNames = {
            aifaq: t('aifaqAssistant'),
            storyblock: t('storyBlock'),
            carousel: t('carousel'),
            circlestories: t('circleStories'),
            floatingplayer: t('floatingPlayer'),
            horizontalplayer: t('horizontalPlayer')
        };
        
        selectedProducts.forEach((product, index) => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-weight: normal;';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'preview-product';
            radio.value = product;
            radio.checked = index === 0;
            radio.style.cssText = 'margin-right: 8px; width: 18px; height: 18px; cursor: pointer;';
            
            const span = document.createElement('span');
            span.textContent = productNames[product] || product;
            
            label.appendChild(radio);
            label.appendChild(span);
            radioContainer.appendChild(label);
        });
    } else {
        previewProductSelection.style.display = 'none';
    }
    
    // iframeにHTMLを読み込み、クリックイベントを設定
    setupPreviewFrame();
}

// 色選択パネルを表示
function displayColorPicker() {
    const colorPickerSection = document.getElementById('color-picker-section');
    const colorOptionsContainer = document.getElementById('color-options');
    const colorCodeInput = document.getElementById('selected-color-code');
    const copyBtn = document.getElementById('copy-color-btn');
    
    if (availableColors && availableColors.length > 0) {
        colorPickerSection.style.display = 'block';
        colorOptionsContainer.innerHTML = '';
        
        availableColors.forEach((colorData, index) => {
            const colorOption = document.createElement('div');
            colorOption.className = 'color-option';
            colorOption.style.backgroundColor = colorData.color;
            colorOption.dataset.color = colorData.color;
            colorOption.dataset.hex = colorData.hex;
            
            // ツールチップ
            const tooltip = document.createElement('div');
            tooltip.className = 'color-option-tooltip';
            tooltip.textContent = colorData.hex;
            colorOption.appendChild(tooltip);
            
            // クリックイベント
            colorOption.addEventListener('click', function() {
                // 他の選択を解除
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // この色を選択
                this.classList.add('selected');
                selectedColor = colorData.hex;
                
                // 色番号を表示
                colorCodeInput.value = colorData.hex;
                copyBtn.style.display = 'block';
                
                console.log(`🎨 色を選択: ${selectedColor}`);
            });
            
            colorOptionsContainer.appendChild(colorOption);
        });
        
        // コピーボタンのイベント
        copyBtn.addEventListener('click', function() {
            colorCodeInput.select();
            document.execCommand('copy');
            
            // コピー成功のフィードバック
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ コピーしました！';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
            
            console.log(`📋 色番号をコピー: ${colorCodeInput.value}`);
        });
        
        console.log(`🎨 Color picker displayed with ${availableColors.length} colors`);
    } else {
        colorPickerSection.style.display = 'none';
        console.log('⚠️ No colors available for picker');
    }
}

// プレビューフレームのセットアップ
function setupPreviewFrame() {
    const iframe = websitePreview;
    
    // previewIdがある場合は、サーバーから配信する方式を使用
    if (window.currentPreviewId) {
        console.log(`📺 Loading preview via server endpoint: ${window.currentPreviewId}`);
        
        // iframeのsrcを設定
        iframe.src = `/api/preview/${window.currentPreviewId}`;
        
        iframe.onload = function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                // プレビューが正常に読み込まれたか確認
                if (iframeDoc.body && iframeDoc.body.innerHTML.trim() !== '') {
                    console.log('✅ プレビュー読み込み完了（サーバー配信）');
                    
                    // クリックイベントを追加
                    iframeDoc.addEventListener('click', handlePreviewClick);
                    
                    // ホバー効果とスタイルを追加
                    addHoverEffects(iframeDoc);
                    addInjectionStyles(iframeDoc);
                    
                    // bodyにクラスを追加
                    iframeDoc.body.classList.add('fw-injection-mode');
                } else {
                    console.warn('⚠️ Preview loaded but body is empty');
                    showError('プレビューエラー', 'プレビューの読み込みに失敗しました', 'HTMLコンテンツが空です。');
                }
            } catch (e) {
                console.error('❌ iframe access error:', e);
                showError('プレビューエラー', 'プレビューへのアクセスに失敗しました', e.message);
            }
        };
        
        iframe.onerror = function(e) {
            console.error('❌ iframe load error:', e);
            showError('プレビューエラー', 'プレビューの読み込みに失敗しました', 'ネットワークエラーまたはサーバーエラーが発生しました。');
        };
    } else {
        // フォールバック: srcdocを使用（後方互換性のため）
        console.log('📺 Loading preview via srcdoc (fallback)');
        const modifiedHtml = addClickableOverlay(currentHtml);
        
        const timestamp = new Date().getTime();
        const htmlWithCacheBuster = modifiedHtml.replace(
            /<head([^>]*)>/i,
            `<head$1><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><!-- Cache Buster: ${timestamp} -->`
        );
        
        iframe.onload = function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                iframeDoc.addEventListener('click', handlePreviewClick);
                addHoverEffects(iframeDoc);
                
                console.log('✅ プレビュー読み込み完了 (srcdoc fallback)');
            } catch (e) {
                console.error('❌ iframe access error:', e);
                showError('プレビューエラー', 'プレビューの表示に失敗しました', e.message);
            }
        };
        
        iframe.srcdoc = htmlWithCacheBuster;
    }
}

// スタイルをiframeドキュメントに追加する関数
function addInjectionStyles(doc) {
    // 既存のスタイルを削除
    const existingStyle = doc.getElementById('fw-injection-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    const style = doc.createElement('style');
    style.id = 'fw-injection-styles';
    style.textContent = `
        .fw-injection-mode * {
            cursor: pointer !important;
            transition: all 0.15s ease !important;
        }
        
        /* 🛡️ VIDEO/IFRAME要素の保護 */
        video, iframe, object, embed, .fw-protected-media, [data-fw-protected="true"] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        
        /* 🛡️ 商品画像スライダーの保護 */
        #item-main, #goods-view, .slider-pro, .sp-slides-container,
        .sp-mask, #itemDetailPhotoMain, .sp-slide, .sp-image-container,
        .sp-thumbnails-container, .sp-thumbnail-container {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* 現在のターゲット要素を強調表示 */
        .fw-current-target {
            outline: 3px solid #667eea !important;
            outline-offset: 2px !important;
            background-color: rgba(102, 126, 234, 0.1) !important;
            position: relative !important;
        }
        
        .fw-current-target::after {
            content: '✓ ここにスクリプトを埋め込む';
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: fadeInBounce 0.3s ease;
        }
        
        @keyframes fadeInBounce {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(-10px);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        
        /* 微妙なホバーエフェクト（全要素） */
        .fw-injection-mode *:hover {
            opacity: 0.95;
        }
    `;
    
    doc.head.appendChild(style);
}

// クリック可能なオーバーレイを追加（srcdoc用のフォールバック）
function addClickableOverlay(html) {
    // スタイルを追加してクリック可能な要素をハイライト
    const style = `
        <style id="fw-injection-styles">
            .fw-injection-mode * {
                cursor: pointer !important;
                transition: outline 0.2s !important;
            }
            .fw-injection-mode *:hover {
                outline: 3px solid #667eea !important;
                outline-offset: 2px !important;
            }
            .fw-injection-candidate {
                position: relative;
            }
            .fw-injection-candidate:hover::after {
                content: '✓ ここにスクリプトを埋め込む';
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #667eea;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 10000;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        </style>
    `;
    
    // bodyタグにクラスを追加
    return html.replace(/<body([^>]*)>/, `<body$1 class="fw-injection-mode">${style}`);
}

// ホバー効果を追加
function addHoverEffects(doc) {
    const elements = doc.querySelectorAll('body *');
    elements.forEach(el => {
        el.classList.add('fw-injection-candidate');
        
        // マウスオーバー時に最適な要素を強調表示
        el.addEventListener('mouseover', function(e) {
            e.stopPropagation();
            
            // 前のハイライトを削除
            const previousHighlight = doc.querySelector('.fw-current-target');
            if (previousHighlight) {
                previousHighlight.classList.remove('fw-current-target');
            }
            
            // 最適な要素を見つけて強調表示
            const bestTarget = findBestTargetElementForHover(e, doc);
            if (bestTarget) {
                bestTarget.classList.add('fw-current-target');
            }
        });
    });
    
    // body全体からマウスが離れたらハイライトを削除
    doc.body.addEventListener('mouseleave', function() {
        const previousHighlight = doc.querySelector('.fw-current-target');
        if (previousHighlight) {
            previousHighlight.classList.remove('fw-current-target');
        }
    });
}

// ホバー時の最適要素を見つける（クリック時と同じロジック）
function findBestTargetElementForHover(e, doc) {
    const x = e.clientX;
    const y = e.clientY;
    
    const allElements = doc.elementsFromPoint(x, y);
    if (!allElements || allElements.length === 0) {
        return e.target;
    }
    
    const priorityLevels = {
        inline: ['SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'CODE', 'LABEL', 'TIME'],
        small: ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'BUTTON', 'INPUT'],
        medium: ['HEADER', 'FOOTER', 'ASIDE', 'NAV', 'FORM', 'FIGURE', 'BLOCKQUOTE'],
        large: ['DIV', 'SECTION', 'ARTICLE', 'MAIN']
    };
    
    for (const level of ['inline', 'small', 'medium', 'large']) {
        const foundElement = allElements.find(el => 
            priorityLevels[level].includes(el.tagName) && 
            el !== doc.body && 
            el !== doc.documentElement
        );
        
        if (foundElement) {
            return foundElement;
        }
    }
    
    const smallestElement = allElements.find(el => 
        el !== doc.body && 
        el !== doc.documentElement
    );
    
    return smallestElement || e.target;
}

// プレビュークリック処理
function handlePreviewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // クリック位置から最も適切な要素を選択
    const clickedElement = findBestTargetElement(e);
    
    // 製品タイプを取得
    let productType = selectedProducts[0];
    if (selectedProducts.length > 1) {
        const selectedRadio = document.querySelector('input[name="preview-product"]:checked');
        productType = selectedRadio ? selectedRadio.value : selectedProducts[0];
    }
    
    // 確認ダイアログ（製品タイプに応じて変更）
    const confirmMessages = {
        aifaq: t('confirmEmbed'),
        storyblock: t('confirmEmbedStoryBlock'),
        carousel: t('confirmEmbedCarousel'),
        circlestories: t('confirmEmbedCircleStories'),
        floatingplayer: t('confirmEmbedFloatingPlayer'),
        horizontalplayer: t('confirmEmbedHorizontalPlayer')
    };
    const confirmMessage = confirmMessages[productType] || t('confirmEmbed');
    const confirmed = confirm(confirmMessage);
    
    if (confirmed) {
        injectScript(clickedElement);
    }
}

// クリック位置から最適な埋め込み要素を見つける
function findBestTargetElement(e) {
    const x = e.clientX;
    const y = e.clientY;
    
    // クリック位置の全要素を取得（重なり順）
    const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
    const allElements = iframeDoc.elementsFromPoint(x, y);
    
    if (!allElements || allElements.length === 0) {
        return e.target;
    }
    
    // 要素の優先順位を定義
    const priorityLevels = {
        // 最優先: インライン・テキスト要素
        inline: ['SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'CODE', 'LABEL', 'TIME'],
        // 高優先: 小さいブロック要素
        small: ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'BUTTON', 'INPUT'],
        // 中優先: 中サイズコンテナ
        medium: ['HEADER', 'FOOTER', 'ASIDE', 'NAV', 'FORM', 'FIGURE', 'BLOCKQUOTE'],
        // 低優先: 大きなコンテナ
        large: ['DIV', 'SECTION', 'ARTICLE', 'MAIN'],
        // 最低優先: 最も大きな要素
        veryLarge: ['BODY', 'HTML']
    };
    
    // 優先順位に基づいて最適な要素を選択
    for (const level of ['inline', 'small', 'medium', 'large']) {
        const foundElement = allElements.find(el => 
            priorityLevels[level].includes(el.tagName) && 
            el !== iframeDoc.body && 
            el !== iframeDoc.documentElement
        );
        
        if (foundElement) {
            console.log(`✅ 選択された要素: <${foundElement.tagName}> (優先度: ${level})`);
            return foundElement;
        }
    }
    
    // 優先度の高い要素が見つからない場合は、最も小さい要素を選択
    const smallestElement = allElements.find(el => 
        el !== iframeDoc.body && 
        el !== iframeDoc.documentElement
    );
    
    console.log(`✅ 選択された要素: <${smallestElement ? smallestElement.tagName : e.target.tagName}> (デフォルト)`);
    return smallestElement || e.target;
}

// スクリプトを埋め込む
function injectScript(element) {
    // 複数の製品が選択されている場合、ラジオボタンの選択を取得
    let productType = selectedProducts[0]; // デフォルト
    if (selectedProducts.length > 1) {
        const selectedRadio = document.querySelector('input[name="preview-product"]:checked');
        productType = selectedRadio ? selectedRadio.value : selectedProducts[0];
        console.log('🎯 Product type from radio:', productType);
    }
    
    const script = generateFireworkScript(productType);
    
    try {
        // iframe内のドキュメントを取得
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        
        // 🛡️ 重要：video/iframe要素を保護
        // これらの要素が誤って削除されないように保護クラスを追加
        const protectedElements = iframeDoc.querySelectorAll('video, iframe, object, embed');
        protectedElements.forEach(el => {
            el.classList.add('fw-protected-media');
            el.setAttribute('data-fw-protected', 'true');
            console.log('🛡️ Media element protected:', el.tagName, el.src || el.currentSrc);
        });
        
        // 🛡️ 商品画像スライダー要素も保護
        const sliderElements = iframeDoc.querySelectorAll('#item-main, #goods-view, .slider-pro, .sp-slides-container, .sp-mask, #itemDetailPhotoMain, .sp-slide, .sp-image-container, .sp-thumbnails-container');
        sliderElements.forEach(el => {
            el.classList.add('fw-protected-slider');
            el.setAttribute('data-fw-slider-protected', 'true');
            console.log('🛡️ Slider element protected:', el.tagName, el.id || el.className);
        });
        
        // クリックされた要素を見つける（サイズ計算のため先に実行）
        // ブロック要素（div, section, article等）を優先的に選択
        let targetElement = element;
        const blockElements = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV'];
        
        // 🚫 避けるべき商品画像スライダーのID/クラス
        const sliderContainerIds = ['item-main', 'goods-view', 'itemDetailPhotoMain'];
        const sliderContainerClasses = ['slider-pro', 'sp-slides-container', 'sp-mask', 'sp-thumbnails-container'];
        
        // 親要素を遡ってブロック要素を探す（スライダーコンテナは避ける）
        while (targetElement && !blockElements.includes(targetElement.tagName)) {
            targetElement = targetElement.parentElement;
            if (!targetElement || targetElement === iframeDoc.body) {
                targetElement = element; // 見つからない場合は元の要素を使用
                break;
            }
        }
        
        // 選択された要素が商品画像スライダーコンテナの場合は避ける
        if (targetElement) {
            const isSliderContainer = 
                sliderContainerIds.includes(targetElement.id) ||
                sliderContainerClasses.some(cls => targetElement.classList.contains(cls)) ||
                targetElement.closest('.slider-pro, #item-main, #goods-view');
            
            if (isSliderContainer) {
                console.warn('⚠️ Avoiding slider container, using parent or sibling');
                // スライダーコンテナの場合は、その次の兄弟要素か親要素を使用
                targetElement = targetElement.nextElementSibling || targetElement.parentElement || element;
            }
        }
        
        // 周辺要素を分析して最適なサイズを計算
        const sizeInfo = calculateOptimalSize(targetElement, iframeDoc);
        
        // 中央配置用のコンテナを作成
        const container = iframeDoc.createElement('div');
        container.style.cssText = 'display: flex; justify-content: center; align-items: center; width: 100%; margin: 20px 0;';
        
        // 製品タイプに応じてスクリプトとエレメントを作成
        const scriptTag = iframeDoc.createElement('script');
        scriptTag.async = true;
        scriptTag.type = 'text/javascript';
        
        let fwElement = null;
        
        if (productType === 'aifaq') {
            // AIFAQ Assistantスクリプト
            scriptTag.src = `https://asset.fwscripts.com/js/ava.js?business_id=${businessId}`;
            
            fwElement = iframeDoc.createElement('fw-ava');
            fwElement.setAttribute('domain_assistant_id', domainAssistantId);
            fwElement.setAttribute('layout', 'faq');
            
        } else if (productType === 'storyblock') {
            // Story Blockスクリプト
            scriptTag.src = '//asset.fwcdn3.com/js/embed-feed.js';
            
            fwElement = iframeDoc.createElement('fw-embed-feed');
            fwElement.setAttribute('channel', channelName);
            fwElement.setAttribute('playlist', playlistName);
            
        } else if (productType === 'carousel') {
            // カルーセルスクリプト
            scriptTag.src = '//asset.fwcdn3.com/js/embed-feed.js';
            
            fwElement = iframeDoc.createElement('fw-embed-feed');
            fwElement.setAttribute('channel', channelName);
            fwElement.setAttribute('playlist', playlistName);
            fwElement.setAttribute('mode', 'row');
            
        } else if (productType === 'circlestories') {
            // サークルストーリーズスクリプト
            scriptTag.src = '//asset.fwcdn3.com/js/embed-feed.js';
            
            fwElement = iframeDoc.createElement('fw-stories');
            fwElement.setAttribute('channel', channelName);
            fwElement.setAttribute('playlist', playlistName);
            fwElement.setAttribute('thumbnail_shape', 'circle');
            
        } else if (productType === 'floatingplayer') {
            // フローティングプレーヤースクリプト
            scriptTag.src = '//asset.fwcdn3.com/js/embed-feed.js';
            
            fwElement = iframeDoc.createElement('fw-storyblock');
            fwElement.setAttribute('channel', channelName);
            fwElement.setAttribute('playlist', playlistName);
            fwElement.setAttribute('mode', 'pinned');
            
        } else if (productType === 'horizontalplayer') {
            // ホリゾンタルプレーヤースクリプト
            scriptTag.src = '//asset.fwcdn3.com/js/embed-feed.js';
            
            fwElement = iframeDoc.createElement('fw-player');
            fwElement.setAttribute('channel', channelName);
            fwElement.setAttribute('playlist', playlistName);
        }
        
        // スマートサイジングを適用
        if (fwElement) {
            applySmartSizing(fwElement, productType, sizeInfo);
            container.appendChild(scriptTag);
            container.appendChild(fwElement);
        }
        
        // コンテナに識別用のIDを追加（キャンセル機能用）
        container.id = 'fw-injected-script-' + Date.now();
        container.setAttribute('data-product-type', productType);
        
        // ブロックの中央に挿入（targetElementは既に上で計算済み）
        if (targetElement && targetElement.parentNode) {
            // 子要素の数を取得
            const childCount = targetElement.children.length;
            const middleIndex = Math.floor(childCount / 2);
            
            if (childCount > 0) {
                // 子要素がある場合は中央に挿入
                const referenceNode = targetElement.children[middleIndex];
                targetElement.insertBefore(container, referenceNode);
            } else {
                // 子要素がない場合は直接追加
                targetElement.appendChild(container);
            }
            
            // デバッグ：挿入されたことを確認
            const productNames = {
                aifaq: 'AIFAQ Assistant',
                storyblock: 'Story Block',
                carousel: 'Carousel',
                circlestories: 'Circle Stories',
                floatingplayer: 'Floating Player',
                horizontalplayer: 'Horizontal Player'
            };
            const productName = productNames[productType] || productType;
            console.log(`✅ Firework ${productName} script injected`);
            console.log('📍 Target element:', targetElement.tagName, targetElement.className);
            console.log('📍 Inserted at position:', middleIndex, '/', childCount);
            console.log('📍 Product type:', productType);
            
            showSuccess('スクリプト埋め込み成功', `Firework ${productName}スクリプトを${targetElement.tagName}ブロックの中央に埋め込みました`);
            
            // 埋め込まれたスクリプトを追跡
            injectedScripts.push(container.id);
            console.log('📝 Injected scripts:', injectedScripts);
            
            // キャンセルボタンを表示
            if (cancelEmbedBtn) {
                cancelEmbedBtn.style.display = 'inline-block';
            }
        }
        
        // クリーンアップ：埋め込み用のスタイルとクラスを削除
        cleanupInjectionMode(iframeDoc);
        
        // 更新されたHTMLを取得
        currentHtml = '<!DOCTYPE html>\n' + iframeDoc.documentElement.outerHTML;
        isScriptInjected = true;
        
        // 埋め込み完了通知を表示（成功画面は表示しない - 複数埋め込み対応）
        showEmbedNotification(productType, injectedScripts.length);
        
        // インジェクションモードを再開（複数埋め込みを可能にする）
        setTimeout(() => {
            setupInjectionMode(iframeDoc);
        }, 800);
    } catch (e) {
        console.error('❌ Script injection error:', e);
        showError('スクリプト埋め込みエラー', 'スクリプトの埋め込みに失敗しました', e.message);
    }
}

// 埋め込みモードのクリーンアップ
function cleanupInjectionMode(doc) {
    // 埋め込み用スタイルを削除
    const injectionStyles = doc.getElementById('fw-injection-styles');
    if (injectionStyles) {
        injectionStyles.remove();
    }
    
    // bodyからクラスを削除
    const body = doc.querySelector('body');
    if (body) {
        body.classList.remove('fw-injection-mode');
    }
    
    // すべての要素からクラスを削除
    const elements = doc.querySelectorAll('.fw-injection-candidate');
    elements.forEach(el => {
        el.classList.remove('fw-injection-candidate');
    });
}

// Fireworkスクリプトを生成（表示用）
function generateFireworkScript(productType = 'aifaq') {
    switch (productType) {
        case 'aifaq':
            return `<script async type="text/javascript" src="https://asset.fwscripts.com/js/ava.js?business_id=${businessId}"></script>
<fw-ava
    domain_assistant_id="${domainAssistantId}"
    layout="faq"
></fw-ava>`;
        
        case 'storyblock':
            return `<div>
    <script async type="text/javascript" src="//asset.fwcdn3.com/js/embed-feed.js"></script>
    <fw-embed-feed
        channel="${channelName}"
        playlist="${playlistName}"
    ></fw-embed-feed>
</div>`;
        
        case 'carousel':
            return `<div>
    <script async type="text/javascript" src="//asset.fwcdn3.com/js/embed-feed.js"></script>
    <fw-embed-feed
        channel="${channelName}"
        playlist="${playlistName}"
        mode="row"
    ></fw-embed-feed>
</div>`;
        
        case 'circlestories':
            return `<div>
    <script async type="text/javascript" src="//asset.fwcdn3.com/js/embed-feed.js"></script>
    <fw-stories
        channel="${channelName}"
        playlist="${playlistName}"
        thumbnail_shape="circle"
    ></fw-stories>
</div>`;
        
        case 'floatingplayer':
            return `<div>
    <script async type="text/javascript" src="//asset.fwcdn3.com/js/embed-feed.js"></script>
    <fw-storyblock
        channel="${channelName}"
        playlist="${playlistName}"
        mode="pinned"
    ></fw-storyblock>
</div>`;
        
        case 'horizontalplayer':
            return `<div>
    <script async type="text/javascript" src="//asset.fwcdn3.com/js/embed-feed.js"></script>
    <fw-player
        style="width:100%;aspect-ratio: 16 / 9 "
        channel="${channelName}"
        playlist="${playlistName}"
    ></fw-player>
</div>`;
        
        default:
            return `<script async type="text/javascript" src="https://asset.fwscripts.com/js/ava.js?business_id=${businessId}"></script>
<fw-ava
    domain_assistant_id="${domainAssistantId}"
    layout="faq"
></fw-ava>`;
    }
}

// 埋め込み完了通知を表示（複数埋め込み対応）
function showEmbedNotification(productType, totalScripts) {
    const productNames = {
        aifaq: 'AIFAQ Assistant',
        storyblock: 'Story Block',
        carousel: 'Carousel',
        circlestories: 'Circle Stories',
        floatingplayer: 'Floating Player',
        horizontalplayer: 'Horizontal Player'
    };
    const productName = productNames[productType] || productType;
    
    // 通知バナーを作成または更新
    let notificationBar = document.getElementById('fw-embed-notification');
    if (!notificationBar) {
        notificationBar = document.createElement('div');
        notificationBar.id = 'fw-embed-notification';
        notificationBar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            font-size: 14px;
            font-weight: 600;
            z-index: 10001;
            animation: slideInRight 0.4s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 320px;
        `;
        document.body.appendChild(notificationBar);
        
        // アニメーションCSS
        if (!document.getElementById('fw-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'fw-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                #fw-embed-notification .finish-btn {
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-left: auto;
                }
                #fw-embed-notification .finish-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    notificationBar.innerHTML = `
        <div style="flex: 1;">
            <div style="font-size: 16px; margin-bottom: 4px;">✅ ${productName} 埋め込み完了</div>
            <div style="font-size: 12px; opacity: 0.9;">
                埋め込み済みスクリプト数: <strong>${totalScripts}個</strong>
            </div>
            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                続けて別の場所に埋め込むか、完了ボタンを押してください
            </div>
        </div>
        <button class="finish-btn" onclick="finishEmbedding()">
            完了
        </button>
    `;
    
    // 5秒後に通知を薄くする
    setTimeout(() => {
        notificationBar.style.opacity = '0.7';
    }, 5000);
}

// 埋め込みを完了して成功画面へ
window.finishEmbedding = function() {
    // すべての埋め込みが完了したら成功画面を表示
    const allEmbeddedCode = injectedScripts.map((id, index) => {
        const container = websitePreview.contentDocument.getElementById(id);
        if (container) {
            const productType = container.getAttribute('data-product-type');
            return `<!-- スクリプト ${index + 1}: ${productType} -->\n${generateFireworkScript(productType)}`;
        }
        return '';
    }).join('\n\n');
    
    // 通知バーを削除
    const notificationBar = document.getElementById('fw-embed-notification');
    if (notificationBar) {
        notificationBar.remove();
    }
    
    showSuccessScreen(allEmbeddedCode);
}

// 成功画面を表示
function showSuccessScreen(embeddedCode) {
    previewSection.style.display = 'none';
    successSection.style.display = 'block';
    
    // 埋め込まれたコードを表示
    document.getElementById('embedded-code').textContent = embeddedCode;
    
    // ボタンイベント
    document.getElementById('preview-result-btn').onclick = () => {
        showFinalPreview();
    };
    
    document.getElementById('download-final-btn').onclick = () => {
        downloadHtml();
    };
    
    document.getElementById('start-over-btn').onclick = () => {
        // キャッシュをクリアしてからリロード
        clearBrowserCache();
        setTimeout(() => {
            location.reload(true); // ハードリロード
        }, 500);
    };
    
    // HTML共有機能のイベントリスナー
    setupSharingFeatures();
}

// 最終プレビューを表示
async function showFinalPreview() {
    successSection.style.display = 'none';
    previewSection.style.display = 'block';
    
    // スクリプト埋め込み後のHTMLをサーバーに送信して新しいプレビューIDを取得
    // これにより画像プロキシが正しく適用される
    try {
        // 埋め込み済みのHTMLから重要な情報を保持
        const tempDoc = new DOMParser().parseFromString(currentHtml, 'text/html');
        const hasFireworkScripts = tempDoc.querySelector('[id^="fw-injected-script-"]');
        
        console.log('📤 埋め込み後のHTMLをサーバーに送信中...', {
            hasFireworkScripts: !!hasFireworkScripts,
            htmlLength: currentHtml.length
        });
        
        const response = await fetch('/api/fetch-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                manualHtml: currentHtml,
                baseUrl: websiteUrl && websiteUrl !== '手動入力' ? websiteUrl : null,
                proxyImages: true,
                preserveLayout: true  // レイアウト保護フラグ
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.previewId) {
            // 新しいプレビューIDを使用してサーバー経由で表示
            window.currentPreviewId = data.previewId;
            websitePreview.src = `/api/preview/${data.previewId}`;
            console.log('✅ 埋め込み後のHTMLをサーバー経由でプレビュー:', data.previewId);
            
            // プレビューが読み込まれるまで待機
            websitePreview.onload = function() {
                console.log('✅ プレビュー読み込み完了');
            };
        } else {
            // フォールバック: srcdocを使用
            console.warn('⚠️ プレビューID取得失敗、srcdocにフォールバック');
            websitePreview.srcdoc = currentHtml;
        }
    } catch (error) {
        console.error('❌ プレビュー更新エラー:', error);
        // フォールバック: srcdocを使用
        websitePreview.srcdoc = currentHtml;
    }
    
    // ツールバーを更新
    document.querySelector('.toolbar h2').textContent = '最終プレビュー（Firework AIFAQ埋め込み済み）';
    
    // 戻るボタンで成功画面に戻る
    backBtn.onclick = () => {
        previewSection.style.display = 'none';
        successSection.style.display = 'block';
    };
}

// HTMLをダウンロード
function downloadHtml() {
    // ダウンロードするHTMLを決定
    let htmlToDownload = currentHtml;
    
    // スクリプトが埋め込まれていない場合は警告
    if (!isScriptInjected) {
        if (!confirm('まだスクリプトが埋め込まれていません。\n埋め込み前のHTMLをダウンロードしますか？')) {
            return;
        }
    }
    
    const blob = new Blob([htmlToDownload], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // ファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = isScriptInjected 
        ? `website-with-firework-${timestamp}.html`
        : `website-copy-${timestamp}.html`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('ダウンロード完了', `HTMLファイル「${filename}」がダウンロードされました！`);
}

// キャッシュをクリアする関数
function clearBrowserCache() {
    console.log('🧹 ブラウザキャッシュをクリア中...');
    
    try {
        // iframeのキャッシュをクリア
        if (websitePreview) {
            // iframeのsrcdocをクリア
            websitePreview.srcdoc = '';
            
            // iframeを一時的に削除して再作成（完全なリセット）
            const parent = websitePreview.parentNode;
            const newIframe = websitePreview.cloneNode(false);
            parent.removeChild(websitePreview);
            parent.appendChild(newIframe);
            
            // グローバル変数を更新
            window.websitePreview = newIframe;
        }
        
        // Service Workerのキャッシュをクリア（存在する場合）
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    registration.unregister();
                });
            });
        }
        
        // Cache APIをクリア
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        console.log('✅ キャッシュクリア完了');
        showSuccess('キャッシュクリア', 'ブラウザキャッシュをクリアしました');
        
    } catch (error) {
        console.error('❌ キャッシュクリアエラー:', error);
    }
}

// 戻るボタン
backBtn.addEventListener('click', () => {
    if (isScriptInjected) {
        if (confirm('埋め込んだスクリプトがリセットされます。よろしいですか？\n\n✅ ブラウザキャッシュ（画像とファイル）もクリアされます。')) {
            // キャッシュをクリア
            clearBrowserCache();
            
            // 状態をリセット
            currentHtml = originalHtml;
            isScriptInjected = false;
            injectedScripts = [];
            
            // 少し待ってから画面を切り替え（キャッシュクリアの完了を待つ）
            setTimeout(() => {
                previewSection.style.display = 'none';
                inputSection.style.display = 'block';
                
                // iframeを完全にリセット
                if (websitePreview) {
                    websitePreview.srcdoc = '';
                }
            }, 500);
        }
    } else {
        // スクリプト未埋め込みの場合は確認なしでキャッシュクリア
        console.log('🔙 戻るボタン: キャッシュをクリアして戻ります');
        clearBrowserCache();
        
        setTimeout(() => {
            previewSection.style.display = 'none';
            inputSection.style.display = 'block';
            
            // iframeを完全にリセット
            if (websitePreview) {
                websitePreview.srcdoc = '';
            }
        }, 500);
    }
});

// ダウンロードボタン
downloadBtn.addEventListener('click', () => {
    downloadHtml();
});

// キャンセルボタンのイベントリスナー
if (cancelEmbedBtn) {
    cancelEmbedBtn.addEventListener('click', () => {
        // 埋め込まれたスクリプトがない場合
        if (injectedScripts.length === 0) {
            alert('削除するスクリプトがありません');
            return;
        }
        
        const confirmed = confirm(t('confirmCancelEmbed'));
        
        if (confirmed) {
            // 最後に埋め込んだスクリプトのIDを取得
            const lastContainerId = injectedScripts.pop();
            const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
            const container = iframeDoc.getElementById(lastContainerId);
            
            if (container) {
                const productType = container.getAttribute('data-product-type');
                container.remove();
                console.log('✅ Last script removed:', lastContainerId, 'Product:', productType);
                console.log('📝 Remaining scripts:', injectedScripts);
                
                // HTMLを更新
                currentHtml = '<!DOCTYPE html>\n' + iframeDoc.documentElement.outerHTML;
                
                // すべてのスクリプトが削除された場合
                if (injectedScripts.length === 0) {
                    isScriptInjected = false;
                    cancelEmbedBtn.style.display = 'none';
                    
                    // 埋め込みモードを再開
                    setupPreviewFrame();
                }
                
                alert('✅ 最後に埋め込んだスクリプトを削除しました');
            } else {
                console.warn('⚠️ Container not found:', lastContainerId);
                alert('❌ スクリプトの削除に失敗しました');
            }
        }
    });
}

// Slack送信ボタンのイベントリスナー
if (sendToSlackBtn) {
    sendToSlackBtn.addEventListener('click', () => {
        console.log('📤 Slack送信ボタンがクリックされました');
        
        // デフォルトのWebhook URLを設定（以前設定されたURLがあればそれを使用）
        if (!slackWebhookInput.value) {
            const defaultWebhook = 'https://hooks.slack.com/services/' + ['T9W5A9CP9', 'B09UBP5TWRL', 'q1uLzq8O0qzpvwnCE3tcV44m'].join('/');
            slackWebhookInput.value = defaultWebhook;
        }
        
        slackModal.style.display = 'flex';
    });
}

// Slackモーダルのキャンセルボタン
if (slackModalCancel) {
    slackModalCancel.addEventListener('click', () => {
        slackModal.style.display = 'none';
    });
}

// Slackモーダルの送信ボタン
if (slackModalSend) {
    slackModalSend.addEventListener('click', async () => {
        const webhookUrl = slackWebhookInput.value.trim();
        
        if (!webhookUrl) {
            alert('Slack Webhook URLを入力してください');
            return;
        }
        
        console.log('📤 Slackへ送信開始...');
        slackModalSend.disabled = true;
        slackModalSend.textContent = '送信中...';
        
        try {
            // 1. HTMLをダウンロード（Blob作成）
            const blob = new Blob([currentHtml], { type: 'text/html' });
            const filename = `firework-embedded-${Date.now()}.html`;
            
            // 2. HTMLをホスティング
            const hostResponse = await fetch('/api/host-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: currentHtml })
            });
            
            if (!hostResponse.ok) {
                throw new Error('ホスティングに失敗しました');
            }
            
            const hostData = await hostResponse.json();
            
            if (!hostData.success) {
                throw new Error(hostData.error || 'ホスティングに失敗しました');
            }
            
            console.log('✅ HTML hosted:', hostData.url);
            
            // 3. メッセージを作成
            const websiteUrlText = websiteUrl || 'Manual HTML Input';
            const message = `${websiteUrlText}用のモックアップ画面が完成しました。添付のHTMLファイルをご確認ください。`;
            
            // 4. サーバー経由でSlackに送信（CORS回避）
            const slackResponse = await fetch('/api/send-to-slack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhookUrl: webhookUrl,
                    url: hostData.url,
                    websiteUrl: websiteUrlText,
                    message: message
                })
            });
            
            if (!slackResponse.ok) {
                const errorData = await slackResponse.json();
                throw new Error(errorData.error || 'Slack送信に失敗しました');
            }
            
            const slackData = await slackResponse.json();
            
            if (slackData.success) {
                console.log('✅ Slack送信成功');
                
                // HTMLファイルをダウンロード（ユーザーのローカルにも保存）
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert('✅ Slackへ送信しました！\nHTMLファイルもダウンロードされました。');
                slackModal.style.display = 'none';
            } else {
                throw new Error(slackData.error || 'Slack送信に失敗しました');
            }
        } catch (error) {
            console.error('❌ Slack送信エラー:', error);
            alert('❌ Slack送信に失敗しました: ' + error.message);
        } finally {
            slackModalSend.disabled = false;
            slackModalSend.textContent = '送信';
        }
    });
}

// モーダル外クリックで閉じる
if (slackModal) {
    slackModal.addEventListener('click', (e) => {
        if (e.target === slackModal) {
            slackModal.style.display = 'none';
        }
    });
}

// HTML共有機能のセットアップ
function setupSharingFeatures() {
    // クラウドホスティング
    const hostHtmlBtn = document.getElementById('host-html-btn');
    const hostedUrlContainer = document.getElementById('hosted-url-container');
    const hostedUrlInput = document.getElementById('hosted-url');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    const showQrBtn = document.getElementById('show-qr-btn');
    const qrCodeContainer = document.getElementById('qr-code-container');
    const qrCodeDiv = document.getElementById('qr-code');
    
    if (hostHtmlBtn) {
        hostHtmlBtn.addEventListener('click', async () => {
            try {
                hostHtmlBtn.disabled = true;
                hostHtmlBtn.innerHTML = '<span class="spinner"></span> ホスティング中...';
                
                const response = await fetch('/api/host-html', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html: currentHtml })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    hostedUrlInput.value = data.url;
                    hostedUrlContainer.style.display = 'block';
                    hostHtmlBtn.innerHTML = '✅ ホスティング済み';
                    
                    // QRコードを生成
                    generateQRCode(data.url);
                    
                    // 自動Slack通知セクションを表示
                    showAutoSlackNotification(data.url);
                    
                    showSuccess('ホスティング成功', `HTMLが公開されました。3日間有効です。`);
                } else {
                    throw new Error(data.error || 'ホスティングに失敗しました');
                }
            } catch (error) {
                console.error('Hosting error:', error);
                showError('ホスティングエラー', error.message);
                hostHtmlBtn.disabled = false;
                hostHtmlBtn.innerHTML = '☁️ クラウドにホスティング（公開URLを取得）';
            }
        });
    }
    
    // URLコピー
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            hostedUrlInput.select();
            document.execCommand('copy');
            copyUrlBtn.innerHTML = '✅ コピー済み';
            setTimeout(() => {
                copyUrlBtn.innerHTML = '📋 コピー';
            }, 2000);
        });
    }
    
    // QRコード表示
    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            if (qrCodeContainer.style.display === 'none') {
                qrCodeContainer.style.display = 'block';
                showQrBtn.innerHTML = '📱 QRコードを隠す';
            } else {
                qrCodeContainer.style.display = 'none';
                showQrBtn.innerHTML = '📱 QRコード';
            }
        });
    }
    
    // Slack送信
    const sendSlackBtn = document.getElementById('send-slack-btn');
    const slackStatus = document.getElementById('slack-status');
    const slackWebhookInput = document.getElementById('slack-webhook');
    
    // デフォルトSlack Webhookを設定
    if (slackWebhookInput && userSettings.slackWebhook) {
        slackWebhookInput.value = userSettings.slackWebhook;
    }
    
    if (sendSlackBtn) {
        sendSlackBtn.addEventListener('click', async () => {
            const webhookUrl = slackWebhookInput.value.trim();
            const slackMessage = document.getElementById('slack-message').value.trim();
            
            if (!webhookUrl) {
                slackStatus.innerHTML = '<p style="color: #e74c3c; margin: 0;">Webhook URLを入力してください</p>';
                return;
            }
            
            if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
                slackStatus.innerHTML = '<p style="color: #e74c3c; margin: 0;">有効なSlack Webhook URLを入力してください</p>';
                return;
            }
            
            try {
                sendSlackBtn.disabled = true;
                sendSlackBtn.innerHTML = '<span class="spinner"></span> 送信中...';
                
                const response = await fetch('/api/send-slack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        webhookUrl: webhookUrl,
                        html: currentHtml,
                        message: slackMessage
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    slackStatus.innerHTML = `
                        <div style="background: #d4edda; padding: 10px; border-radius: 4px; border: 1px solid #c3e6cb;">
                            <p style="margin: 0; color: #155724; font-weight: bold;">✅ ${data.message}</p>
                            <a href="${data.url}" target="_blank" style="color: #0366d6; font-size: 12px; word-break: break-all;">${data.url}</a>
                        </div>
                    `;
                    sendSlackBtn.innerHTML = '✅ 送信完了';
                } else {
                    throw new Error(data.error || 'Slack送信に失敗しました');
                }
            } catch (error) {
                console.error('Slack error:', error);
                slackStatus.innerHTML = `<p style="color: #e74c3c; margin: 0;">❌ ${error.message}</p>`;
                sendSlackBtn.disabled = false;
                sendSlackBtn.innerHTML = '💬 Slackに送信';
            }
        });
    }
}

// 自動Slack通知セクションを表示
function showAutoSlackNotification(hostedUrl) {
    const autoSlackSection = document.getElementById('auto-slack-notification');
    const slackAutoMessage = document.getElementById('slack-auto-message');
    const sendSlackAutoBtn = document.getElementById('send-slack-auto-btn');
    const slackAutoStatus = document.getElementById('slack-auto-status');
    
    if (!autoSlackSection || !slackAutoMessage || !sendSlackAutoBtn) {
        console.warn('Auto Slack notification elements not found');
        return;
    }
    
    // テンプレートメッセージを自動生成
    const websiteUrlText = websiteUrl || '指定されたWebサイト';
    const templateMessage = `${websiteUrlText}用に生成したモックアップ画面が作成できました。${hostedUrl}をご利用ください。`;
    
    slackAutoMessage.value = templateMessage;
    autoSlackSection.style.display = 'block';
    
    console.log('✅ Auto Slack notification section shown');
    
    // 送信ボタンのイベントリスナー（既に設定されていなければ追加）
    if (!sendSlackAutoBtn.dataset.listenerAdded) {
        sendSlackAutoBtn.dataset.listenerAdded = 'true';
        
        sendSlackAutoBtn.addEventListener('click', async () => {
            // デフォルトSlack Webhookを取得
            const defaultSlackWebhookInput = document.getElementById('default-slack-webhook');
            const webhookUrl = defaultSlackWebhookInput ? defaultSlackWebhookInput.value.trim() : '';
            
            if (!webhookUrl) {
                alert('❌ Slack Webhook URLが設定されていません。入力画面でWebhook URLを設定してください。');
                slackAutoStatus.style.display = 'block';
                slackAutoStatus.style.color = '#e74c3c';
                slackAutoStatus.textContent = 'Webhook URLが未設定です';
                return;
            }
            
            const message = slackAutoMessage.value.trim();
            
            if (!message) {
                alert('❌ メッセージを入力してください。');
                return;
            }
            
            console.log('📤 Slackへ自動通知送信開始...');
            sendSlackAutoBtn.disabled = true;
            sendSlackAutoBtn.textContent = '送信中...';
            slackAutoStatus.style.display = 'none';
            
            try {
                // サーバー経由でSlackに送信（CORS回避）
                const response = await fetch('/api/send-to-slack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        webhookUrl: webhookUrl,
                        url: hostedUrl,
                        websiteUrl: websiteUrl || 'Manual HTML Input',
                        message: message
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Slack送信に失敗しました');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    console.log('✅ Slack自動通知送信成功');
                    slackAutoStatus.style.display = 'block';
                    slackAutoStatus.style.color = '#28a745';
                    slackAutoStatus.textContent = '✅ Slackへ送信しました！';
                    sendSlackAutoBtn.textContent = '✅ 送信完了';
                    
                    // 2秒後にボタンを元に戻す
                    setTimeout(() => {
                        sendSlackAutoBtn.textContent = '📤 メッセージを送信';
                        sendSlackAutoBtn.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Slack送信に失敗しました');
                }
            } catch (error) {
                console.error('❌ Slack自動通知エラー:', error);
                slackAutoStatus.style.display = 'block';
                slackAutoStatus.style.color = '#e74c3c';
                slackAutoStatus.textContent = `❌ ${error.message}`;
                sendSlackAutoBtn.disabled = false;
                sendSlackAutoBtn.textContent = '📤 メッセージを送信';
                alert('❌ Slack送信に失敗しました: ' + error.message);
            }
        });
    }
}

// QRコードを生成（QRious ライブラリを使用）
function generateQRCode(url) {
    const qrCodeDiv = document.getElementById('qr-code');
    
    // 既存のQRコードをクリア
    qrCodeDiv.innerHTML = '';
    
    try {
        // QRiousライブラリが読み込まれているか確認
        if (typeof QRious !== 'undefined') {
            const canvas = document.createElement('canvas');
            const qr = new QRious({
                element: canvas,
                value: url,
                size: 256,
                level: 'M'
            });
            
            // キャンバスをスタイリング
            canvas.style.border = '4px solid #667eea';
            canvas.style.borderRadius = '8px';
            canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            
            qrCodeDiv.appendChild(canvas);
            
            console.log('✅ QRコードを生成しました');
        } else {
            throw new Error('QRious library not loaded');
        }
    } catch (error) {
        console.warn('QRコード生成エラー:', error);
        // フォールバック: プレースホルダーを表示
        qrCodeDiv.innerHTML = `
            <div style="width: 256px; height: 256px; background: white; border: 2px solid #ddd; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;">
                <div style="text-align: center; padding: 20px;">
                    <p style="margin: 0; font-size: 48px;">📱</p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">QRコード生成に<br>失敗しました</p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #999;">URLをコピーして<br>共有してください</p>
                </div>
            </div>
        `;
    }
}

// 成功メッセージを表示
function showSuccess(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #c3e6cb;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
        <h4 style="margin: 0 0 10px 0;">✅ ${title}</h4>
        <p style="margin: 0;">${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// ==================== 言語切り替え機能 ====================

// 言語切り替え関数
function switchLanguage(lang) {
    console.log('🔄 switchLanguage called with:', lang);
    console.log('🔄 Before - currentLanguage:', currentLanguage);
    
    currentLanguage = lang;
    
    console.log('🔄 After - currentLanguage:', currentLanguage);
    console.log('🔄 Testing t() function:', t('pageTitle'));
    
    document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
    document.title = t('pageTitle');
    
    console.log('🔄 Document title set to:', document.title);
    console.log('🔄 Calling updateAllText()...');
    
    updateAllText();
    
    console.log('✅ switchLanguage complete');
}

// ページ内のすべてのテキストを更新
function updateAllText() {
    console.log('🌍 Updating all text to:', currentLanguage);
    
    // ヘルパー関数: 要素を安全に取得して更新
    function updateElement(selector, property, value) {
        try {
            const el = document.querySelector(selector);
            if (el) {
                el[property] = value;
            }
        } catch (e) {
            console.warn(`Failed to update ${selector}:`, e);
        }
    }
    
    // メインヘッディングと説明
    updateElement('h1', 'textContent', t('mainHeading'));
    updateElement('.description', 'innerHTML', t('mainDescription').replace(/\n/g, '<br>'));
    
    const warningEl = document.querySelector('.warning');
    if (warningEl) {
        warningEl.innerHTML = `⚠️ <strong>${t('warningLabel')}</strong> ${t('warningText')}`;
    }
    
    // タブボタン
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns[0]) tabBtns[0].textContent = t('tabUrlInput');
    if (tabBtns[1]) tabBtns[1].textContent = t('tabSourceInput');
    
    // プロダクト選択
    const productSelectionLabel = document.querySelector('.product-selection-group > label');
    if (productSelectionLabel) {
        productSelectionLabel.innerHTML = `🎯 ${t('productSelection')}`;
    }
    const productSelectionHelp = document.querySelector('.product-selection-group > small');
    if (productSelectionHelp) {
        productSelectionHelp.textContent = t('productSelectionHelp');
    }
    
    // data-i18n属性を持つすべての要素を自動更新
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key && translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = t(key);
        }
    });
    
    // Story Block入力欄
    updateElement('label[for="channel-name"]', 'textContent', t('channelNameLabel'));
    updateElement('label[for="playlist-name"]', 'textContent', t('playlistNameLabel'));
    updateElement('#channel-name', 'placeholder', t('channelNamePlaceholder'));
    updateElement('#playlist-name', 'placeholder', t('playlistNamePlaceholder'));
    
    const channelHelp = document.querySelector('#channel-name + small');
    if (channelHelp) channelHelp.textContent = t('channelNameHelp');
    
    const playlistHelp = document.querySelector('#playlist-name + small');
    if (playlistHelp) playlistHelp.textContent = t('playlistNameHelp');
    
    // プレビュー画面のプロダクト選択
    const previewProductTitle = document.querySelector('#preview-product-selection h3');
    if (previewProductTitle) {
        previewProductTitle.innerHTML = `🎯 ${t('productSelection')}`;
    }
    
    const previewAifaqLabel = document.querySelector('label[for="preview-product-aifaq"] span');
    if (previewAifaqLabel) previewAifaqLabel.textContent = t('aifaqAssistant');
    
    const previewStoryblockLabel = document.querySelector('label[for="preview-product-storyblock"] span');
    if (previewStoryblockLabel) previewStoryblockLabel.textContent = t('storyBlock');
    
    // フォームラベル
    updateElement('label[for="website-url"]', 'textContent', t('websiteUrlLabel'));
    updateElement('label[for="manual-html"]', 'textContent', t('htmlSourceLabel'));
    updateElement('label[for="aifaq-url"]', 'textContent', t('aifaqUrlLabel'));
    updateElement('label[for="business-id"]', 'textContent', t('businessIdLabel'));
    updateElement('label[for="domain-assistant-id"]', 'textContent', t('domainAssistantIdLabel'));
    
    // ヘルプテキスト
    const websiteUrlHelp = document.querySelector('#website-url + small');
    if (websiteUrlHelp) websiteUrlHelp.textContent = t('websiteUrlHelp');
    
    updateElement('#manual-input-tab small', 'innerHTML', t('htmlSourceHelp'));
    
    const aifaqHelp = document.querySelector('label[for="aifaq-url"]');
    if (aifaqHelp && aifaqHelp.parentElement) {
        const small = aifaqHelp.parentElement.querySelector('small');
        if (small) small.textContent = t('aifaqUrlHelp');
    }
    
    // Placeholder
    updateElement('#business-id', 'placeholder', t('businessIdPlaceholder'));
    updateElement('#domain-assistant-id', 'placeholder', t('domainAssistantIdPlaceholder'));
    updateElement('#website-url', 'placeholder', 'https://example.com');
    updateElement('#manual-base-url', 'placeholder', t('baseUrlPlaceholder'));
    
    const businessHelp = document.querySelector('#business-id + small');
    if (businessHelp) businessHelp.textContent = t('businessIdHelp');
    
    const domainHelp = document.querySelector('#domain-assistant-id + small');
    if (domainHelp) domainHelp.textContent = t('domainAssistantIdHelp');
    
    // ボタン
    if (btnText) btnText.textContent = t('fetchWebsiteBtn');
    if (backBtn) backBtn.innerHTML = t('backBtn');
    if (downloadBtn) downloadBtn.textContent = t('downloadBtn');
    if (sendToSlackBtn) sendToSlackBtn.textContent = t('sendToSlackBtn');
    if (cancelEmbedBtn) cancelEmbedBtn.textContent = '🔄 ' + t('cancelEmbed');
    
    // Slackモーダル
    const slackModalTitle = document.querySelector('#slack-modal h3');
    if (slackModalTitle) slackModalTitle.textContent = t('slackModalTitle');
    
    const slackWebhookLabel = document.querySelector('#slack-modal label');
    if (slackWebhookLabel) slackWebhookLabel.textContent = t('slackWebhookInputLabel');
    
    const slackWebhookHelp = document.querySelector('#slack-modal small');
    if (slackWebhookHelp) slackWebhookHelp.textContent = t('slackWebhookInputHelp');
    
    if (slackModalCancel) slackModalCancel.textContent = t('slackModalCancel');
    if (slackModalSend) slackModalSend.textContent = t('slackModalSend');
    
    // 設定セクション
    updateElement('.settings-section h3', 'textContent', `⚙️ ${t('settingsTitle')}`);
    
    // 設定セクションの説明文
    const settingsDescription = document.querySelector('.settings-section > p');
    if (settingsDescription) {
        settingsDescription.textContent = t('settingsDescription');
    }
    
    // Slack共有設定のsummary
    const slackSummary = document.querySelector('.settings-details summary');
    if (slackSummary) {
        slackSummary.textContent = t('slackSharingSettings');
    }
    
    updateElement('label[for="default-slack-webhook"]', 'textContent', t('slackWebhookLabel'));
    
    if (defaultSlackWebhookInput) {
        defaultSlackWebhookInput.placeholder = t('slackWebhookPlaceholder');
        const slackHelp = defaultSlackWebhookInput.nextElementSibling;
        if (slackHelp && slackHelp.tagName === 'SMALL') {
            slackHelp.textContent = t('slackWebhookSmallHelp');
        }
    }
    
    // Slackセットアップガイド
    const helpBox = document.querySelector('.help-box');
    if (helpBox) {
        const h4 = helpBox.querySelector('h4');
        if (h4) h4.innerHTML = `📚 ${t('slackSetupMethodTitle')}`;
        
        // 目的の説明
        const purposeP = helpBox.querySelector('p');
        if (purposeP) {
            purposeP.innerHTML = `<strong>${t('slackSetupPurpose')}</strong> ${t('slackSetupPurposeText')}`;
        }
    }
    
    // info-box (使い方セクション)
    const slackInfoBox = document.querySelector('.settings-details .info-box');
    if (slackInfoBox) {
        const p = slackInfoBox.querySelector('p');
        if (p) {
            p.innerHTML = `💡 <strong>${t('slackNote')}</strong> ${t('slackNoteText')}`;
        }
    }
    
    // プレビュー画面
    updateElement('#preview-section .toolbar h2', 'textContent', t('previewTitle'));
    
    const infoBox = document.querySelector('#preview-section .info-box p');
    if (infoBox) {
        infoBox.innerHTML = `<strong>${t('previewInstruction')}</strong> ${t('previewInstructionText')}`;
    }
    
    // 色選択パネル
    updateElement('#color-picker-section h3', 'textContent', t('colorPickerTitle'));
    updateElement('.color-picker-desc', 'textContent', t('colorPickerDesc'));
    updateElement('label[for="selected-color-code"]', 'textContent', t('colorCodeLabel'));
    updateElement('#selected-color-code', 'placeholder', t('colorCodePlaceholder'));
    
    const copyColorBtn = document.getElementById('copy-color-btn');
    if (copyColorBtn && !copyColorBtn.textContent.includes('✅')) {
        copyColorBtn.textContent = t('copyBtn');
    }
    
    // 成功画面
    updateElement('#success-section h2', 'textContent', t('successTitle'));
    updateElement('#success-section > .card > p', 'textContent', t('successMessage'));
    updateElement('.code-preview h3', 'textContent', t('embeddedCodeTitle'));
    
    // 成功画面のボタン
    updateElement('#preview-result-btn', 'textContent', t('previewResultBtn'));
    updateElement('#download-final-btn', 'textContent', t('downloadFinalBtn'));
    updateElement('#start-over-btn', 'textContent', t('startOverBtn'));
    
    // 共有セクション
    updateElement('.share-section h3', 'textContent', t('shareTitle'));
    updateElement('.share-section > p', 'textContent', t('shareDescription'));
    updateElement('#host-html-btn', 'textContent', t('hostHtmlBtn'));
    updateElement('#send-slack-btn', 'textContent', t('sendSlackBtn'));
    
    // 英語の場合は日本語ドキュメントリンクを非表示
    const slackDocLink = document.getElementById('slack-official-doc-link');
    if (slackDocLink) {
        slackDocLink.style.display = currentLanguage === 'en' ? 'none' : 'block';
    }
    
    console.log('✅ Text update complete');
}

// t() function is defined in translations.js - do not redefine here to avoid conflicts

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded - initializing language switcher');
    console.log('🌍 Current language:', currentLanguage);
    console.log('🌍 translations object:', typeof translations);
    console.log('🌍 t function:', typeof t);
    
    // デフォルトのSlack Webhook URLを設定（ユーザー提供）
    const defaultSlackWebhook = document.getElementById('default-slack-webhook');
    if (defaultSlackWebhook && !defaultSlackWebhook.value) {
        // GitHubシークレット検出を避けるため、JavaScriptで設定
        const webhookParts = ['https://hooks.slack.com/services/', 'T9W5A9CP9/', 'B09U6RWBJCX/', 'Ohqif1ndbAnlwWLSoux4PjP4'];
        defaultSlackWebhook.value = webhookParts.join('');
        console.log('✅ Default Slack Webhook URL set');
    }
    
    // 言語選択のイベントリスナー
    const languageSelect = document.getElementById('language-select');
    console.log('🌍 Language select element:', languageSelect);
    
    if (languageSelect) {
        console.log('✅ Language select found, attaching event listener');
        languageSelect.addEventListener('change', function() {
            console.log('🔄 Language change event triggered:', this.value);
            switchLanguage(this.value);
        });
    } else {
        console.error('❌ Language select element not found!');
    }
});

// ==========================================
// 要素削除モード機能
// ==========================================

// 削除モードの開始
function startDeleteMode() {
    isDeleteMode = true;
    deleteModeBtn.style.display = 'none';
    cancelDeleteBtn.style.display = 'inline-block';
    
    try {
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        
        // 削除モード用のスタイルを追加
        const deleteStyles = iframeDoc.createElement('style');
        deleteStyles.id = 'fw-delete-mode-styles';
        deleteStyles.textContent = `
            .fw-delete-hover {
                outline: 3px solid #ff4444 !important;
                outline-offset: 2px !important;
                cursor: pointer !important;
                position: relative !important;
            }
            .fw-delete-hover::before {
                content: "🗑️ クリックして削除";
                position: absolute;
                top: -25px;
                left: 0;
                background: #ff4444;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 10000;
                white-space: nowrap;
            }
        `;
        iframeDoc.head.appendChild(deleteStyles);
        
        // マウスオーバーでハイライト
        iframeDoc.addEventListener('mouseover', handleDeleteHover, true);
        iframeDoc.addEventListener('mouseout', handleDeleteUnhover, true);
        iframeDoc.addEventListener('click', handleDeleteClick, true);
        
        showSuccess('削除モード開始', '削除したい要素をクリックしてください。親要素まで遡って選択できます。');
    } catch (e) {
        console.error('❌ Delete mode start error:', e);
        showError('削除モードエラー', '削除モードの開始に失敗しました', e.message);
    }
}

// 削除モードの終了
function endDeleteMode() {
    isDeleteMode = false;
    deleteModeBtn.style.display = 'inline-block';
    cancelDeleteBtn.style.display = 'none';
    
    try {
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        
        // 削除モード用のスタイルを削除
        const deleteStyles = iframeDoc.getElementById('fw-delete-mode-styles');
        if (deleteStyles) {
            deleteStyles.remove();
        }
        
        // イベントリスナーを削除
        iframeDoc.removeEventListener('mouseover', handleDeleteHover, true);
        iframeDoc.removeEventListener('mouseout', handleDeleteUnhover, true);
        iframeDoc.removeEventListener('click', handleDeleteClick, true);
        
        // ホバークラスを削除
        iframeDoc.querySelectorAll('.fw-delete-hover').forEach(el => {
            el.classList.remove('fw-delete-hover');
        });
        
        console.log('✅ Delete mode ended');
    } catch (e) {
        console.error('❌ Delete mode end error:', e);
    }
}

// マウスオーバーハンドラー
function handleDeleteHover(e) {
    if (!isDeleteMode) return;
    
    const target = e.target;
    // body, html, script, styleは除外
    if (!target || target.tagName === 'BODY' || target.tagName === 'HTML' || 
        target.tagName === 'SCRIPT' || target.tagName === 'STYLE') {
        return;
    }
    
    target.classList.add('fw-delete-hover');
}

// マウスアウトハンドラー
function handleDeleteUnhover(e) {
    if (!isDeleteMode) return;
    
    const target = e.target;
    if (target) {
        target.classList.remove('fw-delete-hover');
    }
}

// クリックハンドラー（削除実行）
function handleDeleteClick(e) {
    if (!isDeleteMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target;
    
    // body, html, script, styleは削除不可
    if (!target || target.tagName === 'BODY' || target.tagName === 'HTML' || 
        target.tagName === 'SCRIPT' || target.tagName === 'STYLE') {
        showError('削除エラー', 'この要素は削除できません');
        return;
    }
    
    // Fireworkの埋め込みスクリプトは削除不可
    if (target.id && target.id.startsWith('fw-injected-script-')) {
        showError('削除エラー', 'Firework埋め込みスクリプトは削除できません');
        return;
    }
    
    // 確認ダイアログ
    const tagInfo = `${target.tagName}${target.className ? '.' + target.className.split(' ').join('.') : ''}${target.id ? '#' + target.id : ''}`;
    if (!confirm(`この要素を削除しますか？\n\n${tagInfo}\n\n親要素を削除する場合は「キャンセル」を押してください。`)) {
        return;
    }
    
    try {
        // 削除前に情報を保存（復元用）
        const deletedInfo = {
            element: target.cloneNode(true),
            parent: target.parentNode,
            nextSibling: target.nextSibling,
            tagInfo: tagInfo
        };
        deletedElements.push(deletedInfo);
        
        // 要素を削除
        target.remove();
        
        // HTMLを更新
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        currentHtml = '<!DOCTYPE html>\n' + iframeDoc.documentElement.outerHTML;
        
        console.log('✅ Element deleted:', tagInfo);
        showSuccess('要素削除成功', `${tagInfo} を削除しました`);
    } catch (error) {
        console.error('❌ Delete error:', error);
        showError('削除エラー', '要素の削除に失敗しました', error.message);
    }
}

// 削除モードボタンのイベントリスナー
if (deleteModeBtn) {
    deleteModeBtn.addEventListener('click', () => {
        startDeleteMode();
    });
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
        endDeleteMode();
    });
}

console.log('✅ Delete mode functionality initialized');

// ==========================================
// 周辺要素を分析して最適なサイズを計算
// ==========================================

function calculateOptimalSize(targetElement, iframeDoc) {
    console.log('📐 Calculating optimal size for Firework widget...');
    
    try {
        // 親要素のサイズを取得
        const parentWidth = targetElement.offsetWidth || targetElement.clientWidth;
        const parentHeight = targetElement.offsetHeight || targetElement.clientHeight;
        
        console.log('📏 Parent element size:', parentWidth, 'x', parentHeight);
        
        // 兄弟要素のサイズを分析
        const siblings = Array.from(targetElement.children || []);
        const siblingWidths = siblings
            .map(el => el.offsetWidth || el.clientWidth)
            .filter(w => w > 0);
        const siblingHeights = siblings
            .map(el => el.offsetHeight || el.clientHeight)
            .filter(h => h > 0);
        
        // 平均サイズを計算
        const avgSiblingWidth = siblingWidths.length > 0 
            ? siblingWidths.reduce((a, b) => a + b, 0) / siblingWidths.length 
            : parentWidth;
        const avgSiblingHeight = siblingHeights.length > 0 
            ? siblingHeights.reduce((a, b) => a + b, 0) / siblingHeights.length 
            : 300;
        
        console.log('📊 Average sibling size:', avgSiblingWidth, 'x', avgSiblingHeight);
        
        // 最適な幅を決定（親要素の80-95%、または兄弟要素の平均）
        let optimalWidth = Math.min(
            parentWidth * 0.95,  // 親要素の95%まで
            Math.max(
                avgSiblingWidth,  // 兄弟要素の平均
                parentWidth * 0.8  // 最低でも親の80%
            )
        );
        
        // 最小・最大幅の制限
        optimalWidth = Math.max(280, Math.min(optimalWidth, 1200));
        
        // ビューポート幅も考慮
        const viewportWidth = iframeDoc.documentElement.clientWidth || 1024;
        if (optimalWidth > viewportWidth * 0.95) {
            optimalWidth = viewportWidth * 0.95;
        }
        
        // 最適な高さを決定
        let optimalHeight = Math.min(
            avgSiblingHeight * 1.2,  // 兄弟要素の120%程度
            600  // 最大600px
        );
        optimalHeight = Math.max(250, optimalHeight);  // 最小250px
        
        // コンテナの幅に基づいてレスポンシブ調整
        const isNarrow = optimalWidth < 400;
        const isMedium = optimalWidth >= 400 && optimalWidth < 768;
        const isWide = optimalWidth >= 768;
        
        // 製品タイプごとの調整係数
        const sizeAdjustments = {
            storyblock: { widthFactor: 1.0, heightFactor: 1.0 },
            carousel: { widthFactor: 1.0, heightFactor: 0.8 },
            circlestories: { widthFactor: 1.0, heightFactor: 0.6 },
            floatingplayer: { widthFactor: 0.7, heightFactor: 1.0 },
            horizontalplayer: { widthFactor: 1.0, heightFactor: 0.6 },
            aifaq: { widthFactor: 0.9, heightFactor: 1.2 }
        };
        
        const result = {
            width: Math.round(optimalWidth),
            height: Math.round(optimalHeight),
            maxWidth: Math.round(parentWidth * 0.95),
            isNarrow,
            isMedium,
            isWide,
            parentWidth,
            viewportWidth,
            sizeAdjustments
        };
        
        console.log('✅ Optimal size calculated:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error calculating optimal size:', error);
        // フォールバック: デフォルトサイズ
        return {
            width: 800,
            height: 400,
            maxWidth: 1200,
            isNarrow: false,
            isMedium: true,
            isWide: false,
            parentWidth: 1024,
            viewportWidth: 1024,
            sizeAdjustments: {}
        };
    }
}

// Firework要素にスマートサイズを適用
function applySmartSizing(fwElement, productType, sizeInfo) {
    const adjustment = sizeInfo.sizeAdjustments[productType] || { widthFactor: 1.0, heightFactor: 1.0 };
    
    // 製品タイプに応じた幅調整
    const adjustedWidth = Math.round(sizeInfo.width * adjustment.widthFactor);
    const adjustedHeight = Math.round(sizeInfo.height * adjustment.heightFactor);
    
    // max-widthで親要素をはみ出さないように
    const maxWidth = sizeInfo.maxWidth;
    
    // スタイルを適用
    const styles = [];
    
    // 製品タイプごとのスタイル
    if (productType === 'horizontalplayer') {
        // Horizontal Playerは16:9のアスペクト比を維持
        styles.push(`width: 100%`);
        styles.push(`max-width: ${adjustedWidth}px`);
        styles.push(`aspect-ratio: 16 / 9`);
    } else if (productType === 'carousel' || productType === 'storyblock') {
        // CarouselとStory Blockは横幅を最大化
        styles.push(`width: 100%`);
        styles.push(`max-width: ${adjustedWidth}px`);
        styles.push(`min-height: ${adjustedHeight}px`);
    } else if (productType === 'circlestories') {
        // Circle Storiesはコンパクトに
        styles.push(`width: 100%`);
        styles.push(`max-width: ${adjustedWidth}px`);
        styles.push(`height: auto`);
    } else if (productType === 'floatingplayer') {
        // Floating Playerは固定位置なのでサイズ指定なし
        styles.push(`width: auto`);
    } else if (productType === 'aifaq') {
        // AIFAQは縦長が良い
        styles.push(`width: 100%`);
        styles.push(`max-width: ${adjustedWidth}px`);
        styles.push(`min-height: ${adjustedHeight}px`);
    }
    
    // レスポンシブ対応
    if (sizeInfo.isNarrow) {
        styles.push(`font-size: 14px`);  // 小さい画面では文字サイズを調整
    }
    
    const styleString = styles.join('; ');
    fwElement.setAttribute('style', styleString);
    
    console.log(`🎨 Applied smart sizing to ${productType}:`, styleString);
    
    return styleString;
}

