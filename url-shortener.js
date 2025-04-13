/**
 * URL Shortener Module for SmartBlock
 * Uses TinyURL API to generate shareable short links
 */

const SHORTENER_CONFIG = {
    TINYURL_API: "https://api.tinyurl.com/create",
    STORAGE_STATS_KEY: "shortenerStats"
};

let shortenerMetrics = {
    urlsShortened: 0,
    urlsAccessed: 0,
    charactersReduced: 0
};

/**
 * Initialize the URL shortener (load stats only)
 */
export async function initializeUrlShortener() {
    const { shortenerStats } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_STATS_KEY);
    if (shortenerStats) {
        shortenerMetrics = shortenerStats;
    }
}

/**
 * Shorten URL using TinyURL API (no API key required for public access)
 * @param {string} url - Original URL to shorten
 * @returns {Promise<string>} - Shortened URL
 */
const TINYURL_API_KEY = "kqzNnxD7t3nXDx8gXUVjxsRuTLeRAieXr5uBXIMuMpo8DPIWLuCx9JsjnfuP"; // Replace this with your actual key

export async function shortenUrl(url) {
    try {
        const res = await fetch(SHORTENER_CONFIG.TINYURL_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TINYURL_API_KEY}`
            },
            body: JSON.stringify({
                url,
                domain: "tinyurl.com"
            })
        });

        const data = await res.json();

        if (!data.data || !data.data.tiny_url) {
            console.error("TinyURL API Error:", data.errors);
            throw new Error(data.errors?.[0]?.message || "TinyURL shortening failed");
        }

        const shortUrl = data.data.tiny_url;

        shortenerMetrics.urlsShortened++;
        shortenerMetrics.charactersReduced += url.length - shortUrl.length;
        await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_STATS_KEY]: shortenerMetrics });

        return shortUrl;
    } catch (error) {
        console.error("Shorten URL error:", error);
        throw error;
    }
}


/**
 * Get stored shortener statistics
 * @returns {Promise<Object>}
 */
export async function getShortenerStats() {
    const { shortenerStats = { urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 } } =
        await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_STATS_KEY);
    return shortenerStats;
}

/**
 * Reset stored shortener statistics
 * @returns {Promise<boolean>}
 */
export async function resetShortenerStats() {
    shortenerMetrics = { urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 };
    await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_STATS_KEY]: shortenerMetrics });
    return true;
}

// Export for use in background.js or popup
export default {
    initialize: initializeUrlShortener,
    shortenUrl,
    getStats: getShortenerStats,
    resetStats: resetShortenerStats
};
