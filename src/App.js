import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, ChevronDown, ChevronUp, TestTube2, BrainCircuit, Eraser, Lightbulb } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Helper Functions ---
const getErrorColor = (error, threshold = 10.0) => {
  if (error > threshold) return '#f87171';
  if (error > threshold * 0.7) return '#facc15';
  return '#4ade80';
};
const getSuccessScoreInfo = (score) => {
  if (score >= 8) return { label: "성공", color: "text-green-400" };
  if (score >= 4) return { label: "보통", color: "text-yellow-400" };
  return { label: "실패", color: "text-red-400" };
};
const formatDate = (dateString, format = 'full') => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = { full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, time: { hour: '2-digit', minute: '2-digit', hour12: false } };
  return date.toLocaleString('ko-KR', options[format]);
};
const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const initialProfile = {
    unitName: "제17전투비행단", defaultThreshold: 10.0,
    equipment: [
      { id: 1, name: "JDAM", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: false },
      { id: 2, name: "정찰 드론 (A형)", thresholdMode: 'manual', manualThreshold: 15.0, autoThreshold: null, usesGeoData: true },
      { id: 3, name: "전술 데이터링크", thresholdMode: 'manual', manualThreshold: 8.0, autoThreshold: null, usesGeoData: false },
      { id: 4, name: "KF-21 비행체", thresholdMode: 'manual', manualThreshold: 9.0, autoThreshold: null, usesGeoData: true },
    ],
  };
  const [unitProfile, setUnitProfile] = useState(() => { try { const s = localStorage.getItem('unitProfile'); return s ? JSON.parse(s) : initialProfile; } catch (e) { return initialProfile; }});
  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [forecastData, setForecastData] = useState(() => []);
  useEffect(() => { setForecastData(generateForecastData()); }, []);
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
      case 'settings': return <SettingsView profile={unitProfile} setProfile={setUnitProfile} logs={missionLogs} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipmentList={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} logs={missionLogs} profile={unitProfile} setProfile={setUnitProfile} initialProfile={initialProfile} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={unitProfile} forecast={forecastData} logs={missionLogs} deleteLog={deleteLog} />;
    }
  };
  return (<div className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4 md:p-6 lg:p-8"><Header unitName={unitProfile.unitName} setActiveView={setActiveView} activeView={activeView} /><main className="mt-6">{renderView()}</main></div>);
}

