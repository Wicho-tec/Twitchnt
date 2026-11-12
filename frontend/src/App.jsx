import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import Home from './pages/Home';
import WatchChannel from './pages/WatchChannel';
import Studio from './pages/Studio';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-twitch-bg flex flex-col text-twitch-text">
          <Navbar />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-y-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/:username" element={<WatchChannel />} />
              </Routes>
            </main>
          </div>
          <LoginModal />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
