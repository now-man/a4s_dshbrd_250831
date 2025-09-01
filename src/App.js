import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Zap, Settings, ShieldAlert, Target, BotMessageSquare, Plus, Trash2, Save, ArrowLeft, UploadCloud, ChevronDown, ChevronUp, TestTube2, BrainCircuit, Eraser, Lightbulb, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// --- Helper Functions ---
const getErrorColor = (error, threshold = 10.0) => { /* ... (no changes) ... */ };
const getSuccessScoreInfo = (score) => { /* ... (no changes) ... */ };
const formatDate = (dateString, format = 'full') => { /* ... (no changes) ... */ };
const toLocalISOString = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
const generateForecastData = () => { /* ... (no changes) ... */ };

// --- Main App Component ---
export default function App() { /* ... (no changes) ... */ }

// --- Header Component ---
const Header = ({ unitName, setActiveView, activeView }) => { /* ... (no changes) ... */ };

// --- Dashboard Sub-components ---
const LiveMap = ({threshold}) => { /* ... (no changes) ... */ };
const AutoFitBounds = ({ data }) => { /* ... (no changes) ... */ };
const FeedbackChart = ({ data, equipment }) => { /* ... (no changes) ... */ };
const FeedbackMap = ({ data, equipment }) => { /* ... (no changes) ... */ };
const XaiModal = ({ equipment, logs, onClose }) => { /* ... (no changes) ... */ };
const DashboardView = ({ profile, forecast, logs, deleteLog }) => { /* ... (no changes) ... */ };
const FeedbackView = ({ equipmentList, onSubmit, goBack }) => { /* ... (no changes) ... */ };
const SettingsView = ({ profile, setProfile, logs, goBack }) => { /* ... (no changes) ... */ };


// --- Developer Test View (UPDATED) ---
const DeveloperTestView = ({ setLogs, logs, profile, setProfile, initialProfile, goBack }) => {
    const generateMockLogs = () => { /* ... (no changes) ... */ };
    const clearLogs = () => { /* ... (no changes) ... */ };
    const autoTuneThresholds = () => { /* ... (no changes) ... */ };
    const resetThresholds = () => { /* ... (no changes) ... */ };

    // NEW FUNCTION
    const resetAppState = () => {
        if (window.confirm("앱의 모든 로컬 데이터(프로필, 피드백 로그)를 삭제하고 초기 상태로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            localStorage.removeItem('unitProfile');
            localStorage.removeItem('missionLogs');
            alert("앱 상태가 초기화되었습니다. 페이지를 새로고침합니다.");
            window.location.reload();
        }
    };

    return (<div className="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
        <div className="flex items-center mb-6"><button onClick={goBack} className="mr-4 p-2 rounded-full hover:bg-gray-700"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-xl md:text-2xl font-bold text-white">개발자 테스트 도구</h2></div>
        <div className="space-y-6">
            <div><h3 className="text-lg font-semibold text-white mb-3">피드백 데이터 관리</h3><div className="flex space-x-4"><button onClick={generateMockLogs} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><TestTube2 size={20} /><span>테스트 데이터 생성</span></button><button onClick={clearLogs} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>모든 데이터 삭제</span></button></div></div>
            <div><h3 className="text-lg font-semibold text-white mb-3">임계값 자동 튜닝</h3><div className="flex space-x-4"><button onClick={autoTuneThresholds} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><BrainCircuit size={20} /><span>자동 튜닝 실행</span></button><button onClick={resetThresholds} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><Eraser size={20} /><span>임계값 초기화</span></button></div></div>
            {/* NEW SECTION */}
            <div><h3 className="text-lg font-semibold text-white mb-3 text-red-400">위험 영역</h3><div className="flex space-x-4"><button onClick={resetAppState} className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center space-x-2"><RefreshCw size={20} /><span>앱 상태 전체 초기화</span></button></div></div>
        </div>
    </div>);
};
