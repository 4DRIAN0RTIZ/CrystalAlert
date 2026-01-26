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
| `title` | String | 'Alert' | Main alert title. |
| `text` | String | '' | Descriptive text or message body. |
| `html` | String | '' | HTML content (overrides text). |
| `icon` | String | '' | Icon type: `success`, `error`, `warning`, `info`. |
| `iconHtml` | String | '' | Custom icon HTML (overrides icon). |
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
| `title` | String | '' | Toast title. |
| `text` | String | '' | Toast message. |
| `icon` | String | 'info' | Icon type. |
| `duration` | Number | 3000 | Auto-dismiss in ms (0 = persistent). |
| `position` | String | 'top-right' | Position: `top-right`, `top-left`, `bottom-right`, `bottom-left`. |

## File Sizes

| File | Minified | Gzipped |
|------|----------|---------|
| JS | 5.6 KB | 1.9 KB |
| CSS | 6.1 KB | 1.9 KB |
| **Total** | **11.7 KB** | **3.8 KB** |

## License

MIT License - Created by NeanderTech
