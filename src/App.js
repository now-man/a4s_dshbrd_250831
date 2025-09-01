import React, { useState, useEffect, useMemo, useRef } from 'react';
import Calendar from "react-calendar";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Lightbulb, Zap, Activity, Plus, ArrowLeft, BotMessageSquare, UploadCloud, Compass, Edit3, MapPin, Save, Settings, RefreshCw, TestTube2, Eraser } from 'lucide-react';

// --- Chart.js & Helper Registration ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
const formatDate = (dateString, format = 'full') => { if (!dateString) return 'N/A'; const date = new Date(dateString); const options = { full: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }, date: { year: 'numeric', month: 'long', day: 'numeric' }}; return date.toLocaleString('ko-KR', options[format]); };
const formatDateKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const getSuccessScoreInfo = (score) => { if (score >= 8) return { label: "성공" }; if (score >= 4) return { label: "보통" }; return { label: "실패" }; };

// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [UNIT_DATA, setUnitData] = useState({ "제17전투비행단": { lat: 36.722701, lon: 127.499102 }, "제11전투비행단": { lat: 35.899526, lon: 128.639791 } });

  const initialProfile = {
      unitName: "제17전투비행단",
      location: { method: 'unit', coords: UNIT_DATA["제17전투비행단"] },
      timezone: 'KST',
      equipment: [ { id: 1, name: "JDAM", threshold: 10.0 }, { id: 2, name: "정찰 드론 (A형)", threshold: 15.0, usesGeoData: true }, { id: 4, name: "KF-21 비행체", threshold: 9.0, usesGeoData: true } ],
  };
  const [profile, setProfile] = useState(() => { try { const s = localStorage.getItem('unitProfile'); return s ? JSON.parse(s) : initialProfile; } catch (e) { return initialProfile; }});
  const [missionLogs, setMissionLogs] = useState(() => { try { const s = localStorage.getItem('missionLogs'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});
  const [todoList, setTodoList] = useState(() => { try { const s = localStorage.getItem('todoList'); return s ? JSON.parse(s) : []; } catch (e) { return []; }});

  useEffect(() => { localStorage.setItem('unitProfile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('missionLogs', JSON.stringify(missionLogs)); }, [missionLogs]);
  useEffect(() => { localStorage.setItem('todoList', JSON.stringify(todoList)); }, [todoList]);

  const handleFeedbackSubmit = (log) => { setMissionLogs(prev => [...prev, { ...log, id: Date.now() }].sort((a,b) => new Date(b.startTime) - new Date(a.startTime))); setActiveView('dashboard'); };
  const addTodo = (todo) => { setTodoList(prev => [...prev, { ...todo, id: Date.now() }].sort((a,b) => a.time.localeCompare(b.time))); };
  
  const renderView = () => {
    switch (activeView) {
      case 'settings': return <SettingsView profile={profile} setProfile={setProfile} UNIT_DATA={UNIT_DATA} goBack={() => setActiveView('dashboard')} />;
      case 'feedback': return <FeedbackView equipmentList={profile.equipment} onSubmit={handleFeedbackSubmit} goBack={() => setActiveView('dashboard')} />;
      case 'dev': return <DeveloperTestView setLogs={setMissionLogs} profile={profile} goBack={() => setActiveView('dashboard')} />;
      default: return <DashboardView profile={profile} missionLogs={missionLogs} todoList={todoList} addTodo={addTodo} />;
    }
  };
  return (<> <Header profile={profile} setActiveView={setActiveView} /> <main>{renderView()}</main> </>);
}

// --- Header Component ---
const Header = ({profile, setActiveView}) => {
    const [time, setTime] = useState({kst: '', utc:''});
    const [weather, setWeather] = useState("날씨 정보 로딩 중...");

    useEffect(() => { const timer = setInterval(() => { const now = new Date(); setTime({ kst: now.toLocaleTimeString('ko-KR', {timeZone:'Asia/Seoul', hour12:false}), utc: now.toLocaleTimeString('en-GB', {timeZone:'UTC', hour12:false}) }); }, 1000); return () => clearInterval(timer); }, []);
    useEffect(() => {
        const {lat, lon} = profile.location.coords; if (!lat || !lon) { setWeather("위치 정보 없음"); return; }
        const API_KEY = "402b17f5ee941f24e13c01620a13c7b8";
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`).then(res => res.json()).then(data => { setWeather(`${data.name} | ${data.weather[0].description} | ${data.main.temp.toFixed(1)}°C`); }).catch(() => setWeather("날씨 정보 로드 실패"));
    }, [profile.location]);
    const renderTime = () => { const kst = `${time.kst} KST`, utc = `${time.utc} UTC`; if (profile.timezone === 'BOTH') return `${kst} / ${utc}`; return profile.timezone === 'KST' ? kst : utc; };

    return (<header className="main-header">
        <div className="logo">AIR4SPACE</div>
        <div className="meta-info"><div>{formatDate(new Date(), 'date')}</div><div>{renderTime()}</div><div>{weather}</div></div>
        <div className="header-actions"><button onClick={() => setActiveView('settings')}><Settings size={20}/></button><button onClick={() => setActiveView('dev')}><TestTube2 size={20}/></button></div>
    </header>);
};

// --- Dashboard Component ---
const DashboardView = ({ profile, missionLogs, todoList, addTodo }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const logsByDate = useMemo(() => { const grouped = {}; missionLogs.forEach(log => { const key = formatDateKey(log.startTime); if (!grouped[key]) grouped[key] = []; grouped[key].push(log); }); return grouped; }, [missionLogs]);
    return (<div className="dashboard-grid">
        <div className="card col-span-2"><GnssGraph /></div><div className="card col-span-1"><MissionAdvisory /></div>
        <div className="card col-span-2" style={{height: '500px'}}><MyCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} logsByDate={logsByDate} /></div>
        <div className="card col-span-1"><TodoList todoList={todoList} addTodo={addTodo} /></div>
        <div className="card col-span-3"><h3 style={{marginTop:0}}>{formatDate(selectedDate, 'date')} 피드백 로그</h3><div style={{maxHeight:'400px', overflowY:'auto'}}>
            {logsByDate[formatDateKey(selectedDate)] ? logsByDate[formatDateKey(selectedDate)].map(log => (<div key={log.id} style={{borderBottom:'1px solid var(--border-color)', padding:'1rem 0'}}>{log.equipment}: {getSuccessScoreInfo(log.successScore).label}</div>)) : <p>해당 날짜에 기록된 피드백이 없습니다.</p>}
        </div></div>
    </div>);
};

// --- Dashboard Sub-components ---
const GnssGraph = () => {
    const [chartData, setChartData] = useState(null);
    useEffect(() => { fetch("/data.json").then(res => res.json()).then(data => setChartData(data.gnss_prediction));}, []);
    const options = { maintainAspectRatio: false, responsive: true, scales: { y: { beginAtZero: true, ticks:{color:'#9ca3af'} }, x: { ticks:{color:'#9ca3af'} } }, plugins: { legend: { labels: { color: '#f3f4f6' } } } };
    return (<><h3>시간대별 GNSS 오차 예측</h3><div style={{height: '200px'}}>{chartData ? <Line options={options} data={{ labels: chartData.labels, datasets: [{ label: "예상 오차율(%)", data: chartData.error_rate, borderColor: "rgb(74, 163, 255)", tension: 0.4 }]}} /> : <p>로딩 중...</p>}</div></>);
};
const MissionAdvisory = () => (<><h3><Lightbulb size={20} style={{display:'inline-block', marginRight:'0.5rem'}}/>금일 임무 권고 사항 (XAI)</h3><div className="mission-advisory-content"><div className="advisory-item"><Zap size={24} className="advisory-icon" /><p className="advisory-text"><strong>분석:</strong> 현재 Kp 지수 및 단기 예보를 기반으로 <strong>18:00 KST 이후</strong> GNSS 오차가 <strong>12m</strong>를 초과할 확률이 높습니다.<br /><strong>권고:</strong> 해당 시간대 정밀 타격 임무는 재검토를 권장합니다.</p></div></div></>);
const MyCalendar = ({ selectedDate, setSelectedDate, logsByDate }) => (<Calendar onChange={setSelectedDate} value={selectedDate} formatDay={(locale, date) => date.getDate()} calendarType="gregory" showNeighboringMonth={false} next2Label={null} prev2Label={null} tileContent={({ date, view }) => view === 'month' && logsByDate[formatDateKey(date)] ? <div className="log-indicator"></div> : null} />);
const TodoList = ({ todoList, addTodo }) => {
    const [input, setInput] = useState({time: "12:00", text: "", tag: "Brief"});
    const handleAdd = () => { if(input.text) { addTodo(input); setInput({time: "12:00", text: "", tag: "Brief"}); }};
    return (<><h3><Activity size={20} style={{display:'inline-block', marginRight:'0.5rem'}}/>주요 활동</h3><div className="todo-list-content">
        {todoList.map(item => (<div key={item.id} className="todo-item"><span className="todo-time">{item.time}</span><span>{item.text}</span><span className="todo-tag">{item.tag}</span></div>))}
        <div className="todo-input-form"><input type="time" value={input.time} onChange={e => setInput({...input, time:e.target.value})} className="todo-input" style={{flex:'none', width:'auto'}}/><input type="text" placeholder="활동 내용" value={input.text} onChange={e => setInput({...input, text:e.target.value})} className="todo-input" /><button onClick={handleAdd} className="todo-submit"><Plus size={16}/></button></div>
    </div></>);
};

// --- FeedbackView Component ---
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => {
    const [log, setLog] = useState({ startTime: toLocalISOString(new Date(new Date().getTime() - 60*60*1000)), endTime: toLocalISOString(new Date()), equipment: equipmentList.length > 0 ? equipmentList[0].name : '', successScore: 10, gnssErrorData: null });
    const [fileName, setFileName] = useState("");
    const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) { setLog({ ...log, gnssErrorData: null }); setFileName(""); return; } setFileName(file.name); const reader = new FileReader(); reader.onload = (event) => { try { const text = event.target.result; const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== ''); if (lines.length < 2) throw new Error("CSV에 데이터가 없습니다."); const header = lines[0].trim().split(',').map(h => h.trim()); const hasGeo = header.includes('lat') && header.includes('lon'); if (header[0] !== 'date' || header[1] !== 'error_rate') throw new Error("헤더는 'date,error_rate'로 시작해야 합니다."); const data = lines.slice(1).map((line, i) => { const vals = line.split(','); if ((hasGeo && vals.length !== 4) || (!hasGeo && vals.length !== 2)) throw new Error(`${i+2}번째 줄 형식이 잘못되었습니다.`); const err = parseFloat(vals[1]); if (isNaN(err)) throw new Error(`${i+2}번째 줄 error_rate가 숫자가 아닙니다.`); const entry = { date: vals[0].trim(), error_rate: err }; if (hasGeo) { entry.lat = parseFloat(vals[2]); entry.lon = parseFloat(vals[3]); if (isNaN(entry.lat) || isNaN(entry.lon)) throw new Error(`${i+2}번째 줄 lat/lon이 숫자가 아닙니다.`); } return entry; }); setLog(prev => ({ ...prev, gnssErrorData: data })); } catch (error) { alert(`CSV 파싱 오류: ${error.message}`); setLog(prev => ({...prev, gnssErrorData: null})); setFileName(""); e.target.value = null; } }; reader.readAsText(file); };
    const handleSubmit = (e) => { e.preventDefault(); if (!log.equipment) { alert("장비를 선택해주세요."); return; } if (!log.startTime || !log.endTime) { alert("시작/종료 시간을 입력해주세요."); return; } onSubmit(log); };
    return (<div className="card" style={{maxWidth:'800px', margin:'2rem auto'}}><div style={{display:'flex', alignItems:'center', marginBottom:'1.5rem'}}><button onClick={goBack} style={{background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer'}}><ArrowLeft size={24} /></button><h3 style={{margin: '0 0 0 1rem'}}>작전 피드백 입력</h3></div><form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}><div style={{display:'flex', gap:'1rem'}}><div><label className="form-label">작전 시작 시간</label><input type="datetime-local" value={log.startTime} onChange={e => setLog({ ...log, startTime: e.target.value })} className="form-input" /></div><div><label className="form-label">작전 종료 시간</label><input type="datetime-local" value={log.endTime} onChange={e => setLog({ ...log, endTime: e.target.value })} className="form-input" /></div></div><div><label className="form-label">운용 장비</label><select value={log.equipment} onChange={e => setLog({ ...log, equipment: e.target.value })} className="form-input"><option value="" disabled>장비를 선택하세요</option>{equipmentList.map(eq => <option key={eq.id} value={eq.name}>{eq.name}</option>)}</select></div><div><label className="form-label">GNSS 기반 작전 성공도</label><div style={{display:'flex', alignItems:'center', gap:'1rem'}}><input type="range" min="1" max="10" value={log.successScore} onChange={e => setLog({ ...log, successScore: parseInt(e.target.value)})} style={{width:'100%'}}/><span style={{color:getSuccessScoreInfo(log.successScore).color, width:'80px', textAlign:'center'}}>{log.successScore}점 ({getSuccessScoreInfo(log.successScore).label})</span></div></div><div><label className="form-label">GNSS 오차 데이터 (선택)</label><label htmlFor="csv-upload" className="form-input" style={{cursor:'pointer', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem'}}><UploadCloud size={16}/><span>{fileName || "CSV (date,error_rate[,lat,lon])"}</span></label><input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} style={{display:'none'}} /></div><div style={{paddingTop:'1rem', display:'flex', justifyContent:'flex-end'}}><button type="submit" className="todo-submit" style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><BotMessageSquare size={20} /><span>피드백 제출</span></button></div></form></div>);
};

// --- SettingsView Component ---
const SettingsView = ({ profile, setProfile, UNIT_DATA, goBack }) => {
  const [localProfile, setLocalProfile] = useState(JSON.parse(JSON.stringify(profile)));
  const handleSave = () => { setProfile(localProfile); goBack(); };
  const handleLocationMethodChange = (method) => { if (method === 'unit') { const coords = UNIT_DATA[localProfile.unitName] || { lat: null, lon: null }; setLocalProfile(p => ({ ...p, location: { method, coords }})); } else { setLocalProfile(p => ({ ...p, location: { ...p.location, method }})); } };
  return (<div className="card" style={{maxWidth:'800px', margin:'2rem auto'}}><div style={{display:'flex', alignItems:'center', marginBottom:'1.5rem'}}><button onClick={goBack} style={{background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer'}}><ArrowLeft size={24} /></button><h3 style={{margin: '0 0 0 1rem'}}>설정</h3></div><div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
      <div><h4>부대 및 위치</h4><div className="form-group"><label className="form-label">부대명</label><select className="form-input" value={localProfile.unitName} onChange={e => setLocalProfile(p => ({...p, unitName: e.target.value}))}>{Object.keys(UNIT_DATA).map(name => <option key={name} value={name}>{name}</option>)}</select></div><div className="form-group"><label className="form-label">위치 설정 방식</label><div className="radio-group" style={{display:'flex', gap:'0.5rem'}}><button onClick={() => handleLocationMethodChange('unit')} className={localProfile.location.method === 'unit' ? 'active' : ''}><Compass size={16}/> 부대 위치</button><button onClick={() => handleLocationMethodChange('manual')} className={localProfile.location.method === 'manual' ? 'active' : ''}><Edit3 size={16}/> 직접 입력</button><button onClick={() => handleLocationMethodChange('current')} className={localProfile.location.method === 'current' ? 'active' : ''}><MapPin size={16}/> 현재 위치</button></div></div>
      {localProfile.location.method === 'manual' && (<div style={{display:'flex', gap:'1rem'}}><div className="form-group"><label className="form-label">위도</label><input type="number" step="any" className="form-input" value={localProfile.location.coords.lat || ''} onChange={e => setLocalProfile(p => ({...p, location: {...p.location, coords: {...p.location.coords, lat: parseFloat(e.target.value) || null}} }))}/></div><div className="form-group"><label className="form-label">경도</label><input type="number" step="any" className="form-input" value={localProfile.location.coords.lon || ''} onChange={e => setLocalProfile(p => ({...p, location: {...p.location, coords: {...p.location.coords, lon: parseFloat(e.target.value) || null}} }))}/></div></div>)}</div>
      <div><h4>표준 시간</h4><div className="form-group"><div className="radio-group" style={{display:'flex', gap:'0.5rem'}}><button onClick={() => setLocalProfile(p => ({...p, timezone: 'KST'}))} className={localProfile.timezone === 'KST' ? 'active' : ''}>KST</button><button onClick={() => setLocalProfile(p => ({...p, timezone: 'UTC'}))} className={localProfile.timezone === 'UTC' ? 'active' : ''}>UTC</button><button onClick={() => setLocalProfile(p => ({...p, timezone: 'BOTH'}))} className={localProfile.timezone === 'BOTH' ? 'active' : ''}>KST/UTC</button></div></div></div>
      <div style={{paddingTop:'1rem', display:'flex', justifyContent:'flex-end'}}><button onClick={handleSave} className="todo-submit" style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><Save size={18}/><span>설정 저장</span></button></div>
  </div></div>);
};

// --- Developer Test View ---
const DeveloperTestView = ({ setLogs, profile, goBack }) => {
    const generateMockLogs = () => { if (!window.confirm("기존 피드백을 삭제하고, 30일간의 테스트 데이터를 생성합니까? (약 300~400개)")) return; const newLogs = []; const today = new Date(); for (let i = 0; i < 30; i++) { const date = new Date(today); date.setDate(today.getDate() - i); const logCount = Math.floor(Math.random() * 5) + 10; for (let j = 0; j < logCount; j++) { const eq = profile.equipment[Math.floor(Math.random() * profile.equipment.length)]; const isBadWeather = Math.random() < 0.3; const baseError = isBadWeather ? (eq.threshold * 0.8 + Math.random() * 5) : (3 + Math.random() * 4); const successScore = baseError > eq.threshold * 0.9 ? Math.floor(1 + Math.random() * 5) : Math.floor(8 + Math.random() * 3); const startTime = new Date(date); startTime.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 60)); const endTime = new Date(startTime.getTime() + (30 + Math.floor(Math.random() * 90)) * 60000); const data = []; let curTime = new Date(startTime); const p0 = [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; const p1 = [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; const p2 = Math.random() < 0.5 ? p0 : [36.5+Math.random()*0.5, 127.2+Math.random()*0.5]; let step = 0; while (curTime <= endTime) { const err = Math.max(1.0, baseError + (Math.random() - 0.5) * 4); const entry = { date: curTime.toISOString(), error_rate: parseFloat(err.toFixed(2))}; if (eq.usesGeoData) { const progress = step / ((endTime - startTime) / 60000); const pos = getPointOnBezierCurve(progress, p0, p1, p2); entry.lat = pos[0]; entry.lon = pos[1]; } data.push(entry); curTime.setMinutes(curTime.getMinutes() + 1); step++; } newLogs.push({ id: Date.now() + i * 10 + j, startTime: startTime.toISOString(), endTime: endTime.toISOString(), equipment: eq.name, successScore, gnssErrorData: data }); } } setLogs(newLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))); alert(`${newLogs.length}개의 테스트 피드백이 생성되었습니다.`); };
    const clearLogs = () => { if (window.confirm("모든 피드백 데이터를 삭제하시겠습니까?")) { setLogs([]); alert("모든 피드백이 삭제되었습니다."); }};
    const resetAppState = () => { if (window.confirm("앱의 모든 로컬 데이터(프로필, 피드백 로그)를 삭제하고 초기 상태로 되돌리시겠습니까?")) { localStorage.clear(); alert("앱 상태가 초기화되었습니다. 페이지를 새로고침합니다."); window.location.reload(); }};
    return (<div className="card" style={{maxWidth:'800px', margin:'2rem auto'}}><div style={{display:'flex', alignItems:'center', marginBottom:'1.5rem'}}><button onClick={goBack} style={{background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer'}}><ArrowLeft size={24} /></button><h2 style={{margin: '0 0 0 1rem'}}>개발자 테스트 도구</h2></div><div style={{display:'flex', flexDirection:'column', gap:'2rem'}}>
        <div><h4>피드백 데이터 관리</h4><div style={{display:'flex', gap:'1rem'}}><button onClick={generateMockLogs} className="todo-submit">테스트 데이터 생성 (x5)</button><button onClick={clearLogs} className="todo-submit" style={{backgroundColor:'var(--accent-red)'}}>모든 데이터 삭제</button></div></div>
        <div><h4 style={{color:'var(--accent-red)'}}>위험 영역</h4><div style={{display:'flex', gap:'1rem'}}><button onClick={resetAppState} className="todo-submit" style={{backgroundColor:'#991b1b'}}>앱 상태 전체 초기화</button></div></div>
    </div></div>);
};
