import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/ui.jsx';
import './index.css';

// Vite sets BASE_URL from --base: "/" when Express serves the app, "/kireai/"
// on GitHub Pages. React Router needs that prefix to match the routes.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

// GitHub Pages is a static file host: a deep link such as /kireai/app/dashboard
// has no file behind it, so it answers 404 (with the SPA shell). The static
// build keeps the route in the hash instead, so every URL is a real 200 and a
// reload never depends on the 404 fallback.
const isPages = import.meta.env.MODE === 'pages';
const Router = isPages ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router {...(isPages ? {} : { basename })}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>,
);
