// Configuration

import { initializeStorage } from './storage.js';

const DEFAULT_ALLOWED_SITES = [
    "*://*.www.9anime.to/*",
    "*://*.www.forbes.com/*"
];

const STATIC_AD_SERVERS = [
    "partner.googleadservices.com",
    "googlesyndication.com",
    "google-analytics.com",
    "doubleclick.net",
    "facebook.com",
    "adservice.google.com",
    "pagead2.googlesyndication.com",
    "analytics.twitter.com",
    "amazon-adsystem.com",
    "scorecardresearch.com"
];

// Trackers Database
let currentRules = [];
let isInitialized = false;
let keepAliveInterval;
let performanceStats = { 
    dataSaved: 0,
    timeSaved: 0, 
    totalBlocked: 0 
};

// Main Initialization Function
async function initializeExtension() {
    if (isInitialized) return;

    try {
        console.log("Starting extension initialization...");

        // Initialize storage
        await initializeStorage();

        // Load and update blocking rules
        await updateBlockLists();

        // Set up periodic updates
        setupAlarms();

        // Start keep-alive
        startKeepAlive();

        // Load performance stats
        await loadPerformanceStats();

        isInitialized = true;
        console.log("Extension successfully initialized");
    } catch (error) {
        console.error("Initialization error:", error);
        // Fallback to basic functionality
        await updateBlockingRules(STATIC_AD_SERVERS);
    }
}

// Storage Initialization
async function initializeStorage() {
    const { storedArray } = await chrome.storage.sync.get('storedArray');
    if (!storedArray) {
        await chrome.storage.sync.set({ storedArray: DEFAULT_ALLOWED_SITES });
    }

    // Initialize user settings if needed
    const { userSettings } = await chrome.storage.local.get('userSettings');
    if (!userSettings) {
        const defaultSettings = {
            blockingEnabled: true,
            trackerProtection: true,
            fingerprintProtection: false,
            autoUpdateLists: true,
            showNotifications: false,
            version: 1
        };
        await chrome.storage.local.set({ userSettings: defaultSettings });
    }
}

// Block List Management
async function updateBlockLists() {
    try {
        // Check if auto-updates are enabled
        const { userSettings } = await chrome.storage.local.get('userSettings');
        if (userSettings && userSettings.autoUpdateLists === false) {
            console.log("Automatic updates disabled, using static block list only");
            await updateBlockingRules(STATIC_AD_SERVERS);
            return;
        }

        const dynamicTrackers = await fetchDynamicTrackerLists();
        const allBlockedDomains = [...new Set([...STATIC_AD_SERVERS, ...dynamicTrackers])];
        await updateBlockingRules(allBlockedDomains);
    } catch (error) {
        console.error("Failed to update block lists:", error);
        throw error;
    }
}

async function fetchDynamicTrackerLists() {
    try {
        const response = await fetch('https://whotracks.me/trackers.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const dynamicTrackers = Object.keys(data.trackers);
        
        console.log(`Fetched ${dynamicTrackers.length} trackers from dynamic source`);
        return dynamicTrackers;
    } catch (error) {
        console.error("Failed to fetch dynamic lists:", error);
        return [];
    }
}

async function updateBlockingRules(domainsToBlock) {
    try {
        // Check if blocking is enabled
        const { userSettings } = await chrome.storage.local.get('userSettings');
        if (userSettings && userSettings.blockingEnabled === false) {
            console.log("Ad blocking disabled in settings");
            return;
        }

        const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
        const allowedDomains = getAllowedDomains(storedArray);

        const newRules = domainsToBlock.map((domain, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: 'block' },
            condition: {
                urlFilter: `||${domain}`,
                excludedDomains: allowedDomains,
                resourceTypes: ['script', 'image', 'stylesheet', 'xmlhttprequest', 'other']
            }
        }));

        // Skip update if rules are identical
        if (!rulesChanged(newRules)) return;

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: currentRules.map(rule => rule.id),
            addRules: newRules
        });

        currentRules = newRules;
        console.log(`Updated blocking rules (${newRules.length} rules)`);
    } catch (error) {
        console.error("Rule update failed:", error);
        throw error;
    }
}

