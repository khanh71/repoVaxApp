// =============================================================================
// CONFIGURATION & METADATA
// =============================================================================

function getManifest() {
    return JSON.stringify({
        "id": "vlxx",
        "name": "VLXX",
        "version": "1.1.0",
        "baseUrl": "https://vlxx.bz",
        "iconUrl": "https://raw.githubusercontent.com/youngbi/repo/main/plugins/vlxx.ico",
        "isEnabled": true,
        "isAdult": true,
        "type": "MOVIE",
        "playerType": "embed",
        "layoutType": "HORIZONTAL"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: 'jav', title: 'Phim JAV', type: 'Horizontal', path: 'category' },
        { slug: 'phim-sex-hay', title: 'Phim Sex Hay', type: 'Horizontal', path: 'category' },
        { slug: 'vietsub', title: 'Phim Sex Vietsub', type: 'Horizontal', path: 'category' },
        { slug: 'khong-che', title: 'Không Che', type: 'Horizontal', path: 'category' },
        { slug: 'home', title: 'Phim Sex Mới', type: 'Grid', path: '' }
    ]);
}

function getPrimaryCategories() {
    return JSON.stringify([
        { name: 'JAV', slug: 'jav' },
        { name: 'Phim Sex Hay', slug: 'phim-sex-hay' },
        { name: 'Vietsub', slug: 'vietsub' },
        { name: 'Không Che', slug: 'khong-che' },
        { name: 'Sex Học Sinh', slug: 'hoc-sinh' },
        { name: 'Vụng Trộm', slug: 'vung-trom' },
        { name: 'Phim Cấp 3', slug: 'cap-3' },
        { name: 'Mỹ - Châu Âu', slug: 'chau-au' },
        { name: 'XVIDEOS', slug: 'xvideos' },
        { name: 'XNXX', slug: 'xnxx' },
        { name: 'XXX', slug: 'xxx' }
    ]);
}

function getFilterConfig() {
    return JSON.stringify({});
}

// =============================================================================
// URL GENERATION
// =============================================================================

function getUrlList(slug, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    var baseUrl = "https://vlxx.bz";

    if (slug === '' || slug === 'home') {
        if (page > 1) {
            return baseUrl + "/new/" + page + "/";
        }
        return baseUrl + "/";
    }

    if (page > 1) {
        return baseUrl + "/" + slug + "/" + page + "/";
    }
    return baseUrl + "/" + slug + "/";
}

function getUrlSearch(keyword, filtersJson) {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    var safeKeyword = encodeURIComponent(keyword.replace(/\s+/g, '-'));
    var url = "https://vlxx.bz/search/" + safeKeyword + "/";
    if (page > 1) {
        url = "https://vlxx.bz/search/" + safeKeyword + "/" + page + "/";
    }
    return url;
}

function getUrlDetail(slug) {
    if (!slug) return "";
    if (slug.indexOf("http") === 0) return slug;
    // ensure starting slash
    if (slug.charAt(0) !== '/') slug = '/' + slug;
    return "https://vlxx.bz" + slug;
}

function getUrlCategories() { return ""; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }

// =============================================================================
// PARSERS
// =============================================================================

function parseListResponse(html) {
    var items = [];
    var blocks = html.split('class="video-item"');

    for (var i = 1; i < blocks.length; i++) {
        var block = blocks[i];

        var linkMatch = block.match(/href=["']([^"']+)["']/i);
        var link = linkMatch ? linkMatch[1] : "";

        var titleMatch = block.match(/title=["']([^"']+)["']/i);
        var title = titleMatch ? titleMatch[1] : "";

        // lazyload uses data-original
        var thumbMatch = block.match(/data-original=["']([^"']+)["']/i);
        if (!thumbMatch) {
            thumbMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i);
        }
        var thumb = thumbMatch ? thumbMatch[1] : "";

        // Exclude base64 placeholder images
        if (thumb && thumb.indexOf("data:image") === 0) thumb = "";

        if (link && title) {
            items.push({
                id: link,
                title: title.replace(/<[^>]+>/g, '').trim(),
                posterUrl: thumb,
                backdropUrl: thumb,
                year: 0
            });
        }
    }

    var currentPage = 1;
    var totalPages = 1;

    var cpMatch = html.match(/<a[^>]*class=["'][^"']*active[^"']*["'][^>]*data-page=["'](\d+)["']/i);
    if (cpMatch) {
        currentPage = parseInt(cpMatch[1]);
    }

    var lpRegex = /<a[^>]*data-page=["'](\d+)["'][^>]*>[0-9]+<\/a>/gi;
    var lpMatch;
    while ((lpMatch = lpRegex.exec(html)) !== null) {
        var pageNum = parseInt(lpMatch[1]);
        if (pageNum > totalPages) totalPages = pageNum;
    }
    if (currentPage > totalPages) totalPages = currentPage;

    return JSON.stringify({
        items: items,
        pagination: {
            currentPage: currentPage,
            totalPages: totalPages
        }
    });
}

function parseSearchResponse(html) {
    return parseListResponse(html);
}

