/**
 * Storage Module for SmartBlock & Tracker Detector
 * Handles persistent storage, versioning, and settings management
 */

// Storage keys
const STORAGE_KEYS = {
    SETTINGS: 'userSettings',
    SETTINGS_VERSION: 'settingsVersion',
    TRACKERS: 'trackers',
    PERFORMANCE_STATS: 'stats',
    ALLOWED_SITES: 'storedArray'
};

// Current settings version
const CURRENT_VERSION = 1;

// Default settings
const DEFAULT_SETTINGS = {
    blockingEnabled: true,         // Enable ad blocking
    trackerProtection: true,       // Enable tracker detection
    fingerprintProtection: false,  // Enable fingerprint protection
    autoUpdateLists: true,         // Auto-update block lists
    showNotifications: false,      // Show notifications for blocked trackers
    version: CURRENT_VERSION
};

// Default allowed sites (whitelist)
const DEFAULT_ALLOWED_SITES = [
    "*://*.www.9anime.to/*",
    "*://*.www.forbes.com/*"
];

/**
 * Initialize storage with version checking
 * @returns {Promise<void>}
 */
export async function initializeStorage() {
    try {
        // Check version
        const { settingsVersion } = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS_VERSION);
        
        // If no version or outdated, migrate settings
        if (!settingsVersion || settingsVersion < CURRENT_VERSION) {
            await migrateSettings(settingsVersion || 0);
        }
        
        // Initialize trackers object if needed
        const { trackers } = await chrome.storage.local.get(STORAGE_KEYS.TRACKERS);
        if (!trackers) {
            await chrome.storage.local.set({ [STORAGE_KEYS.TRACKERS]: {} });
        }
        
        // Initialize allowed sites if needed
        const { storedArray } = await chrome.storage.sync.get(STORAGE_KEYS.ALLOWED_SITES);
        if (!storedArray) {
            await chrome.storage.sync.set({ [STORAGE_KEYS.ALLOWED_SITES]: DEFAULT_ALLOWED_SITES });
        }
        
        // Initialize performance stats if needed
        const { stats } = await chrome.storage.local.get(STORAGE_KEYS.PERFORMANCE_STATS);
        if (!stats) {
            await chrome.storage.local.set({
                [STORAGE_KEYS.PERFORMANCE_STATS]: {
                    dataSaved: 0,
                    timeSaved: 0,
                    totalBlocked: 0
                }
            });
        }
        
        console.log('Storage initialized successfully');
    } catch (error) {
        console.error('Storage initialization failed:', error);
        throw error;
    }
}

/**
 * Migrate settings when version changes
 * @param {number} previousVersion - Previous settings version
 * @returns {Promise<void>}
 */
async function migrateSettings(previousVersion) {
    try {
        console.log(`Migrating settings from v${previousVersion} to v${CURRENT_VERSION}`);
        
        // Get existing settings
        const { userSettings } = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        
        // Apply migrations based on previous version
        let migratedSettings;
        
        if (previousVersion === 0) {
            // First-time migration
            migratedSettings = {
                ...DEFAULT_SETTINGS,
                ...(userSettings || {})
            };
        } else {
            // Handle specific version migrations
            migratedSettings = {
                ...DEFAULT_SETTINGS,
                ...userSettings,
                // Add migration rules for specific version changes here
            };
        }
        
        // Update with current version
        migratedSettings.version = CURRENT_VERSION;
        
        // Save migrated settings
        await Promise.all([
            chrome.storage.local.set({
                [STORAGE_KEYS.SETTINGS]: migratedSettings
            }),
            chrome.storage.local.set({
                [STORAGE_KEYS.SETTINGS_VERSION]: CURRENT_VERSION
            })
        ]);
        
        console.log(`Settings migrated successfully to v${CURRENT_VERSION}`);
    } catch (error) {
        console.error('Settings migration failed:', error);
        throw error;
    }
}

/**
 * Save user settings with validation
 * @param {Object} settings - User settings to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveSettings(settings) {
    try {
        // Validate settings
        const validated = validateSettings({
            ...DEFAULT_SETTINGS,
            ...settings
        });
        
        // Set version
        validated.version = CURRENT_VERSION;
        
        // Save to storage
        await chrome.storage.local.set({
            [STORAGE_KEYS.SETTINGS]: validated
        });
        
        console.log('Settings saved successfully:', validated);
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
}

/**
 * Validate settings object
 * @param {Object} settings - Settings to validate
 * @returns {Object} Validated settings
 */
function validateSettings(settings) {
    // Copy to avoid modifying original
    const validated = { ...settings };
    
    // Ensure boolean values are actually booleans
    const booleanProps = [
        'blockingEnabled',
        'trackerProtection',
        'fingerprintProtection',
        'autoUpdateLists',
        'showNotifications'
    ];
    
    booleanProps.forEach(prop => {
        if (validated[prop] !== undefined) {
            validated[prop] = Boolean(validated[prop]);
        }
    });
    
    return validated;
}

/**
 * Load user settings
 * @returns {Promise<Object>} User settings
 */