// --- Header Component ---
const Header = ({ unitName, setActiveView, activeView }) => (
  <header className="flex justify-between items-center pb-4 border-b border-gray-700">
    <div className="flex items-center space-x-3"><ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" /><div><h1 className="text-lg md:text-2xl font-bold text-white leading-tight">{unitName}</h1><p className="text-xs md:text-sm text-gray-400">우주기상 기반 작전 지원 대시보드</p></div></div>
    <div className="flex items-center space-x-2">
       {activeView === 'dashboard' && (<><button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span className="hidden md:inline text-sm">피드백</span></button><button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2"><Settings className="w-5 h-5" /><span className="hidden md:inline text-sm">설정</span></button></>)}
       <button onClick={() => setActiveView('dev')} className={`font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 ${activeView === 'dev' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}><TestTube2 className="w-5 h-5" /><span className="hidden md:inline text-sm">개발자 테스트</span></button>
    </div>
  </header>
);

// --- Dashboard Sub-components ---
const generateLiveAircrafts = (equipmentList) => {
    const aircraftPaths = [{ start: [36.8, 127.0], end: [36.2, 128.0] }, { start: [37.0, 127.8], end: [36.5, 127.2] }, { start: [36.4, 127.1], end: [36.9, 127.9] }];
    return aircraftPaths.map((p, i) => ({ id: i, ...p, progress: Math.random(), speed: 0.01 + Math.random() * 0.01, error: 5 + Math.random() * 5 }));
};
const LiveMap = ({threshold}) => {
    const [aircrafts, setAircrafts] = useState(generateLiveAircrafts);
    useEffect(() => {
        const timer = setInterval(() => setAircrafts(prev => prev.map(ac => ({ ...ac, progress: (ac.progress + ac.speed) % 1, error: Math.max(3.0, ac.error + (Math.random() - 0.5) * 2) }))), 2000);
        return () => clearInterval(timer);
    }, []);
    return (<div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-[400px]">
        <h2 className="text-lg font-semibold mb-4 text-white">실시간 항적 (청주 중심)</h2>
        <MapContainer center={[36.64, 127.49]} zoom={9} style={{ height: "300px", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
            {aircrafts.map(ac => {
                const lat = ac.start[0] + (ac.end[0] - ac.start[0]) * ac.progress, lon = ac.start[1] + (ac.end[1] - ac.start[1]) * ac.progress;
                return (<CircleMarker key={ac.id} center={[lat, lon]} radius={6} pathOptions={{ color: getErrorColor(ac.error, threshold), fillColor: getErrorColor(ac.error, threshold), fillOpacity: 0.8 }}><LeafletTooltip>✈️ ID: {ac.id}<br />GNSS 오차: {ac.error.toFixed(2)}m</LeafletTooltip></CircleMarker>);
            })}
        </MapContainer>
    </div>);
};
const AutoFitBounds = ({ data }) => {
    const map = useMap();
    useEffect(() => { if (!data || data.length === 0) return; const bounds = L.latLngBounds(data.map(p => [p.lat, p.lon])); map.fitBounds(bounds, { padding: [20, 20] }); }, [data, map]);
    return null;
};
const FeedbackChart = ({ data, equipment }) => {
    const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold;
    const segments = useMemo(() => {
        const highErrorSegments = []; let currentSegment = null;
        data.forEach((d, i) => {
            if (d.error_rate > activeThreshold) {
                if (!currentSegment) currentSegment = { x1: d.date, x2: d.date }; else currentSegment.x2 = d.date;
            } else { if (currentSegment) { highErrorSegments.push(currentSegment); currentSegment = null; } }
        });
        if (currentSegment) highErrorSegments.push(currentSegment);
        return highErrorSegments;
    }, [data, activeThreshold]);
    return (<div className="mt-4 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
        <XAxis dataKey="date" stroke="#A0AEC0" tick={{ fontSize: 10 }} tickFormatter={(tick) => formatDate(tick, 'time')} />
        <YAxis stroke="#A0AEC0" tick={{ fontSize: 10 }} domain={[0, 'dataMax + 2']} tickFormatter={(tick) => tick.toFixed(1)} />
        <Tooltip contentStyle={{ backgroundColor: '#1A202C' }} labelFormatter={(label) => formatDate(label)} />
        <Line type="monotone" dataKey="error_rate" name="GNSS 오차(m)" stroke="#F56565" strokeWidth={2} dot={false} />
        {segments.map((seg, i) => <ReferenceArea key={i} x1={seg.x1} x2={seg.x2} stroke="none" fill="#f56565" fillOpacity={0.3} />)}
        <ReferenceLine y={activeThreshold} label={{ value: "임계값", position: 'insideTopLeft', fill: '#4FD1C5', fontSize: 10 }} stroke="#4FD1C5" strokeDasharray="3 3" />
    </LineChart></ResponsiveContainer></div>);
};
const FeedbackMap = ({ data, equipment }) => {
    const activeThreshold = equipment.thresholdMode === 'auto' && equipment.autoThreshold ? equipment.autoThreshold : equipment.manualThreshold;
    return (<div className="mt-2 h-48 rounded-lg overflow-hidden"><MapContainer center={[data[0].lat, data[0].lon]} zoom={11} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
        {data.slice(1).map((p, i) => (<Polyline key={i} positions={[[data[i].lat, data[i].lon], [p.lat, p.lon]]} color={getErrorColor(data[i].error_rate, activeThreshold)} weight={4} />))}
        <AutoFitBounds data={data} />
    </MapContainer></div>);
};
const XaiModal = ({ equipment, logs, onClose }) => {
    const analysis = useMemo(() => {
        const relevantLogs = logs.filter(log => log.equipment === equipment.name);
        if (relevantLogs.length === 0) return { total: 0 };
        const failedLogs = relevantLogs.filter(log => log.successScore < 4);
        const mediocreLogs = relevantLogs.filter(log => log.successScore >= 4 && log.successScore < 8);
        const errorRatesOnFailure = relevantLogs.filter(l => l.successScore < 8 && l.gnssErrorData).flatMap(l => l.gnssErrorData.map(d => d.error_rate));
        const avgErrorOnFailure = errorRatesOnFailure.length > 0 ? errorRatesOnFailure.reduce((a, b) => a + b, 0) / errorRatesOnFailure.length : null;
        return { total: relevantLogs.length, failed: failedLogs.length, mediocre: mediocreLogs.length, avgErrorOnFailure };
    }, [logs, equipment]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">{equipment.name} 분석</h2><button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button></div>
                <div className="space-y-4">
                    <div><h3 className="font-semibold text-cyan-400">작전 요약</h3><p>총 {analysis.total}회의 피드백 중 <span className="text-red-400 font-bold">{analysis.failed}회 실패</span>, <span className="text-yellow-400 font-bold">{analysis.mediocre}회 보통</span>으로 평가되었습니다.</p></div>
                    <div><h3 className="font-semibold text-cyan-400">자동 임계값 (XAI)</h3>
                        {equipment.autoThreshold ? (<>
                            <p className="mb-2">자동 설정된 임계값은 <strong className="text-white">{equipment.autoThreshold}m</strong> 입니다.</p>
                            <p className="text-sm text-gray-400"><Lightbulb className="inline w-4 h-4 mr-1 text-yellow-300" />이 값은 작전 성공도가 '보통' 이하({analysis.failed + analysis.mediocre}회)였던 임무들의 GNSS 오차 데이터를 분석하여 설정되었습니다. 해당 임무들에서 평균적으로 <strong className="text-white">{analysis.avgErrorOnFailure?.toFixed(2) ?? 'N/A'}m</strong> 이상의 오차가 관측되었습니다.</p>
                        </> ) : (<p className="text-sm text-gray-400">자동 임계값을 계산하기에 데이터가 부족합니다 (최소 3회 이상의 '보통' 이하 피드백 필요).</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Dashboard View (Restored Layout) ---
const DashboardView = ({ profile, forecast, logs, deleteLog }) => {
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [xaiModalEquipment, setXaiModalEquipment] = useState(null);
  const maxError = useMemo(() => forecast.length > 0 ? Math.max(...forecast.map(d => d.predicted_error)) : 0, [forecast]);
  const overallStatus = useMemo(() => {
    if (maxError > profile.defaultThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50", icon: <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> };
    if (maxError > profile.defaultThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50", icon: <Zap className="w-8 h-8 md:w-10 md:h-10" /> };
    return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50", icon: <Target className="w-8 h-8 md:w-10 md:h-10" /> };
  }, [maxError, profile.defaultThreshold]);

  return (<>
    {xaiModalEquipment && <XaiModal equipment={xaiModalEquipment} logs={logs} onClose={() => setXaiModalEquipment(null)} />}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className={`p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 ${overallStatus.bgColor} border border-gray-700`}>
          <div className="flex items-center gap-4 w-full md:w-auto"><div className={overallStatus.color}>{overallStatus.icon}</div><div><p className="text-gray-400 text-xs md:text-sm">향후 24시간 종합 위험도</p><p className={`text-2xl md:text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p></div></div>
          <div className="w-full md:w-auto flex justify-around md:justify-start md:gap-6 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600">
            <div><p className="text-gray-400 text-xs md:text-sm">최대 예상 오차</p><p className="text-2xl md:text-3xl font-bold text-white">{maxError.toFixed(2)} m</p></div>
            <div><p className="text-gray-400 text-xs md:text-sm">부대 임계값</p><p className="text-2xl md:text-3xl font-bold text-cyan-400">{profile.defaultThreshold.toFixed(2)} m</p></div>
          </div>
        </div>
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">GNSS 오차 및 Kp 지수 예측 (24시간)</h2>
          <ResponsiveContainer width="100%" height={300}><LineChart data={forecast}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="time" stroke="#A0AEC0" tick={{ fontSize: 12 }} /><YAxis yAxisId="left" label={{ value: '오차 (m)', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} stroke="#A0AEC0" /><YAxis yAxisId="right" orientation="right" label={{ value: 'Kp', angle: 90, position: 'insideRight', fill: '#A0AEC0' }} stroke="#A0AEC0" /><Tooltip contentStyle={{ backgroundColor: '#1A202C' }} /><Legend /><Line yAxisId="left" type="monotone" dataKey="predicted_error" name="예상 오차" stroke="#F56565" dot={false} /><Line yAxisId="right" type="monotone" dataKey="kp_index" name="Kp 지수" stroke="#4299E1" dot={false} /><ReferenceLine yAxisId="left" y={profile.defaultThreshold} label={{ value: "부대 임계값", fill: "#4FD1C5" }} stroke="#4FD1C5" strokeDasharray="4 4" /></LineChart></ResponsiveContainer>
        </div>
        <LiveMap threshold={profile.defaultThreshold} />
      </div>
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">주요 장비별 작전 영향 분석</h2>
          <div className="space-y-3">
            {profile.equipment.map(eq => {
                const activeThreshold = eq.thresholdMode === 'auto' && eq.autoThreshold ? eq.autoThreshold : eq.manualThreshold;
                return (<div key={eq.id} onClick={() => setXaiModalEquipment(eq)} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg cursor-pointer hover:bg-gray-700"><span className="font-medium text-sm">{eq.name}</span><div className="text-right"><span className={`font-bold text-sm px-3 py-1 rounded-full ${maxError > activeThreshold ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{maxError > activeThreshold ? '위험' : '정상'}</span><p className="text-xs text-gray-400 mt-1">임계값: {activeThreshold.toFixed(2)}m ({eq.thresholdMode === 'auto' ? '자동' : '수동'})</p></div></div>);
            })}
          </div>
        </div>
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">최근 작전 피드백</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {logs.length > 0 ? logs.map(log => {
                const equipment = profile.equipment.find(e => e.name === log.equipment);
                return (<div key={log.id} className="text-sm bg-gray-700/50 rounded-lg p-3 transition-all">
                    <div className="flex justify-between items-start cursor-pointer" onClick={() => log.gnssErrorData && setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                        <div><p className="font-semibold text-gray-300">{log.equipment}</p><p className="text-xs text-gray-400">{formatDate(log.startTime)}</p></div>
                        <div className="flex items-center"><span className={`font-bold mr-2 ${getSuccessScoreInfo(log.successScore).color}`}>{log.successScore}점({getSuccessScoreInfo(log.successScore).label})</span>{log.gnssErrorData && (expandedLogId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}<button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="ml-2 text-red-400 hover:text-red-300 p-1"><Trash2 size={16} /></button></div>
                    </div>
                    {expandedLogId === log.id && log.gnssErrorData && (<>
                        <FeedbackChart data={log.gnssErrorData} equipment={equipment} />
                        {log.gnssErrorData[0]?.lat !== undefined && <FeedbackMap data={log.gnssErrorData} equipment={equipment} />}
                    </>)}
                  </div>
                )}) : <p className="text-gray-500 text-sm">입력된 피드백이 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  </>);
};


// --- Feedback View ---
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => {
    const [log, setLog] = useState({ startTime: toLocalISOString(new Date(new Date().getTime() - 60*60*1000)), endTime: toLocalISOString(new Date()), equipment: equipmentList.length > 0 ? equipmentList[0].name : '', successScore: 10, gnssErrorData: null });
    const [fileName, setFileName] = useState("");
    const handleFileChange = (e) => { /* ... (omitted for brevity, no changes) ... */ };
    const handleSubmit = (e) => { e.preventDefault(); if (!log.equipment) { alert("장비를 선택해주세요."); return; } if (!log.startTime || !log.endTime) { alert("시작/종료 시간을 입력해주세요."); return; } onSubmit(log); };
    return ( /* ... (omitted for brevity, no changes) ... */ );
};


// --- Settings View ---
const SettingsView = ({ profile, setProfile, logs, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));
  const handleSave = () => { setProfile(localProfile); goBack(); };
  const handleEquipmentChange = (id, field, value) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq) });
  const addEquipment = () => setLocalProfile({ ...localProfile, equipment: [...localProfile.equipment, { id: Date.now(), name: "신규 장비", thresholdMode: 'manual', manualThreshold: 10.0, autoThreshold: null, usesGeoData: false }] });
  const removeEquipment = (id) => setLocalProfile({ ...localProfile, equipment: localProfile.equipment.filter(eq => eq.id !== id) });

  const runAutoTuneForAll = () => {
      const tunedEquipment = localProfile.equipment.map(eq => {
          const relevantLogs = logs.filter(log => log.equipment === eq.name && log.successScore < 8 && log.gnssErrorData);
          if (relevantLogs.length < 3) return { ...eq, autoThreshold: null };
          const errorRates = relevantLogs.flatMap(log => log.gnssErrorData.map(d => d.error_rate));
          const p75 = [...errorRates].sort((a,b) => a-b)[Math.floor(errorRates.length * 0.75)];
          return { ...eq, autoThreshold: parseFloat(p75.toFixed(2)) };
      });
      setLocalProfile({ ...localProfile, equipment: tunedEquipment });
      alert("모든 장비의 자동 임계값 재계산이 완료되었습니다.");
  };

  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-3xl mx-auto">
      <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2></div>
      <div className="space-y-6">
        <div><label className="block text-sm font-medium text-gray-400 mb-2">부대명</label><input type="text" value={localProfile.unitName} onChange={e => setLocalProfile({ ...localProfile, unitName: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white" /></div>
        <div><h3 className="text-lg font-semibold text-white mb-3">주요 장비 및 민감도 설정</h3>
          <div className="space-y-4">
            {localProfile.equipment.map(eq => (
            <div key={eq.id} className="bg-gray-700/50 p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                    <input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="장비명" />
                    <button onClick={() => removeEquipment(eq.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={eq.usesGeoData} onChange={e => handleEquipmentChange(eq.id, 'usesGeoData', e.target.checked)} className="h-4 w-4 rounded bg-gray-900 border-gray-600 text-cyan-500 focus:ring-cyan-500" /><span>위치 정보 사용</span></label>
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'manual' ? 'bg-blue-600' : 'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'manual')}>수동</span>
                        <span className={`px-2 py-1 text-xs rounded-md ${eq.thresholdMode === 'auto' ? 'bg-blue-600' : 'bg-gray-600'}`} onClick={() => handleEquipmentChange(eq.id, 'thresholdMode', 'auto')}>자동</span>
                    </div>
                </div>
                <div>
                  {eq.thresholdMode === 'manual' ? (
                    <div className="flex items-center space-x-2"><input type="range" min="1" max="30" step="0.5" value={eq.manualThreshold} onChange={e => handleEquipmentChange(eq.id, 'manualThreshold', parseFloat(e.target.value))} className="w-full" /><span className="text-cyan-400 font-mono w-16 text-center">{eq.manualThreshold.toFixed(1)}m</span></div>
                  ) : (
                    <div className="text-center bg-gray-800 p-2 rounded-md"><span className="text-gray-400">자동 임계값: </span><span className="font-bold text-white">{eq.autoThreshold ? `${eq.autoThreshold.toFixed(2)}m` : '데이터 부족'}</span></div>
                  )}
                </div>
            </div>))}
          </div>
          <div className="flex space-x-4 mt-4">
            <button onClick={addEquipment} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Plus className="w-5 h-5" /><span>장비 추가</span></button>
            <button onClick={runAutoTuneForAll} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><BrainCircuit size={20}/><span>자동 임계값 전체 재계산</span></button>
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end"><button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2"><Save className="w-5 h-5" /><span>저장</span></button></div>
    </div>
  );
};

// --- Developer Test View ---
const DeveloperTestView = ({ setLogs, logs, profile, setProfile, initialProfile, goBack }) => {
    const generateMockLogs = () => { /* ... (omitted for brevity, includes better correlation) ... */ };
    const clearLogs = () => { /* ... (omitted for brevity) ... */ };
    const autoTuneThresholds = () => { /* ... (omitted for brevity) ... */ };
    const resetThresholds = () => { /* ... (omitted for brevity) ... */ };
    return ( /* ... (omitted for brevity) ... */ );
};
