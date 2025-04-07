import { initializeStorage } from './storage.js';
import urlShortener from './url-shortener.js';

const DEFAULT_ALLOWED_SITES = [
    '*://*.www.9anime.to/*',
    '*://*.www.forbes.com/*'
];

const STATIC_AD_SERVERS = [
    'partner.googleadservices.com',
    'googlesyndication.com',
    'google-analytics.com',
    'doubleclick.net',
    'facebook.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'analytics.twitter.com',
    'amazon-adsystem.com',
    'scorecardresearch.com'
];

let currentRules = [];
let isInitialized = false;
let keepAliveInterval;
let performanceStats = {
    dataSaved: 0,
    timeSaved: 0,
    totalBlocked: 0
};

async function updateBlockLists() {
    try {
        const { userSettings } = await chrome.storage.local.get('userSettings');
        if (userSettings?.autoUpdateLists === false) {
            console.log('Automatic updates disabled, using static block list only');
            await updateBlockingRules(STATIC_AD_SERVERS);
            return;
        }
        const dynamicTrackers = await fetchDynamicTrackerLists();
        const allBlockedDomains = [...new Set([...STATIC_AD_SERVERS, ...dynamicTrackers])];
        await updateBlockingRules(allBlockedDomains);
    } catch (error) {
        console.error('Failed to update block lists:', error);
        throw error;
    }
}

async function fetchDynamicTrackerLists() {
    try {
        const response = await fetch('https://whotracks.me/trackers.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return Object.keys(data.trackers);
    } catch (error) {
        console.error('Failed to fetch dynamic lists:', error);
        return [];
    }
}

async function updateBlockingRules(domainsToBlock) {
    try {
        const { userSettings } = await chrome.storage.local.get('userSettings');
        if (userSettings?.blockingEnabled === false) return;

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

        if (!rulesChanged(newRules)) return;

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: currentRules.map(rule => rule.id),
            addRules: newRules
        });
        currentRules = newRules;
        console.log(`Updated blocking rules (${newRules.length} rules)`);
    } catch (error) {
        console.error('Rule update failed:', error);
        throw error;
    }
}

function rulesChanged(newRules) {
    return currentRules.length !== newRules.length ||
        currentRules.some((rule, i) => rule.condition.urlFilter !== newRules[i].condition.urlFilter);
}

function getAllowedDomains(storedArray) {
    const domains = new Set();
    for (const urlPattern of storedArray) {
        try {
            if (!urlPattern.includes('://')) continue;
            const url = new URL(urlPattern.replace('*://', 'https://').replace('*', 'www'));
            let hostname = url.hostname;
            if (hostname.startsWith('*.')) hostname = hostname.substring(2);
            else if (hostname.startsWith('www.')) hostname = hostname.substring(4);
            domains.add(hostname);
        } catch (error) {
            console.debug('Invalid URL pattern skipped:', urlPattern);
        }
    }
    return Array.from(domains);
}

function setupAlarms() {
    chrome.alarms?.create('updateRules', { periodInMinutes: 1440 });
    chrome.alarms?.create('saveStats', { periodInMinutes: 30 });
    chrome.alarms?.onAlarm.addListener(handleAlarm);
}

function handleAlarm(alarm) {
    if (alarm.name === 'updateRules') updateBlockLists().catch(console.error);
    else if (alarm.name === 'saveStats') savePerformanceStats().catch(console.error);
}

function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = setInterval(() => {
        console.debug('Service worker keep-alive ping');
    }, 25000);
}

function stopKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    keepAliveInterval = null;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    const handlers = {
        trackerDetected: async () => {
            if (!request.hostname) throw new Error('Missing hostname');
            await handleTrackerDetection(request.hostname);
            return { success: true };
        },
        getPerformanceStats: async () => performanceStats,
        resetStats: async () => {
            await resetPerformanceStats();
            return { success: true };
        },
        refreshRules: async () => {
            await updateBlockLists();
            return { success: true };
        },
        shortenUrl: () => shortenUrl(request.url, request.expirationDays),
        resolveShortUrl: () => urlShortener.resolveUrl(request.hash),
        getRecentUrls: () => urlShortener.getAllUrls(),
        deleteUrl: () => urlShortener.deleteUrl(request.hash),
        clearUrlHistory: () => clearAllUrls(),
        getShortenerStats: () => urlShortener.getStats()
    };

    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (handlers[request.type]) {
        handlers[request.type]()
            .then(response => sendResponse(response))
            .catch(error => {
                console.error(`Error handling ${request.type}:`, error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});
});

async function handleTrackerDetection(hostname) {
    const { trackers = {} } = await chrome.storage.local.get('trackers');
    trackers[hostname] = (trackers[hostname] || 0) + 1;
    performanceStats.totalBlocked++;
    performanceStats.dataSaved += 50;
    performanceStats.timeSaved += 0.2;
    await chrome.storage.local.set({ trackers });

    const { userSettings } = await chrome.storage.local.get('userSettings');
    if (userSettings?.showNotifications) {
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
}

async function loadPerformanceStats() {
    const { stats = { dataSaved: 0, timeSaved: 0, totalBlocked: 0 } } =
        await chrome.storage.local.get('stats');
    performanceStats = stats;
}

async function savePerformanceStats() {
    await chrome.storage.local.set({ stats: performanceStats });
    console.log('Performance stats saved', performanceStats);
}

async function resetPerformanceStats() {
    performanceStats = { dataSaved: 0, timeSaved: 0, totalBlocked: 0 };
    await savePerformanceStats();
    console.log('Performance stats reset');
}

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log(`Extension installed (reason: ${details.reason})`);
    if (details.reason === 'install') {
        await chrome.storage.local.set({ trackers: {} });
        await resetPerformanceStats();
    }
    await initializeBackground();
});

chrome.runtime.onStartup.addListener(() => {
    initializeBackground().catch(console.error);
});

chrome.runtime.onSuspend.addListener(() => {
    console.log('Service worker suspending');
    savePerformanceStats().catch(console.error);
    stopKeepAlive();
});

if (chrome.webRequest) {
    chrome.webRequest.onCompleted.addListener(
        (details) => {
            if (details.tabId === -1) return;
            const url = new URL(details.url);
            if (STATIC_AD_SERVERS.some(tracker => url.hostname.includes(tracker))) {
                handleTrackerDetection(url.hostname).catch(console.error);
            }
        },
        { urls: ['<all_urls>'] }
    );
}

async function shortenUrl(url, expirationDays = 0) {
    return await urlShortener.shortenUrl(url, expirationDays);
}

async function clearAllUrls() {
    await chrome.storage.local.set({ urlMappings: {} });
    return true;
}

// Add at the bottom of background.js
chrome.runtime.onStartup.addListener(() => initializeExtension());
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        initializeExtension();
    }
});

// Keep only ONE initializeExtension() at the bottom:
async function initializeExtension() {
    if (isInitialized) return;
    try {
      console.log('Starting extension initialization...');
      await initializeStorage();
      await urlShortener.initialize();  // Add this
      await updateBlockLists();
      setupAlarms();
      startKeepAlive();
      await loadPerformanceStats();
      isInitialized = true;
      console.log('Extension successfully initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      await updateBlockingRules(STATIC_AD_SERVERS);
    }
  }