function parseMovieDetail(html) {
    try {
        var titleMatch = html.match(/<h2[^>]*page-title[^>]*>([\s\S]*?)<\/h2>/i);
        var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        var descMatch = html.match(/<div[^>]*class=["']video-description["'][^>]*>([\s\S]*?)<\/div>/i);
        var description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        var codeMatch = html.match(/<span[^>]*class=["']video-code["'][^>]*>([\s\S]*?)<\/span>/i);
        var code = codeMatch ? codeMatch[1].replace(/<[^>]+>/g, '').trim() : "";

        if (code && title) {
            title = "(" + code + ") " + title;
        }

        var ogImg = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        var posterUrl = ogImg ? ogImg[1] : "";

        var castsArr = [];
        var castRegex = /<div[^>]*class=["']actress-tag["'][^>]*><a[^>]*>([\s\S]*?)<\/a>/gi;
        var castMatch;
        while ((castMatch = castRegex.exec(html)) !== null) {
            castsArr.push(castMatch[1].replace(/<[^>]+>/g, '').trim());
        }

        var categoriesArr = [];
        var catSectionMatch = html.match(/<div[^>]*class=["']category-tag["'][^>]*>([\s\S]*?)<\/div>/i);
        if (catSectionMatch) {
            var catSection = catSectionMatch[1];
            var catRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
            var cmMatch;
            while ((cmMatch = catRegex.exec(catSection)) !== null) {
                categoriesArr.push(cmMatch[1].replace(/<[^>]+>/g, '').trim());
            }
        }

        // =====================================================================
        // STRATEGY: Extract video URL cho WebView embed
        // Trang vlxx load iframe qua AJAX POST (App không hỗ trợ POST).
        // Ta trích xuất URL canonical của trang để WebView tự load và chạy JS.
        // PlayerViewModel fallback: nếu getStreamLink trả rỗng và episode.id
        // là URL http → dùng làm WebView embed URL.
        // =====================================================================

        var servers = [];

        // Lấy URL canonical (hoặc og:url) từ trang
        var canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
        var pageUrl = canonicalMatch ? canonicalMatch[1] : "";

        // Fallback: trích data-id để xây dựng URL
        if (!pageUrl) {
            var dataIdMatch = html.match(/data-id=["'](\d+)["']/i);
            if (dataIdMatch) {
                pageUrl = "https://vlxx.bz/" + dataIdMatch[1];
            }
        }

        // Trích xuất thông tin server từ HTML
        var serverButtons = html.match(/onclick=["']server\(\d+,\d+\)["']/gi);
        if (serverButtons && serverButtons.length > 0) {
            // Chỉ cần 1 entry vì video chỉ có 1 tập (Full)
            // episode.id = full page URL → WebView sẽ load trang và tự chạy JS
            if (pageUrl) {
                servers.push({
                    name: "VLStream",
                    episodes: [{
                        id: pageUrl,
                        name: "Full",
                        slug: "full"
                    }]
                });
            }
        }

        // Fallback nếu không tìm thấy server buttons nhưng có pageUrl
        if (servers.length === 0 && pageUrl) {
            servers.push({
                name: "VLStream",
                episodes: [{
                    id: pageUrl,
                    name: "Full",
                    slug: "full"
                }]
            });
        }

        return JSON.stringify({
            id: "",
            title: title.replace(/<[^>]+>/g, '').trim(),
            posterUrl: posterUrl,
            backdropUrl: posterUrl,
            description: description,
            servers: servers,
            quality: "HD",
            lang: "Vietsub",
            year: 0,
            rating: 0,
            casts: castsArr.join(", "),
            director: "",
            country: "",
            category: categoriesArr.join(", "),
            status: code || "Full"
        });

    } catch (e) {
        return "null";
    }
}

// parseDetailResponse: App gọi hàm này với HTML từ getUrlDetail(episode.id)
// Vì episode.id = page URL, HTML sẽ là trang detail (không có iframe)
// → Trả về empty URL để App fallback dùng episode.id cho WebView
function parseDetailResponse(html, fallbackUrl) {
    try {
        // Thử trích xuất trực tiếp nếu có thể (trường hợp HTML có sẵn iframe)
        var iframeMatch = html.match(/<iframe[^>]*src=["']([^"']*vlstream[^"']*)["']/i);
        if (iframeMatch) {
            return JSON.stringify({
                url: iframeMatch[1],
                isEmbed: true,
                headers: {
                    "Referer": "https://vlxx.bz/"
                }
            });
        }

        // Trả URL rỗng → App sẽ fallback dùng episode.id (trang gốc) cho WebView embed
        // WebView sẽ load trang, JavaScript tự chạy AJAX, inject iframe & player
        return JSON.stringify({
            url: "",
            isEmbed: false,
            headers: {}
        });
    } catch (error) {
        return JSON.stringify({ url: "", isEmbed: false, headers: {} });
    }
}

// parseEmbedResponse: Trích xuất stream URL từ embed page (vlstream.net)
// Nếu App fetch được embed page thành công
function parseEmbedResponse(html, url) {
    try {
        // Tìm file .vl từ sources array hoặc window.$$ops
        var fileMatch = html.match(/"file"\s*:\s*"(https?[^"]+\.vl[^"]*)"/i);
        if (fileMatch) {
            return JSON.stringify({
                url: fileMatch[1],
                isEmbed: false,
                headers: {
                    "Referer": "https://play.vlstream.net/"
                }
            });
        }

        var sourcesMatch = html.match(/sources\s*:\s*(\[[^\]]+\])/i);
        if (sourcesMatch) {
            try {
                var sources = JSON.parse(sourcesMatch[1]);
                if (sources && sources.length > 0 && sources[0].file) {
                    return JSON.stringify({
                        url: sources[0].file,
                        isEmbed: false,
                        headers: {
                            "Referer": "https://play.vlstream.net/"
                        }
                    });
                }
            } catch (e) {
                var regexFile = sourcesMatch[1].match(/"file"\s*:\s*"([^"]+)"/i);
                if (regexFile) {
                    return JSON.stringify({
                        url: regexFile[1],
                        isEmbed: false,
                        headers: {
                            "Referer": "https://play.vlstream.net/"
                        }
                    });
                }
            }
        }

        return JSON.stringify({ url: url || "", isEmbed: true, headers: {} });
    } catch (e) {
        return JSON.stringify({ url: url || "", isEmbed: true, headers: {} });
    }
}
