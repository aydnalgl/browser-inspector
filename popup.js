document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Add click handler for show more/less buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('show-more-btn')) {
      const valueContainer = e.target.previousElementSibling;
      const fullValue = valueContainer.getAttribute('data-full-value');
      const truncatedValue = valueContainer.getAttribute('data-truncated-value');
      
      if (e.target.textContent === 'Show More') {
        // Convert the stored plain text back to HTML format for JSON values
        if (fullValue.includes(': null') || fullValue.includes(': true') || fullValue.includes(': false')) {
          const formattedValue = fullValue.split('\n').map(line => {
            const [key, ...rest] = line.split(':');
            return `<span class="json-key">${key}</span>:${rest.join(':')}`;
          }).join('\n');
          valueContainer.innerHTML = formattedValue;
        } else {
          valueContainer.textContent = fullValue;
        }
        e.target.textContent = 'Show Less';
      } else {
        // Convert the stored plain text back to HTML format for JSON values
        if (truncatedValue.includes(': null') || truncatedValue.includes(': true') || truncatedValue.includes(': false')) {
          const formattedValue = truncatedValue.split('\n').map(line => {
            const [key, ...rest] = line.split(':');
            return `<span class="json-key">${key}</span>:${rest.join(':')}`;
          }).join('\n');
          valueContainer.innerHTML = formattedValue;
        } else {
          valueContainer.textContent = truncatedValue;
        }
        e.target.textContent = 'Show More';
      }
    }
  });

  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = new URL(currentTab.url);
    
    // Get base domain by removing 'www' if present
    const baseDomain = url.hostname.replace(/^www\./, '');
    
    // Create array of possible domain variations
    const domainVariations = [
      url.hostname,          // e.g., "www.peoplebox.biz"
      `.${url.hostname}`,    // e.g., ".www.peoplebox.biz"
      baseDomain,           // e.g., "peoplebox.biz"
      `.${baseDomain}`      // e.g., ".peoplebox.biz"
    ];

    // Fetch cookies for all domain variations
    Promise.all(domainVariations.map(domain => 
      new Promise(resolve => {
        chrome.cookies.getAll({domain}, resolve);
      })
    )).then(cookieArrays => {
      // Merge all cookie arrays and remove duplicates by name
      const cookies = Array.from(
        cookieArrays.flat().reduce((map, cookie) => {
          map.set(cookie.name, cookie);
          return map;
        }, new Map()).values()
      );

      const cookiesContent = document.getElementById('cookies-content');
      if (cookies.length === 0) {
        cookiesContent.innerHTML = '<div class="storage-item">No cookies found</div>';
      } else {
        cookiesContent.innerHTML = cookies.map(cookie => {
          const rawValue = cookie.value;
          const decodedValue = safeDecodeURIComponent(rawValue);
          const displayValue = decodedValue !== rawValue ? decodedValue : rawValue;
          
          return formatStorageItem(cookie.name, displayValue, rawValue, cookie.domain);
        }).join('');
      }
    });

    // Function to be injected into the page to get storage data
    function getStorageData() {
      const localStorage = {};
      const sessionStorage = {};

      try {
        // Get localStorage items
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          localStorage[key] = window.localStorage.getItem(key);
        }

        // Get sessionStorage items
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          sessionStorage[key] = window.sessionStorage.getItem(key);
        }
      } catch (e) {
        console.error('Error accessing storage:', e);
      }

      return { localStorage, sessionStorage };
    }

    // Fetch localStorage and sessionStorage
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: getStorageData,
      world: "MAIN"  // This ensures we run in the main world where we can access the page's storage
    }).then((results) => {
      if (!results || !results[0] || !results[0].result) {
        console.error('Failed to get storage data');
        return;
      }

      const storageData = results[0].result;
      
      // Update localStorage content
      const localStorageContent = document.getElementById('localStorage-content');
      if (Object.keys(storageData.localStorage).length === 0) {
        localStorageContent.innerHTML = '<div class="storage-item">No local storage items found</div>';
      } else {
        localStorageContent.innerHTML = Object.entries(storageData.localStorage).map(([key, value]) => {
          const decodedValue = safeDecodeURIComponent(value);
          const displayValue = decodedValue !== value ? decodedValue : value;
          
          return formatStorageItem(key, displayValue, value);
        }).join('');
      }

      // Update sessionStorage content
      const sessionStorageContent = document.getElementById('sessionStorage-content');
      if (Object.keys(storageData.sessionStorage).length === 0) {
        sessionStorageContent.innerHTML = '<div class="storage-item">No session storage items found</div>';
      } else {
        sessionStorageContent.innerHTML = Object.entries(storageData.sessionStorage).map(([key, value]) => {
          const decodedValue = safeDecodeURIComponent(value);
          const displayValue = decodedValue !== value ? decodedValue : value;
          
          return formatStorageItem(key, displayValue, value);
        }).join('');
      }
    }).catch(error => {
      console.error('Error executing script:', error);
    });
  });
});

