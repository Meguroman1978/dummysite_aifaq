const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
    const { url, proxyImages = false, usePuppeteer = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URLが指定されていません',
        code: 'MISSING_URL'
      });
    }

    // URLの検証
    let targetUrl;
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

    let html;
    let fetchMethod = 'standard';
    let fetchWarning = null;
    
    try {
      // まず標準的な方法で試行
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
          suggestion = 'このウェブサイトはBot対策が厳しく、複写できません。\n\n代替案:\n1. サイト管理者に連絡して許可を得る\n2. より軽量なページを試す\n3. 別のURLを使用する';
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

    const $ = cheerio.load(html);

    // 相対URLを絶対URLに変換
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
    
    // <base> タグを追加または更新（404エラー対策）
    if ($('base').length === 0) {
      $('head').prepend(`<base href="${baseUrl}/">`);
    } else {
      $('base').attr('href', `${baseUrl}/`);
    }
    
    // エラーハンドリングスクリプトを追加（404/403エラーを無視）
    const errorHandlingScript = `
      <script>
        // リソース読み込みエラーを無視
        window.addEventListener('error', function(e) {
          if (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
            e.preventDefault();
            console.warn('リソース読み込みエラーを無視:', e.target.src || e.target.href);
          }
        }, true);
      </script>
    `;
    $('head').append(errorHandlingScript);
    
    // ヘルパー関数：URLを絶対パスに変換
    function toAbsoluteUrl(url) {
      if (!url || url.startsWith('data:')) return null;
      
      if (url.startsWith('//')) {
        return targetUrl.protocol + url;
      } else if (url.startsWith('http')) {
        return url;
      } else {
        try {
          return new URL(url, baseUrl).href;
        } catch (e) {
          console.warn(`Failed to convert URL: ${url}`);
          return null;
        }
      }
    }
    
    // すべてのリンクを絶対URLに変換
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('javascript:') && !href.startsWith('#')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          $(elem).attr('href', absoluteUrl);
        } catch (e) {
          console.warn(`Failed to convert href: ${href}`);
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
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          $(elem).attr('href', absoluteUrl);
        } catch (e) {
          console.warn(`Failed to convert stylesheet href: ${href}`);
        }
      } else if (href && href.startsWith('//')) {
        $(elem).attr('href', targetUrl.protocol + href);
      }
    });

    // JavaScriptファイルを絶対URLに変換
    $('script[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          $(elem).attr('src', absoluteUrl);
        } catch (e) {
          console.warn(`Failed to convert script src: ${src}`);
        }
      } else if (src && src.startsWith('//')) {
        $(elem).attr('src', targetUrl.protocol + src);
      }
    });

    // その他のリソース（favicon等）
    $('link[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          $(elem).attr('href', absoluteUrl);
        } catch (e) {
          console.warn(`Failed to convert link href: ${href}`);
        }
      } else if (href && href.startsWith('//')) {
        $(elem).attr('href', targetUrl.protocol + href);
      }
    });

    // background-imageも処理
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      if (style && style.includes('url(')) {
        const updatedStyle = style.replace(/url\(['"]?([^'")\s]+)['"]?\)/g, (match, url) => {
          if (!url.startsWith('http') && !url.startsWith('//') && !url.startsWith('data:')) {
            try {
              const absoluteUrl = new URL(url, baseUrl).href;
              return `url('${absoluteUrl}')`;
            } catch (e) {
              return match;
            }
          } else if (url.startsWith('//')) {
            return `url('${targetUrl.protocol + url}')`;
          }
          return match;
        });
        $(elem).attr('style', updatedStyle);
      }
    });

    html = $.html();

    const responseData = {
      success: true,
      html: html,
      baseUrl: baseUrl,
      fetchMethod: fetchMethod,
      stats: {
        totalImages: imageUrls.length,
        domain: targetUrl.hostname
      }
    };

    if (fetchMethod !== 'standard') {
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

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
