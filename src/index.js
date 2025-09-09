import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css';
import 'react-day-picker/dist/style.css';
import DashboardView from './components/DashboardView';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DashboardView />
  </React.StrictMode>
);
