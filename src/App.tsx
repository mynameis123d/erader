import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { Library } from './pages/Library';
import { Reader } from './pages/Reader';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<Library />} />
          <Route path="/reader/:bookId" element={<Reader />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