function rulesChanged(newRules) {
    if (currentRules.length !== newRules.length) return true;
    return currentRules.some((rule, i) => 
        rule.condition.urlFilter !== newRules[i].condition.urlFilter
    );
}

function getAllowedDomains(storedArray) {
    const domains = new Set();
    for (const urlPattern of storedArray) {
        try {
            // Skip invalid patterns early
            if (!urlPattern.includes('://')) continue;
            
            const url = new URL(urlPattern.replace('*://', 'https://').replace('*', 'www'));
            let hostname = url.hostname;
            
            // Handle wildcard subdomains
            if (hostname.startsWith('*.')) {
                hostname = hostname.substring(2);
            } else if (hostname.startsWith('www.')) {
                hostname = hostname.substring(4);
            }
            
            domains.add(hostname);
        } catch (error) {
            console.debug('Invalid URL pattern skipped:', urlPattern);
        }
    }
    return Array.from(domains);
}

// Alarm Management
function setupAlarms() {
    if (!chrome.alarms) {
        console.warn("Alarms API not available");
        return;
    }

    chrome.alarms.create('updateRules', { periodInMinutes: 1440 });
    chrome.alarms.create('saveStats', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener(handleAlarm);
}

function handleAlarm(alarm) {
    if (alarm.name === 'updateRules') {
        console.log("Running scheduled rules update");
        updateBlockLists().catch(console.error);
    } else if (alarm.name === 'saveStats') {
        savePerformanceStats().catch(console.error);
    }
}

// Keep-Alive Management
function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        console.debug("Service worker keep-alive ping");
    }, 25000); // 25 seconds (under 30s threshold)
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

// Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request.type);
    
    if (request.type === "trackerDetected" && request.hostname) {
        handleTrackerDetection(request.hostname)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
                console.error("Error handling tracker detection:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message port open for async response
    }
    
    if (request.type === "getPerformanceStats") {
        sendResponse(performanceStats);
    }
    
    if (request.type === "resetStats") {
        resetPerformanceStats()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.type === "refreshRules") {
        updateBlockLists()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function handleTrackerDetection(hostname) {
    // Get existing trackers
    const { trackers = {} } = await chrome.storage.local.get('trackers');
    
    // Update tracker count
    trackers[hostname] = (trackers[hostname] || 0) + 1;
    
    // Update performance stats
    performanceStats.totalBlocked++;
    
    // Rough estimate: each blocked request saves ~50KB and 200ms
    performanceStats.dataSaved += 50; // KB
    performanceStats.timeSaved += 0.2; // seconds
    
    // Save trackers to storage
    await chrome.storage.local.set({ trackers });
    
    // Check if notifications are enabled
    const { userSettings } = await chrome.storage.local.get('userSettings');
    
    if (userSettings && userSettings.showNotifications) {
        // Only show notifications for high-risk trackers or when many trackers detected
        const isHighRisk = STATIC_AD_SERVERS.includes(hostname);
        const isFrequent = trackers[hostname] > 10;
        
        if (isHighRisk || isFrequent) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Tracker Blocked',
                message: `SmartBlock has blocked a tracker from: ${hostname}`,
                priority: 1
            });
        }
    }
    
    // Optional: Add new tracker to block list
    if (!STATIC_AD_SERVERS.includes(hostname)) {
        console.log(`New tracker detected: ${hostname}`);
    }
}

// Performance Stats Management
async function loadPerformanceStats() {
    try {
        const { stats = { dataSaved: 0, timeSaved: 0, totalBlocked: 0 } } = 
            await chrome.storage.local.get('stats');
        
        performanceStats = stats;
    } catch (error) {
        console.error("Error loading performance stats:", error);
    }
}

async function savePerformanceStats() {
    try {
        await chrome.storage.local.set({ stats: performanceStats });
        console.log("Performance stats saved", performanceStats);
    } catch (error) {
        console.error("Error saving performance stats:", error);
    }
}

async function resetPerformanceStats() {
    performanceStats = { dataSaved: 0, timeSaved: 0, totalBlocked: 0 };
    await savePerformanceStats();
    console.log("Performance stats reset");
}

