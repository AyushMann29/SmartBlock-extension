/**
 * URL Shortener Module for SmartBlock & Tracker Detector
 * Provides URL shortening functionality that respects user privacy
 */

// Configuration
const SHORTENER_CONFIG = {
    // Base domain for shortened URLs
    BASE_DOMAIN: "sb.link",
    
    // Hash length for shortened URLs
    HASH_LENGTH: 8,
    
    // Storage key for URL mappings
    STORAGE_KEY: "urlMappings",
    
    // Maximum number of URLs to store (prevent unlimited storage growth)
    MAX_STORED_URLS: 1000,
    
    // Default expiration time in days (0 = never expire)
    DEFAULT_EXPIRATION_DAYS: 0
};

// Analytics metrics
let shortenerMetrics = {
    urlsShortened: 0,
    urlsAccessed: 0,
    charactersReduced: 0
};

/**
 * Initialize the URL shortener module
 * @returns {Promise<void>}
 */
export async function initializeUrlShortener() {
    try {
        // Create context menu item for shortening URLs
        if (chrome.contextMenus) {
            chrome.contextMenus.create({
                id: "shortenUrl",
                title: "Shorten this URL",
                contexts: ["link", "page"]
            });
            
            // Handle context menu clicks
            chrome.contextMenus.onClicked.addListener((info, tab) => {
                if (info.menuItemId === "shortenUrl") {
                    const url = info.linkUrl || info.pageUrl;
                    shortenUrl(url)
                        .then(shortUrl => {
                            // Copy to clipboard
                            navigator.clipboard.writeText(shortUrl)
                                .then(() => {
                                    // Notify user
                                    chrome.notifications.create({
                                        type: "basic",
                                        iconUrl: "icon.png",
                                        title: "URL Shortened",
                                        message: `Shortened URL copied to clipboard: ${shortUrl}`
                                    });
                                })
                                .catch(console.error);
                        })
                        .catch(console.error);
                }
            });
        }
        
        // Load analytics metrics
        const { shortenerStats } = await chrome.storage.local.get("shortenerStats");
        if (shortenerStats) {
            shortenerMetrics = shortenerStats;
        }
        
        // Clean up expired URLs periodically
        chrome.alarms.create("cleanExpiredUrls", { periodInMinutes: 1440 }); // Daily
        chrome.alarms.onAlarm.addListener(alarm => {
            if (alarm.name === "cleanExpiredUrls") {
                cleanExpiredUrls().catch(console.error);
            }
        });
        
        // Handle URL redirection requests
        chrome.webRequest.onBeforeRequest.addListener(
            handleRedirection,
            { urls: [`*://${SHORTENER_CONFIG.BASE_DOMAIN}/*`] },
            ["blocking"]
        );
        
        console.log("URL shortener initialized");
        
    } catch (error) {
        console.error("Failed to initialize URL shortener:", error);
    }
}

/**
 * Shorten a URL and store the mapping
 * @param {string} url - URL to shorten
 * @param {number} expirationDays - Days until URL expires (0 = never)
 * @returns {Promise<string>} - Shortened URL
 */
export async function shortenUrl(url, expirationDays = SHORTENER_CONFIG.DEFAULT_EXPIRATION_DAYS) {
    try {
        // Validate URL
        new URL(url); // This will throw if URL is invalid
        
        // Generate short hash from URL
        const shortHash = await generateUniqueHash(url);
        
        // Calculate expiration date if applicable
        let expirationDate = null;
        if (expirationDays > 0) {
            expirationDate = Date.now() + (expirationDays * 24 * 60 * 60 * 1000);
        }
        
        // Store mapping
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        
        // Check if we need to prune old mappings to stay under storage limit
        if (Object.keys(urlMappings).length >= SHORTENER_CONFIG.MAX_STORED_URLS) {
            await pruneOldMappings();
        }
        
        // Store new mapping
        urlMappings[shortHash] = {
            originalUrl: url,
            created: Date.now(),
            expires: expirationDate,
            useCount: 0
        };
        
        await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_KEY]: urlMappings });
        
        // Update analytics
        shortenerMetrics.urlsShortened++;
        shortenerMetrics.charactersReduced += url.length - (shortHash.length + SHORTENER_CONFIG.BASE_DOMAIN.length + 8); // 8 for "https://"
        await chrome.storage.local.set({ shortenerStats: shortenerMetrics });
        
        // Return shortened URL
        const shortUrl = `https://${SHORTENER_CONFIG.BASE_DOMAIN}/${shortHash}`;
        return shortUrl;
    } catch (error) {
        console.error("URL shortening failed:", error);
        throw error;
    }
}

