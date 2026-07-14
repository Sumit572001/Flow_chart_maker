import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';

export type PageType = 'dashboard' | 'editor';

const App: React.FC = () => {
  const [page, setPage] = useState<PageType>('dashboard');

  const navigateTo = (targetPage: PageType) => {
    setPage(targetPage);
  };

  switch (page) {
    case 'editor':
      return <Editor navigateTo={navigateTo} />;
    case 'dashboard':
    default:
      return <Dashboard navigateTo={navigateTo} />;
  }
};

export default App;
