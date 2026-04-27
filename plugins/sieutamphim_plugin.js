// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "sieutamphim",
        "name": "Sưu Tầm Phim",
        "version": "1.0.0",
        "baseUrl": "https://www.sieutamphim.pro",
        "iconUrl": "https://www.sieutamphim.pro/favicon.ico",
        "isEnabled": true,
        "isAdult": false,
        "type": "VIDEO",
        "layoutType": "GRID",
        "playerType": "embed"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'phim-le', title: 'Phim Lẻ Mới', type: 'Grid', path: '/search/label/phim-le' },
        { slug: 'phim-bo', title: 'Phim Bộ Mới', type: 'Grid', path: '/search/label/phim-bo' },
        { slug: 'phim-moi', title: 'Phim Mới Cập Nhật', type: 'Grid', path: '/search/label/phim-moi' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'Phim Lẻ', slug: 'phim-le' },
        { name: 'Phim Bộ', slug: 'phim-bo' },
        { name: 'Hành Động', slug: 'hanh-dong' },
        { name: 'Viễn Tưởng', slug: 'vien-tuong' },
        { name: 'Hoạt Hình', slug: 'hoat-hinh' },
        { name: 'Lồng Tiếng', slug: 'long-tieng' },
        { name: 'Thuyết Minh', slug: 'thuyet-minh' }
    ]);
}

// =============================================================================
// SEARCH & LISTING
// =============================================================================

function parseSearchResponse(html, path) {
    try {
        var movies = [];
        // Tách từng item phim để parse cho chuẩn
        var items = html.split('class="col post-item"');
        for (var i = 1; i < items.length; i++) {
            var item = items[i];
            
            var linkMatch = item.match(/href="([^"]+)"/i);
            var posterMatch = item.match(/src="([^"]+)"/i);
            var titleMatch = item.match(/post-title[^>]*?>([\s\S]*?)<\/a>/i);
            var qualityMatch = item.match(/data-fulltext="([^"]*)"/i);
            
            if (linkMatch && titleMatch) {
                var title = titleMatch[1].replace(/<[^>]*>/g, "").trim();
                // Một số ảnh bị resize qua i0.wp.com hoặc i2.wp.com, ta lấy gốc nếu có thể
                var posterUrl = posterMatch ? posterMatch[1] : "";
                
                movies.push({
                    id: linkMatch[1],
                    title: title,
                    posterUrl: posterUrl,
                    link: linkMatch[1],
                    quality: (qualityMatch ? qualityMatch[1] : "").trim() || "HD"
                });
            }
        }
        return JSON.stringify(movies);
    } catch (error) { return "[]"; }
}

// =============================================================================
// MOVIE DETAIL
// =============================================================================

function parseDetailResponse(html, url) {
    try {
        var titleMatch = html.match(/<h1[^>]*class="entry-title"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/post-title[^>]*>([\s\S]*?)<\/h1>/i);
        var title = titleMatch ? titleMatch[1].trim() : "";
        
        var descMatch = html.match(/<div class="entry-content[^>]*>([\s\S]*?)<\/div>/i) || html.match(/from_the_blog_excerpt[^>]*>([\s\S]*?)<\/p>/i);
        var description = descMatch ? descMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        
        var posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i) || html.match(/<img[^>]*src="([^"]+)"[^>]*wp-post-image/i);
        var posterUrl = posterMatch ? posterMatch[1] : "";

        // Tìm danh sách tập phim (Servers)
        var servers = [];
        
        // Blogger site thường có danh sách tập trong các thẻ <a> hoặc button
        // Người dùng nói "Khi ấn vào nút player nó mới danh sách tập" 
        // -> Có thể danh sách tập nằm trong một div ẩn hoặc được nạp động.
        // Tôi sẽ thử tìm tất cả các link có tap= hoặc server=
        
        var serverMap = {};
        var epRegex = /<a[^>]*href="([^"]*?(\?|&)server=([^"&]+)(&tap=([^"&]+))?)"[^>]*>([\s\S]*?)<\/a>/g;
        var m;
        while ((m = epRegex.exec(html)) !== null) {
            var epUrl = m[1];
            if (!epUrl.startsWith('http')) {
                if (epUrl.startsWith('/')) epUrl = "https://www.sieutamphim.pro" + epUrl;
                else epUrl = url.split('?')[0] + epUrl;
            }
            var sName = m[3] || "Default";
            var epName = m[5] || m[6].replace(/<[^>]*>/g, "").trim() || "Full";
            
            if (!serverMap[sName]) serverMap[sName] = [];
            serverMap[sName].push({
                name: epName,
                slug: epUrl
            });
        }
        
        for (var s in serverMap) {
            servers.push({
                name: "Server " + s.toUpperCase(),
                episodes: serverMap[s]
            });
        }
        
        // Nếu không tìm thấy tập nào, tạo một tập mặc định từ URL hiện tại
        if (servers.length === 0) {
            servers.push({
                name: "Mặc định",
                episodes: [{ name: "Full", slug: url }]
            });
        }

        return JSON.stringify({
            id: url,
            title: title,
            posterUrl: posterUrl,
            description: description,
            servers: servers
        });
    } catch (error) { return "null"; }
}

// =============================================================================
// STREAM INFO
// =============================================================================

function getStreamInfo(html, url) {
    try {
        // Tìm iframe hoặc video trong trang player
        var iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"/i);
        if (iframeMatch) {
            var embedUrl = iframeMatch[1];
            if (embedUrl.startsWith('//')) embedUrl = "https:" + embedUrl;
            
            return JSON.stringify({
                url: embedUrl,
                isEmbed: true,
                headers: {
                    "Referer": "https://www.sieutamphim.pro/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                }
            });
        }
        
        // Nếu không có iframe, trả chính URL trang để Interceptor trong App tự xử lý
        return JSON.stringify({
            url: url,
            isEmbed: true,
            headers: {
                "Referer": "https://www.sieutamphim.pro/"
            }
        });
    } catch (error) { return "{}"; }
}