/**
 * Generate a unique hash for a URL
 * @param {string} url - URL to hash
 * @returns {Promise<string>} - Unique hash
 */
async function generateUniqueHash(url) {
    try {
        // Get existing mappings
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        
        // Check if URL is already shortened
        for (const [hash, mapping] of Object.entries(urlMappings)) {
            if (mapping.originalUrl === url) {
                return hash; // Return existing hash
            }
        }
        
        // Generate new hash using crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(url + Date.now()); // Add timestamp to reduce collisions
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        
        // Convert to base62 for shorter, URL-safe hash
        const base62Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let hash = '';
        for (let i = 0; i < SHORTENER_CONFIG.HASH_LENGTH; i++) {
            hash += base62Chars[hashArray[i] % 62];
        }
        
        // Check for collisions and regenerate if needed
        if (urlMappings[hash]) {
            // Simple collision resolution by adding a character
            hash = hash.substring(0, SHORTENER_CONFIG.HASH_LENGTH - 1) + 
                   base62Chars[Math.floor(Math.random() * 62)];
                   
            // Very unlikely, but check again
            if (urlMappings[hash]) {
                // Add timestamp to make it unique
                hash = hash.substring(0, SHORTENER_CONFIG.HASH_LENGTH - 3) + 
                       Date.now().toString(36).substring(0, 3);
            }
        }
        
        return hash;
    } catch (error) {
        console.error("Hash generation failed:", error);
        throw error;
    }
}

/**
 * Handle redirection of shortened URLs
 * @param {Object} details - Request details
 * @returns {Object} - Redirection information
 */
function handleRedirection(details) {
    try {
        // Extract hash from URL
        const url = new URL(details.url);
        const hash = url.pathname.substring(1); // Remove leading /
        
        if (!hash) return; // No hash provided
        
        // Look up hash asynchronously
        resolveUrl(hash)
            .then(originalUrl => {
                if (originalUrl) {
                    // Redirect to original URL
                    chrome.tabs.update(details.tabId, { url: originalUrl });
                }
            })
            .catch(console.error);
        
        // Show loading page while resolving
        return { redirectUrl: chrome.runtime.getURL('shortener_redirect.html') };
    } catch (error) {
        console.error("Redirection handling failed:", error);
        return;
    }
}

/**
 * Resolve a shortened URL to its original URL
 * @param {string} hash - Hash to resolve
 * @returns {Promise<string|null>} - Original URL or null if not found
 */
export async function resolveUrl(hash) {
    try {
        // Get mapping
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        const mapping = urlMappings[hash];
        
        if (!mapping) {
            return null; // Hash not found
        }
        
        // Check if expired
        if (mapping.expires && mapping.expires < Date.now()) {
            return null; // URL expired
        }
        
        // Update usage metrics
        mapping.useCount++;
        shortenerMetrics.urlsAccessed++;
        await Promise.all([
            chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_KEY]: urlMappings }),
            chrome.storage.local.set({ shortenerStats: shortenerMetrics })
        ]);
        
        return mapping.originalUrl;
    } catch (error) {
        console.error("URL resolution failed:", error);
        return null;
    }
}

