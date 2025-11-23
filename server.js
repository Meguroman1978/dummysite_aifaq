const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// プロキシ環境（サンドボックス）対応
app.set('trust proxy', true);

// 一時的なHTMLストレージ（メモリベース）
const tempHtmlStorage = new Map();
const hostedHtmlStorage = new Map(); // 公開用のHTML（3日間保存）

// 保存期間の定数
const PREVIEW_EXPIRY = 30 * 60 * 1000; // 30分
const HOSTED_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 3日間

// 古いエントリを定期的にクリーンアップ
setInterval(() => {
  const now = Date.now();
  
  // プレビュー用HTML（30分）
  for (const [id, data] of tempHtmlStorage.entries()) {
    if (now - data.timestamp > PREVIEW_EXPIRY) {
      tempHtmlStorage.delete(id);
      console.log(`🗑️  Cleaned up preview HTML: ${id}`);
    }
  }
  
  // ホスティング用HTML（3日間）
  for (const [id, data] of hostedHtmlStorage.entries()) {
    if (now - data.timestamp > HOSTED_EXPIRY) {
      hostedHtmlStorage.delete(id);
      console.log(`🗑️  Cleaned up hosted HTML: ${id} (age: ${Math.floor((now - data.timestamp) / (24 * 60 * 60 * 1000))} days)`);
    }
  }
}, 5 * 60 * 1000); // 5分ごとにチェック

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// 複数のUser-Agentを試す（403対策）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

