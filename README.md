# CrystalAlert

A modern, lightweight alert and toast notification system for the web, designed with a **Glassmorphism** aesthetic.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Size](https://img.shields.io/badge/gzip-<4kb-success.svg)

## Features

- **Glassmorphism Design:** Frosted glass effect with smooth shadows and translucent borders.
- **Zero Dependencies:** Pure Vanilla JS and CSS. No external libraries required.
- **Smart Async Buttons:** Automatic loading states (spinners) on confirm buttons when using Promises.
- **Built-in Toasts:** Non-blocking notification system that stacks automatically.
- **Smooth Animations:** Elegant entrance transitions and animated SVG icons.
- **Theme Support:** Includes dark and minimal themes, easy to customize.

## Installation

### CDN (jsDelivr)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/4DRIAN0RTIZ/CrystalAlert@v1.0.0/dist/crystal-alert.min.css">
<script src="https://cdn.jsdelivr.net/gh/4DRIAN0RTIZ/CrystalAlert@v1.0.0/dist/crystal-alert.min.js"></script>
```

With themes:
```html
<!-- Dark theme -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/4DRIAN0RTIZ/CrystalAlert@v1.0.0/dist/themes/dark.min.css">

<!-- Minimal theme -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/4DRIAN0RTIZ/CrystalAlert@v1.0.0/dist/themes/minimal.min.css">
```

### npm

```bash
npm install crystal-alert
# or
pnpm add crystal-alert
```

```javascript
import 'crystal-alert/dist/crystal-alert.min.css';
import 'crystal-alert/dist/crystal-alert.min.js';
```

### Direct Download

Download the files and include them in your HTML:

```html
<link rel="stylesheet" href="dist/crystal-alert.min.css">
<script src="dist/crystal-alert.min.js"></script>
```

## Usage

### Basic Alerts

```javascript
// Success
Crystal.fire({
    title: 'Well done!',
    text: 'Changes have been saved successfully.',
    icon: 'success'
});

// Error
Crystal.fire({
    title: 'Error',
    text: 'Something went wrong.',
    icon: 'error'
});
```

### Confirmation (Promises)

```javascript
Crystal.fire({
    title: 'Are you sure?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
}).then((result) => {
    if (result) {
        console.log('User confirmed');
    }
});
```

### Queued Modals

Calls to `Crystal.fire()` made while another modal is open are queued in
FIFO order. Each returned promise resolves only after its own modal is
confirmed or dismissed; queued calls never replace an active modal.

```javascript
const first = Crystal.fire({ title: 'First step' });
const second = Crystal.fire({ title: 'Second step' });
```

### Timed Modals

Set `timer` in milliseconds to close a modal automatically. Add
`timerProgressBar: true` to show the remaining time at the bottom of the modal.
A manual confirmation or dismissal cancels the timer. When the timer expires,
the promise resolves with `{ dismiss: 'timer' }`.

```javascript
Crystal.fire({
    title: 'Session expiring',
    text: 'This dialog will close in five seconds.',
    timer: 5000,
    timerProgressBar: true
});
```

### Smart Async

Pass a function that returns a Promise to `preConfirm`. The button will show a spinner automatically and remain disabled until the promise resolves.

```javascript
Crystal.fire({
    title: 'Uploading file...',
    text: 'Please wait',
    icon: 'info',
    confirmButtonText: 'Upload',
    preConfirm: () => {
        return new Promise((resolve) => {
            // Simulate an API request
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }
});
```

### Inputs and Prompts

Use `input` to collect a value without building custom HTML. The supported
input types are `text`, `email`, `password`, `number`, `textarea`, `select`,
and `checkbox`.

```javascript
Crystal.prompt('Subscribe to the newsletter', {
    input: 'email',
    inputPlaceholder: 'you@example.com',
    inputValidator: (email) => email.includes('@') ? '' : 'Enter a valid email.'
}).then((email) => {
    if (email) console.log(`Subscribed: ${email}`);
});
```

For a select, pass `inputOptions` as strings or `{ value, label }` objects.
`preConfirm` receives the input value and can return a transformed value or a
Promise. Validation messages can also be shown from callbacks with
`Crystal.showValidationMessage(message)`.

```javascript
Crystal.fire({
    title: 'Delivery frequency',
    input: 'select',
    inputOptions: [
        { value: 'daily', label: 'Daily digest' },
        { value: 'weekly', label: 'Weekly summary' }
    ],
    inputValue: 'daily'
});
```

### Toasts (Notifications)

Display floating notifications that stack automatically.

```javascript
Crystal.toast({
    title: 'New Message',
    text: 'You have an unread email',
    icon: 'info', // success, error, warning, info
    duration: 3000 // ms (0 = persistent)
});
```

### Themes

CrystalAlert supports multiple themes. Load a theme CSS after the main stylesheet:

```html
<!-- Dark Theme -->
<link rel="stylesheet" href="dist/themes/dark.min.css">

<!-- Minimal Theme -->
<link rel="stylesheet" href="dist/themes/minimal.min.css">
```

Or switch themes programmatically:

```javascript
// Set theme path (if different from default)
Crystal.setThemePath('dist/themes/');

// Apply a theme
Crystal.setTheme('dark');    // Load dark theme
Crystal.setTheme('minimal'); // Load minimal theme
Crystal.setTheme('default'); // Reset to default
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | String | 'Alert' | Main alert title, rendered as **plain text** (not parsed as HTML). |
| `text` | String | '' | Message body, rendered as **plain text** (not parsed as HTML). |
| `html` | String | '' | Trusted HTML content, rendered as markup (overrides `text`). |
| `icon` | String | '' | Icon type: `success`, `error`, `warning`, `info`. |
| `iconHtml` | String | '' | Custom icon HTML (overrides icon). |
| `input` | String | null | Input type: `text`, `email`, `password`, `number`, `textarea`, `select`, or `checkbox`. |
| `inputPlaceholder` | String | '' | Placeholder for the generated input. |
| `inputValue` | String/Boolean | '' | Initial value for the generated input. |
| `inputOptions` | Array | [] | Options for a `select`, as strings or `{ value, label }` objects. |
| `inputValidator` | Function | null | Async or sync validator; return a string to keep the modal open and show an error. |
| `timer` | Number | 0 | Auto-close duration in milliseconds. |
| `timerProgressBar` | Boolean | false | Show a progress bar for the modal timer. |
| `confirmButtonText` | String | 'OK' | Confirm button text. |
| `showCancelButton` | Boolean | false | Show cancel button. |
| `cancelButtonText` | String | 'Cancel' | Cancel button text. |
| `showCloseButton` | Boolean | false | Show close (X) button. |
| `preConfirm` | Function | null | Async function executed before closing. |
| `onOpen` | Function | null | Callback when modal opens. |
| `onClose` | Function | null | Callback when modal closes. |

### Toast Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | String | '' | Toast title, rendered as **plain text** (not parsed as HTML). |
| `text` | String | '' | Toast message, rendered as **plain text** (not parsed as HTML). |
| `html` | String | '' | Trusted HTML content, rendered as markup (overrides `text`). |
| `icon` | String | 'info' | Icon type: `success`, `error`, `warning`, `info`. |
| `iconHtml` | String | '' | Custom icon HTML, rendered as markup (overrides `icon`). |
| `duration` | Number | 3000 | Auto-dismiss in ms (0 = persistent). |
| `position` | String | 'top-right' | Position: `top-right`, `top-left`, `bottom-right`, `bottom-left`. |

### Security: `text` vs `html`

`title` and `text` are always inserted via `textContent`, so any markup in them
(for example `<img src=x onerror=...>`) shows up as literal characters and never
runs. Use them for anything that comes from users or other untrusted input.
`html` and `iconHtml` are the explicit opt-in for trusted markup and are
inserted as-is; never pass unsanitized user input to them.

## File Sizes

| File | Minified | Gzipped |
|------|----------|---------|
| JS | 8.3 KB | 2.7 KB |
| CSS | 6.9 KB | 2.0 KB |
| **Total** | **15.2 KB** | **4.8 KB** |

## Comparison

| | CrystalAlert | SweetAlert2 | Notiflix |
|---|---|---|---|
| Gzipped size | **4.8 KB** | 20.1 KB | 15.9 KB |
| Minified size | **15.2 KB** | 77.3 KB | 88.9 KB |
| Runtime dependencies | 0 | 0 | 0 |
| Alerts and confirms | Yes | Yes | Yes |
| Toasts | Yes | Yes | Yes |
| Promise-based API | Yes | Yes | Callbacks |
| Timers | Yes, with progress bar | Yes, with progress bar | Toast timeout |
| Prompts and inputs | 7 types (text, email, password, number, textarea, select, checkbox) | More (adds radio, range, file, date and others) | Single text prompt |
| Loading, report and block UI | Async button spinner only | Loading state on buttons | Yes, dedicated modules |
| Theming | CSS variables, dark and minimal themes | CSS and official theme packages | Options object |

Sizes are gzip -9 of the official CDN bundles (CrystalAlert JS + CSS; SweetAlert2 v11.26.25 `sweetalert2.all.min.js`; Notiflix v3.2.8 `notiflix-aio`), measured Oct 2026, 1 KB = 1024 B. CrystalAlert is about 4x smaller than SweetAlert2 and 3x smaller than Notiflix, but SweetAlert2 offers a broader feature set.

## License

MIT License - Created by NeanderTech. See [LICENSE](LICENSE).