/**
 * Get information about a shortened URL
 * @param {string} hash - Hash to look up
 * @returns {Promise<Object|null>} - URL information or null if not found
 */
export async function getUrlInfo(hash) {
    try {
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        return urlMappings[hash] || null;
    } catch (error) {
        console.error("Failed to get URL info:", error);
        return null;
    }
}

/**
 * Get all stored URL mappings
 * @returns {Promise<Object>} - All URL mappings
 */
export async function getAllUrls() {
    try {
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        return urlMappings;
    } catch (error) {
        console.error("Failed to get all URLs:", error);
        return {};
    }
}

/**
 * Delete a shortened URL
 * @param {string} hash - Hash to delete
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteUrl(hash) {
    try {
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        
        if (!urlMappings[hash]) {
            return false; // Hash not found
        }
        
        delete urlMappings[hash];
        await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_KEY]: urlMappings });
        
        return true;
    } catch (error) {
        console.error("URL deletion failed:", error);
        return false;
    }
}

/**
 * Clean up expired URLs
 * @returns {Promise<number>} - Number of URLs removed
 */
async function cleanExpiredUrls() {
    try {
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        let removedCount = 0;
        
        for (const [hash, mapping] of Object.entries(urlMappings)) {
            if (mapping.expires && mapping.expires < Date.now()) {
                delete urlMappings[hash];
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_KEY]: urlMappings });
            console.log(`Cleaned up ${removedCount} expired URLs`);
        }
        
        return removedCount;
    } catch (error) {
        console.error("Failed to clean expired URLs:", error);
        return 0;
    }
}

/**
 * Prune old mappings to stay under storage limit
 * @returns {Promise<number>} - Number of URLs removed
 */
async function pruneOldMappings() {
    try {
        const { urlMappings = {} } = await chrome.storage.local.get(SHORTENER_CONFIG.STORAGE_KEY);
        
        // Sort mappings by creation date (oldest first)
        const sortedMappings = Object.entries(urlMappings)
            .sort(([_, a], [__, b]) => a.created - b.created);
        
        // Remove oldest entries to get under limit
        const toRemove = sortedMappings.length - SHORTENER_CONFIG.MAX_STORED_URLS + 100; // Remove 100 extra to avoid frequent pruning
        let removedCount = 0;
        
        if (toRemove > 0) {
            const newMappings = { ...urlMappings };
            
            for (let i = 0; i < toRemove; i++) {
                if (i < sortedMappings.length) {
                    delete newMappings[sortedMappings[i][0]];
                    removedCount++;
                }
            }
            
            await chrome.storage.local.set({ [SHORTENER_CONFIG.STORAGE_KEY]: newMappings });
            console.log(`Pruned ${removedCount} old URL mappings`);
        }
        
        return removedCount;
    } catch (error) {
        console.error("Failed to prune old mappings:", error);
        return 0;
    }
}

/**
 * Get URL shortener statistics
 * @returns {Promise<Object>} - Shortener statistics
 */
export async function getShortenerStats() {
    try {
        const { shortenerStats = { urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 } } = 
            await chrome.storage.local.get("shortenerStats");
            
        return shortenerStats;
    } catch (error) {
        console.error("Failed to get shortener statistics:", error);
        return { urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 };
    }
}

/**
 * Reset URL shortener statistics
 * @returns {Promise<boolean>} - Success status
 */
export async function resetShortenerStats() {
    try {
        shortenerMetrics = { urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 };
        await chrome.storage.local.set({ shortenerStats: shortenerMetrics });
        return true;
    } catch (error) {
        console.error("Failed to reset shortener statistics:", error);
        return false;
    }
}

// Export main functions
export default {
    initialize: initializeUrlShortener,
    shortenUrl,
    resolveUrl,
    getUrlInfo,
    getAllUrls,
    deleteUrl,
    getStats: getShortenerStats,
    resetStats: resetShortenerStats
};