// 色抽出関数：ウェブサイトから使用頻度の高い色を抽出（より厳密）
function extractTopColors($) {
  const colorMap = new Map();
  
  // RGB/RGBA/HEX色を正規化してRGB形式に変換
  function normalizeColor(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial' || colorStr === 'currentcolor') {
      return null;
    }
    
    colorStr = colorStr.trim().toLowerCase();
    
    // rgb(a) 形式
    const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      
      // 白・黒・グレーを除外（閾値設定）
      if ((r > 240 && g > 240 && b > 240) || // ほぼ白
          (r < 30 && g < 30 && b < 30) || // ほぼ黒
          (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15)) { // グレー
        return null;
      }
      
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    // HEX形式
    const hexMatch = colorStr.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // 白・黒・グレーを除外
      if ((r > 240 && g > 240 && b > 240) || 
          (r < 30 && g < 30 && b < 30) ||
          (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15)) {
        return null;
      }
      
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    return null;
  }
  
  // より厳密：実際に表示されている可能性の高い要素のみから抽出
  // visible要素を優先的に抽出
  $('body *').each((i, elem) => {
    const $elem = $(elem);
    const tagName = elem.tagName.toLowerCase();
    
    // script, style, head内の要素は除外
    if (['script', 'style', 'meta', 'link', 'title'].includes(tagName)) {
      return;
    }
    
    // style属性から色を取得（インラインスタイルは実際に使われている可能性が高い）
    const style = $elem.attr('style');
    if (style) {
      // color（テキスト色）
      const colorMatch = style.match(/color:\s*([^;]+)/i);
      if (colorMatch) {
        const normalized = normalizeColor(colorMatch[1]);
        if (normalized) {
          colorMap.set(normalized, (colorMap.get(normalized) || 0) + 3); // インラインスタイルは重み3倍
        }
      }
      
      // background-color
      const bgMatch = style.match(/background-color:\s*([^;]+)/i);
      if (bgMatch) {
        const normalized = normalizeColor(bgMatch[1]);
        if (normalized) {
          colorMap.set(normalized, (colorMap.get(normalized) || 0) + 5); // 背景色は重み5倍
        }
      }
      
      // border-color
      const borderMatch = style.match(/border-color:\s*([^;]+)/i);
      if (borderMatch) {
        const normalized = normalizeColor(borderMatch[1]);
        if (normalized) {
          colorMap.set(normalized, (colorMap.get(normalized) || 0) + 2);
        }
      }
    }
  });
  
  // ボタン、リンク、重要な要素のCSS色を優先的に抽出
  $('style').each((i, elem) => {
    const cssText = $(elem).html();
    if (!cssText) return;
    
    // 重要なセレクタ（ボタン、リンク、CTAなど）に関連する色を高く評価
    const importantSelectors = ['button', 'a', '.btn', '.cta', '[class*="button"]', '[class*="link"]'];
    
    importantSelectors.forEach(selector => {
      // セレクタに関連するCSSブロックを探す
      const selectorRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*{[^}]*}`, 'gi');
      const blocks = cssText.match(selectorRegex) || [];
      
      blocks.forEach(block => {
        // color
        const colorMatches = block.matchAll(/color:\s*([^;}\s]+)/gi);
        for (const match of colorMatches) {
          const normalized = normalizeColor(match[1]);
          if (normalized) {
            colorMap.set(normalized, (colorMap.get(normalized) || 0) + 4); // 重要要素は重み4倍
          }
        }
        
        // background-color
        const bgMatches = block.matchAll(/background(?:-color)?:\s*([^;}\s]+)/gi);
        for (const match of bgMatches) {
          const normalized = normalizeColor(match[1]);
          if (normalized) {
            colorMap.set(normalized, (colorMap.get(normalized) || 0) + 6); // ボタン背景は最重要
          }
        }
      });
    });
  });
  
  // 頻度順にソート（最低カウント3以上のみ採用 = 実際に使われている可能性が高い）
  let sortedColors = Array.from(colorMap.entries())
    .filter(([color, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // 最大8色に変更
    .map(([color, count]) => ({
      color: color,
      count: count,
      hex: rgbToHex(color)
    }));
  
  console.log(`🎨 Found ${sortedColors.length} colors with minimum usage threshold`);
  
  // 7色以下で黒が含まれていない場合、黒を追加
  if (sortedColors.length <= 7) {
    const hasBlack = sortedColors.some(c => c.hex.toLowerCase() === '#000000');
    if (!hasBlack) {
      sortedColors.push({
        color: 'rgb(0, 0, 0)',
        count: 0,
        hex: '#000000'
      });
      console.log('✅ Added black color as fallback option');
    }
  }
  
  return sortedColors;
}

// RGB文字列をHEXに変換
function rgbToHex(rgb) {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// 画像をプロキシ経由で取得するエンドポイント
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URLが指定されていません' });
    }

    console.log(`Proxying image: ${url}`);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': new URL(url).origin
      },
      timeout: 10000,
      maxRedirects: 5
    });

    // Content-Typeを取得
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // 画像データをBase64に変換
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.json({
      success: true,
      dataUrl: dataUrl,
      contentType: contentType
    });

  } catch (error) {
    console.error('Error proxying image:', error.message);
    res.status(500).json({
      error: '画像の取得に失敗しました',
      details: error.message,
      url: req.query.url
    });
  }
});

// 複数の画像を一括取得
app.post('/api/proxy-images', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLsが指定されていません' });
    }

    console.log(`Proxying ${urls.length} images`);

    // 並列で画像を取得（最大10個まで同時）
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': new URL(url).origin
            },
            timeout: 8000,
            maxRedirects: 5
          });

          const contentType = response.headers['content-type'] || 'image/jpeg';
          const base64 = Buffer.from(response.data, 'binary').toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;

          return {
            url: url,
            success: true,
            dataUrl: dataUrl
          };
        } catch (error) {
          return {
            url: url,
            success: false,
            error: error.message
          };
        }
      })
    );

    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });

    res.json({
      success: true,
      results: processedResults,
      total: urls.length,
      successful: processedResults.filter(r => r.success).length,
      failed: processedResults.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('Error proxying images:', error.message);
    res.status(500).json({
      error: '画像の一括取得に失敗しました',
      details: error.message
    });
  }
});

// 複数のUser-Agentで試行（403対策）
async function fetchWithRetry(url, targetUrl) {
  let lastError = null;
  
  for (let i = 0; i < USER_AGENTS.length; i++) {
    try {
      console.log(`🔄 試行 ${i + 1}/${USER_AGENTS.length}: ${USER_AGENTS[i].substring(0, 50)}...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENTS[i],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Referer': targetUrl.origin
        },
        timeout: 20000,
        maxRedirects: 10,
        validateStatus: (status) => status >= 200 && status < 500
      });
      
      if (response.status === 200) {
        console.log(`✅ User-Agent ${i + 1} で成功`);
        return { html: response.data, method: `user-agent-${i + 1}` };
      } else if (response.status === 403) {
        console.log(`⚠️ User-Agent ${i + 1} も403エラー`);
        lastError = new Error(`403 Forbidden with User-Agent ${i + 1}`);
        continue;
      } else {
        return { html: response.data, method: `user-agent-${i + 1}`, warning: `Status ${response.status}` };
      }
      
    } catch (error) {
      console.log(`❌ User-Agent ${i + 1} 失敗: ${error.message}`);
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error('すべてのUser-Agentで失敗しました');
}

