/**
 * Linkora — Frontend Application Logic
 * Integrates with FastAPI URL Shortener API
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const shortenForm = document.getElementById('shorten-form');
  const urlInput = document.getElementById('url-input');
  const shortenButton = document.getElementById('shorten-button');
  const validationMessage = document.getElementById('validation-message');
  
  const resultCard = document.getElementById('result-card');
  const shortUrlLink = document.getElementById('short-url-link');
  const originalUrlText = document.getElementById('original-url-text');
  const copyButton = document.getElementById('copy-button');
  const copyButtonText = document.getElementById('copy-button-text');
  
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  let currentShortUrl = '';
  let toastTimeout = null;

  /**
   * Display an inline validation or error message safely (without innerHTML).
   * @param {string} message 
   */
  function showError(message) {
    if (!validationMessage) return;
    validationMessage.textContent = message;
    validationMessage.className = 'validation-message is-error';
  }

  /**
   * Clear the inline validation error message.
   */
  function clearError() {
    if (!validationMessage) return;
    validationMessage.textContent = '';
    validationMessage.className = 'validation-message';
  }

  /**
   * Toggle the loading state of the submit button and input.
   * @param {boolean} isLoading 
   */
  function setLoading(isLoading) {
    if (!shortenButton || !urlInput) return;
    if (isLoading) {
      shortenButton.classList.add('is-loading');
      shortenButton.disabled = true;
      urlInput.disabled = true;
    } else {
      shortenButton.classList.remove('is-loading');
      shortenButton.disabled = false;
      urlInput.disabled = false;
    }
  }

  /**
   * Display floating toast notification.
   * @param {string} msg 
   */
  function showToast(msg) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = msg;
    toast.classList.add('show');

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  /**
   * Form Submission Handler
   */
  shortenForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();

    const rawUrl = urlInput.value ? urlInput.value.trim() : '';

    // 1. Client-side empty validation
    if (!rawUrl) {
      showError('Please paste a URL before shortening.');
      urlInput.focus();
      return;
    }

    // 2. Client-side quick protocol check
    const lowerUrl = rawUrl.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      showError("Unsupported URL scheme. URLs must start with 'http://' or 'https://'.");
      urlInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ url: rawUrl }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Parse error messages from FastAPI / Pydantic validation
        let errorMessage = 'Failed to shorten URL. Please check the URL and try again.';

        if (data && data.detail) {
          if (Array.isArray(data.detail) && data.detail.length > 0) {
            // Pydantic validation error list
            const firstError = data.detail[0];
            errorMessage = firstError.msg || errorMessage;
            // Clean up common "Value error, " prefix if present
            if (errorMessage.startsWith('Value error, ')) {
              errorMessage = errorMessage.substring(13);
            }
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
        }

        showError(errorMessage);
        return;
      }

      // Success
      if (data && data.short_url) {
        currentShortUrl = data.short_url;

        // Populate Result Card safely
        shortUrlLink.textContent = data.short_url;
        shortUrlLink.href = data.short_url;
        originalUrlText.textContent = data.original_url || rawUrl;

        // Reset copy button text
        copyButtonText.textContent = 'Copy Link';

        // Reveal the result card smoothly
        resultCard.classList.remove('hidden');

        // Scroll result card into view if needed
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        showError('Received an unexpected response from the server.');
      }
    } catch (networkError) {
      showError('Unable to connect to the server. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  });

  /**
   * Copy Link to Clipboard
   */
  copyButton.addEventListener('click', async () => {
    if (!currentShortUrl) return;

    let copied = false;

    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(currentShortUrl);
        copied = true;
      } catch (err) {
        copied = false;
      }
    }

    // Fallback for non-secure contexts or permission restrictions
    if (!copied) {
      try {
        const tempInput = document.createElement('input');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        tempInput.value = currentShortUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        copied = document.execCommand('copy');
        document.body.removeChild(tempInput);
      } catch (fallbackErr) {
        copied = false;
      }
    }

    if (copied) {
      copyButtonText.textContent = 'Copied! ✓';
      showToast('Link copied to clipboard!');
      setTimeout(() => {
        if (copyButtonText) {
          copyButtonText.textContent = 'Copy Link';
        }
      }, 2500);
    } else {
      showToast('Could not auto-copy. Please copy link manually.');
    }
  });
});
