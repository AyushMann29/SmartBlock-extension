// Get elements
const destinationContainer = document.getElementById('destination-container');
const destinationElement = document.getElementById('destination');
const proceedLink = document.getElementById('proceed-link');
const errorContainer = document.getElementById('error-container');

// Parse the current URL
const currentUrl = new URL(window.location.href);
const hash = currentUrl.pathname.substring(1); // Remove leading /

// Function to sanitize URLs for display
function sanitizeUrl(url) {
  try {
    // Create a text node to prevent XSS
    const urlText = document.createTextNode(url);
    return urlText.textContent;
  } catch (error) {
    return '[Invalid URL]';
  }
}

// Function to check if URL is potentially dangerous
function isSuspiciousUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // List of suspicious TLDs often used in phishing
    const suspiciousTLDs = [
      'top', 'xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'info'
    ];
    
    // Check domain ending
    const domain = urlObj.hostname;
    const tld = domain.split('.').pop().toLowerCase();
    if (suspiciousTLDs.includes(tld)) {
      return true;
    }
    
    // Check for suspicious keywords in URL
    const suspiciousKeywords = [
      'login', 'signin', 'account', 'secure', 'banking', 'password', 'verify',
      'wallet', 'blockchain', 'bitcoin', 'crypto', 'authenticate', 'security'
    ];
    
    const urlLower = url.toLowerCase();
    if (suspiciousKeywords.some(keyword => urlLower.includes(keyword))) {
      return true;
    }
    
    // Check for IP address URLs
    const ipRegex = /^(https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
    if (ipRegex.test(url)) {
      return true;
    }
    
    // Check for excessive subdomains (potential phishing)
    const subdomainCount = domain.split('.').length;
    if (subdomainCount > 4) {
      return true;
    }
    
    return false;
  } catch (error) {
    // Invalid URL
    return true;
  }
}

// Main function to handle URL resolution
async function resolveAndRedirect() {
  if (!hash) {
    // No hash provided, show error
    errorContainer.style.display = 'block';
    return;
  }
  
  try {
    // Request resolution from the background script
    const originalUrl = await chrome.runtime.sendMessage({
      type: 'resolveShortUrl',
      hash: hash
    });
    
    if (!originalUrl) {
      // URL not found or expired
      errorContainer.style.display = 'block';
      return;
    }
    
    // Check if URL is suspicious
    const isSuspicious = isSuspiciousUrl(originalUrl);
    
    // Show destination
    destinationElement.textContent = sanitizeUrl(originalUrl);
    destinationContainer.style.display = 'block';
    
    // Set proceed link
    proceedLink.href = originalUrl;
    
    // Add warning for suspicious URLs
    if (isSuspicious) {
      const warningElement = document.createElement('p');
      warningElement.className = 'error';
      warningElement.textContent = 'Warning: This URL contains suspicious patterns. Proceed with caution.';
      destinationContainer.insertBefore(warningElement, proceedLink);
    } else {
      // Auto-redirect after 2 seconds if not suspicious
      setTimeout(() => {
        window.location.href = originalUrl;
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error resolving URL:', error);
    errorContainer.style.display = 'block';
  }
}

// Start the resolution process
resolveAndRedirect();

// Handle proceed button click
proceedLink.addEventListener('click', (event) => {
  // This is just a fallback - most navigation will happen via href
  event.preventDefault();
  window.location.href = proceedLink.href;
});