// ウェブサイトを取得するエンドポイント（画像プロキシオプション付き）
app.post('/api/fetch-website', async (req, res) => {
  try {
    const { url, manualHtml, baseUrl, proxyImages = false, usePuppeteer = false } = req.body;
    
    let html;
    let fetchMethod = 'standard';
    let fetchWarning = null;
    let targetUrl;
    
    // 手動HTML入力モードの処理
    if (manualHtml) {
      console.log(`📝 Processing manual HTML input (length: ${manualHtml.length} chars)`);
      
      html = manualHtml;
      fetchMethod = 'manual-input';
      
      // baseUrlが提供されている場合は使用
      if (baseUrl) {
        try {
          targetUrl = new URL(baseUrl);
          console.log(`🌐 Base URL provided: ${baseUrl}`);
        } catch (e) {
          console.warn(`⚠️ Invalid base URL: ${baseUrl}, proceeding without it`);
          targetUrl = null;
        }
      } else {
        console.log(`⚠️ No base URL provided for manual HTML`);
        targetUrl = null;
      }
      
    } else {
      // 通常のURL取得モード
      if (!url) {
        return res.status(400).json({ 
          error: 'URLが指定されていません',
          code: 'MISSING_URL'
        });
      }

      // URLの検証
      try {
        targetUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ 
          error: '無効なURLです',
          code: 'INVALID_URL',
          details: e.message
        });
      }

      console.log(`Fetching: ${url} (proxyImages: ${proxyImages}, usePuppeteer: ${usePuppeteer})`);
      
      try {
        // Puppeteerモードが有効な場合は、最初からPuppeteerを使用
        if (usePuppeteer) {
          console.log('🤖 Puppeteerモードで取得中...');
          const puppeteer = require('puppeteer');
          
          const browser = await puppeteer.launch({
            headless: 'new',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--disable-gpu'
            ]
          });
          
          try {
            const page = await browser.newPage();
            
            // User-AgentをGooglebotに設定（robots.txt対策）
            // 多くのサイトがGooglebotにはCSS/JS/画像へのアクセスを許可している
            const googlebotUA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
            await page.setUserAgent(googlebotUA);
            console.log('🤖 User-Agent: Googlebot');
            
            // ビューポート設定
            await page.setViewport({ width: 1920, height: 1080 });
            
            // リソース読み込みを有効化（画像、CSS、JSすべて）
            await page.setRequestInterception(false);
            
            // ページにアクセス
            console.log('🌐 Puppeteerでページを読み込み中...');
            await page.goto(url, {
              waitUntil: 'networkidle2',
              timeout: 30000
            });
            
            // JavaScriptが完全に実行されるまで待機
            await page.waitForTimeout(2000);
            
            // ページのHTMLを取得
            html = await page.content();
            fetchMethod = 'puppeteer-googlebot';
            console.log('✅ Puppeteerで取得成功（Googlebot UA）');
            
          } finally {
            await browser.close();
          }
        } else {
          // 標準的な方法で試行
          const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENTS[0],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 20000,
        maxRedirects: 10,
        validateStatus: (status) => status >= 200 && status < 500
      });

          if (response.status === 403) {
            throw new Error('403 Forbidden - 複数のUser-Agentで再試行');
          } else if (response.status === 200) {
            html = response.data;
          } else {
            // 200以外だが取得できた場合
            html = response.data;
            fetchWarning = `⚠️ HTTPステータス ${response.status} でしたが、コンテンツは取得できました`;
          }
        }
      } catch (firstError) {
      // 失敗した場合、複数のUser-Agentで再試行
      console.warn(`⚠️ 初回取得失敗: ${firstError.message}`);
      console.log('🔄 複数のUser-Agentで再試行中...');
      
      try {
        const result = await fetchWithRetry(url, targetUrl);
        html = result.html;
        fetchMethod = result.method;
        fetchWarning = result.warning;
      } catch (retryError) {
        console.error('❌ すべての試行が失敗:', retryError.message);
        
        // すべて失敗した場合のエラー処理
        let errorCode = 'FETCH_ERROR';
        let userMessage = 'ウェブサイトの取得に失敗しました';
        let suggestion = '';
        
        if (firstError.response?.status === 403 || retryError.message.includes('403')) {
          errorCode = 'HTTP_403';
          userMessage = 'アクセスが拒否されました（403 Forbidden）';
          suggestion = 'このウェブサイトはアクセス制限が設定されています。\n\n✅ 解決方法:\n1. 「⚡ アクセス強化モード」をONにして再試行\n2. または、手動HTML入力モードを使用\n   → サイトで右クリック → 「ページのソースを表示」\n   → すべてコピー → 貼り付け\n   → ベースURLも必ず入力\n\nその他の方法:\n3. 別のブラウザでサイトを開いてソースコードを取得';
        } else if (firstError.code === 'ENOTFOUND') {
          errorCode = 'DNS_ERROR';
          userMessage = 'ウェブサイトが見つかりません';
          suggestion = 'URLのスペルを確認してください。';
        } else if (firstError.code === 'ETIMEDOUT') {
          errorCode = 'TIMEOUT';
          userMessage = 'リクエストがタイムアウトしました';
          suggestion = 'サイトの応答が遅すぎます。もう一度試すか、別のURLを使用してください。';
        } else if (firstError.response?.status === 404) {
          errorCode = 'HTTP_404';
          userMessage = 'ページが見つかりません（404 Not Found）';
          suggestion = 'URLが正しいか確認してください。';
        }
        
        return res.status(500).json({
          error: userMessage,
          code: errorCode,
          details: `初回: ${firstError.message}\n再試行: ${retryError.message}`,
          suggestion: suggestion
        });
        }
      }
    }

    const $ = cheerio.load(html);

    // 相対URLを絶対URLに変換
    let resolvedBaseUrl = null;
    if (targetUrl) {
      resolvedBaseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
      
      // <base> タグを追加または更新（404エラー対策）
      // 既存のbaseタグを削除してから新しいものを追加（確実性を高める）
      $('base').remove();
      $('head').prepend(`<base href="${resolvedBaseUrl}/">`);
      console.log(`🔗 Added <base> tag: ${resolvedBaseUrl}/`);
    } else {
      // 手動入力でbaseUrlがない場合は、既存のbaseタグを確認
      const existingBase = $('base').attr('href');
      if (existingBase) {
        resolvedBaseUrl = existingBase;
        console.log(`📍 Using existing base tag: ${resolvedBaseUrl}`);
      } else {
        console.log(`⚠️ No base URL available, relative URLs will not be resolved`);
      }
    }
    
    // 既存のCSPメタタグを削除（競合防止）
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    
    // 寛容なCSPを追加（外部リソースを許可）
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';">`;
    $('head').prepend(cspMeta);
    console.log('🔒 Added permissive CSP meta tag');
    
    // エラーハンドリング + ナビゲーション防止スクリプトを追加
    const errorHandlingScript = `
      <script>
        // リソース読み込みエラーを無視
        window.addEventListener('error', function(e) {
          if (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
            e.preventDefault();
            console.warn('リソース読み込みエラーを無視:', e.target.src || e.target.href);
          }
        }, true);
        
        // iframe内でのみナビゲーションを防止（ダウンロードしたHTMLでは動作しない）
        if (window.self !== window.top) {
          // リンククリックを無効化
          document.addEventListener('click', function(e) {
            var target = e.target;
            while (target && target.tagName !== 'A') {
              target = target.parentElement;
            }
            if (target && target.tagName === 'A' && target.href) {
              e.preventDefault();
              console.log('リンククリックを防止:', target.href);
            }
          }, true);
          
          // フォーム送信を防止
          document.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('フォーム送信を防止');
          }, true);
        }
      </script>
    `;
    $('head').append(errorHandlingScript);
    
    // ヘルパー関数：URLを絶対パスに変換
    function toAbsoluteUrl(url) {
      if (!url || url.startsWith('data:')) return null;
      
      if (url.startsWith('//')) {
        return targetUrl ? (targetUrl.protocol + url) : ('https:' + url);
      } else if (url.startsWith('http')) {
        return url;
      } else if (resolvedBaseUrl) {
        try {
          return new URL(url, resolvedBaseUrl).href;
        } catch (e) {
          console.warn(`Failed to convert URL: ${url}`);
          return null;
        }
      } else {
        // baseUrlがない場合はそのまま返す
        return url;
      }
    }
    
    // すべてのリンクを絶対URLに変換
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('javascript:') && !href.startsWith('#')) {
        if (resolvedBaseUrl) {
          try {
            const absoluteUrl = new URL(href, resolvedBaseUrl).href;
            $(elem).attr('href', absoluteUrl);
          } catch (e) {
            console.warn(`Failed to convert href: ${href}`);
          }
        }
      }
    });

    // 高度な画像抽出機能
    const imageUrls = [];
    const imageMap = new Map(); // 重複を避けるため
    
    // 1. <img>タグから画像を抽出（複数の属性をチェック）
    $('img').each((i, elem) => {
      const possibleSources = [
        $(elem).attr('src'),
        $(elem).attr('data-src'),
        $(elem).attr('data-lazy-src'),
        $(elem).attr('data-original'),
        $(elem).attr('data-srcset')?.split(',')[0]?.trim().split(' ')[0],
        $(elem).attr('srcset')?.split(',')[0]?.trim().split(' ')[0]
      ];
      
      for (const source of possibleSources) {
        const imageUrl = toAbsoluteUrl(source);
        if (imageUrl) {
          $(elem).attr('src', imageUrl);
          $(elem).attr('data-original-src', imageUrl);
          
          if (proxyImages && !imageMap.has(imageUrl)) {
            imageMap.set(imageUrl, true);
            imageUrls.push(imageUrl);
          }
          break;
        }
      }
    });
    
    // 2. <picture>要素内の<source>タグから画像を抽出
    $('picture source').each((i, elem) => {
      const srcset = $(elem).attr('srcset');
      if (srcset) {
        const imageUrl = toAbsoluteUrl(srcset.split(',')[0].trim().split(' ')[0]);
        if (imageUrl) {
          $(elem).attr('srcset', imageUrl);
          if (proxyImages && !imageMap.has(imageUrl)) {
            imageMap.set(imageUrl, true);
            imageUrls.push(imageUrl);
          }
        }
      }
    });
    
    // 3. CSS background-imageから画像を抽出
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style && style.includes('background-image')) {
        const urlMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          const imageUrl = toAbsoluteUrl(urlMatch[1]);
          if (imageUrl && proxyImages && !imageMap.has(imageUrl)) {
            imageMap.set(imageUrl, true);
            imageUrls.push(imageUrl);
          }
        }
      }
    });
    
    // 4. data-background属性から画像を抽出
    $('[data-background], [data-bg], [data-background-image]').each((i, elem) => {
      const bgUrl = $(elem).attr('data-background') || 
                    $(elem).attr('data-bg') || 
                    $(elem).attr('data-background-image');
      const imageUrl = toAbsoluteUrl(bgUrl);
      if (imageUrl && proxyImages && !imageMap.has(imageUrl)) {
        imageMap.set(imageUrl, true);
        imageUrls.push(imageUrl);
      }
    });

    // CSSファイルを絶対URLに変換
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        if (resolvedBaseUrl) {
          try {
            const absoluteUrl = new URL(href, resolvedBaseUrl).href;
            $(elem).attr('href', absoluteUrl);
          } catch (e) {
            console.warn(`Failed to convert stylesheet href: ${href}`);
          }
        }
      } else if (href && href.startsWith('//')) {
        $(elem).attr('href', targetUrl ? (targetUrl.protocol + href) : ('https:' + href));
      }
    });

    // JavaScriptファイルを絶対URLに変換
    $('script[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        if (resolvedBaseUrl) {
          try {
            const absoluteUrl = new URL(src, resolvedBaseUrl).href;
            $(elem).attr('src', absoluteUrl);
          } catch (e) {
            console.warn(`Failed to convert script src: ${src}`);
          }
        }
      } else if (src && src.startsWith('//')) {
        $(elem).attr('src', targetUrl ? (targetUrl.protocol + src) : ('https:' + src));
      }
    });

    // その他のリソース（favicon等）
    $('link[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        if (resolvedBaseUrl) {
          try {
            const absoluteUrl = new URL(href, resolvedBaseUrl).href;
            $(elem).attr('href', absoluteUrl);
          } catch (e) {
            console.warn(`Failed to convert link href: ${href}`);
          }
        }
      } else if (href && href.startsWith('//')) {
        $(elem).attr('href', targetUrl ? (targetUrl.protocol + href) : ('https:' + href));
      }
    });

    // background-imageも処理
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style && style.includes('url(')) {
        const updatedStyle = style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (match, url) => {
          if (!url.startsWith('http') && !url.startsWith('//') && !url.startsWith('data:')) {
            if (resolvedBaseUrl) {
              try {
                const absoluteUrl = new URL(url, resolvedBaseUrl).href;
                return `url('${absoluteUrl}')`;
              } catch (e) {
                return match;
              }
            }
            return match;
          } else if (url.startsWith('//')) {
            return `url('${targetUrl ? (targetUrl.protocol + url) : ('https:' + url)}')`;
          }
          return match;
        });
        $(elem).attr('style', updatedStyle);
      }
    });

    // A/B テストツール・ボット検知スクリプトの除去
    console.log('🔧 Removing A/B testing scripts and forced visibility...');
    
    // Phase 1: Shoplift関連のスタイルとスクリプトを削除
    // Shopliftの非表示スタイルを削除
    $('style').each((i, elem) => {
      const styleContent = $(elem).html();
      if (styleContent && styleContent.includes('shoplift-hide')) {
        console.log('  ❌ Removed Shoplift hide style');
        $(elem).remove();
      }
    });
    
    // Shopliftスクリプトを削除
    $('script[src*="shoplift"]').remove();
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('shoplift')) {
        console.log('  ❌ Removed inline Shoplift script');
        $(elem).remove();
      }
    });
    
    // その他のA/Bテストツールを削除
    const abTestTools = [
      'optimizely',
      'vwo',
      'google-optimize',
      'ab-test',
      'split.io',
      'kameleoon',
      'launchdarkly',
      'convert.com'
    ];
    
    abTestTools.forEach(tool => {
      const removed = $(`script[src*="${tool}"]`);
      if (removed.length > 0) {
        console.log(`  ❌ Removed ${tool} scripts (${removed.length})`);
        removed.remove();
      }
    });
    
    // Phase 2: 強制表示CSSを追加
    const forceVisibleCSS = `
      <style id="force-visible-override">
        /* A/Bテストツールによる非表示を強制上書き */
        .shoplift-hide,
        .ab-test-hide,
        .optimize-hide,
        [class*="hide"][class*="test"] {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
        
        /* インラインスタイルでopacity: 0が設定されている要素を上書き */
        [style*="opacity: 0"],
        [style*="opacity:0"] {
          opacity: 1 !important;
        }
        
        /* bodyやhtmlに適用されたhideクラスを上書き */
        body[class*="hide"],
        html[class*="hide"],
        body[style*="opacity: 0"],
        html[style*="opacity: 0"] {
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        /* その他の一般的な非表示パターン */
        [data-test-hide="true"],
        [data-ab-hidden="true"] {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
      </style>
    `;
    
    $('head').append(forceVisibleCSS);
    console.log('✅ Added force-visible CSS override');

    // モバイル最適化の自動注入
    console.log('📱 Adding mobile optimization...');
    
    // 1. Viewport メタタグを追加または更新
    const existingViewport = $('meta[name="viewport"]');
    if (existingViewport.length === 0) {
      $('head').prepend('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">');
      console.log('✅ Added viewport meta tag');
    } else {
      existingViewport.attr('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
      console.log('✅ Updated viewport meta tag');
    }
    
    // 2. モバイル対応CSSを追加
    const mobileCSS = `
      <style id="mobile-optimization">
        /* モバイル最適化CSS */
        @media (max-width: 768px) {
          /* 基本的なレスポンシブ設定 */
          body {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            overflow-x: hidden !important;
          }
          
          /* 画像のレスポンシブ化 */
          img {
            max-width: 100% !important;
            height: auto !important;
          }
          
          /* テーブルのレスポンシブ化 */
          table {
            max-width: 100% !important;
            overflow-x: auto !important;
            display: block !important;
          }
          
          /* 固定幅要素の制限 */
          * {
            max-width: 100vw !important;
          }
          
          /* フォントサイズの調整 */
          body, p, div, span {
            font-size: 16px !important;
            line-height: 1.6 !important;
          }
          
          /* ボタンやリンクのタップ領域拡大 */
          a, button {
            min-height: 44px !important;
            min-width: 44px !important;
            display: inline-block !important;
          }
          
          /* 横スクロール防止 */
          html, body {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
          
          /* iframe のレスポンシブ化 */
          iframe {
            max-width: 100% !important;
          }
        }
      </style>
    `;
    
    // 既存のモバイル最適化CSSを削除して新しいものを追加
    $('#mobile-optimization').remove();
    $('head').append(mobileCSS);
    console.log('✅ Added mobile responsive CSS');

    html = $.html();

    // 色抽出処理
    console.log('🎨 Extracting colors from website...');
    const topColors = extractTopColors($);
    console.log(`✅ Extracted top ${topColors.length} colors:`, topColors);

    // 一時的なIDを生成してHTMLを保存（プレビュー用）
    const previewId = crypto.randomBytes(16).toString('hex');
    tempHtmlStorage.set(previewId, {
      html: html,
      timestamp: Date.now(),
      baseUrl: resolvedBaseUrl
    });
    console.log(`💾 Stored preview HTML with ID: ${previewId}`);

    const responseData = {
      success: true,
      html: html,
      previewId: previewId, // クライアントがiframeで使用
      baseUrl: resolvedBaseUrl || 'N/A',
      fetchMethod: fetchMethod,
      topColors: topColors, // 抽出した色情報を追加
      stats: {
        totalImages: imageUrls.length,
        domain: targetUrl ? targetUrl.hostname : 'manual-input'
      }
    };

    if (fetchMethod === 'manual-input') {
      responseData.message = `✅ 手動入力されたHTMLを処理しました`;
    } else if (fetchMethod !== 'standard') {
      responseData.message = `ℹ️ 通常の方法で取得できなかったため、別のUser-Agentを使用しました（${fetchMethod}）`;
    }

    if (fetchWarning) {
      responseData.warning = fetchWarning;
    }

    if (proxyImages && imageUrls.length > 0) {
      responseData.imageUrls = imageUrls;
      if (!responseData.message) {
        responseData.message = `${imageUrls.length}個の画像URLを検出しました。`;
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching website:', error.message);
    
    let errorCode = 'FETCH_ERROR';
    let userMessage = 'ウェブサイトの取得に失敗しました';
    
    if (error.code === 'ENOTFOUND') {
      errorCode = 'DNS_ERROR';
      userMessage = 'ウェブサイトが見つかりません。URLを確認してください。';
    } else if (error.code === 'ETIMEDOUT') {
      errorCode = 'TIMEOUT';
      userMessage = 'リクエストがタイムアウトしました。サイトの応答が遅すぎます。';
    } else if (error.response) {
      errorCode = `HTTP_${error.response.status}`;
      userMessage = `サーバーがエラーを返しました（${error.response.status}）`;
    }
    
    res.status(500).json({
      error: userMessage,
      code: errorCode,
      details: error.message
    });
  }
});

