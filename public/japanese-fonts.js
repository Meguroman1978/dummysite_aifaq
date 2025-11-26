// Japanese Google Fonts configuration
const JAPANESE_FONTS = [
    { name: 'Noto Sans JP', family: 'Noto Sans JP' },
    { name: 'Noto Serif JP', family: 'Noto Serif JP' },
    { name: 'M PLUS Rounded 1c', family: 'M PLUS Rounded 1c' },
    { name: 'M PLUS 1p', family: 'M PLUS 1p' },
    { name: 'Sawarabi Gothic', family: 'Sawarabi Gothic' },
    { name: 'Sawarabi Mincho', family: 'Sawarabi Mincho' },
    { name: 'Kosugi', family: 'Kosugi' },
    { name: 'Kosugi Maru', family: 'Kosugi Maru' },
    { name: 'Zen Maru Gothic', family: 'Zen Maru Gothic' },
    { name: 'Zen Kaku Gothic New', family: 'Zen Kaku Gothic New' },
    { name: 'Zen Old Mincho', family: 'Zen Old Mincho' },
    { name: 'Shippori Mincho', family: 'Shippori Mincho' },
    { name: 'Shippori Mincho B1', family: 'Shippori Mincho B1' },
    { name: 'Klee One', family: 'Klee One' },
    { name: 'RocknRoll One', family: 'RocknRoll One' },
    { name: 'Hachi Maru Pop', family: 'Hachi Maru Pop' },
    { name: 'Yusei Magic', family: 'Yusei Magic' },
    { name: 'Potta One', family: 'Potta One' },
    { name: 'Reggae One', family: 'Reggae One' },
    { name: 'Stick', family: 'Stick' },
    { name: 'Train One', family: 'Train One' },
    { name: 'DotGothic16', family: 'DotGothic16' },
    { name: 'Rampart One', family: 'Rampart One' },
    { name: 'Kaisei Decol', family: 'Kaisei Decol' },
    { name: 'Kaisei Opti', family: 'Kaisei Opti' },
    { name: 'Kaisei Tokumin', family: 'Kaisei Tokumin' },
    { name: 'Kaisei HarunoUmi', family: 'Kaisei HarunoUmi' },
    { name: 'Murecho', family: 'Murecho' },
    { name: 'BIZ UDGothic', family: 'BIZ UDGothic' },
    { name: 'BIZ UDMincho', family: 'BIZ UDMincho' },
    { name: 'BIZ UDPGothic', family: 'BIZ UDPGothic' },
    { name: 'BIZ UDPMincho', family: 'BIZ UDPMincho' },
    { name: 'Dela Gothic One', family: 'Dela Gothic One' },
    { name: 'Yomogi', family: 'Yomogi' },
    { name: 'Mochiy Pop One', family: 'Mochiy Pop One' },
    { name: 'Mochiy Pop P One', family: 'Mochiy Pop P One' },
    { name: 'Kiwi Maru', family: 'Kiwi Maru' },
    { name: 'New Tegomin', family: 'New Tegomin' },
    { name: 'Shizuru', family: 'Shizuru' },
    { name: 'Yuji Syuku', family: 'Yuji Syuku' },
    { name: 'Yuji Boku', family: 'Yuji Boku' },
    { name: 'Yuji Mai', family: 'Yuji Mai' }
];

// Dynamically load Google Fonts
function loadGoogleFont(fontFamily) {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
    
    // Check if font is already loaded
    const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
    if (existingLink) return;
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
}

// Initialize font selector
function initializeFontSelector() {
    const fontSelect = document.getElementById('font-select');
    if (!fontSelect) return;
    
    // Set default placeholder text
    fontSelect.innerHTML = '<option value="" disabled selected>ふぉんと・フォント・Font！？</option>';
    
    // Add all Japanese fonts
    JAPANESE_FONTS.forEach(font => {
        const option = document.createElement('option');
        option.value = font.family;
        option.textContent = font.name;
        option.style.fontFamily = `"${font.family}", sans-serif`;
        fontSelect.appendChild(option);
        
        // Preload the font for the option
        loadGoogleFont(font.family);
    });
    
    // Handle font selection
    fontSelect.addEventListener('change', function() {
        const selectedFont = this.value;
        if (selectedFont) {
            loadGoogleFont(selectedFont);
            applyFontToPreview(selectedFont);
        }
    });
}

// Apply selected font to preview
function applyFontToPreview(fontFamily) {
    const preview = document.getElementById('website-preview');
    if (!preview || !preview.contentDocument) return;
    
    try {
        const previewDoc = preview.contentDocument || preview.contentWindow.document;
        
        // Add font link to preview
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
        let fontLink = previewDoc.querySelector(`link[href="${fontUrl}"]`);
        
        if (!fontLink) {
            fontLink = previewDoc.createElement('link');
            fontLink.rel = 'stylesheet';
            fontLink.href = fontUrl;
            previewDoc.head.appendChild(fontLink);
        }
        
        // Apply font to body and common text elements
        const style = previewDoc.createElement('style');
        style.textContent = `
            body, p, h1, h2, h3, h4, h5, h6, span, div, a, button, input, textarea, select {
                font-family: "${fontFamily}", sans-serif !important;
            }
        `;
        previewDoc.head.appendChild(style);
        
        console.log(`✅ Font "${fontFamily}" applied to preview`);
    } catch (error) {
        console.error('Failed to apply font to preview:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFontSelector);
} else {
    initializeFontSelector();
}
