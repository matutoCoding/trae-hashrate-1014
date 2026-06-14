import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-industrial-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
