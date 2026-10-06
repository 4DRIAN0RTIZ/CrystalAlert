/**
 * CrystalAlert - Lightweight alert & toast library
 * @version 1.0.0
 */
// Slightly above the ~0.4s CSS exit transition.
const TOAST_EXIT_FALLBACK_MS = 600;

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
    this.toastCounter = 0;
    this.toasts = new Map();
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
   * @param {boolean} [options.pauseOnHover] - Pause the timer while hovered
   * @param {boolean} [options.showCloseButton] - Show a dismiss button
   * @param {function} [options.onClose] - Callback receiving the dismiss reason
   * @returns {{id: string, close: function, update: function, closed: Promise}} Toast handle
   */
  toast(options = {}) {
    this.ensureDom();

    const id = `ca-toast-${++this.toastCounter}`;
    let resolveClosed;
    const state = {
      id,
      options: {
        title: '',
        text: '',
        html: '',
        icon: 'info',
        iconHtml: '',
        duration: 3000,
        position: 'top-right',
        pauseOnHover: false,
        showCloseButton: false,
        onClose: null,
        ...options
      },
      element: document.createElement('div'),
      timeout: null,
      timerStartedAt: null,
      remainingDuration: null,
      hovered: false,
      closing: false,
      closed: new Promise((resolve) => { resolveClosed = resolve; }),
      resolveClosed
    };
    state.element.className = 'ca-toast';
    state.element.dataset.toastId = id;
    this.toasts.set(id, state);
    this.toastContainer.appendChild(state.element);
    state.element.addEventListener('click', (event) => {
      const reason = event.target.closest('.ca-toast-close') ? 'button' : 'click';
      this.closeToast(id, reason);
    });
    state.element.addEventListener('mouseenter', () => {
      state.hovered = true;
      this.pauseToastTimer(id);
    });
    state.element.addEventListener('mouseleave', () => {
      state.hovered = false;
      this.resumeToastTimer(id);
    });
    this.renderToast(state);

    return this.createToastHandle(state);
  }

  createToastHandle(state) {
    return {
      id: state.id,
      close: () => this.closeToast(state.id),
      update: (nextOptions = {}) => this.updateToast(state.id, nextOptions),
      closed: state.closed
    };
  }

  renderToast(state) {
    const {
      title,
      text,
      html,
      icon,
      iconHtml,
      duration,
      position,
      showCloseButton
    } = state.options;

    // Only touch the container class when the position actually changes,
    // otherwise every call reflows the container and visible toasts jump.
    if (this.toastPosition !== position) {
      this.toastContainer.className = `ca-toast-container ca-${position}`;
      this.toastPosition = position;
    }

    const iconColors = {
      success: '#059669',
      error: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    };
    const iconColor = iconColors[icon] || '#333';
    const iconMarkup = iconHtml
      ? `<div class="ca-toast-icon">${iconHtml}</div>`
      : `<div class="ca-toast-icon" style="color: ${iconColor}">${this.getIconSVG(icon)}</div>`;
    const content = html || (text ? '<p class="ca-toast-text"></p>' : '');
    const closeButton = showCloseButton
      ? '<button type="button" class="ca-toast-close" aria-label="Close">&times;</button>'
      : '';
    const progressBar = duration > 0
      ? `<div class="ca-progress-bar" style="transition: width ${duration}ms linear; width: 100%;"></div>`
      : '';

    this.clearToastTimer(state);
    state.remainingDuration = duration;
    state.element.classList.remove('hide');
    state.element.innerHTML = `
      ${iconMarkup}
      <div class="ca-toast-content">
        <h3 class="ca-toast-title"></h3>
        ${content}
      </div>
      ${closeButton}
      ${progressBar}
    `;
    state.element.querySelector('.ca-toast-title').textContent = title;

    if (!html && text) {
      const textEl = state.element.querySelector('.ca-toast-text');
      if (textEl) textEl.textContent = text;
    }

    if (duration > 0) {
      this.startToastTimer(state);
      if (state.hovered && state.options.pauseOnHover) this.pauseToastTimer(state.id);
    }
  }

  clearToastTimer(state) {
    if (state.timeout) clearTimeout(state.timeout);
    state.timeout = null;
    state.timerStartedAt = null;
  }

  startToastTimer(state) {
    this.clearToastTimer(state);
    if (state.remainingDuration <= 0 || state.closing) {
      if (state.remainingDuration <= 0) this.closeToast(state.id, 'timer');
      return;
    }

    state.timerStartedAt = Date.now();
    const duration = state.remainingDuration;
    state.timeout = setTimeout(() => this.closeToast(state.id, 'timer'), duration);
    requestAnimationFrame(() => {
      if (state.closing || state.hovered) return;
      const bar = state.element.querySelector('.ca-progress-bar');
      if (bar) {
        bar.style.transition = `width ${duration}ms linear`;
        bar.style.width = '0%';
      }
    });
  }

  pauseToastTimer(id) {
    const state = this.toasts.get(id);
    if (!state || state.closing || !state.options.pauseOnHover || !state.timeout) return;

    const elapsed = Date.now() - state.timerStartedAt;
    state.remainingDuration = Math.max(0, state.remainingDuration - elapsed);
    this.clearToastTimer(state);
    const bar = state.element.querySelector('.ca-progress-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = `${(state.remainingDuration / state.options.duration) * 100}%`;
    }
  }

  resumeToastTimer(id) {
    const state = this.toasts.get(id);
    if (!state || state.closing || !state.options.pauseOnHover || !(state.options.duration > 0) || state.timeout) return;

    if (state.remainingDuration > 0) this.startToastTimer(state);
    else this.closeToast(id, 'timer');
  }

  updateToast(id, options = {}) {
    const state = this.toasts.get(id);
    if (!state || state.closing) return null;
    state.options = { ...state.options, ...options };
    this.renderToast(state);
    return this.createToastHandle(state);
  }

  closeToast(id, reason = 'programmatic') {
    const state = this.toasts.get(id);
    if (!state || state.closing) return false;

    state.closing = true;
    this.clearToastTimer(state);
    state.element.classList.add('hide');
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      clearTimeout(fallbackTimer);
      state.element.removeEventListener('transitionend', onTransitionEnd);
      if (state.element.parentElement) state.element.remove();
      this.toasts.delete(id);
      if (state.options.onClose && typeof state.options.onClose === 'function') {
        try {
          state.options.onClose(reason);
        } catch (error) {
          console.error('CrystalAlert toast onClose error:', error);
        }
      }
      state.resolveClosed(reason);
    };
    const onTransitionEnd = (event) => {
      if (event.target === state.element) finalize();
    };
    // Safety net: no transitionend fires with transition:none, reduced motion,
    // hidden tabs or display:none.
    const fallbackTimer = setTimeout(finalize, TOAST_EXIT_FALLBACK_MS);
    state.element.addEventListener('transitionend', onTransitionEnd);
    return true;
  }

  /**
   * Close every active toast, preserving each toast's exit animation.
   */
  closeAllToasts() {
    for (const id of this.toasts.keys()) this.closeToast(id);
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
