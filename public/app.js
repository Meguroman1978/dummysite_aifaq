// グローバル変数
let currentHtml = '';
let originalHtml = '';
let domainAssistantId = '';
let businessId = '';
let websiteUrl = '';
let isScriptInjected = false;

// DOM要素
const inputSection = document.getElementById('input-section');
const previewSection = document.getElementById('preview-section');
const successSection = document.getElementById('success-section');
const websiteForm = document.getElementById('website-form');
const websiteUrlInput = document.getElementById('website-url');
const aifaqUrlInput = document.getElementById('aifaq-url');
const businessIdInput = document.getElementById('business-id');
const domainAssistantIdInput = document.getElementById('domain-assistant-id');
const fetchBtn = document.getElementById('fetch-btn');
const btnText = document.querySelector('.btn-text');
const btnLoading = document.querySelector('.btn-loading');
const backBtn = document.getElementById('back-btn');
const downloadBtn = document.getElementById('download-btn');
const websitePreview = document.getElementById('website-preview');

// エラー表示用の関数
function showError(title, message, details = null) {
    let errorHtml = `
        <div style="background: #fee; border-left: 4px solid #f44; padding: 20px; border-radius: 8px; margin: 20px;">
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
    
    errorHtml += `</div>`;
    
    alert(`${title}\n\n${message}${details ? '\n\n' + details : ''}`);
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

// AIFAQ URL入力時の自動抽出
aifaqUrlInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    
    if (url) {
        const ids = extractIdsFromAifaqUrl(url);
        
        if (ids) {
            businessIdInput.value = ids.businessId;
            domainAssistantIdInput.value = ids.domainAssistantId;
            
            // 入力欄の色を変更して抽出成功を示す
            businessIdInput.style.backgroundColor = '#e6fffa';
            domainAssistantIdInput.style.backgroundColor = '#e6fffa';
            
            showSuccess('ID抽出成功', `Business ID: ${ids.businessId}, Domain Assistant ID: ${ids.domainAssistantId}`);
        } else {
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

// 画像をプロキシ経由で取得してBase64に変換
async function proxyImages(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img[data-original-src]');
    
    if (images.length === 0) {
        console.log('No images to proxy');
        return html;
    }
    
    console.log(`🖼️ Proxying ${images.length} images...`);
    
    // 画像URLを収集
    const imageUrls = Array.from(images).map(img => img.getAttribute('data-original-src')).filter(Boolean);
    
    if (imageUrls.length === 0) {
        return html;
    }
    
    try {
        // サーバー経由で画像を一括取得
        const response = await fetch('/api/proxy-images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: imageUrls })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ 画像取得完了: ${data.successful}/${data.total} 成功`);
            
            // 成功した画像をBase64データURLに置き換え
            data.results.forEach((result, index) => {
                if (result.success && images[index]) {
                    images[index].setAttribute('src', result.dataUrl);
                    images[index].removeAttribute('data-original-src');
                } else if (!result.success) {
                    console.warn(`画像取得失敗: ${result.url} - ${result.error}`);
                }
            });
            
            if (data.failed > 0) {
                showSuccess('画像取得完了（一部失敗）', `${data.successful}/${data.total}個の画像を取得しました。${data.failed}個は失敗しました。`);
            } else {
                showSuccess('画像取得完了', `${data.successful}個の画像を取得しました。`);
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
    
    websiteUrl = websiteUrlInput.value.trim();
    businessId = businessIdInput.value.trim();
    domainAssistantId = domainAssistantIdInput.value.trim();
    
    if (!websiteUrl || !businessId || !domainAssistantId) {
        showError(
            '入力エラー',
            'すべての項目を入力してください。',
            'AIFAQ URLを入力すると、Business IDとDomain Assistant IDが自動で抽出されます。'
        );
        return;
    }
    
    // ローディング状態
    fetchBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    
    try {
        console.log(`🌐 ウェブサイト取得開始: ${websiteUrl}`);
        
        const response = await fetch('/api/fetch-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: websiteUrl,
                proxyImages: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ウェブサイト取得成功`);
            console.log(`📊 統計: ${data.stats.totalImages}個の画像を検出`);
            
            originalHtml = data.html;
            currentHtml = data.html;
            isScriptInjected = false;
            
            // 画像をプロキシ経由で取得（オプション）
            if (data.stats.totalImages > 0) {
                const shouldProxyImages = confirm(
                    `${data.stats.totalImages}個の画像が見つかりました。\n\n` +
                    '画像をプロキシ経由で取得しますか？\n' +
                    '（推奨: CORS制限を回避できますが、時間がかかります）'
                );
                
                if (shouldProxyImages) {
                    btnText.textContent = '画像を取得中...';
                    btnText.style.display = 'inline';
                    btnLoading.style.display = 'none';
                    
                    currentHtml = await proxyImages(currentHtml);
                    originalHtml = currentHtml;
                }
            }
            
            showPreview();
        } else {
            showError(
                'ウェブサイト取得エラー',
                data.error || 'ウェブサイトの取得に失敗しました',
                data.code ? `エラーコード: ${data.code}\n詳細: ${data.details || ''}` : null
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
        btnText.textContent = 'ウェブサイトを取得';
        btnLoading.style.display = 'none';
    }
});

// プレビュー表示
function showPreview() {
    inputSection.style.display = 'none';
    previewSection.style.display = 'block';
    
    // ツールバーを更新
    document.querySelector('.toolbar h2').textContent = 'スクリプト埋め込み位置を選択';
    
    // iframeにHTMLを読み込み、クリックイベントを設定
    setupPreviewFrame();
}

// プレビューフレームのセットアップ
function setupPreviewFrame() {
    // クリック可能なHTMLを準備
    const modifiedHtml = addClickableOverlay(currentHtml);
    
    // iframeに書き込み
    const iframe = websitePreview;
    iframe.onload = function() {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            // クリックイベントを追加
            iframeDoc.addEventListener('click', handlePreviewClick);
            
            // ホバー効果を追加
            addHoverEffects(iframeDoc);
            
            console.log('✅ プレビュー読み込み完了');
        } catch (e) {
            console.error('❌ iframe access error:', e);
            showError('プレビューエラー', 'プレビューの表示に失敗しました', e.message);
        }
    };
    
    iframe.srcdoc = modifiedHtml;
}

// クリック可能なオーバーレイを追加
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
    });
}

// プレビュークリック処理
function handlePreviewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const clickedElement = e.target;
    
    // 確認ダイアログ
    const confirmed = confirm('この位置にFirework AIFAQスクリプトを埋め込みますか？');
    
    if (confirmed) {
        injectScript(clickedElement);
    }
}

// スクリプトを埋め込む
function injectScript(element) {
    const script = generateFireworkScript();
    
    try {
        // iframe内のドキュメントを取得
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        
        // スクリプトタグを作成
        const scriptTag = iframeDoc.createElement('script');
        scriptTag.async = true;
        scriptTag.type = 'text/javascript';
        scriptTag.src = `https://asset.fwscripts.com/js/ava.js?business_id=${businessId}`;
        
        // fw-ava要素を作成
        const fwAvaElement = iframeDoc.createElement('fw-ava');
        fwAvaElement.setAttribute('domain_assistant_id', domainAssistantId);
        fwAvaElement.setAttribute('layout', 'faq');
        
        // クリックされた要素の後にスクリプトを挿入
        if (element.parentNode) {
            element.parentNode.insertBefore(scriptTag, element.nextSibling);
            element.parentNode.insertBefore(fwAvaElement, scriptTag.nextSibling);
            
            // デバッグ：挿入されたことを確認
            console.log('✅ Firework AIFAQ script injected');
            console.log('📍 Script URL:', scriptTag.src);
            console.log('📍 fw-ava element:', fwAvaElement);
            console.log('📍 Attributes:', {
                domain_assistant_id: fwAvaElement.getAttribute('domain_assistant_id'),
                layout: fwAvaElement.getAttribute('layout')
            });
            
            showSuccess('スクリプト埋め込み成功', 'Firework AIFAQスクリプトが正常に埋め込まれました');
        }
        
        // クリーンアップ：埋め込み用のスタイルとクラスを削除
        cleanupInjectionMode(iframeDoc);
        
        // 更新されたHTMLを取得
        currentHtml = '<!DOCTYPE html>\n' + iframeDoc.documentElement.outerHTML;
        isScriptInjected = true;
        
        // 成功画面を表示
        showSuccessScreen(script);
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
function generateFireworkScript() {
    return `<script async type="text/javascript" src="https://asset.fwscripts.com/js/ava.js?business_id=${businessId}"></script>
<fw-ava
    domain_assistant_id="${domainAssistantId}"
    layout="faq"
></fw-ava>`;
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
        location.reload();
    };
}

// 最終プレビューを表示
function showFinalPreview() {
    successSection.style.display = 'none';
    previewSection.style.display = 'block';
    
    // クリーンアップされたHTMLをプレビュー
    websitePreview.srcdoc = currentHtml;
    
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

// 戻るボタン
backBtn.addEventListener('click', () => {
    if (isScriptInjected) {
        if (confirm('埋め込んだスクリプトがリセットされます。よろしいですか？')) {
            currentHtml = originalHtml;
            isScriptInjected = false;
            previewSection.style.display = 'none';
            inputSection.style.display = 'block';
        }
    } else {
        previewSection.style.display = 'none';
        inputSection.style.display = 'block';
    }
});

// ダウンロードボタン
downloadBtn.addEventListener('click', () => {
    downloadHtml();
});
