/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/bots" element={<Dashboard initialTab="bots" />} />
        <Route path="/dashboard/panels" element={<Dashboard initialTab="management" />} />
        <Route path="/dashboard/operation" element={<Dashboard initialTab="operation" />} />
      </Routes>
    </BrowserRouter>
  );
}
