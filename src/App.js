import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';

// --- Mock 데이터 생성 함수 ---
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
    data.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      predicted_error: parseFloat(error.toFixed(2)),
      kp_index: parseFloat((error / 3 + Math.random()).toFixed(2)),
    });
  }
  return data;
};

// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [unitProfile, setUnitProfile] = useState(() => {
    try {
      const savedProfile = localStorage.getItem('unitProfile');
      return savedProfile ? JSON.parse(savedProfile) : {
        unitName: "제17전투비행단",
        defaultThreshold: 10.0,
        equipment: [
          { id: 1, name: "JDAM", sensitivity: 10.0 },
          { id: 2, name: "정찰 드론 (A형)", sensitivity: 15.0 },
          { id: 3, name: "전술 데이터링크", sensitivity: 8.0 },
        ],
      };
    } catch (error) {
       return {
        unitName: "제17전투비행단",
        defaultThreshold: 10.0,
        equipment: [
          { id: 1, name: "JDAM", sensitivity: 10.0 },
          { id: 2, name: "정찰 드론 (A형)", sensitivity: 15.0 },
          { id: 3, name: "전술 데이터링크", sensitivity: 8.0 },
        ],
      };
    }
  });

  const [missionLogs, setMissionLogs] = useState(() => {
    try {
      const savedLogs = localStorage.getItem('missionLogs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (error) { return []; }
  });

  const [forecastData, setForecastData] = useState(generateForecastData());

  useEffect(() => { localStorage.setItem('unitProfile', JSON.stringify(unitProfile)); }, [unitProfile]);
  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);

  const handleFeedbackSubmit = (log) => {
    const newLogs = [...missionLogs, { ...log, id: Date.now() }];
    setMissionLogs(newLogs);
    if (log.impactLevel === '주의' || log.impactLevel === '위험') {
      const missionTime = log.time.split(':')[0];
      const forecastAtMissionTime = forecastData.find(d => d.time.startsWith(missionTime));
      if (forecastAtMissionTime) {
        const errorAtMissionTime = forecastAtMissionTime.predicted_error;
        const equipmentToUpdate = unitProfile.equipment.find(e => e.name === log.equipment);
        if (equipmentToUpdate && errorAtMissionTime < equipmentToUpdate.sensitivity) {
          const newSensitivity = parseFloat((equipmentToUpdate.sensitivity * 0.9).toFixed(2));
          const userConfirmed = window.confirm(`[임계값 조정 제안]\n\n'${log.equipment}' 장비가 기존 임계값(${equipmentToUpdate.sensitivity}m)보다 낮은 오차(${errorAtMissionTime}m)에서 '${log.impactLevel}' 영향을 보고했습니다.\n\n해당 장비의 민감도 임계값을 ${newSensitivity}m으로 하향 조정하시겠습니까?`);
          if (userConfirmed) {
            const updatedEquipment = unitProfile.equipment.map(e => e.id === equipmentToUpdate.id ? { ...e, sensitivity: newSensitivity } : e);
            setUnitProfile({ ...unitProfile, equipment: updatedEquipment });
          }
        }
      }
    }
    setActiveView('dashboard');
  };

  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profile={unitProfile} setProfile={setUnitProfile} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipment={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={unitProfile} forecast={forecastData} logs={missionLogs} />;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans p-4 md:p-6 lg:p-8">
      <Header unitName={unitProfile.unitName} setActiveView={setActiveView} activeView={activeView} />
      <main className="mt-6">
        {renderView()}
      </main>
    </div>
  );
}

