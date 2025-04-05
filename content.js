// Known tracker domains to watch for
const knownTrackers = [
  "google-analytics.com",
  "doubleclick.net",
  "facebook.com",
  "adservice.google.com",
  "googlesyndication.com",
  "amazon-adsystem.com",
  "googletagmanager.com",
  "scorecardresearch.com",
  "analytics.twitter.com",
  "adsrvr.org",
  "criteo.com",
  "outbrain.com",
  "taboola.com",
  "hotjar.com",
  "cloudfront.net"
];

// Configuration and state
let isObserving = false;
let trackerCounts = {};
let observerInitialized = false;
let fingerprintProtectionEnabled = false;
let debounceTimer = null;

// Initialize protection features
initializeProtection().catch(console.error);

async function initializeProtection() {
  try {
    // Check if we should be active on this page
    if (!shouldProtectPage()) {
      console.log('Protection not needed for this page');
      return;
    }

    // Load user settings
    const { userSettings } = await chrome.storage.local.get('userSettings');
    
    // Enable fingerprint protection if configured
    if (userSettings && userSettings.fingerprintProtection) {
      fingerprintProtectionEnabled = true;
      applyFingerprintProtection();
    }
    
    // Start resource monitoring
    if (!userSettings || userSettings.trackerProtection !== false) {
      startTrackingObserver();
    }
    
    // Listen for settings changes
    chrome.storage.onChanged.addListener(handleSettingsChange);
    
    // Add unload handler
    window.addEventListener('beforeunload', handlePageUnload);
    
    console.log('SmartBlock protection initialized');
  } catch (error) {
    console.error('Failed to initialize protection:', error);
  }
}

function shouldProtectPage() {
  // Skip protection for certain page types
  if (
    document.location.protocol === 'chrome:' ||
    document.location.protocol === 'chrome-extension:' ||
    document.location.protocol === 'moz-extension:' ||
    document.location.protocol === 'about:'
  ) {
    return false;
  }
  
  return true;
}

function startTrackingObserver() {
  if (isObserving || !window.PerformanceObserver) return;
  
  try {
    // Create performance observer for resource loads
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(handleResourceLoad);
    });
    
    // Start observing resources
    observer.observe({ entryTypes: ["resource"] });
    
    isObserving = true;
    observerInitialized = true;
    console.log('Resource tracking observer started');
    
    // Also check for existing resources
    performance.getEntriesByType('resource').forEach(handleResourceLoad);
  } catch (error) {
    console.error('Failed to start performance observer:', error);
  }
}

function handleResourceLoad(entry) {
  try {
    // Skip if not a URL
    if (!entry.name || !entry.name.startsWith('http')) return;
    
    const url = new URL(entry.name);
    const hostname = url.hostname;
    
    // Check if this is a known tracker
    if (knownTrackers.some(tracker => hostname.includes(tracker))) {
      // Count unique trackers on the page
      if (!trackerCounts[hostname]) {
        trackerCounts[hostname] = 0;
      }
      trackerCounts[hostname]++;
      
      // Debounce sending to avoid too many messages
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(reportTrackers, 1000);
    }
  } catch (error) {
    // Skip URL parsing errors
    if (!error.message.includes('Invalid URL')) {
      console.error('Error processing resource:', error);
    }
  }
}

async function reportTrackers() {
  try {
    for (const [hostname, count] of Object.entries(trackerCounts)) {
      // Only report each tracker once per page
      if (count > 0) {
        await chrome.runtime.sendMessage({ 
          type: "trackerDetected", 
          hostname,
          url: document.location.href,
          timestamp: Date.now()
        });
        
        // Mark as reported
        trackerCounts[hostname] = 0;
      }
    }
  } catch (error) {
    console.error('Failed to report trackers:', error);
    
    // If the extension context is invalid (e.g., during update)
    // we should stop trying to report
    if (error.message.includes('Extension context invalidated')) {
      isObserving = false;
    }
  }
}

function applyFingerprintProtection() {
  try {
    // Canvas fingerprinting protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    // Add subtle noise to canvas data
    HTMLCanvasElement.prototype.toDataURL = function() {
      const context = this.getContext('2d');
      if (context && this.width > 16 && this.height > 16) {
        // Add slight noise to a few random pixels
        const imageData = context.getImageData(0, 0, this.width, this.height);
        const pixels = imageData.data;
        
        // Only modify every 50th pixel to minimize visual impact
        for (let i = 0; i < pixels.length; i += 200) {
          pixels[i] = pixels[i] + (Math.random() * 2 - 1);
        }
        
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
    
    // Alter getImageData slightly
    CanvasRenderingContext2D.prototype.getImageData = function() {
      const imageData = originalGetImageData.apply(this, arguments);
      
      // Only modify image data for small regions that might be used for fingerprinting
      if (arguments[2] < 200 || arguments[3] < 200) {
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 400) {
          pixels[i] = pixels[i] + (Math.random() < 0.5 ? 1 : 0);
        }
      }
      
      return imageData;
    };
    
    // Audio fingerprinting protection
    if (window.AudioContext || window.webkitAudioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      
      // Add subtle noise to audio data
      AudioBuffer.prototype.getChannelData = function(channel) {
        const originalData = originalGetChannelData.call(this, channel);
        
        // Only modify for short audio samples likely used in fingerprinting
        if (this.length < 1000) {
          const newData = new Float32Array(originalData);
          for (let i = 0; i < newData.length; i += 100) {
            // Add minimal noise
            newData[i] += (Math.random() * 0.0001 - 0.00005);
          }
          return newData;
        }
        
        return originalData;
      };
    }
    
    console.log('Fingerprint protection applied');
  } catch (error) {
    console.error('Failed to apply fingerprint protection:', error);
  }
}

function handleSettingsChange(changes) {
  if (changes.userSettings) {
    const newSettings = changes.userSettings.newValue;
    
    // Update fingerprint protection
    if (newSettings.fingerprintProtection !== undefined) {
      if (newSettings.fingerprintProtection && !fingerprintProtectionEnabled) {
        fingerprintProtectionEnabled = true;
        applyFingerprintProtection();
      } else if (!newSettings.fingerprintProtection) {
        fingerprintProtectionEnabled = false;
        // Can't fully remove protection without page reload
        console.log('Fingerprint protection will be disabled on next page load');
      }
    }
    
    // Update tracking observer
    if (newSettings.trackerProtection !== undefined) {
      if (newSettings.trackerProtection && !isObserving) {
        startTrackingObserver();
      } else if (!newSettings.trackerProtection && isObserving) {
        isObserving = false;
        console.log('Tracker detection paused');
      }
    }
  }
}

function handlePageUnload() {
  // Final report of any remaining trackers
  if (Object.values(trackerCounts).some(count => count > 0)) {
    reportTrackers();
  }
}

// Also monitor DOM changes for late-loading trackers
if (window.MutationObserver) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Look for script tags being added
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'SCRIPT' && node.src) {
            try {
              const url = new URL(node.src);
              if (knownTrackers.some(tracker => url.hostname.includes(tracker))) {
                trackerCounts[url.hostname] = (trackerCounts[url.hostname] || 0) + 1;
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(reportTrackers, 1000);
              }
            } catch (error) {
              // Skip invalid URLs
            }
          }
        });
      }
    });
  });
  
  // Start observing after DOM is fully loaded
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  });
}