document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const toggleBlocking = document.getElementById('toggleBlocking');
  const blockStatus = document.getElementById('blockStatus');
  const allowedSitesList = document.getElementById('allowedSitesList');
  const clearAllowedBtn = document.getElementById('clearAllowed');
  const trackerList = document.getElementById('trackerList');
  const emptyTrackers = document.getElementById('empty-trackers');
  const emptySites = document.getElementById('empty-sites');
  const blockCount = document.getElementById('blockCount');
  const trackerCount = document.getElementById('trackerCount');
  const dataSaved = document.getElementById('dataSaved');
  const timeSaved = document.getElementById('timeSaved');
  const siteFavicon = document.getElementById('siteFavicon');
  const siteUrl = document.getElementById('siteUrl');
  const resetSettingsBtn = document.getElementById('resetSettings');
  const settingsInputs = document.querySelectorAll('#settings input[type="checkbox"]');

  // Initialize Chart (if you add Chart.js)
  let trackerChart;
  
  // Current site information
  let currentSiteUrl = '';
  let currentSiteDomain = '';

  // Tab switching functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      
      // Update charts if on tracker tab
      if (tabId === 'trackers') {
        updateTrackerChart();
      }
    });
  });

  // Get current tab information
  const getCurrentTabInfo = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        currentSiteUrl = tab.url;
        currentSiteDomain = url.hostname;
        
        // Update UI with site info
        siteUrl.textContent = currentSiteDomain;
        siteFavicon.src = `chrome://favicon/${tab.url}`;
        
        return { url: tab.url, domain: url.hostname };
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
    }
    return null;
  };

  // Update toggle state for current site
  const updateToggleState = async () => {
    try {
      const tabInfo = await getCurrentTabInfo();
      if (!tabInfo) return;
      
      const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
      const pattern = `*://*.${tabInfo.domain}/*`;
      const isAllowed = storedArray.some(p => p === pattern);
      
      toggleBlocking.checked = !isAllowed;
      blockStatus.textContent = isAllowed ? 'Protection disabled' : 'Protection active';
      blockStatus.className = isAllowed ? 'status-label disabled' : 'status-label';
    } catch (error) {
      console.error('Error updating toggle state:', error);
    }
  };

  // Update allowed sites list
  const updateAllowedSitesList = async () => {
    try {
      const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
      
      if (storedArray.length === 0) {
        allowedSitesList.innerHTML = '';
        emptySites.style.display = 'block';
        return;
      }
      
      emptySites.style.display = 'none';
      allowedSitesList.innerHTML = storedArray.map(pattern => {
        // Extract domain from pattern
        let domain = pattern.replace('*://*.', '').replace('/*', '');
        
        return `
          <li>
            <span>${domain}</span>
            <button class="remove-btn" data-pattern="${pattern}">×</button>
          </li>
        `;
      }).join('');
      
      // Add event listeners to remove buttons
      document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
          const pattern = e.target.getAttribute('data-pattern');
          const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
          const newArray = storedArray.filter(p => p !== pattern);
          
          await chrome.storage.sync.set({ storedArray: newArray });
          updateAllowedSitesList();
          updateToggleState();
        });
      });
    } catch (error) {
      console.error('Error updating allowed sites list:', error);
    }
  };

  // Update tracker list
  const updateTrackerList = async () => {
    try {
      const { trackers = {} } = await chrome.storage.local.get('trackers');
      const trackerEntries = Object.entries(trackers);
      
      if (trackerEntries.length === 0) {
        trackerList.innerHTML = '';
        emptyTrackers.style.display = 'block';
        return;
      }
      
      emptyTrackers.style.display = 'none';
      // Sort trackers by count (descending)
      trackerEntries.sort((a, b) => b[1] - a[1]);
      
      trackerList.innerHTML = trackerEntries.map(([host, count]) => {
        return `
          <li>
            <span>${host}</span>
            <span class="tracker-count">${count}</span>
          </li>
        `;
      }).join('');
      
      // Update tracker count in header
      trackerCount.textContent = trackerEntries.length;
      
      // Update total blocked count
      const totalBlocked = trackerEntries.reduce((total, [_, count]) => total + count, 0);
      blockCount.textContent = totalBlocked;
    } catch (error) {
      console.error('Error updating tracker list:', error);
    }
  };

  // Update tracker chart (placeholder function - implement with Chart.js)
  const updateTrackerChart = async () => {
    try {
      const { trackers = {} } = await chrome.storage.local.get('trackers');
      const trackerEntries = Object.entries(trackers);
      
      // Simple placeholder visualization
      const chartContainer = document.getElementById('tracker-chart');
      
      if (trackerEntries.length === 0) {
        chartContainer.innerHTML = 'No tracker data to display';
        return;
      }
      
      // Sort and limit to top 5 trackers for visualization
      const topTrackers = trackerEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const totalCount = topTrackers.reduce((sum, [_, count]) => sum + count, 0);
      
      chartContainer.innerHTML = `
        <div class="chart-placeholder">
          <div class="chart-title">Top 5 Trackers Detected</div>
          <div class="chart-bars">
            ${topTrackers.map(([host, count]) => {
              const percentage = (count / totalCount * 100).toFixed(1);
              return `
                <div class="chart-bar-container">
                  <div class="chart-label">${host.split('.')[0]}</div>
                  <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                  </div>
                  <div class="chart-value">${count}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      // Add CSS for the chart visualization
      const style = document.createElement('style');
      style.textContent = `
        .chart-placeholder {
          padding: 12px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
          text-align: center;
        }
        .chart-bars {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .chart-bar-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chart-label {
          width: 70px;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chart-bar {
          flex-grow: 1;
          height: 12px;
          background-color: #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
        }
        .chart-bar-fill {
          height: 100%;
          background-color: var(--primary);
          border-radius: 6px;
        }
        .chart-value {
          width: 30px;
          font-size: 12px;
          text-align: right;
        }
      `;
      
      document.head.appendChild(style);
      
    } catch (error) {
      console.error('Error updating tracker chart:', error);
    }
  };

  // Calculate and display performance metrics
  const updatePerformanceMetrics = async () => {
    try {
      // In a real implementation, you would store and calculate actual saved data
      // This is just a placeholder with random/estimated values
      const { trackers = {} } = await chrome.storage.local.get('trackers');
      const totalBlocked = Object.values(trackers).reduce((sum, count) => sum + count, 0);
      
      // Rough estimate: each blocked request saves ~50KB and 200ms
      const dataSavedMB = ((totalBlocked * 50) / 1024).toFixed(1);
      const timeSavedSec = ((totalBlocked * 0.2)).toFixed(1);
      
      dataSaved.textContent = `${dataSavedMB} MB`;
      timeSaved.textContent = `${timeSavedSec}s`;
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  };

  // Toggle blocking for current site
  toggleBlocking.addEventListener('change', async () => {
    try {
      const tabInfo = await getCurrentTabInfo();
      if (!tabInfo) return;
      
      const { storedArray = [] } = await chrome.storage.sync.get('storedArray');
      const pattern = `*://*.${tabInfo.domain}/*`;
      
      let newArray;
      if (toggleBlocking.checked) {
        // Remove from allowed list
        newArray = storedArray.filter(p => p !== pattern);
        blockStatus.textContent = 'Protection active';
        blockStatus.className = 'status-label';
      } else {
        // Add to allowed list
        newArray = [...storedArray, pattern];
        blockStatus.textContent = 'Protection disabled';
        blockStatus.className = 'status-label disabled';
      }
      
      await chrome.storage.sync.set({ storedArray: newArray });
      updateAllowedSitesList();
    } catch (error) {
      console.error('Error toggling blocking:', error);
    }
  });

  // Clear all allowed sites
  clearAllowedBtn.addEventListener('click', async () => {
    try {
      await chrome.storage.sync.set({ storedArray: [] });
      updateAllowedSitesList();
      updateToggleState();
    } catch (error) {
      console.error('Error clearing allowed sites:', error);
    }
  });

  // Reset settings
  resetSettingsBtn.addEventListener('click', async () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      try {
        // Reset settings in storage
        const defaultSettings = {
          blockingEnabled: true,
          trackerProtection: true,
          allowedSites: [],
          version: 1
        };
        
        await chrome.storage.local.set({ userSettings: defaultSettings });
        await chrome.storage.sync.set({ storedArray: [] });
        
        // Reset UI
        settingsInputs.forEach(input => {
          if (input.id === 'blockAllTrackers' || input.id === 'autoUpdateLists') {
            input.checked = true;
          } else {
            input.checked = false;
          }
        });
        
        updateAllowedSitesList();
        updateToggleState();
        
        alert('Settings have been reset to default');
      } catch (error) {
        console.error('Error resetting settings:', error);
      }
    }
  });

  // Save settings
  settingsInputs.forEach(input => {
    input.addEventListener('change', async () => {
      try {
        const { userSettings = {} } = await chrome.storage.local.get('userSettings');
        
        const newSettings = {
          ...userSettings,
          [input.id]: input.checked
        };
        
        await chrome.storage.local.set({ userSettings: newSettings });
      } catch (error) {
        console.error('Error saving setting:', error);
      }
    });
  });

  // Load settings
  const loadSettings = async () => {
    try {
      const { userSettings = {} } = await chrome.storage.local.get('userSettings');
      
      settingsInputs.forEach(input => {
        if (userSettings[input.id] !== undefined) {
          input.checked = userSettings[input.id];
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Initialize
  const initialize = async () => {
    await updateToggleState();
    await updateAllowedSitesList();
    await updateTrackerList();
    await updatePerformanceMetrics();
    await loadSettings();
  };

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.trackers) {
      updateTrackerList();
      updatePerformanceMetrics();
      if (document.querySelector('.tab-btn[data-tab="trackers"]').classList.contains('active')) {
        updateTrackerChart();
      }
    }
    
    if (changes.storedArray) {
      updateAllowedSitesList();
      updateToggleState();
    }
    
    if (changes.userSettings) {
      loadSettings();
    }
  });

  // Initialize popup
  initialize();
});