// Lifecycle Management
chrome.runtime.onInstalled.addListener(handleInstall);
chrome.runtime.onStartup.addListener(initializeExtension);

async function handleInstall(details) {
    console.log(`Extension installed (reason: ${details.reason})`);
    if (details.reason === 'install') {
        await chrome.storage.local.set({ trackers: {} });
        await resetPerformanceStats();
    }
    initializeExtension().catch(console.error);
}

// Web Request Analysis (optional enhancement)
if (chrome.webRequest) {
    chrome.webRequest.onCompleted.addListener(
        (details) => {
            // Analyze completed requests for additional tracker detection
            if (details.tabId === -1) return; // Ignore non-tab requests
            
            const url = new URL(details.url);
            const knownTrackers = STATIC_AD_SERVERS;
            
            if (knownTrackers.some(tracker => url.hostname.includes(tracker))) {
                handleTrackerDetection(url.hostname).catch(console.error);
            }
        },
        { urls: ["<all_urls>"] }
    );
}

// Cleanup on unload
chrome.runtime.onSuspend.addListener(() => {
    console.log("Service worker suspending");
    savePerformanceStats().catch(console.error);
    stopKeepAlive();
});

// Start the extension
initializeExtension().catch(console.error);

// Add these imports at the top of your background.js file
import urlShortener from './url-shortener.js';

// Add this to your message handler in background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Existing message handling code...
  
  // URL Shortener message handling
  if (request.type === 'shortenUrl') {
    shortenUrl(request.url, request.expirationDays)
      .then(shortUrl => sendResponse(shortUrl))
      .catch(error => {
        console.error('Error in shortenUrl:', error);
        sendResponse(null);
      });
    return true; // Keep the message channel open for async response
  }
  
  if (request.type === 'resolveShortUrl') {
    urlShortener.resolveUrl(request.hash)
      .then(originalUrl => sendResponse(originalUrl))
      .catch(error => {
        console.error('Error in resolveShortUrl:', error);
        sendResponse(null);
      });
    return true;
  }
  
  if (request.type === 'getRecentUrls') {
    urlShortener.getAllUrls()
      .then(urls => sendResponse(urls))
      .catch(error => {
        console.error('Error in getRecentUrls:', error);
        sendResponse({});
      });
    return true;
  }
  
  if (request.type === 'deleteUrl') {
    urlShortener.deleteUrl(request.hash)
      .then(success => sendResponse(success))
      .catch(error => {
        console.error('Error in deleteUrl:', error);
        sendResponse(false);
      });
    return true;
  }
  
  if (request.type === 'clearUrlHistory') {
    clearAllUrls()
      .then(success => sendResponse(success))
      .catch(error => {
        console.error('Error in clearUrlHistory:', error);
        sendResponse(false);
      });
    return true;
  }
  
  if (request.type === 'getShortenerStats') {
    urlShortener.getStats()
      .then(stats => sendResponse(stats))
      .catch(error => {
        console.error('Error in getShortenerStats:', error);
        sendResponse({ urlsShortened: 0, urlsAccessed: 0, charactersReduced: 0 });
      });
    return true;
  }
});

// Wrapper function for URL shortening
async function shortenUrl(url, expirationDays = 0) {
  try {
    return await urlShortener.shortenUrl(url, expirationDays);
  } catch (error) {
    console.error('Error shortening URL:', error);
    throw error;
  }
}

// Function to clear all URL mappings
async function clearAllUrls() {
  try {
    const { urlMappings = {} } = await chrome.storage.local.get('urlMappings');
    await chrome.storage.local.set({ urlMappings: {} });
    return true;
  } catch (error) {
    console.error('Error clearing URL history:', error);
    throw error;
  }
}

// Add this to your background.js initialization
async function initializeBackground() {
  try {
    // Existing initialization code...
    
    // Initialize URL shortener
    await urlShortener.initialize();
    
    console.log('URL Shortener initialized');
  } catch (error) {
    console.error('Error initializing background:', error);
  }
}

// Call this function when the extension starts
initializeBackground().catch(console.error);