// Helper function to format storage items with truncation
function formatStorageItem(key, displayValue, rawValue, domain = null) {
  const maxLength = 200;
  const keySpan = domain 
    ? `<span class="key" title="Domain: ${domain}">${escapeHtml(key)}</span>`
    : `<span class="key">${escapeHtml(key)}</span>`;
  
  // Try to parse JSON if the value looks like a JSON string
  try {
    if ((displayValue.startsWith('{') && displayValue.endsWith('}')) || 
        (displayValue.startsWith('[') && displayValue.endsWith(']'))) {
      const jsonObj = JSON.parse(displayValue);
      
      // Function to format JSON value
      function formatJsonValue(value) {
        if (value === null) return 'null';
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            return '[\n' + value.map(item => '  ' + formatJsonValue(item)).join(',\n') + '\n]';
          }
          const entries = Object.entries(value);
          if (entries.length === 0) return '{}';
          return '{\n' + entries.map(([k, v]) => `  <span class="json-key">${k}</span>: ${formatJsonValue(v)}`).join(',\n') + '\n}';
        }
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
      }

      // Function to format JSON value as plain text (for data attributes)
      function formatJsonValuePlain(value) {
        if (value === null) return 'null';
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            return '[\n' + value.map(item => '  ' + formatJsonValuePlain(item)).join(',\n') + '\n]';
          }
          const entries = Object.entries(value);
          if (entries.length === 0) return '{}';
          return '{\n' + entries.map(([k, v]) => `  ${k}: ${formatJsonValuePlain(v)}`).join(',\n') + '\n}';
        }
        if (typeof value === 'string') return `"${value}"`;
        return String(value);
      }

      // For arrays, truncate the number of items instead of characters
      if (Array.isArray(jsonObj)) {
        const maxItems = 5;
        if (jsonObj.length > maxItems) {
          const truncatedArray = jsonObj.slice(0, maxItems);
          const truncatedHtml = formatJsonValue(truncatedArray);
          const truncatedText = formatJsonValuePlain(truncatedArray);
          const fullHtml = formatJsonValue(jsonObj);
          const fullText = formatJsonValuePlain(jsonObj);

          return `
            <div class="storage-item">
              ${keySpan}
              <div class="value-container">
                <span class="value" 
                      title="Raw value: ${escapeHtml(rawValue)}"
                      data-full-value="${escapeHtml(fullText)}"
                      data-truncated-value="${escapeHtml(truncatedText)}"
                      style="white-space: pre-line">${truncatedHtml}</span>
                <button class="show-more-btn">Show More</button>
              </div>
            </div>
          `;
        }
      }

      // For non-array JSON, use character length
      const formattedText = formatJsonValuePlain(jsonObj);
      const formattedHtml = formatJsonValue(jsonObj);

      if (formattedText.length > maxLength) {
        // For objects, truncate by character length but ensure we don't break the JSON structure
        const truncatedObj = {};
        let currentLength = 0;
        for (const [k, v] of Object.entries(jsonObj)) {
          const entryText = `"${k}":${JSON.stringify(v)}`;
          if (currentLength + entryText.length > maxLength) break;
          truncatedObj[k] = v;
          currentLength += entryText.length;
        }

        const truncatedHtml = formatJsonValue(truncatedObj);
        const truncatedText = formatJsonValuePlain(truncatedObj);

        return `
          <div class="storage-item">
            ${keySpan}
            <div class="value-container">
              <span class="value" 
                    title="Raw value: ${escapeHtml(rawValue)}"
                    data-full-value="${escapeHtml(formattedText)}"
                    data-truncated-value="${escapeHtml(truncatedText)}"
                    style="white-space: pre-line">${truncatedHtml}</span>
              <button class="show-more-btn">Show More</button>
            </div>
          </div>
        `;
      }

      // If not truncated, show the full formatted value
      return `
        <div class="storage-item">
          ${keySpan}
          <span class="value" 
                title="Raw value: ${escapeHtml(rawValue)}"
                style="white-space: pre-line">${formattedHtml}</span>
        </div>
      `;
    }
  } catch (e) {
    // If parsing fails, continue with normal string handling
  }

  // Handle non-JSON values
  const formattedValue = displayValue;
  const truncatedValue = formattedValue.length > maxLength 
    ? formattedValue.substring(0, maxLength) + '...' 
    : formattedValue;

  if (formattedValue.length <= maxLength) {
    return `
      <div class="storage-item">
        ${keySpan}
        <span class="value" title="Raw value: ${escapeHtml(rawValue)}" style="white-space: pre-line">${formattedValue}</span>
      </div>
    `;
  }

  return `
    <div class="storage-item">
      ${keySpan}
      <div class="value-container">
        <span class="value" 
              title="Raw value: ${escapeHtml(rawValue)}"
              data-full-value="${escapeHtml(formattedValue)}"
              data-truncated-value="${escapeHtml(truncatedValue)}"
              style="white-space: pre-line">${truncatedValue}</span>
        <button class="show-more-btn">Show More</button>
      </div>
    </div>
  `;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper function to safely decode URI Component
function safeDecodeURIComponent(str) {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}