// プレビュー用HTMLを配信するエンドポイント
app.get('/api/preview/:previewId', (req, res) => {
  const { previewId } = req.params;
  
  const data = tempHtmlStorage.get(previewId);
  
  if (!data) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Preview Not Found</title>
      </head>
      <body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h1>❌ プレビューが見つかりません</h1>
        <p>このプレビューは期限切れか、存在しません。</p>
        <p><small>プレビューは30分後に自動的に削除されます。</small></p>
      </body>
      </html>
    `);
  }
  
  console.log(`📺 Serving preview: ${previewId}`);
  
  // HTMLを配信（適切なContent-Typeヘッダーを設定）
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.send(data.html);
});

// HTMLをクラウドホスティング（公開用）
app.post('/api/host-html', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ 
        error: 'HTMLが指定されていません',
        code: 'MISSING_HTML'
      });
    }
    
    // ランダムなホストIDを生成（より長く、推測しにくいもの）
    const hostId = crypto.randomBytes(24).toString('hex');
    
    // HTMLを保存（3日間）
    hostedHtmlStorage.set(hostId, {
      html: html,
      timestamp: Date.now(),
      accessCount: 0
    });
    
    console.log(`☁️  Hosted HTML with ID: ${hostId} (expires in 3 days)`);
    
    // 公開URLを生成（サンドボックス環境対応）
    // X-Forwarded-Hostヘッダーを優先的に使用（プロキシ環境）
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    
    // デバッグログ
    console.log('🔍 Headers:', {
      'x-forwarded-host': req.get('x-forwarded-host'),
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      'host': req.get('host'),
      'protocol': req.protocol
    });
    
    // サンドボックス環境の場合は常にHTTPSを使用
    const finalProtocol = host.includes('sandbox.novita.ai') ? 'https' : protocol;
    const publicUrl = `${finalProtocol}://${host}/view/${hostId}`;
    
    console.log(`🌐 Public URL generated: ${publicUrl}`);
    
    res.json({
      success: true,
      hostId: hostId,
      url: publicUrl,
      expiresIn: '3 days',
      expiresInHours: 72,
      message: 'HTMLを3日間公開しました'
    });
    
  } catch (error) {
    console.error('Error hosting HTML:', error.message);
    res.status(500).json({
      error: 'HTMLのホスティングに失敗しました',
      details: error.message
    });
  }
});

