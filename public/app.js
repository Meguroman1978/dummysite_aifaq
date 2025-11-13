// グローバル変数
let currentHtml = '';
let domainAssistantId = '';
let businessId = '';
let websiteUrl = '';

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

// AIFAQ URLからIDを抽出する関数
function extractIdsFromAifaqUrl(url) {
    try {
        // URLパターン: https://business.firework.com/business/{business_id}/ava/{domain_assistant_id}
        const regex = /\/business\/([^\/]+)\/ava\/([^\/\?#]+)/;
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

// フォーム送信処理
websiteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    websiteUrl = websiteUrlInput.value.trim();
    businessId = businessIdInput.value.trim();
    domainAssistantId = domainAssistantIdInput.value.trim();
    
    if (!websiteUrl || !businessId || !domainAssistantId) {
        alert('すべての項目を入力してください。AIFAQ URLを入力すると、Business IDとDomain Assistant IDが自動で抽出されます。');
        return;
    }
    
    // ローディング状態
    fetchBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    
    try {
        const response = await fetch('/api/fetch-website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: websiteUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentHtml = data.html;
            showPreview();
        } else {
            alert('エラー: ' + (data.error || 'ウェブサイトの取得に失敗しました'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('ウェブサイトの取得中にエラーが発生しました: ' + error.message);
    } finally {
        // ローディング解除
        fetchBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
});

// プレビュー表示
function showPreview() {
    inputSection.style.display = 'none';
    previewSection.style.display = 'block';
    
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
        } catch (e) {
            console.error('iframe access error:', e);
        }
    };
    
    iframe.srcdoc = modifiedHtml;
}

// クリック可能なオーバーレイを追加
function addClickableOverlay(html) {
    // スタイルを追加してクリック可能な要素をハイライト
    const style = `
        <style>
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
    const confirmed = confirm('この位置にFreshworksスクリプトを埋め込みますか？');
    
    if (confirmed) {
        injectScript(clickedElement);
    }
}

// スクリプトを埋め込む
function injectScript(element) {
    const script = generateFreshworksScript();
    
    // 要素の後にスクリプトを挿入
    const scriptElement = document.createElement('div');
    scriptElement.innerHTML = script;
    
    try {
        // iframe内のドキュメントを取得
        const iframeDoc = websitePreview.contentDocument || websitePreview.contentWindow.document;
        
        // クリックされた要素の後にスクリプトを挿入
        if (element.parentNode) {
            element.parentNode.insertBefore(scriptElement, element.nextSibling);
        }
        
        // 更新されたHTMLを取得
        currentHtml = iframeDoc.documentElement.outerHTML;
        
        // 成功画面を表示
        showSuccess(script);
    } catch (e) {
        console.error('Script injection error:', e);
        alert('スクリプトの埋め込みに失敗しました: ' + e.message);
    }
}

// Freshworksスクリプトを生成
function generateFreshworksScript() {
    return `
<script async type="text/javascript" src="https://asset.fwscripts.com/js/ava.js?business_id=${businessId}"></script>
<fw-ava
    domain_assistant_id="${domainAssistantId}"
    layout="faq"
></fw-ava>`;
}

// 成功画面を表示
function showSuccess(embeddedCode) {
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
    
    // クリックイベントを無効化して最終プレビューを表示
    websitePreview.srcdoc = currentHtml;
    
    // ツールバーを更新
    document.querySelector('.toolbar h2').textContent = '最終プレビュー';
    
    // 戻るボタンで成功画面に戻る
    backBtn.onclick = () => {
        previewSection.style.display = 'none';
        successSection.style.display = 'block';
    };
}

// HTMLをダウンロード
function downloadHtml() {
    const blob = new Blob([currentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modified-website-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('HTMLファイルがダウンロードされました！');
}

// 戻るボタン
backBtn.addEventListener('click', () => {
    previewSection.style.display = 'none';
    inputSection.style.display = 'block';
});

// ダウンロードボタン
downloadBtn.addEventListener('click', () => {
    // プレビュー中でもダウンロード可能
    if (confirm('現在の状態でHTMLをダウンロードしますか？\n（スクリプト埋め込み前の状態です）')) {
        downloadHtml();
    }
});
