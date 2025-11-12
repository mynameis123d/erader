# Settings Page

The Settings Page is a comprehensive UI component for managing all ebook reader preferences. It provides an intuitive interface for customizing appearance, reading preferences, translation settings, and data management.

## Features

### Appearance Settings
- **Theme Selection**: Choose from Light, Dark, Sepia, or Custom themes
- **Font Customization**: 
  - Font family selection (Georgia, Times New Roman, Palatino, Arial, Helvetica, Verdana, Courier New)
  - Font size adjustment (12-32px)
  - Line height control (1.0-2.5)
- **Layout Control**:
  - Horizontal and vertical margins (0-100px)
  - Text alignment (left, center, right, justify)
- **Custom Theme**: When "Custom" theme is selected, users can pick custom background and text colors

### Reading Settings
- **Default Page Layout**: Single page, double page, or scroll
- **Reading Mode**: Paginated or continuous
- **History Retention**: Configure how long to keep reading history (7-365 days)
- **Page Transitions**: Enable or disable page transition animations
- **Auto-save Progress**: Toggle automatic progress saving

### Translation Settings
- **Enable/Disable Translation**: Toggle translation feature
- **Preferred Language**: Set target language for translations
- **Translation Provider**: Choose between Google Translate, DeepL, or Custom provider
- **API Key Management**: 
  - Secure input field with show/hide toggle
  - Masked by default for security
  - Persisted in settings store

### Data Management
- **Settings Backup**:
  - Export settings to JSON file
  - Import settings from JSON file
- **Library Metadata**:
  - Export library metadata (books, collections, activity)
  - Import library metadata from backup
- **Analytics**: Toggle analytics collection
- **Reset to Defaults**: Reset all settings with confirmation dialog

### About Section
- Display app version
- Show last sync date
- App information

## Usage

### Basic Implementation

```tsx
import { SettingsPage } from './src/components';
import { initializeStores } from './src/init';

async function App() {
  await initializeStores();
  
  return <SettingsPage />;
}
```

### With React Router

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SettingsPage } from './src/components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Standalone Demo

A demo file is provided at `src/demo.tsx` that shows how to use the SettingsPage as a standalone application:

```bash
# Install dependencies
npm install

# Run demo (requires a bundler like Vite, webpack, or parcel)
```

## Features Implementation

### Immediate Preview
All appearance changes are immediately applied to the root document element via CSS custom properties. This provides instant visual feedback without requiring a page refresh.

### Secure API Key Handling
- API keys are stored in the settings store
- Input field is masked by default (password type)
- Toggle button to show/hide the key
- Keys are persisted with other settings

### Export/Import Functionality
All export/import operations use JSON format and trigger automatic file downloads. Import operations include error handling with user-friendly alerts.

### Reset Confirmation
The reset button requires a double-click confirmation to prevent accidental resets. After the first click, the button changes appearance and shows "Click again to confirm" for 5 seconds.

## Responsive Design

The settings page is fully responsive with breakpoints at:
- **Desktop (≥768px)**: Two-column grid layout for settings
- **Mobile (<768px)**: Single-column layout with full-width buttons

## Theme Support

The component automatically applies theme classes to the document root:
- `.theme-light`
- `.theme-dark`
- `.theme-sepia`
- `.theme-custom`

CSS custom properties are used for dynamic theming:
- `--bg-color`: Background color
- `--text-color`: Text color
- `--font-size`: Font size
- `--font-family`: Font family
- `--line-height`: Line height

## Store Integration

The SettingsPage component integrates with three main stores:

1. **Settings Store** (`useSettingsStore`):
   - Theme, translation, and reading preferences
   - Export/import settings
   - Reset functionality

2. **Library Store** (`useLibraryStore`):
   - Export/import library metadata
   - Preserve book collections and activity

3. **Reader Store** (indirectly):
   - Theme changes affect active reading sessions

## Accessibility

- All form controls have associated labels
- Keyboard navigation is fully supported
- Color contrast ratios meet WCAG guidelines
- Focus states are clearly visible

## Browser Compatibility

- Modern browsers with ES2022 support
- CSS Grid and Flexbox
- FileReader API for import functionality
- Blob and URL.createObjectURL for export functionality

## Future Enhancements

Potential improvements for the settings page:
- Keyboard shortcuts configuration
- Theme preview before applying
- More granular reading preferences
- Cloud sync integration
- Settings profiles (multiple preset configurations)
- Import/export with encryption
- Settings search functionality
