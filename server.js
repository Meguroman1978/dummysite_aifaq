const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ウェブサイトを取得するエンドポイント
app.post('/api/fetch-website', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URLが指定されていません' });
    }

    // URLの検証
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: '無効なURLです' });
    }

    console.log(`Fetching: ${url}`);

    // ウェブサイトを取得
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    let html = response.data;
    const $ = cheerio.load(html);

    // 相対URLを絶対URLに変換
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;
    
    // すべてのリンクを絶対URLに変換
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        const absoluteUrl = new URL(href, baseUrl).href;
        $(elem).attr('href', absoluteUrl);
      }
    });

    // すべての画像を絶対URLに変換
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        const absoluteUrl = new URL(src, baseUrl).href;
        $(elem).attr('src', absoluteUrl);
      }
    });

    // CSSファイルを絶対URLに変換
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        const absoluteUrl = new URL(href, baseUrl).href;
        $(elem).attr('href', absoluteUrl);
      }
    });

    // JavaScriptファイルを絶対URLに変換
    $('script[src]').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//')) {
        const absoluteUrl = new URL(src, baseUrl).href;
        $(elem).attr('src', absoluteUrl);
      }
    });

    // その他のリソース（favicon等）
    $('link[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        const absoluteUrl = new URL(href, baseUrl).href;
        $(elem).attr('href', absoluteUrl);
      }
    });

    html = $.html();

    res.json({
      success: true,
      html: html,
      baseUrl: baseUrl
    });

  } catch (error) {
    console.error('Error fetching website:', error.message);
    res.status(500).json({
      error: 'ウェブサイトの取得に失敗しました',
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
