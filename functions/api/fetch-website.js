export async function onRequestPost(context) {
  try {
    const { url } = await context.request.json();

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'URLが指定されていません'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // URLの検証
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: '無効なURLです'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // HTTPリクエストを送信
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      timeout: 10000
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `HTTPエラー: ${response.status} ${response.statusText}`
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const html = await response.text();

    // 簡易的なURL変換（cheerioの代わり）
    let modifiedHtml = html;
    const baseUrl = targetUrl.origin;

    // 相対URLを絶対URLに変換
    modifiedHtml = modifiedHtml
      .replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`)
      .replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`)
      .replace(/href='\/([^']*)'/g, `href='${baseUrl}/$1'`)
      .replace(/src='\/([^']*)'/g, `src='${baseUrl}/$1'`);

    return new Response(JSON.stringify({
      success: true,
      html: modifiedHtml,
      baseUrl: targetUrl.toString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '不明なエラーが発生しました'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