export async function loadSettings() {
    try {
        const { userSettings } = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        
        if (!userSettings) {
            return DEFAULT_SETTINGS;
        }
        
        return {
            ...DEFAULT_SETTINGS,
            ...userSettings
        };
    } catch (error) {
        console.error('Failed to load settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Reset settings to defaults
 * @returns {Promise<boolean>} Success status
 */
export async function resetSettings() {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
        });
        
        console.log('Settings reset to defaults');
        return true;
    } catch (error) {
        console.error('Failed to reset settings:', error);
        return false;
    }
}

/**
 * Get allowed sites (whitelist)
 * @returns {Promise<Array<string>>} Array of allowed site patterns
 */
export async function getAllowedSites() {
    try {
        const { storedArray } = await chrome.storage.sync.get(STORAGE_KEYS.ALLOWED_SITES);
        return storedArray || [];
    } catch (error) {
        console.error('Failed to get allowed sites:', error);
        return [];
    }
}

/**
 * Save allowed sites (whitelist)
 * @param {Array<string>} sites - Array of site patterns
 * @returns {Promise<boolean>} Success status
 */
export async function saveAllowedSites(sites) {
    try {
        if (!Array.isArray(sites)) {
            throw new Error('Sites must be an array');
        }
        
        await chrome.storage.sync.set({
            [STORAGE_KEYS.ALLOWED_SITES]: sites
        });
        
        return true;
    } catch (error) {
        console.error('Failed to save allowed sites:', error);
        return false;
    }
}

/**
 * Get tracker statistics
 * @returns {Promise<Object>} Tracker statistics
 */
export async function getTrackerStats() {
    try {
        const { trackers } = await chrome.storage.local.get(STORAGE_KEYS.TRACKERS);
        return trackers || {};
    } catch (error) {
        console.error('Failed to get tracker stats:', error);
        return {};
    }
}

/**
 * Reset tracker statistics
 * @returns {Promise<boolean>} Success status
 */
export async function resetTrackerStats() {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.TRACKERS]: {}
        });
        
        return true;
    } catch (error) {
        console.error('Failed to reset tracker stats:', error);
        return false;
    }
}

/**
 * Get performance statistics
 * @returns {Promise<Object>} Performance statistics
 */
export async function getPerformanceStats() {
    try {
        const { stats } = await chrome.storage.local.get(STORAGE_KEYS.PERFORMANCE_STATS);
        
        return stats || {
            dataSaved: 0,
            timeSaved: 0,
            totalBlocked: 0
        };
    } catch (error) {
        console.error('Failed to get performance stats:', error);
        return {
            dataSaved: 0,
            timeSaved: 0,
            totalBlocked: 0
        };
    }
}

/**
 * Reset performance statistics
 * @returns {Promise<boolean>} Success status
 */
export async function resetPerformanceStats() {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.PERFORMANCE_STATS]: {
                dataSaved: 0,
                timeSaved: 0,
                totalBlocked: 0
            }
        });
        
        return true;
    } catch (error) {
        console.error('Failed to reset performance stats:', error);
        return false;
    }
}

/**
 * Check if a URL is in the allowed sites list
 * @param {string} url - URL to check
 * @returns {Promise<boolean>} Whether URL is allowed
 */
export async function isUrlAllowed(url) {
    try {
        if (!url) return false;
        
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        const { storedArray = [] } = await chrome.storage.sync.get(STORAGE_KEYS.ALLOWED_SITES);
        
        return storedArray.some(pattern => {
            // Convert pattern to regex
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\./g, '\\.')
                .replace('://.*', '://(.*\\.)?' );
            
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(url);
        });
    } catch (error) {
        console.error('Error checking if URL is allowed:', error);
        return false;
    }
}

/**
 * Add a URL to the allowed sites list
 * @param {string} url - URL to allow
 * @returns {Promise<boolean>} Success status
 */
export async function allowUrl(url) {
    try {
        if (!url) return false;
        
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const pattern = `*://*.${domain}/*`;
        
        const { storedArray = [] } = await chrome.storage.sync.get(STORAGE_KEYS.ALLOWED_SITES);
        
        // Check if already allowed
        if (storedArray.includes(pattern)) {
            return true;
        }
        
        // Add to allowed sites
        const newArray = [...storedArray, pattern];
        await chrome.storage.sync.set({ [STORAGE_KEYS.ALLOWED_SITES]: newArray });
        
        return true;
    } catch (error) {
        console.error('Error adding URL to allowed sites:', error);
        return false;
    }
}

/**
 * Remove a URL from the allowed sites list
 * @param {string} url - URL to disallow
 * @returns {Promise<boolean>} Success status
 */
export async function disallowUrl(url) {
    try {
        if (!url) return false;
        
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const pattern = `*://*.${domain}/*`;
        
        const { storedArray = [] } = await chrome.storage.sync.get(STORAGE_KEYS.ALLOWED_SITES);
        
        // Remove from allowed sites
        const newArray = storedArray.filter(p => p !== pattern);
        await chrome.storage.sync.set({ [STORAGE_KEYS.ALLOWED_SITES]: newArray });
        
        return true;
    } catch (error) {
        console.error('Error removing URL from allowed sites:', error);
        return false;
    }
}

// Export storage initialization for use in background script
export default initializeStorage;