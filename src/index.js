import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './dashboard.css'; // 새로 추가된 CSS 파일
import 'leaflet/dist/leaflet.css';
import 'react-calendar/dist/Calendar.css'; // 캘린더 CSS
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