// --- 헤더 컴포넌트 ---
const Header = ({ unitName, setActiveView, activeView }) => (
  <header className="flex justify-between items-center pb-4 border-b border-gray-700">
    <div className="flex items-center space-x-3">
      <ShieldAlert className="w-8 h-8 text-cyan-400 flex-shrink-0" />
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-white leading-tight">{unitName}</h1>
        <p className="text-xs md:text-sm text-gray-400">우주기상 기반 작전 지원 대시보드</p>
      </div>
    </div>
    {activeView === 'dashboard' && (
      <div className="flex items-center space-x-2">
        <button onClick={() => setActiveView('feedback')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors">
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline text-sm">피드백</span>
        </button>
        <button onClick={() => setActiveView('settings')} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center space-x-2 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="hidden md:inline text-sm">설정</span>
        </button>
      </div>
    )}
  </header>
);

// --- Mock ADS-B 데이터 ---
const generateMockAircrafts = () => {
  const aircrafts = [];
  for (let i = 0; i < 10; i++) {
    aircrafts.push({
      id: i + 1,
      lat: 36.64 + (Math.random() - 0.5) * 0.5,
      lon: 127.49 + (Math.random() - 0.5) * 0.5,
      nic: Math.floor(Math.random() * 12)
    });
  }
  return aircrafts;
};

// --- 대시보드 뷰 ---
const DashboardView = ({ profile, forecast, logs }) => {
  const maxError = useMemo(() => Math.max(...forecast.map(d => d.predicted_error)), [forecast]);
  const overallStatus = useMemo(() => {
    if (maxError > profile.defaultThreshold) return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50", icon: <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> };
    if (maxError > profile.defaultThreshold * 0.7) return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50", icon: <Zap className="w-8 h-8 md:w-10 md:h-10" /> };
    return { label: "정상", color: "text-green-400", bgColor: "bg-green-900/50", icon: <Target className="w-8 h-8 md:w-10 md:h-10" /> };
  }, [maxError, profile.defaultThreshold]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className={`p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-center gap-4 md:gap-6 ${overallStatus.bgColor} border border-gray-700`}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={overallStatus.color}>{overallStatus.icon}</div>
            <div>
              <p className="text-gray-400 text-xs md:text-sm">향후 24시간 종합 위험도</p>
              <p className={`text-2xl md:text-3xl font-bold ${overallStatus.color}`}>{overallStatus.label}</p>
            </div>
          </div>
          <div className="w-full md:w-auto flex justify-around md:justify-start md:gap-6 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-600">
            <div>
              <p className="text-gray-400 text-xs md:text-sm">최대 예상 오차</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{maxError.toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs md:text-sm">부대 임계값</p>
              <p className="text-2xl md:text-3xl font-bold text-cyan-400">{profile.defaultThreshold.toFixed(2)} m</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">GNSS 오차 및 Kp 지수 예측 (24시간)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="time" stroke="#A0AEC0" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" label={{ value: '오차 (m)', angle: -90, position: 'insideLeft', fill: '#A0AEC0' }} stroke="#A0AEC0" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Kp', angle: 90, position: 'insideRight', fill: '#A0AEC0' }} stroke="#A0AEC0" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="predicted_error" name="예상 오차" stroke="#F56565" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="kp_index" name="Kp 지수" stroke="#4299E1" strokeWidth={2} dot={false} />
              <ReferenceLine yAxisId="left" y={profile.defaultThreshold} label={{ value: "부대 임계값", position: "insideTopRight", fill: "#4FD1C5" }} stroke="#4FD1C5" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">주요 장비별 작전 영향 분석</h2>
          <div className="space-y-3">
            {profile.equipment.map(eq => {
              const eqMaxError = Math.max(...forecast.map(d => d.predicted_error));
              const isAtRisk = eqMaxError > eq.sensitivity;
              return (
                <div key={eq.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                  <span className="font-medium text-sm">{eq.name}</span>
                  <div className="text-right">
                    <span className={`font-bold text-sm px-3 py-1 rounded-full ${isAtRisk ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {isAtRisk ? '위험' : '정상'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">임계값: {eq.sensitivity.toFixed(2)}m</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-white">최근 작전 피드백</h2>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {logs.length > 0 ? [...logs].reverse().map(log => (
              <div key={log.id} className="text-sm border-l-2 pl-3 border-blue-500">
                <p className="font-semibold text-gray-300">{log.time} - {log.equipment}</p>
                <p className="text-gray-400">영향: <span className={`font-bold ${log.impactLevel === '위험' ? 'text-red-400' : log.impactLevel === '주의' ? 'text-yellow-400' : 'text-green-400'}`}>{log.impactLevel}</span></p>
              </div>
            )) : <p className="text-gray-500 text-sm">입력된 피드백이 없습니다.</p>}
          </div>
        </div>
        <div className="bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-700 h-[400px]">
          <h2 className="text-lg font-semibold mb-4 text-white">ADS-B 항적 (청주 중심)</h2>
          <MapContainer center={[36.64, 127.49]} zoom={10} style={{ height: "300px", width: "100%", borderRadius: "0.75rem", backgroundColor: "#333" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {generateMockAircrafts().map(ac => {
              let color = "lime";
              if (ac.nic < 4) color = "red";
              else if (ac.nic < 8) color = "orange";
              return (
                <CircleMarker key={ac.id} center={[ac.lat, ac.lon]} radius={6} pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}>
                  <LeafletTooltip>
                    ✈️ ID: {ac.id} <br />
                    NIC: {ac.nic}
                  </LeafletTooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

// --- 부대 설정 뷰 ---
const SettingsView = ({ profile, setProfile, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));
  const handleSave = () => { setProfile(localProfile); goBack(); };
  const handleEquipmentChange = (id, field, value) => {
    const updatedEquipment = localProfile.equipment.map(eq => eq.id === id ? { ...eq, [field]: value } : eq);
    setLocalProfile({ ...localProfile, equipment: updatedEquipment });
  };
  const addEquipment = () => {
    const newId = localProfile.equipment.length > 0 ? Math.max(...localProfile.equipment.map(e => e.id)) + 1 : 1;
    setLocalProfile({ ...localProfile, equipment: [...localProfile.equipment, { id: newId, name: "신규 장비", sensitivity: 10.0 }] });
  };
  const removeEquipment = (id) => {
    setLocalProfile({ ...localProfile, equipment: localProfile.equipment.filter(eq => eq.id !== id) });
  };
  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl md:text-2xl font-bold text-white">부대 프로필 설정</h2>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">부대명</label>
          <input type="text" value={localProfile.unitName} onChange={e => setLocalProfile({ ...localProfile, unitName: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">종합 위험도 임계값 (m)</label>
          <input type="number" step="0.1" value={localProfile.defaultThreshold} onChange={e => setLocalProfile({ ...localProfile, defaultThreshold: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">주요 장비 및 민감도 설정</h3>
          <div className="space-y-4">
            {localProfile.equipment.map(eq => (
              <div key={eq.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-gray-700/50 p-4 rounded-lg">
                <input type="text" value={eq.name} onChange={e => handleEquipmentChange(eq.id, 'name', e.target.value)} className="md:col-span-3 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="장비명" />
                <div className="md:col-span-2 flex items-center space-x-2">
                  <input type="range" min="1" max="30" step="0.5" value={eq.sensitivity} onChange={e => handleEquipmentChange(eq.id, 'sensitivity', parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                  <span className="text-cyan-400 font-mono w-16 text-center">{eq.sensitivity.toFixed(1)}m</span>
                </div>
                <button onClick={() => removeEquipment(eq.id)} className="md:col-span-1 text-red-400 hover:text-red-300 p-2 justify-self-end"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
          <button onClick={addEquipment} className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <Plus className="w-5 h-5" /><span>장비 추가</span>
          </button>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2 transition-colors">
          <Save className="w-5 h-5" /><span>저장</span>
        </button>
      </div>
    </div>
  );
};

// --- 작전 피드백 입력 뷰 ---
const FeedbackView = ({ equipment, onSubmit, goBack }) => {
  const [log, setLog] = useState({
    time: new Date().toTimeString().slice(0, 5),
    equipment: equipment.length > 0 ? equipment[0].name : '',
    impactLevel: '정상',
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!log.equipment) { alert("장비를 선택해주세요."); return; }
    onSubmit(log);
  };
  return (
    <div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl md:text-2xl font-bold text-white">작전 피드백 입력</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">작전 시간</label>
          <input type="time" value={log.time} onChange={e => setLog({ ...log, time: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">운용 장비</label>
          <select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none">
            {equipment.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">관측된 GNSS 영향 수준</label>
          <div className="grid grid-cols-3 gap-3">
            {['정상', '주의', '위험'].map(level => (
              <button key={level} type="button" onClick={() => setLog({ ...log, impactLevel: level })}
                className={`p-3 rounded-lg text-center font-semibold transition-all ${log.impactLevel === level ? (level === '정상' ? 'bg-green-500 text-white' : level === '주의' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                {level}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center space-x-2 transition-colors">
            <BotMessageSquare className="w-5 h-5" /><span>피드백 제출</span>
          </button>
        </div>
      </form>
    </div>
  );
};
