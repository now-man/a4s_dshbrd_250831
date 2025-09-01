import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, ChevronDown, ChevronUp, TestTube2, BrainCircuit, Eraser } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline } from 'react-leaflet';

// --- Helper Functions ---
const getErrorColor = (error, threshold = 10.0) => {
  if (error > threshold) return '#f87171'; // red-400
  if (error > threshold * 0.7) return '#facc15'; // yellow-400
  return '#4ade80'; // green-400
};

const getSuccessScoreInfo = (score) => {
  if (score >= 8) return { label: "성공", color: "text-green-400" };
  if (score >= 4) return { label: "보통", color: "text-yellow-400" };
  return { label: "실패", color: "text-red-400" };
};

const formatDate = (dateString, format = 'full') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = {
    full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false },
    time: { hour: '2-digit', minute: '2-digit', hour12: false }
  };
  return date.toLocaleString('ko-KR', options[format]);
};

const toLocalISOString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzoffset).toISOString().slice(0, 16);
};

// --- Mock Data Generation ---
const generateForecastData = () => {
  const data = [];
  const now = new Date();
  now.setHours(now.getHours() - 12, 0, 0, 0);
  for (let i = 0; i < 24; i++) {
    now.setHours(now.getHours() + 1);
    const hour = now.getHours();
    let error = 2 + Math.random() * 2;
    if (hour >= 18 || hour <= 3) { error += 3 + Math.random() * 5; }
    if (hour >= 21 && hour <= 23) { error += 5 + Math.random() * 5; }
    data.push({ time: `${String(hour).padStart(2, '0')}:00`, predicted_error: parseFloat(error.toFixed(2)), kp_index: parseFloat((error / 3 + Math.random()).toFixed(2)) });
  }
  return data;
};

// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const initialProfile = {
    unitName: "제17전투비행단", defaultThreshold: 10.0,
    equipment: [{ id: 1, name: "JDAM", sensitivity: 10.0 }, { id: 2, name: "정찰 드론 (A형)", sensitivity: 15.0 }, { id: 3, name: "전술 데이터링크", sensitivity: 8.0 }, { id: 4, name: "KF-21 비행체", sensitivity: 9.0 }],
  };
  const [unitProfile, setUnitProfile] = useState(() => { try { const s = localStorage.getItem('unitProfile'); return s ? JSON.parse(s) : initialProfile; } catch (e) { return initialProfile; }});
  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [forecastData, setForecastData] = useState(generateForecastData());
  useEffect(() => { localStorage.setItem('unitProfile', JSON.stringify(unitProfile)); }, [unitProfile]);
  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);

  const handleFeedbackSubmit = (log) => {
    const newLogs = [...missionLogs, { ...log, id: Date.now() }];
    setMissionLogs(newLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
    setActiveView('dashboard');
  };
  const deleteLog = (logId) => { if (window.confirm("피드백 기록을 삭제하시겠습니까?")) { setMissionLogs(missionLogs.filter(log => log.id !== logId)); }};

  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profile={unitProfile} setProfile={setUnitProfile} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipmentList={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} logs={missionLogs} profile={unitProfile} setProfile={setUnitProfile} initialProfile={initialProfile} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={unitProfile} forecast={forecastData} logs={missionLogs} deleteLog={deleteLog} />;
    }
  };
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4 md:p-6 lg:p-8">
      <Header unitName={unitProfile.unitName} setActiveView={setActiveView} activeView={activeView} />
      <main className="mt-6">{renderView()}</main>
    </div>
  );
}

