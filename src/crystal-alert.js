/**
 * CrystalAlert - Lightweight alert & toast library
 * @version 1.0.0
 */
class CrystalAlert {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.toastContainer = null;
    this.activeElement = null;
    this.currentTheme = 'default';
    this.themeStylesheet = null;
    this.themePath = 'themes/';
    this.toastPosition = null;
    this.timer = null;
    this.modalQueue = [];
    this.modalActive = false;
  }

  // Builds the DOM lazily on the first fire()/toast(). Doing it in the
  // constructor breaks when the script loads in <head>, where document.body
  // is still null at import time.
  ensureDom() {
    if (this.overlay && this.toastContainer) return;

    this.overlay = document.querySelector('.ca-overlay');
    if (this.overlay) {
      this.modal = this.overlay.querySelector('.ca-modal');
    } else {
      this.overlay = document.createElement('div');
      this.overlay.className = 'ca-overlay';

      this.modal = document.createElement('div');
      this.modal.className = 'ca-modal';
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-modal', 'true');

      this.overlay.appendChild(this.modal);
      document.body.appendChild(this.overlay);

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close(null);
        }
      });
    }

    this.toastContainer = document.querySelector('.ca-toast-container');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'ca-toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  /**
   * Configure the path where theme CSS files are located
   * @param {string} path - Path to themes directory (with trailing slash)
   */
  setThemePath(path) {
    this.themePath = path.endsWith('/') ? path : path + '/';
  }

  /**
   * Set the active theme by loading its CSS file
   * @param {string} name - Theme name (default, dark, minimal, or custom)
   * @returns {Promise} Resolves when theme is loaded
   */
  setTheme(name) {
    return new Promise((resolve, reject) => {
      // Remove any existing theme stylesheet, including one from a previous
      // setTheme() call whose onload has not fired yet (avoids duplicate
      // <link id="ca-theme-stylesheet"> on rapid successive calls).
      if (this.themeStylesheet) this.themeStylesheet.remove();
      const stale = document.getElementById('ca-theme-stylesheet');
      if (stale) stale.remove();
      this.themeStylesheet = null;

      // Default theme uses base styles, no additional CSS needed
      if (name === 'default' || name === 'light') {
        this.currentTheme = 'default';
        resolve();
        return;
      }

      // Load theme CSS file
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${this.themePath}crystal-alert-${name}.css`;
      link.id = 'ca-theme-stylesheet';
      this.themeStylesheet = link;

      link.onload = () => {
        this.currentTheme = name;
        resolve();
      };

      link.onerror = () => {
        console.warn(`CrystalAlert: Theme "${name}" not found at ${link.href}`);
        reject(new Error(`Theme "${name}" not found`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Get the current theme name
   * @returns {string} Current theme name
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Main Alert Method
   * @param {object} options
   * @param {string} options.title - Alert title
   * @param {string} [options.text] - Plain text content
   * @param {string} [options.html] - HTML content (overrides text)
   * @param {string} [options.icon] - Built-in icon: success, error, warning, info
   * @param {string} [options.iconHtml] - Custom icon HTML (overrides icon)
   * @param {number} [options.timer] - Auto-close duration in milliseconds (0 = disabled)
   * @param {boolean} [options.timerProgressBar] - Show remaining timer progress
   * @param {string} [options.confirmButtonText] - Confirm button label
   * @param {boolean} [options.showCancelButton] - Show cancel button
   * @param {string} [options.cancelButtonText] - Cancel button label
   * @param {boolean} [options.showCloseButton] - Show X close button
   * @param {function} [options.preConfirm] - Async function before confirm
   * @param {function} [options.onOpen] - Callback when modal opens
   * @param {function} [options.onClose] - Callback when modal closes
   */
  fire(options = {}) {
    return new Promise((resolve) => {
      this.modalQueue.push({ options, resolve });
      this.processModalQueue();
    });
  }

  processModalQueue() {
    if (this.modalActive || this.modalQueue.length === 0) return;

    const { options, resolve } = this.modalQueue.shift();
    this.showModal(options, resolve);
  }

  showModal({
    title = 'Alert',
    text = '',
    html = '',
    icon = '',
    iconHtml = '',
    input = null,
    inputPlaceholder = '',
    inputValue = '',
    inputOptions = [],
    inputValidator = null,
    timer = 0,
    timerProgressBar = false,
    confirmButtonText = 'OK',
    showCancelButton = false,
    cancelButtonText = 'Cancel',
    showCloseButton = false,
    preConfirm = null,
    onOpen = null,
    onClose = null
  } = {}, resolvePromise) {
    this.ensureDom();
    this.modalActive = true;
    this.activeElement = document.activeElement;
    this.resolvePromise = resolvePromise;
    this.onCloseCallback = onClose;

    let iconMarkup = '';
    if (iconHtml) {
      iconMarkup = `<div class="ca-icon custom">${iconHtml}</div>`;
    } else if (icon) {
      iconMarkup = `<div class="ca-icon ${icon}">${this.getIconSVG(icon)}</div>`;
    }

    const content = html || (text ? '<p class="ca-text"></p>' : '');
    const closeBtn = showCloseButton
      ? `<button class="ca-close" aria-label="Close">&times;</button>`
      : '';
    let buttonsHtml = `
      <button class="ca-btn ca-btn-confirm">
        <span class="ca-btn-text">${confirmButtonText}</span>
        <div class="ca-spinner"></div>
      </button>
    `;

    if (showCancelButton) {
      buttonsHtml = `
        <button class="ca-btn ca-btn-cancel">${cancelButtonText}</button>
        ${buttonsHtml}
      `;
    }

    this.modal.innerHTML = `
        ${closeBtn}
        ${iconMarkup}
        <h2 class="ca-title"></h2>
        ${content}
        ${input ? '<div class="ca-input-container"></div>' : ''}
        ${timer > 0 && timerProgressBar ? '<div class="ca-progress-bar ca-modal-progress"></div>' : ''}
        <div class="ca-actions">
          ${buttonsHtml}
        </div>
      `;

    this.modal.querySelector('.ca-title').textContent = title;

    if (!html && text) {
      const textEl = this.modal.querySelector('.ca-text');
      if (textEl) textEl.textContent = text;
    }

    let inputElement = null;
    if (input) {
      inputElement = this.createInput({
        type: input === true ? 'text' : input,
        placeholder: inputPlaceholder,
        value: inputValue,
        options: inputOptions
      });
      this.modal.querySelector('.ca-input-container').appendChild(inputElement);
    }

    const confirmBtn = this.modal.querySelector('.ca-btn-confirm');
    const cancelBtn = this.modal.querySelector('.ca-btn-cancel');
    const closeBtnEl = this.modal.querySelector('.ca-close');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
          const value = inputElement ? this.getInputValue(inputElement) : true;
          this.hideValidationMessage();
          confirmBtn.classList.add('ca-loading');
          confirmBtn.disabled = true;
          if (cancelBtn) cancelBtn.disabled = true;

          try {
            if (inputValidator && typeof inputValidator === 'function') {
              const validationMessage = await inputValidator(value);
              if (validationMessage) {
                this.showValidationMessage(validationMessage);
                confirmBtn.classList.remove('ca-loading');
                confirmBtn.disabled = false;
                if (cancelBtn) cancelBtn.disabled = false;
                return;
              }
            }

            if (preConfirm && typeof preConfirm === 'function') {
              const result = await preConfirm(inputElement ? value : undefined);
              this.close(result !== undefined ? result : value);
            } else {
              this.close(value);
            }
          } catch (error) {
            confirmBtn.classList.remove('ca-loading');
            confirmBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            console.error('CrystalAlert preConfirm error:', error);
          }
        };
        confirmBtn.focus();
      }

    if (cancelBtn) {
      cancelBtn.onclick = () => this.close(false);
    }

    if (closeBtnEl) {
      closeBtnEl.onclick = () => this.close(null);
    }

    this._escHandler = (e) => {
      if (e.key === 'Escape') this.close(null);
    };
    document.addEventListener('keydown', this._escHandler);

    this.overlay.classList.add('ca-show');

    if (onOpen && typeof onOpen === 'function') {
      onOpen(this.modal);
    }

    if (timer > 0) {
      this.timer = setTimeout(() => this.close({ dismiss: 'timer' }), timer);
      if (timerProgressBar) {
        const progressBar = this.modal.querySelector('.ca-modal-progress');
        if (progressBar) {
          progressBar.style.transition = `width ${timer}ms linear`;
          requestAnimationFrame(() => {
            progressBar.style.width = '0%';
          });
        }
      }
    }
  }

  createInput({ type, placeholder, value, options }) {
    const element = type === 'textarea' || type === 'select'
      ? document.createElement(type)
      : document.createElement('input');

    element.className = 'ca-input';
    if (type !== 'textarea' && type !== 'select') {
      element.type = type;
    }
    if (placeholder) element.placeholder = placeholder;

    if (type === 'select') {
      for (const option of options || []) {
        const optionElement = document.createElement('option');
        const optionValue = typeof option === 'object' ? option.value : option;
        optionElement.value = optionValue;
        optionElement.textContent = typeof option === 'object'
          ? (option.label ?? option.value)
          : option;
        element.appendChild(optionElement);
      }
      if (value !== '') element.value = value;
    } else if (type === 'checkbox') {
      element.checked = Boolean(value);
    } else if (value !== undefined && value !== null) {
      element.value = value;
    }

    return element;
  }

  getInputValue(inputElement) {
    return inputElement.type === 'checkbox'
      ? inputElement.checked
      : inputElement.value;
  }

  showValidationMessage(message) {
    let messageElement = this.modal.querySelector('.ca-validation-message');
    if (!messageElement) {
      messageElement = document.createElement('p');
      messageElement.className = 'ca-validation-message';
      this.modal.querySelector('.ca-input-container').appendChild(messageElement);
    }
    messageElement.textContent = message;
  }

  hideValidationMessage() {
    const messageElement = this.modal && this.modal.querySelector('.ca-validation-message');
    if (messageElement) messageElement.remove();
  }

  prompt(title, options = {}) {
    return this.fire({
      ...options,
      title,
      input: options.input || 'text'
    });
  }

  close(result) {
    if (!this.modalActive) return;

    document.removeEventListener('keydown', this._escHandler);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.overlay) this.overlay.classList.remove('ca-show');

    const onCloseCallback = this.onCloseCallback;
    const resolvePromise = this.resolvePromise;
    const activeElement = this.activeElement;
    this.modalActive = false;
    this.onCloseCallback = null;
    this.resolvePromise = null;
    this.activeElement = null;

    // Must match the .ca-modal exit transition (transform 0.4s) in
    // crystal-alert-styles.css so focus/promise settle after it finishes.
    setTimeout(() => {
      if (onCloseCallback && typeof onCloseCallback === 'function') {
        onCloseCallback(result);
      }
      if (resolvePromise) resolvePromise(result);
      if (activeElement) activeElement.focus();
      this.processModalQueue();
    }, 400);
  }

  /**
   * Toast Notification
   * @param {object} options
   * @param {string} options.title - Toast title
   * @param {string} [options.text] - Toast text
   * @param {string} [options.html] - HTML content (overrides text)
   * @param {string} [options.icon] - Built-in icon
   * @param {string} [options.iconHtml] - Custom icon HTML
   * @param {number} [options.duration] - Auto-dismiss in ms (0 = persistent)
   * @param {string} [options.position] - Position: top-right, top-left, bottom-right, bottom-left
   */
  toast({
    title = '',
    text = '',
    html = '',
    icon = 'info',
    iconHtml = '',
    duration = 3000,
    position = 'top-right'
  } = {}) {
    this.ensureDom();

    // Only touch the container class when the position actually changes,
    // otherwise every call reflows the container and visible toasts jump.
    if (this.toastPosition !== position) {
      this.toastContainer.className = `ca-toast-container ca-${position}`;
      this.toastPosition = position;
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'ca-toast';

    const iconColors = {
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    };
    const iconColor = iconColors[icon] || '#333';

    // Icon markup
    const iconMarkup = iconHtml
      ? `<div class="ca-toast-icon">${iconHtml}</div>`
      : `<div class="ca-toast-icon" style="color: ${iconColor}">${this.getIconSVG(icon)}</div>`;

    // Content: html takes priority over text; text goes in via textContent (see below)
    const content = html || (text ? '<p class="ca-toast-text"></p>' : '');

    // Progress bar only if duration > 0
    const progressBar = duration > 0
      ? `<div class="ca-progress-bar" style="transition: width ${duration}ms linear; width: 100%;"></div>`
      : '';

    toastEl.innerHTML = `
      ${iconMarkup}
      <div class="ca-toast-content">
        <h3 class="ca-toast-title"></h3>
        ${content}
      </div>
      ${progressBar}
    `;

    toastEl.querySelector('.ca-toast-title').textContent = title;

    if (!html && text) {
      const textEl = toastEl.querySelector('.ca-toast-text');
      if (textEl) textEl.textContent = text;
    }

    this.toastContainer.appendChild(toastEl);

    // Animate progress bar
    if (duration > 0) {
      requestAnimationFrame(() => {
        const bar = toastEl.querySelector('.ca-progress-bar');
        if (bar) bar.style.width = '0%';
      });
    }

    let timeout;
    const removeToast = () => {
      toastEl.classList.add('hide');
      toastEl.addEventListener('transitionend', () => {
        if (toastEl.parentElement) toastEl.remove();
      });
    };

    if (duration > 0) {
      timeout = setTimeout(removeToast, duration);
    }

    toastEl.addEventListener('click', () => {
      if (timeout) clearTimeout(timeout);
      removeToast();
    });

    return toastEl;
  }

  getIconSVG(type) {
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    return icons[type] || '';
  }
}

const Crystal = new CrystalAlert();
