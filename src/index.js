import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'leaflet/dist/leaflet.css'; // 지도 UI 복원을 위해 필수적인 CSS import
import 'react-day-picker/dist/style.css'; 
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