// --- Header Component ---
const Header = ({ unitName, setActiveView, activeView }) => (
  <header className="flex justify-between items-center pb-4 border-b border-gray-700">
    <div className="flex items-center space-x-3">
      <ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" />
      <div><h1 className="text-lg md:text-2xl font-bold text-white leading-tight">{unitName}</h1><p className="text-xs md:text-sm text-gray-400">우주기상 기반 작전 지원 대시보드</p></div>
    </div>
    <div className="flex items-center space-x-2">
       {activeView === 'dashboard' && (<>
            <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span className="hidden md:inline text-sm">피드백</span></button>
            <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2"><Settings className="w-5 h-5" /><span className="hidden md:inline text-sm">설정</span></button></>
       )}
       <button onClick={() => setActiveView('dev')} className={`font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <TestTube2 className="w-5 h-5" /><span className="hidden md:inline text-sm">개발자 테스트</span></button>
    </div>
  </header>
);

// --- Real-time Aircraft Simulation ---
const generateLiveAircrafts = () => {
    const paths = [
        { start: [36.8, 127.0], end: [36.2, 128.0] }, { start: [37.0, 127.8], end: [36.5, 127.2] }, { start: [36.4, 127.1], end: [36.9, 127.9] },
    ];
    return paths.map((p, i) => ({ id: i, ...p, progress: Math.random(), speed: 0.01 + Math.random() * 0.01, error: 5 + Math.random() * 5 }));
};
const LiveMap = ({threshold}) => {
    const [aircrafts, setAircrafts] = useState(generateLiveAircrafts);
    useEffect(() => {
        const timer = setInterval(() => {
            setAircrafts(prev => prev.map(ac => {
                let newProgress = ac.progress + ac.speed;
                if (newProgress > 1) newProgress = 0; // Loop
                const newError = Math.max(3.0, ac.error + (Math.random() - 0.5) * 2);
                return { ...ac, progress: newProgress, error: newError };
            }));
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-[400px]">
            <h2 className="text-lg font-semibold mb-4 text-white">실시간 항적 (청주 중심)</h2>
            <MapContainer center={[36.64, 127.49]} zoom={9} style={{ height: "300px", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                {aircrafts.map(ac => {
                    const lat = ac.start[0] + (ac.end[0] - ac.start[0]) * ac.progress;
                    const lon = ac.start[1] + (ac.end[1] - ac.start[1]) * ac.progress;
                    const color = getErrorColor(ac.error, threshold);
                    return (<CircleMarker key={ac.id} center={[lat, lon]} radius={6} pathOptions={{ color: color, fillColor: color, fillOpacity: 0.8 }}>
                        <LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {ac.error.toFixed(2)}m</LeafletTooltip>
                    </CircleMarker>);
                })}
            </MapContainer>
        </div>
    );
};


// --- Dashboard View ---
const DashboardView = ({ profile, forecast, logs, deleteLog }) => {
  const [expandedLogId, setExpandedLogId] = useState(null);
  const maxError = useMemo(() => Math.max(...forecast.map(d => d.predicted_error)), [forecast]);
  const overallStatus = useMemo(() => {
    if (maxError > profile.defaultThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50", icon: <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> };
    if (maxError > profile.defaultThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50", icon: <Zap className="w-8 h-8 md:w-10 md:h-10" /> };
    return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50", icon: <Target className="w-8 h-8 md:w-10 md:h-10" /> };
  }, [maxError, profile.defaultThreshold]);

  const toggleLogExpansion = (logId) => setExpandedLogId(expandedLogId === logId ? null : logId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className={`p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 ${overallStatus.bgColor} border border-gray-700`}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={overallStatus.color}>{overallStatus.icon}</div>
            <div><p className="text-gray-400 text-xs md:text-sm">향후 24시간 종합 위험도</p><p className={`text-2xl md:text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p></div>
          </div>
          <div className="w-full md:w-auto flex justify-around md:justify-start md:gap-6 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600">
            <div><p className="text-gray-400 text-xs md:text-sm">최대 예상 오차</p><p className="text-2xl md:text-3xl font-bold text-white">{maxError.toFixed(2)} m</p></div>
            <div><p className="text-gray-400 text-xs md:text-sm">부대 임계값</p><p className="text-2xl md:text-3xl font-bold text-cyan-400">{profile.defaultThreshold.toFixed(2)} m</p></div>
          </div>
        </div>
        <LiveMap threshold={profile.defaultThreshold} />
      </div>
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">최근 작전 피드백</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {logs.length > 0 ? logs.map(log => {
                const scoreInfo = getSuccessScoreInfo(log.successScore);
                const isExpanded = expandedLogId === log.id;
                const equipment = profile.equipment.find(e => e.name === log.equipment);
                const hasGeoData = log.gnssErrorData && log.gnssErrorData[0]?.lat !== undefined;

                return (
                  <div key={log.id} className="text-sm bg-gray-700/50 rounded-lg p-3 transition-all">
                    <div className="flex justify-between items-start cursor-pointer" onClick={() => log.gnssErrorData && toggleLogExpansion(log.id)}>
                        <div><p className="font-semibold text-gray-300">{log.equipment}</p><p className="text-xs text-gray-400">{formatDate(log.startTime)}</p></div>
                        <div className="flex items-center">
                             <span className={`font-bold mr-2 ${scoreInfo.color}`}>{log.successScore}점({scoreInfo.label})</span>
                             {log.gnssErrorData && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                             <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="ml-2 text-red-400 hover:text-red-300 p-1"><Trash2 size={16} /></button>
                        </div>
                    </div>
                    {isExpanded && log.gnssErrorData && ( hasGeoData ? 
                        <div className="mt-4 h-48 rounded-lg overflow-hidden"><MapContainer center={[log.gnssErrorData[0].lat, log.gnssErrorData[0].lon]} zoom={11} style={{ height: "100%", width: "100%" }}>
                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                            {log.gnssErrorData.slice(1).map((p, i) => (
                                <Polyline key={i} positions={[[log.gnssErrorData[i].lat, log.gnssErrorData[i].lon], [p.lat, p.lon]]} color={getErrorColor(log.gnssErrorData[i].error_rate, equipment?.sensitivity)} weight={4} />
                            ))}
                        </MapContainer></div> :
                        <div className="mt-4 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={log.gnssErrorData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="date" stroke="#A0AEC0" tick={{ fontSize: 10 }} tickFormatter={(tick) => formatDate(tick, 'time')} />
                            <YAxis stroke="#A0AEC0" tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                            <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} labelFormatter={(label) => formatDate(label)} />
                            <Line type="monotone" dataKey="error_rate" name="GNSS 오차(m)" stroke="#F56565" strokeWidth={2} dot={false} />
                            {equipment?.sensitivity && <ReferenceLine y={equipment.sensitivity} label={{ value: "임계값", position: 'insideTopLeft', fill: '#4FD1C5', fontSize: 10 }} stroke="#4FD1C5" strokeDasharray="3 3" />}
                            {equipment?.sensitivity && <ReferenceArea y1={equipment.sensitivity} y2={999} fill="#f56565" opacity={0.2} />}
                        </LineChart></ResponsiveContainer></div>
                    )}
                  </div>
                )}) : <p className="text-gray-500 text-sm">입력된 피드백이 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Feedback View ---
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => {
    const [log, setLog] = useState({ startTime: toLocalISOString(new Date(new Date().getTime() - 60*60*1000)), endTime: toLocalISOString(new Date()), equipment: equipmentList.length > 0 ? equipmentList[0].name : '', successScore: 10, gnssErrorData: null });
    const [fileName, setFileName] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) { setLog({ ...log, gnssErrorData: null }); setFileName(""); return; }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("CSV에 데이터가 없습니다.");
                const header = lines[0].trim().split(',').map(h => h.trim());
                const hasGeoData = header.includes('lat') && header.includes('lon');
                if (header[0] !== 'date' || header[1] !== 'error_rate') throw new Error("헤더는 'date,error_rate'로 시작해야 합니다.");

                const data = lines.slice(1).map((line, i) => {
                    const values = line.split(',');
                    if ((hasGeoData && values.length !== 4) || (!hasGeoData && values.length !== 2)) throw new Error(`${i+2}번째 줄 형식이 잘못되었습니다.`);
                    const errorRate = parseFloat(values[1]);
                    if (isNaN(errorRate)) throw new Error(`${i+2}번째 줄 error_rate가 숫자가 아닙니다.`);
                    const entry = { date: values[0].trim(), error_rate: errorRate };
                    if (hasGeoData) {
                        entry.lat = parseFloat(values[2]);
                        entry.lon = parseFloat(values[3]);
                        if (isNaN(entry.lat) || isNaN(entry.lon)) throw new Error(`${i+2}번째 줄 lat/lon이 숫자가 아닙니다.`);
                    }
                    return entry;
                });
                setLog(prev => ({ ...prev, gnssErrorData: data }));
            } catch (error) {
                alert(`CSV 파싱 오류: ${error.message}`);
                setLog(prev => ({...prev, gnssErrorData: null})); setFileName(""); e.target.value = null;
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = (e) => { e.preventDefault(); if (!log.equipment) { alert("장비를 선택해주세요."); return; } if (!log.startTime || !log.endTime) { alert("시작/종료 시간을 입력해주세요."); return; } onSubmit(log); };
    const scoreInfo = getSuccessScoreInfo(log.successScore);

    return (
        <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">작전 피드백 입력</h2></div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-400 mb-2">작전 시작 시간</label><input type="datetime-local" value={log.startTime} onChange={e => setLog({ ...log, startTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div>
                    <div><label className="block text-sm font-medium text-gray-400 mb-2">작전 종료 시간</label><input type="datetime-local" value={log.endTime} onChange={e => setLog({ ...log, endTime: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-400 mb-2">운용 장비</label><select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white"><option value="" disabled>장비를 선택하세요</option>{equipmentList.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-400 mb-2">GNSS 기반 작전 성공도</label>
                    <div className="flex items-center gap-4 bg-gray-900 p-3 rounded-lg">
                        <input type="range" min="1" max="10" value={log.successScore} onChange={e => setLog({ ...log, successScore: parseInt(e.target.value)})} className="w-full h-2 bg-gray-700 rounded-lg" />
                        <span className={`font-bold text-lg w-32 shrink-0 text-center ${scoreInfo.color}`}>{log.successScore}점 ({scoreInfo.label})</span>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">GNSS 오차 데이터 (선택)</label>
                    <label htmlFor="csv-upload" className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 cursor-pointer"><UploadCloud className="w-5 h-5" /><span>{fileName || "CSV (date,error_rate[,lat,lon])"}</span></label>
                    <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                </div>
                <div className="pt-4 flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><BotMessageSquare className="w-5 h-5" /><span>피드백 제출</span></button></div>
            </form>
        </div>
    );
};


// --- Settings View ---
const SettingsView = ({ profile, setProfile, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));
  const handleSave = () => { setProfile(localProfile); goBack(); };
  const handleEquipmentChange = (id, field, value) => { setLocalProfile({ ...localProfile, equipment: localProfile.equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq) }); };
  const addEquipment = () => { setLocalProfile({ ...localProfile, equipment: [...localProfile.equipment, { id: Date.now(), name: "신규 장비", sensitivity: 10.0 }] }); };
  const removeEquipment = (id) => { setLocalProfile({ ...localProfile, equipment: localProfile.equipment.filter(eq => eq.id !== id) }); };
  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
      <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2></div>
      <div className="space-y-6">
        <div><label className="block text-sm font-medium text-gray-400 mb-2">부대명</label><input type="text" value={localProfile.unitName} onChange={e => setLocalProfile({ ...localProfile, unitName: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div>
        <div><label className="block text-sm font-medium text-gray-400 mb-2">종합 위험도 임계값 (m)</label><input type="number" step="0.1" value={localProfile.defaultThreshold} onChange={e => setLocalProfile({ ...localProfile, defaultThreshold: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div>
        <div><h3 className="text-lg font-semibold text-white mb-3">주요 장비 및 민감도 설정</h3>
          <div className="space-y-4">{localProfile.equipment.map(eq => (<div key={eq.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-gray-700/50 p-4 rounded-lg"><input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)} className="md:col-span-3 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" /><div className="md:col-span-2 flex items-center space-x-2"><input type="range" min="1" max="30" step="0.5" value={eq.sensitivity} onChange={e => handleEquipmentChange(eq.id, 'sensitivity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" /><span className="text-cyan-400 font-mono w-16 text-center">{eq.sensitivity.toFixed(1)}m</span></div><button onClick={() => removeEquipment(eq.id)} className="md:col-span-1 text-red-400 hover:text-red-300 p-2 justify-self-end"><Trash2 className="w-5 h-5" /></button></div>))}</div>
          <button onClick={addEquipment} className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Plus className="w-5 h-5" /><span>장비 추가</span></button>
        </div>
      </div>
      <div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><Save className="w-5 h-5" /><span>저장</span></button></div>
    </div>
  );
};

// --- Developer Test View ---
const DeveloperTestView = ({ setLogs, logs, profile, setProfile, initialProfile, goBack }) => {
    const generateMockLogs = () => {
        if (!window.confirm("기존 피드백을 삭제하고, 30일간의 테스트 데이터를 생성합니까?")) return;
        const newLogs = []; const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today); date.setDate(today.getDate() - i);
            const logCount = Math.floor(Math.random() * 2) + 2;
            for (let j = 0; j < logCount; j++) {
                const equipment = profile.equipment[Math.floor(Math.random() * profile.equipment.length)];
                const isAircraft = equipment.name.includes('비행체');
                const baseError = 3 + Math.random() * 5; const isSpaceWeatherEvent = Math.random() < 0.2;
                const errorMultiplier = isSpaceWeatherEvent ? 1.5 + Math.random() : 1;
                const successScore = isSpaceWeatherEvent ? Math.floor(1 + Math.random() * 6) : Math.floor(7 + Math.random() * 4);
                const startTime = new Date(date); startTime.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60));
                const endTime = new Date(startTime.getTime() + (30 + Math.floor(Math.random() * 90)) * 60000);
                const gnssErrorData = []; let currentTime = new Date(startTime);
                const startLat = 36.5 + Math.random() * 0.5, startLon = 127.2 + Math.random() * 0.5;
                const endLat = 36.5 + Math.random() * 0.5, endLon = 127.2 + Math.random() * 0.5;
                let step = 0;
                while (currentTime <= endTime) {
                    const error = (baseError + (Math.random() - 0.5) * 2) * errorMultiplier;
                    const entry = { date: currentTime.toISOString(), error_rate: parseFloat(error.toFixed(2))};
                    if (isAircraft) {
                        const progress = step / ((endTime - startTime) / 60000);
                        entry.lat = startLat + (endLat - startLat) * progress;
                        entry.lon = startLon + (endLon - startLon) * progress;
                    }
                    gnssErrorData.push(entry);
                    currentTime.setMinutes(currentTime.getMinutes() + 1); step++;
                }
                newLogs.push({ id: Date.now() + i * 10 + j, startTime: startTime.toISOString(), endTime: endTime.toISOString(), equipment: equipment.name, successScore, gnssErrorData });
            }
        }
        setLogs(newLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
        alert(`${newLogs.length}개의 테스트 피드백이 생성되었습니다.`);
    };
    const clearLogs = () => { if (window.confirm("모든 피드백 데이터를 삭제하시겠습니까?")) { setLogs([]); alert("모든 피드백이 삭제되었습니다."); }};
    const autoTuneThresholds = () => {
        if (logs.length < 10) { alert("분석을 위해 최소 10개 이상의 피드백이 필요합니다."); return; }
        if (!window.confirm("현재 피드백 데이터 기반으로 임계값을 자동 조정하시겠습니까?")) return;
        const updatedEquipment = profile.equipment.map(eq => {
            const relevantLogs = logs.filter(log => log.equipment === eq.name && log.successScore < 8 && log.gnssErrorData);
            if (relevantLogs.length < 3) return eq;
            const errorRates = relevantLogs.flatMap(log => log.gnssErrorData.map(d => d.error_rate));
            const p75 = [...errorRates].sort((a, b) => a - b)[Math.floor(errorRates.length * 0.75)];
            return { ...eq, sensitivity: parseFloat(p75.toFixed(2)) };
        });
        setProfile({ ...profile, equipment: updatedEquipment });
        alert("임계값 자동 조정 완료. 설정 페이지에서 확인하세요.");
    };
    const resetThresholds = () => { if (window.confirm("모든 장비의 임계값을 초기값으로 되돌리시겠습니까?")) { setProfile({ ...profile, equipment: initialProfile.equipment }); alert("임계값이 초기화되었습니다."); }};
    return (
        <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
            <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">개발자 테스트 도구</h2></div>
            <div className="space-y-6">
                <div><h3 className="text-lg font-semibold text-white mb-3">피드백 데이터 관리</h3><div className="flex space-x-4">
                    <button onClick={generateMockLogs} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><TestTube2 size={20} /><span>테스트 데이터 생성</span></button>
                    <button onClick={clearLogs} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>모든 데이터 삭제</span></button>
                </div></div>
                <div><h3 className="text-lg font-semibold text-white mb-3">임계값 자동 튜닝</h3><div className="flex space-x-4">
                    <button onClick={autoTuneThresholds} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><BrainCircuit size={20} /><span>자동 튜닝 실행</span></button>
                    <button onClick={resetThresholds} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>임계값 초기화</span></button>
                </div></div>
            </div>
        </div>
    );
};
