import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';


// --- Mock 데이터 생성 함수 ---
const generateForecastData = () => {
  const data = [];
  const now = new Date();
  now.setHours(now.getHours() - 12, 0, 0, 0); // 12시간 전부터 시작

  for (let i = 0; i < 24; i++) {
    now.setHours(now.getHours() + 1);
    const hour = now.getHours();
    let error = 2 + Math.random() * 2;
    if (hour >= 18 || hour <= 3) {
      error += 3 + Math.random() * 5;
    }
    if (hour >= 21 && hour <= 23) {
      error += 5 + Math.random() * 5;
    }
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
    } catch (error) {
      return [];
    }
  });

  const [forecastData, setForecastData] = useState(generateForecastData());

  useEffect(() => {
    localStorage.setItem('unitProfile', JSON.stringify(unitProfile));
  }, [unitProfile]);

  useEffect(() => {
    localStorage.setItem('missionLogs', JSON.stringify(missionLogs));
  }, [missionLogs]);

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
          const userConfirmed = window.confirm(
            `[임계값 조정 제안]\n\n'${log.equipment}' 장비가 기존 임계값(${equipmentToUpdate.sensitivity}m)보다 낮은 오차(${errorAtMissionTime}m)에서 '${log.impactLevel}' 영향을 보고했습니다.\n\n해당 장비의 민감도 임계값을 ${newSensitivity}m으로 하향 조정하시겠습니까?`
          );
          if (userConfirmed) {
            const updatedEquipment = unitProfile.equipment.map(e =>
              e.id === equipmentToUpdate.id ? { ...e, sensitivity: newSensitivity } : e
            );
            setUnitProfile({ ...unitProfile, equipment: updatedEquipment });
          }
        }
      }
    }
    setActiveView('dashboard');
  };

  const renderView = () => {
    switch (activeView) {
      case 'settings':
        return <SettingsView profile={unitProfile} setProfile={setUnitProfile} goBack={() => setActiveView('dashboard')} />;
      case 'feedback':
        return <FeedbackView equipment={unitProfile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      default:
        return <DashboardView profile={unitProfile} forecast={forecastData} logs={missionLogs} />;
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

const generateMockAircrafts = () => {
  const aircrafts = [];
  for (let i = 0; i < 10; i++) {
    const lat = 36.64 + (Math.random() - 0.5) * 0.5;
    const lon = 127.49 + (Math.random() - 0.5) * 0.5;
    const nic = Math.floor(Math.random() * 12);
    aircrafts.push({ id: i + 1, lat, lon, nic });
  }
  return aircrafts;
};

const DashboardView = ({ profile, forecast, logs }) => {
  const maxError = useMemo(() => Math.max(...forecast.map(d => d.predicted_error)), [forecast]);
  const overallStatus = useMemo(() => {
    if (maxError > profile.defaultThreshold)
      return { label: "위험", color: "text-red-400", bgColor: "bg-red-900/50", icon: <ShieldAlert className="w-8 h-8 md:w-10 md:h-10" /> };
    if (maxError > profile.defaultThreshold * 0.7)
      return { label: "주의", color: "text-yellow-400", bgColor: "bg-yellow-900/50", icon: <Zap className="w-8 h-8 md:w-10 md:h-10" /> };
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
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-xs md:text-sm">최대 예상 오차</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{maxError.toFixed(2)} m</p>
            </div>
            <div className="text-center md:text-left">
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
                <CircleMarker
                  key={ac.id}
                  center={[ac.lat, ac.lon]}
                  radius={6}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}
                >
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


const SettingsView = ({ profile, setProfile, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));

  const handleSave = () => {
    setProfile(localProfile);
    goBack();
  };

  const handleEquipmentChange = (id, field, value) => {
    const updatedEquipment = localProfile.equipment.map(eq =>
      eq.id === id ? { ...eq, [field]: value } : eq
    );
    setLocalProfile({ ...localProfile, equipment: updatedEquipment });
  };

  const addEquipment = () => {
    const newId = localProfile.equipment.length > 0 ? Math.max(...localProfile.equipment.map(e => e.id)) + 1 : 1;
    setLocalProfile({
      ...localProfile,
      equipment: [...localProfile.equipment, { id: newId, name: "신규 장비", sensitivity: 10.0 }]
    });
  };

  const removeEquipment = (id) => {
    setLocalProfile({
      ...localProfile,
      equipment: localProfile.equipment.filter(eq => eq.id !== id)
    });
  };

  return (