// Add this to your popup.js file

// URL Shortener Tab Functionality
function initializeUrlShortenerTab() {
  // Elements
  const urlInput = document.getElementById('urlInput');
  const shortenButton = document.getElementById('shortenButton');
  const resultContainer = document.getElementById('resultContainer');
  const shortUrlResult = document.getElementById('shortUrlResult');
  const copyButton = document.getElementById('copyButton');
  const expirationSelect = document.getElementById('expirationSelect');
  const recentUrlsList = document.getElementById('recentUrlsList');
  const emptyUrls = document.getElementById('empty-urls');
  const clearHistoryButton = document.getElementById('clearHistory');
  const urlsShortened = document.getElementById('urlsShortened');
  const urlsAccessed = document.getElementById('urlsAccessed');
  const charsSaved = document.getElementById('charsSaved');

  // Initialize
  loadRecentUrls();
  loadShortenerStats();

  // Event Listeners
  shortenButton.addEventListener('click', handleShortenUrl);
  copyButton.addEventListener('click', handleCopyUrl);
  clearHistoryButton.addEventListener('click', handleClearHistory);
  
  // When URL is in clipboard, auto-fill the input
  urlInput.addEventListener('focus', async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Check if text is a valid URL and input is empty
      if (urlInput.value === '' && isValidUrl(text)) {
        urlInput.value = text;
      }
    } catch (error) {
      // Clipboard access may be denied
      console.log('Could not access clipboard');
    }
  });

  // Handle URL shortening
  async function handleShortenUrl() {
    const url = urlInput.value.trim();
    if (!isValidUrl(url)) {
      showNotification('Please enter a valid URL', 'error');
      return;
    }

    try {
      // Show loading state
      shortenButton.textContent = 'Shortening...';
      shortenButton.disabled = true;

      // Get expiration days
      const expirationDays = parseInt(expirationSelect.value);

      // Send request to background script
      const shortUrl = await chrome.runtime.sendMessage({
        type: 'shortenUrl',
        url: url,
        expirationDays: expirationDays
      });

      // Display result
      shortUrlResult.textContent = shortUrl;
      resultContainer.style.display = 'block';
      
      // Reset input and button
      urlInput.value = '';
      shortenButton.textContent = 'Shorten';
      shortenButton.disabled = false;

      // Update UI
      loadRecentUrls();
      loadShortenerStats();

    } catch (error) {
      console.error('Error shortening URL:', error);
      showNotification('Failed to shorten URL', 'error');
      shortenButton.textContent = 'Shorten';
      shortenButton.disabled = false;
    }
  }

  // Handle copy to clipboard
  async function handleCopyUrl() {
    const url = shortUrlResult.textContent;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      showNotification('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('Failed to copy to clipboard', 'error');
    }
  }

  // Handle clear history
  async function handleClearHistory() {
    try {
      if (!confirm('Are you sure you want to clear all shortened URLs?')) {
        return;
      }

      await chrome.runtime.sendMessage({ type: 'clearUrlHistory' });
      loadRecentUrls();
      showNotification('URL history cleared', 'success');
    } catch (error) {
      console.error('Failed to clear history:', error);
      showNotification('Failed to clear history', 'error');
    }
  }

  // Load recent shortened URLs
  async function loadRecentUrls() {
    try {
      const urlMappings = await chrome.runtime.sendMessage({ type: 'getRecentUrls' });
      
      if (Object.keys(urlMappings).length === 0) {
        recentUrlsList.innerHTML = '';
        emptyUrls.style.display = 'block';
        return;
      }

      emptyUrls.style.display = 'none';
      
      // Convert to array and sort by created date (newest first)
      const sortedUrls = Object.entries(urlMappings)
        .map(([hash, mapping]) => ({ hash, ...mapping }))
        .sort((a, b) => b.created - a.created)
        .slice(0, 5); // Show only 5 most recent
      
      // Generate HTML
      recentUrlsList.innerHTML = sortedUrls.map(item => {
        const shortUrl = `https://sb.link/${item.hash}`;
        const originalUrl = truncateUrl(item.originalUrl);
        
        // Format date
        const createdDate = new Date(item.created);
        const formattedDate = createdDate.toLocaleDateString();
        
        // Expiration info
        let expirationInfo = 'Never expires';
        if (item.expires) {
          const expiresDate = new Date(item.expires);
          expirationInfo = `Expires on ${expiresDate.toLocaleDateString()}`;
        }
        
        return `
          <li>
            <div class="url-list-item">
              <div class="short-url">${shortUrl}</div>
              <div class="original-url" title="${item.originalUrl}">${originalUrl}</div>
              <div class="url-meta">
                <small>Created: ${formattedDate} • ${expirationInfo} • Clicks: ${item.useCount}</small>
              </div>
              <div class="url-actions">
                <button class="url-action-btn copy" data-url="${shortUrl}">Copy</button>
                <button class="url-action-btn open" data-url="${item.originalUrl}">Open original</button>
                <button class="url-action-btn delete" data-hash="${item.hash}">Delete</button>
              </div>
            </div>
          </li>
        `;
      }).join('');
      
      // Add event listeners to buttons
      document.querySelectorAll('.url-action-btn.copy').forEach(button => {
        button.addEventListener('click', async () => {
          const url = button.getAttribute('data-url');
          await navigator.clipboard.writeText(url);
          showNotification('Copied to clipboard!', 'success');
        });
      });
      
      document.querySelectorAll('.url-action-btn.open').forEach(button => {
        button.addEventListener('click', () => {
          const url = button.getAttribute('data-url');
          chrome.tabs.create({ url });
        });
      });
      
      document.querySelectorAll('.url-action-btn.delete').forEach(button => {
        button.addEventListener('click', async () => {
          const hash = button.getAttribute('data-hash');
          await chrome.runtime.sendMessage({ type: 'deleteUrl', hash });
          loadRecentUrls();
          showNotification('URL deleted', 'success');
        });
      });
      
    } catch (error) {
      console.error('Failed to load recent URLs:', error);
    }
  }

  // Load shortener statistics
  async function loadShortenerStats() {
    try {
      const stats = await chrome.runtime.sendMessage({ type: 'getShortenerStats' });
      
      urlsShortened.textContent = stats.urlsShortened.toLocaleString();
      urlsAccessed.textContent = stats.urlsAccessed.toLocaleString();
      
      // Format characters saved
      let savedText = stats.charactersReduced.toLocaleString();
      if (stats.charactersReduced > 1000) {
        savedText = (stats.charactersReduced / 1000).toFixed(1) + 'K';
      }
      if (stats.charactersReduced > 1000000) {
        savedText = (stats.charactersReduced / 1000000).toFixed(1) + 'M';
      }
      
      charsSaved.textContent = savedText;
      
    } catch (error) {
      console.error('Failed to load shortener stats:', error);
    }
  }

  // Helper: Check if URL is valid
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper: Truncate URL for display
  function truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname;
      if (path.length > 20) {
        path = path.substring(0, 17) + '...';
      }
      return urlObj.hostname + path;
    } catch (error) {
      return url.length > 40 ? url.substring(0, 37) + '...' : url;
    }
  }

  // Helper: Show notification
  function showNotification(message, type = 'info') {
    // If you have a notification system, use it here
    // Otherwise, create a simple one
    
    // Remove existing notification
    const existingNotification = document.querySelector('.shortener-notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `shortener-notification ${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.querySelector('#shortener').appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
}

// Add this to your initialization code in popup.js
document.addEventListener('DOMContentLoaded', () => {
  // ...existing initialization code
  
  // Initialize URL shortener tab
  initializeUrlShortenerTab();
});