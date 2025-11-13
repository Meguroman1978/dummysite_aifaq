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

// ウェブサイトを取得するエンドポイント（画像プロキシオプション付き）
app.post('/api/fetch-website', async (req, res) => {
  try {
    const { url, proxyImages = false } = req.body;
    
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

    console.log(`Fetching: ${url} (proxyImages: ${proxyImages})`);

    // ウェブサイトを取得
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    let html = response.data;
    const $ = cheerio.load(html);

    // 相対URLを絶対URLに変換
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
    
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

    // 画像の処理
    const imageUrls = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      const dataSrc = $(elem).attr('data-src'); // lazy loading対応
      
      let imageUrl = src || dataSrc;
      
      if (imageUrl && !imageUrl.startsWith('data:')) {
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('//')) {
          try {
            imageUrl = new URL(imageUrl, baseUrl).href;
          } catch (e) {
            console.warn(`Failed to convert image src: ${imageUrl}`);
          }
        }
        
        // //で始まるURLを処理
        if (imageUrl.startsWith('//')) {
          imageUrl = targetUrl.protocol + imageUrl;
        }
        
        $(elem).attr('src', imageUrl);
        $(elem).attr('data-original-src', imageUrl); // オリジナルURLを保存
        
        if (proxyImages) {
          imageUrls.push(imageUrl);
        }
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
      stats: {
        totalImages: imageUrls.length,
        domain: targetUrl.hostname
      }
    };

    if (proxyImages && imageUrls.length > 0) {
      responseData.imageUrls = imageUrls;
      responseData.message = `${imageUrls.length}個の画像URLを検出しました。クライアント側で画像プロキシを使用してください。`;
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