// ホスティングされたHTMLを配信
app.get('/view/:hostId', (req, res) => {
  const { hostId } = req.params;
  
  const data = hostedHtmlStorage.get(hostId);
  
  if (!data) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Page Not Found</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
          }
          .container {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
          }
          h1 { margin-top: 0; color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ ページが見つかりません</h1>
          <p>このページは期限切れか、存在しません。</p>
          <p><small>公開されたHTMLは3日後に自動的に削除されます。</small></p>
        </div>
      </body>
      </html>
    `);
  }
  
  // アクセスカウントを増加
  data.accessCount++;
  console.log(`🌐 Serving hosted HTML: ${hostId} (Access count: ${data.accessCount})`);
  
  // HTMLを配信
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ
  res.send(data.html);
});

// SlackでHTMLを共有（旧エンドポイント - 後方互換性のため維持）
app.post('/api/send-slack', async (req, res) => {
  try {
    const { webhookUrl, html, message } = req.body;
    
    if (!webhookUrl || !html) {
      return res.status(400).json({ 
        error: 'Webhook URLとHTMLが必要です',
        code: 'MISSING_PARAMS'
      });
    }
    
    // HTMLをホスティング
    const hostId = crypto.randomBytes(24).toString('hex');
    hostedHtmlStorage.set(hostId, {
      html: html,
      timestamp: Date.now(),
      accessCount: 0,
      sharedVia: 'slack'
    });
    
    // 公開URLを生成（サンドボックス環境対応）
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    
    // サンドボックス環境の場合は常にHTTPSを使用
    const finalProtocol = host.includes('sandbox.novita.ai') ? 'https' : protocol;
    const publicUrl = `${finalProtocol}://${host}/view/${hostId}`;
    
    console.log(`💬 Slack send requested, URL: ${publicUrl}`);
    
    // Slackにメッセージを送信
    const slackMessage = {
      text: message || 'HTMLファイルを共有します',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📄 HTMLファイルの共有*\n${message || 'Firework AIFAQ埋め込み済みのHTMLファイルです'}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔗 *リンク:* <${publicUrl}|HTMLを開く>\n⏰ *有効期限:* 24時間`
          }
        }
      ]
    };
    
    const response = await axios.post(webhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      res.json({
        success: true,
        message: 'Slackに送信しました',
        url: publicUrl
      });
    } else {
      throw new Error(`Slack API returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error sending to Slack:', error.message);
    res.status(500).json({
      error: 'Slack送信に失敗しました',
      details: error.message,
      suggestion: 'Webhook URLが正しいか確認してください'
    });
  }
});

