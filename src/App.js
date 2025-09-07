import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { DayPicker } from 'react-day-picker';
import { ko } from 'date-fns/locale';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, TestTube2, BrainCircuit, Eraser, Lightbulb, RefreshCw, PlayCircle, MapPin, Edit3, Compass, Activity, Calendar as CalendarIcon, MoreVertical, X, Edit } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'react-day-picker/dist/style.css';

// --- Helper Functions ---
const getErrorColor = (error, threshold = 10.0) => { if (error > threshold) return '#f87171'; if (error > threshold * 0.7) return '#facc15'; return '#4ade80'; };
const getSuccessScoreInfo = (score) => { if (score >= 8) return { label: "성공", color: "text-green-400", dotClass: "bg-green-500" }; if (score >= 4) return { label: "보통", color: "text-yellow-400", dotClass: "bg-yellow-500" }; return { label: "실패", color: "text-red-400", dotClass: "bg-red-500" }; };
const formatDate = (dateString, format = 'full') => { if (!dateString) return 'N/A'; const date = new Date(dateString); const options = { full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, time: { hour: '2-digit', minute: '2-digit', hour12: false }, date: { year: 'numeric', month: 'long', day: 'numeric' }}; return date.toLocaleString('ko-KR', options[format]); };
const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
const getPointOnBezierCurve = (t, p0, p1, p2) => { const [x0, y0] = p0; const [x1, y1] = p1; const [x2, y2] = p2; const u = 1 - t; const tt = t * t; const uu = u * u; const x = uu * x0 + 2 * u * t * x1 + tt * x2; const y = uu * y0 + 2 * u * t * y1 + tt * y2; return [x, y]; };
const generateForecastData = () => { const data = []; const now = new Date(); now.setHours(now.getHours() - 12, 0, 0, 0); for (let i = 0; i < 24; i++) { now.setHours(now.getHours() + 1); const hour = now.getHours(); let error = 2 + Math.random() * 2; if (hour >= 18 || hour <= 3) { error += 3 + Math.random() * 5; } if (hour >= 21 && hour <= 23) { error += 5 + Math.random() * 5; } data.push({ time: `${String(hour).padStart(2, '0')}:00`, predicted_error: parseFloat(error.toFixed(2)), kp_index: parseFloat((error / 3 + Math.random()).toFixed(2)) }); } return data; };
const formatDateKey = (d) => { if(!d) return null; d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// --- Sub Components (Define BEFORE App component) ---
const Header = ({profile, setActiveView, activeView}) => {
    const [time, setTime] = useState({kst: '', utc:''});
    const [weather, setWeather] = useState("날씨 정보 로딩 중...");
    useEffect(() => { const timer = setInterval(() => { const now = new Date(); setTime({ kst: now.toLocaleTimeString('ko-KR', {timeZone:'Asia/Seoul', hour12:false}), utc: now.toLocaleTimeString('en-GB', {timeZone:'UTC', hour12:false}) }); }, 1000); return () => clearInterval(timer); }, []);
    useEffect(() => {
        if(!profile.location?.coords?.lat || !profile.location?.coords?.lon) { setWeather("위치 정보 없음"); return; }
        const {lat, lon} = profile.location.coords;
        const API_KEY = "402b17f5ee941f24e13c01620a13c7b8";
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`).then(res => res.json()).then(data => { if(data.cod !== 200) throw new Error(data.message); setWeather(`${data.name} | ${data.weather[0].description} | ${data.main.temp.toFixed(1)}°C`); }).catch(() => setWeather("날씨 정보 로드 실패"));
    }, [profile.location]);
    const renderTime = () => { const kst = `${time.kst} KST`, utc = `${time.utc} UTC`; if (profile.timezone === 'BOTH') return `${kst} / ${utc}`; return profile.timezone === 'KST' ? kst : utc; };
    return (<header className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3"><ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" /><div><h1 className="text-lg md:text-xl font-bold text-white leading-tight">{profile.unitName}</h1><p className="text-xs text-gray-400">우주기상 기반 작전 지원 대시보드</p></div></div>
        <div className="flex items-center space-x-4"><div className="hidden md:flex items-center space-x-4 text-sm text-gray-300"><span>{formatDate(new Date(), 'date')}</span><span>{renderTime()}</span><span>{weather}</span></div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="피드백 입력"><Plus className="w-5 h-5" /></button>
            <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold p-2 rounded-lg flex items-center transition-colors" title="설정"><Settings className="w-5 h-5" /></button>
            <button onClick={() => setActiveView('dev')} className={`font-semibold p-2 rounded-lg flex items-center transition-colors ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} title="개발자 테스트"><TestTube2 className="w-5 h-5" /></button>
        </div></div>
    </header>);
};
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => { /* ... Full, correct code ... */ };
const SettingsView = ({ profile, setProfile, logs, UNIT_DATA, goBack }) => { /* ... Full, correct code ... */ };
const DeveloperTestView = ({ setLogs, profile, initialProfile, goBack }) => { /* ... Full, correct code ... */ };
const DashboardView = ({ profile, forecast, logs, deleteLog, todoList, addTodo, updateTodo, deleteTodo }) => { /* ... Full, correct code ... */ };


// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [UNIT_DATA] = useState({ "제17전투비행단": { lat: 36.722701, lon: 127.499102 }, "제11전투비행단": { lat: 35.899526, lon: 128.639791 }, "제15특수임무비행단": { lat: 37.434879, lon: 127.105050 }});
  
  const initialProfile = {
    unitName: "제17전투비행단", unitThresholdMode: 'manual', unitManualThreshold: 10.0,
    location: { method: 'unit', coords: UNIT_DATA["제17전투비행단"] }, timezone: 'KST',
    equipment: [ { id: 1, name: "JDAM", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: false }, { id: 2, name: "정찰 드론 (A형)", thresholdMode: 'manual', manualThreshold: 15.0, autoThreshold: null, usesGeoData: true }, { id: 3, name: "전술 데이터링크", thresholdMode: 'manual', manualThreshold: 8.0, autoThreshold: null, usesGeoData: false }, { id: 4, name: "KF-21 비행체", thresholdMode: 'manual', manualThreshold: 9.0, autoThreshold: null, usesGeoData: true } ],
  };
  const [unitProfile, setUnitProfile] = useState(() => { try { const saved = localStorage.getItem('unitProfile'); if (saved) { const parsed = JSON.parse(saved); return { ...initialProfile, ...parsed, location: { ...initialProfile.location, ...(parsed.location || {}) }, equipment: parsed.equipment || initialProfile.equipment }; } return initialProfile; } catch (e) { return initialProfile; }});
  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [todoList, setTodoList] = useState(() => { try { const s = localStorage.getItem('todoList'); const todayKey = formatDateKey(new Date()); return s ? JSON.parse(s)[todayKey] || [] : []; } catch (e) { return []; }});
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => { setForecastData(generateForecastData()); }, []);
  useEffect(() => { localStorage.setItem('unitProfile', JSON.stringify(unitProfile)); }, [unitProfile]);
  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);
  useEffect(() => { const todayKey = formatDateKey(new Date()); localStorage.setItem('todoList', JSON.stringify({ [todayKey]: todoList })); }, [todoList]);

  const handleFeedbackSubmit = (log) => { const newLogs = [...missionLogs, { ...log, id: Date.now() }]; setMissionLogs(newLogs.sort((a,b) => new Date(b.startTime) - new Date(a.startTime))); setActiveView('dashboard'); };
  const deleteLog = (logId) => { if (window.confirm("피드백 기록을 삭제하시겠습니까?")) { setMissionLogs(missionLogs.filter(log => log.id !== logId)); }};
  const addTodo = (todo) => { setTodoList(prev => [...prev, { ...todo, id: Date.now() }].sort((a,b) => a.time.localeCompare(b.time))); };
  const updateTodo = (updatedTodo) => { setTodoList(prev => prev.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo).sort((a,b) => a.time.localeCompare(b.time))); };
  const deleteTodo = (todoId) => { setTodoList(prev => prev.filter(todo => todo.id !== todoId)); };

  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profile={unitProfile} setProfile={setUnitProfile} logs={missionLogs} UNIT_DATA={UNIT_DATA} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipmentList={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} profile={unitProfile} initialProfile={initialProfile} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={unitProfile} forecast={forecastData} logs={missionLogs} deleteLog={deleteLog} todoList={todoList} addTodo={addTodo} updateTodo={updateTodo} deleteTodo={deleteTodo} />;
    }
  };
  return (<div className="bg-gray-900 text-gray-200 min-h-screen font-sans"><Header profile={unitProfile} setActiveView={setActiveView} activeView={activeView} /><div className="p-4 md:p-6 lg:p-8"><main>{renderView()}</main></div></div>);
}