// Slackに既にホスティング済みのURLを送信（新エンドポイント）
app.post('/api/send-to-slack', async (req, res) => {
  // 必ずJSONを返すように設定
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { webhookUrl, url, websiteUrl, message } = req.body;
    
    console.log('📥 Received Slack send request:', {
      hasWebhookUrl: !!webhookUrl,
      hasUrl: !!url,
      websiteUrl: websiteUrl || 'N/A',
      hasMessage: !!message
    });
    
    if (!webhookUrl) {
      console.warn('❌ Missing webhook URL');
      return res.status(400).json({ 
        success: false,
        error: 'Webhook URLが必要です',
        code: 'MISSING_WEBHOOK_URL'
      });
    }
    
    if (!url) {
      console.warn('❌ Missing hosting URL');
      return res.status(400).json({ 
        success: false,
        error: 'ホスティングURLが必要です',
        code: 'MISSING_HOSTING_URL'
      });
    }
    
    console.log(`💬 Sending to Slack - URL: ${url}, Website: ${websiteUrl || 'N/A'}`);
    
    // カスタムメッセージがある場合はそれを使用、なければデフォルトメッセージ
    const displayMessage = message || 
      (websiteUrl ? `${websiteUrl}用に生成したモックアップ画面が作成できました。` : 'Firework埋め込み済みのHTMLファイルです');
    
    // Slackにメッセージを送信
    const slackMessage = {
      text: displayMessage,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📄 ${displayMessage}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔗 *リンク:* <${url}|HTMLを開く>\n⏰ *有効期限:* 3日間`
          }
        }
      ]
    };
    
    console.log('📤 Sending message to Slack...');
    
    const response = await axios.post(webhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
    
    console.log(`📨 Slack response status: ${response.status}`);
    
    if (response.status === 200 || response.data === 'ok') {
      console.log('✅ Slack送信成功');
      return res.json({
        success: true,
        message: 'Slackに送信しました',
        url: url
      });
    } else {
      console.warn(`⚠️ Slack returned non-200 status: ${response.status}`);
      throw new Error(`Slack API returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error sending to Slack:', error.message);
    console.error('Error details:', {
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response'
    });
    
    // より詳細なエラー情報を返す
    let errorMessage = 'Slack送信に失敗しました';
    let suggestion = 'Webhook URLが正しいか確認してください';
    
    if (error.response) {
      errorMessage = `Slack APIがエラーを返しました (${error.response.status})`;
      suggestion = JSON.stringify(error.response.data) || suggestion;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Slack APIへの接続がタイムアウトしました';
      suggestion = 'ネットワーク接続を確認してください';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Slack APIに接続できません';
      suggestion = 'Webhook URLが正しいか確認してください';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Slack APIへの接続が拒否されました';
      suggestion = 'ネットワーク設定を確認してください';
    }
    
    // 必ずJSONを返す
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
      suggestion: suggestion
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
