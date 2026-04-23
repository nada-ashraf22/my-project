
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// --- الأنواع والواجهات (Types & Interfaces) ---

type RecordType = 'medication' | 'surgery' | 'chronic' | 'past_diagnosis' | 'note';

interface MedicalRecordEntry {
  id: string;
  type: RecordType;
  date: string;
  title: string;
  details: string;
  doctorName?: string;
}

interface Patient {
  id: string;
  displayId: number;
  name: string;
  age: number;
  gender: 'ذكر' | 'أنثى';
  bloodType: string;
  history: MedicalRecordEntry[];
}

interface DoctorProfile {
  name: string;
  age: number;
  specialty: string;
  treatedDisease: string;
}

interface User {
  id: string;
  name: string;
  role: 'patient' | 'doctor';
  doctorInfo?: DoctorProfile;
}

// --- البيانات التجريبية المنظمة ---

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    displayId: 1,
    name: 'أحمد محمد الشريف',
    age: 45,
    gender: 'ذكر',
    bloodType: 'O+',
    history: [
      { id: '1', type: 'surgery', date: '2020-05-12', title: 'استئصال الزائدة الدودية', details: 'جراحة عامة - تم الاستئصال بنجاح ولا توجد مضاعفات.' },
      { id: '2', type: 'medication', date: '2024-01-10', title: 'أملوديبين 5 ملجم', details: 'علاج ضغط الدم - حبة واحدة يومياً مساءً.' },
      { id: '3', type: 'chronic', date: '2018-03-15', title: 'السكري النوع الثاني', details: 'حالة مستقرة - متابعة الحمية الغذائية مع فحص دوري.' },
      { id: '4', type: 'past_diagnosis', date: '2021-09-10', title: 'التهاب رئوي حاد (تم الشفاء)', details: 'عولج بمضادات حيوية واسعة الطيف - الرئتين بحالة ممتازة الآن.' },
    ]
  },
  {
    id: 'p2',
    displayId: 2,
    name: 'ليلى سالم',
    age: 32,
    gender: 'أنثى',
    bloodType: 'A-',
    history: [
      { id: '5', type: 'medication', date: '2024-02-05', title: 'فيتامين د', details: 'مكمل غذائي - 50,000 وحدة أسبوعياً.' }
    ]
  }
];

// --- المكونات المساعدة ---

const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[2.5rem] shadow-sm p-8 border border-slate-100 ${className}`}>
    {children}
  </div>
);

const HistorySectionHeader = ({ icon, title, color }: { icon: string, title: string, color: string }) => (
  <div className="flex items-center justify-end gap-3 mb-4 mt-8 first:mt-0">
    <h3 className="text-lg font-black text-slate-800">{title}</h3>
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-sm`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
  </div>
);

// --- التطبيق الرئيسي ---

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'scanner' | 'history' | 'profile' | 'patients' | 'add' | 'ai_assistant' | 'settings'>('overview');
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('p1');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isViewingPatientFile, setIsViewingPatientFile] = useState(false);
  const [isDocProcessing, setIsDocProcessing] = useState(false);
  
  const [symptoms, setSymptoms] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('medical_app_v12_patients');
    if (saved) setPatients(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('medical_app_v12_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    if (activeTab === 'scanner' && user?.role === 'doctor') {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 280, height: 280 },
        rememberLastUsedCamera: true,
      }, false);

      scanner.render((decodedText) => {
        const found = patients.find(p => p.id === decodedText);
        if (found) {
          setSelectedPatientId(decodedText);
          setScanSuccess(true);
          setTimeout(() => {
            setIsViewingPatientFile(true);
            setActiveTab('history');
            setScanSuccess(false);
            scanner.clear();
          }, 1200);
        }
      }, (error) => {});

      scannerRef.current = scanner;
      return () => {
        if (scannerRef.current) scannerRef.current.clear().catch(() => {});
      };
    }
  }, [activeTab, user]);

  const handleLogin = (role: 'patient' | 'doctor') => {
    if (role === 'doctor') {
      setUser({
        id: 'd1', name: 'د. سارة الكناني', role: 'doctor',
        doctorInfo: { name: 'د. سارة الكناني', age: 38, specialty: 'استشاري أمراض القلب والأوعية الدموية', treatedDisease: 'ارتفاع ضغط الدم وفشل عضلة القلب' }
      });
    } else {
      setUser({ id: 'u1', name: 'أحمد محمد الشريف', role: 'patient' });
    }
    setActiveTab('overview');
    setIsViewingPatientFile(false);
  };

  const isDoctor = user?.role === 'doctor';
  const selectedPatient = patients.find(p => p.id === (isDoctor ? selectedPatientId : 'p1')) || patients[0];

  const handleAIDiagnosis = async () => {
    if (!symptoms.trim()) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `أنت مساعد طبي ذكي. بناءً على الأعراض التالية: "${symptoms}"، قدم تحليلاً مبدئياً للحالات المحتملة واقترح التخصص الطبي المناسب الذي يجب زيارته. تذكر دائماً إضافة تنبيه بأن هذا ليس تشخيصاً نهائياً ويجب رؤية طبيب. اجعل الإجابة منظمة وودودة باللغة العربية.`,
      });
      setAiResponse(response.text || 'عذراً، لم أتمكن من تحليل الأعراض حالياً.');
    } catch (error) {
      setAiResponse('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDocumentScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDocProcessing(true);
    setShowDocScanner(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: `هذه صورة لمستند طبي (روشتة أو تقرير). استخرج منها البيانات التالية بدقة باللغة العربية: العناون، التاريخ، النوع (اختر واحداً فقط من: medication, surgery, chronic, past_diagnosis)، والتفاصيل.
              يجب أن يكون الرد بتنسيق JSON حصراً كالتالي:
              {"title": "...", "date": "YYYY-MM-DD", "type": "...", "details": "..."}` }
            ]
          }
        });

        try {
          const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(cleanText);
          addRecord({
            type: data.type || 'note',
            title: data.title || 'سجل ممسوح ضوئياً',
            date: data.date || new Date().toISOString().split('T')[0],
            details: data.details || 'تم استخراج البيانات عبر الماسح الضوئي الذكي.',
            doctorName: 'نظام المسح الذكي'
          });
          setScanSuccess(true);
          setTimeout(() => {
             setShowDocScanner(false);
             setScanSuccess(false);
             setIsDocProcessing(false);
          }, 2000);
        } catch (jsonError) {
          console.error("JSON Parsing error", jsonError);
          setIsDocProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Scanning error", error);
      setIsDocProcessing(false);
    }
  };

  const addRecord = (entry: Omit<MedicalRecordEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() };
    setPatients(prev => prev.map(p => 
      p.id === selectedPatient.id ? { ...p, history: [newEntry, ...p.history] } : p
    ));
    setIsViewingPatientFile(true);
    setActiveTab('history');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full text-center border-0 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-xl shadow-blue-100 mt-4">
            <i className="fa-solid fa-house-chimney-medical text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">منصة الرعاية الذكية</h1>
          <p className="text-slate-400 mb-10 text-sm px-4">إدارة احترافية للسجلات الطبية ومعاينات المرضى بخصوصية تامة</p>
          <div className="space-y-4 px-4 pb-4">
            <button onClick={() => handleLogin('doctor')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              <i className="fa-solid fa-user-doctor"></i> دخول الطبيب
            </button>
            <button onClick={() => handleLogin('patient')} className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">دخول المريض</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pr-72 bg-slate-50 text-slate-800">
      
      {/* Hidden inputs for camera capture */}
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleDocumentScan} />

      {/* Floating Action Button for Patient (Camera) */}
      {!isDoctor && (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="fixed bottom-28 left-6 lg:bottom-10 lg:left-10 z-50 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group"
          title="مسح ملف طبي"
        >
          <i className="fa-solid fa-camera-retro text-xl group-hover:text-blue-400"></i>
          <span className="absolute right-full mr-3 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">مسح ملف ورقي</span>
        </button>
      )}

      {/* Logout */}
      <div className="fixed top-6 left-6 z-50">
        <button onClick={() => setUser(null)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-rose-500 shadow-xl hover:bg-rose-50 transition-all group">
          <i className="fa-solid fa-power-off group-hover:scale-110 transition-transform"></i>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`hidden lg:flex fixed top-0 right-0 h-full w-72 flex-col p-8 z-20 border-l transition-all ${isDoctor ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-end gap-4 mb-12">
          <span className="font-black text-xl tracking-tight">الرعاية الذكية</span>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-staff-snake text-xl"></i></div>
        </div>
        
        <nav className="space-y-3 flex-grow">
          <SidebarLink active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsViewingPatientFile(false); }} icon="fa-house" label="الرئيسية" isDark={isDoctor} />
          {isDoctor && (
            <>
              <SidebarLink active={activeTab === 'patients'} onClick={() => { setActiveTab('patients'); setIsViewingPatientFile(false); }} icon="fa-users-rectangle" label="قائمة المرضى" isDark={isDoctor} />
              <SidebarLink active={activeTab === 'scanner'} onClick={() => { setActiveTab('scanner'); setIsViewingPatientFile(false); }} icon="fa-qrcode" label="ماسح QR" isDark={isDoctor} />
            </>
          )}
          {!isDoctor && <SidebarLink active={activeTab === 'ai_assistant'} onClick={() => setActiveTab('ai_assistant')} icon="fa-brain" label="مساعد التشخيص" isDark={isDoctor} />}
          <SidebarLink active={activeTab === 'history'} onClick={() => { setActiveTab('history'); if(isDoctor) setIsViewingPatientFile(false); }} icon="fa-folder-medical" label={isDoctor ? "سجل النشاط" : "السجل الطبي"} isDark={isDoctor} />
          {isDoctor && <SidebarLink active={activeTab === 'add'} onClick={() => { setActiveTab('add'); setIsViewingPatientFile(false); }} icon="fa-plus-circle" label="إضافة سجل" isDark={isDoctor} />}
          <SidebarLink active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsViewingPatientFile(false); }} icon="fa-gear" label="الإعدادات" isDark={isDoctor} />
          <SidebarLink active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsViewingPatientFile(false); }} icon="fa-id-card-clip" label={isDoctor ? "ملفي المهني" : "ملفي الشخصي"} isDark={isDoctor} />
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-100/10">
          <div className={`p-4 rounded-2xl flex items-center gap-3 flex-row-reverse ${isDoctor ? 'bg-white/5' : 'bg-slate-50'}`}>
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold">{user.name[0]}</div>
            <div className="overflow-hidden text-right">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] opacity-50 uppercase tracking-widest">{isDoctor ? 'طبيب ممارس' : 'مريض'}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="max-w-4xl mx-auto p-6 lg:p-12 min-h-screen text-right">
        
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <header>
              <h1 className="text-4xl font-black text-slate-800">مرحباً، {user.name}</h1>
              <p className="text-slate-400 mt-2">{isDoctor ? 'استعراض الحالات التي تمت معاينتها اليوم' : 'ملخص بياناتك الصحية الأساسية'}</p>
            </header>

            {isDoctor ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-blue-600 text-white border-0 shadow-lg shadow-blue-100">
                  <p className="text-blue-100 text-[10px] font-black uppercase mb-4 tracking-widest text-right">التخصص والمهنة</p>
                  <h3 className="text-2xl font-bold">{user.doctorInfo?.specialty}</h3>
                  <div className="mt-6 flex items-center gap-3 bg-white/10 p-4 rounded-2xl justify-end">
                    <p className="text-sm font-medium">المرض المعالج: {user.doctorInfo?.treatedDisease}</p>
                    <i className="fa-solid fa-notes-medical"></i>
                  </div>
                </Card>
                <button onClick={() => { setActiveTab('scanner'); setIsViewingPatientFile(false); }} className="text-right group">
                  <Card className="bg-slate-800 text-white border-0 hover:bg-slate-700 transition-all h-full flex flex-col justify-between">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest">إجراء سريع</p>
                    <div className="flex justify-between items-center">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl text-blue-400 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-qrcode"></i>
                      </div>
                      <h3 className="text-2xl font-black">فتح ماسح الـ QR</h3>
                    </div>
                  </Card>
                </button>
              </div>
            ) : (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600/20 rounded-br-[100px]"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <button onClick={() => setShowQRModal(true)} className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-500 transition-all" title="كود الهوية الرقمية"><i className="fa-solid fa-qrcode text-lg"></i></button>
                    <div className="text-right">
                      <p className="text-blue-400 text-[10px] font-black uppercase mb-1 tracking-widest">البطاقة الطبية الأساسية</p>
                      <h3 className="text-2xl font-bold">{selectedPatient.name}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 text-center">
                     <div><p className="text-slate-500 text-[10px] uppercase font-black mb-1">المعرف</p><p className="font-mono text-lg">P-{selectedPatient.displayId.toString().padStart(4, '0')}</p></div>
                     <div><p className="text-slate-500 text-[10px] uppercase font-black mb-1">فصيلة الدم</p><p className="font-bold text-lg text-blue-400">{selectedPatient.bloodType}</p></div>
                     <div><p className="text-slate-500 text-[10px] uppercase font-black mb-1">السن</p><p className="font-bold text-lg">{selectedPatient.age} عاماً</p></div>
                  </div>
                </div>
              </Card>
            )}
            
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
               <h2 className="text-xl font-black mb-6 flex items-center justify-end gap-3">
                  {isDoctor ? "آخر المرضى المراجعين" : "آخر السجلات المضافة"}
                  <i className="fa-solid fa-clock-rotate-left text-blue-600"></i>
               </h2>
               <div className="space-y-4">
                  {isDoctor ? (
                    patients.slice(0, 3).map(p => (
                      <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all">
                        <button onClick={() => { setSelectedPatientId(p.id); setIsViewingPatientFile(true); setActiveTab('history'); }} className="px-5 py-2.5 text-blue-600 bg-blue-50 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all">فتح السجل</button>
                        <div className="flex items-center gap-5">
                          <div className="text-right">
                            <p className="font-black text-lg text-slate-800">مريض رقم {p.displayId}</p>
                            <p className="text-xs text-slate-400 mt-1">{p.age} عاماً | {p.gender}</p>
                          </div>
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">{p.displayId}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    selectedPatient.history.slice(0, 3).map(h => (
                      <div key={h.id} className="flex items-center justify-end gap-4 p-4 bg-slate-50 rounded-2xl">
                        <div className="text-right"><p className="font-bold">{h.title}</p><p className="text-xs text-slate-400">{h.date}</p></div>
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><i className="fa-solid fa-check"></i></div>
                      </div>
                    ))
                  )}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-12 animate-in fade-in">
             <header className="flex justify-between items-center flex-row-reverse">
                <div className="text-right">
                   <h2 className="text-3xl font-black">
                     {isDoctor ? (isViewingPatientFile ? "الملف الطبي للمريض" : "سجل النشاط المهني") : "السجل الطبي المصنف"}
                   </h2>
                   <p className="text-slate-400 mt-1">
                     {isDoctor ? (isViewingPatientFile ? `عرض ملف: ${selectedPatient.name}` : "نظرة عامة على العمليات والتقارير المنجزة") : `المريض: ${selectedPatient.name}`}
                   </p>
                </div>
                <div className="flex gap-2">
                   {isDoctor && isViewingPatientFile && (
                     <button onClick={() => setIsViewingPatientFile(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">رجوع للنشاط</button>
                   )}
                   {isDoctor && (
                     <button onClick={() => { setActiveTab('add'); setIsViewingPatientFile(false); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100">إضافة سجل جديد</button>
                   )}
                </div>
             </header>

             <div className="space-y-10">
                {(isDoctor && !isViewingPatientFile) ? (
                  /* واجهة سجل النشاط للطبيب */
                  <>
                    <section>
                      <HistorySectionHeader icon="fa-chart-line" title="إحصائيات العمل اليومي" color="bg-blue-600" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-r-4 border-r-blue-600 flex flex-col items-center justify-center py-10">
                           <p className="text-4xl font-black text-blue-600 mb-2">12</p>
                           <p className="text-sm font-bold text-slate-400">إجمالي معاينات اليوم</p>
                        </Card>
                        <Card className="border-r-4 border-r-blue-600 flex flex-col items-center justify-center py-10">
                           <p className="text-4xl font-black text-emerald-500 mb-2">4</p>
                           <p className="text-sm font-bold text-slate-400">تقارير طبية منجزة</p>
                        </Card>
                      </div>
                    </section>
                    <section>
                      <HistorySectionHeader icon="fa-file-signature" title="أحدث التقارير الطبية الصادرة" color="bg-emerald-500" />
                      <div className="space-y-4">
                        {[
                          { id: 'r1', title: 'تقرير حالة: مريض 001', date: 'منذ ساعة', status: 'مكتمل' },
                          { id: 'r2', title: 'وصفة علاجية: مريض 004', date: 'منذ 3 ساعات', status: 'مكتمل' },
                          { id: 'r3', title: 'تحديث سجل جراحي: مريض 002', date: 'يوم أمس', status: 'قيد المراجعة' }
                        ].map(report => (
                          <Card key={report.id} className="p-6 border-r-4 border-r-emerald-500 flex flex-row-reverse justify-between items-center">
                            <div className="text-right">
                              <h4 className="font-black text-slate-800">{report.title}</h4>
                              <p className="text-xs text-slate-400">{report.date}</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full">{report.status}</span>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  /* واجهة سجل الأمراض (للمريض أو الطبيب عند معاينة مريض) */
                  <>
                    <section>
                       <HistorySectionHeader icon="fa-shield-virus" title="الأمراض الحالية والمزمنة" color="bg-amber-500" />
                       <div className="grid gap-4">
                          {selectedPatient.history.filter(h => h.type === 'chronic').length > 0 ? (
                             selectedPatient.history.filter(h => h.type === 'chronic').map(h => (
                               <Card key={h.id} className="border-r-4 border-r-amber-500">
                                  <p className="text-xs text-slate-400 mb-1">{h.date}</p>
                                  <h4 className="font-black text-slate-800 mb-2">{h.title}</h4>
                                  <p className="text-sm text-slate-500 leading-relaxed text-right">{h.details}</p>
                               </Card>
                             ))
                          ) : <p className="text-slate-300 italic px-4 text-right">لا توجد سجلات لأمراض مزمنة.</p>}
                       </div>
                    </section>
                    <section>
                       <HistorySectionHeader icon="fa-pills" title="الأدوية والعلاجات الحالية" color="bg-emerald-500" />
                       <div className="grid gap-4">
                          {selectedPatient.history.filter(h => h.type === 'medication').length > 0 ? (
                             selectedPatient.history.filter(h => h.type === 'medication').map(h => (
                               <Card key={h.id} className="border-r-4 border-r-emerald-500">
                                  <p className="text-xs text-slate-400 mb-1">{h.date}</p>
                                  <h4 className="font-black text-slate-800 mb-2">{h.title}</h4>
                                  <p className="text-sm text-slate-500 leading-relaxed text-right">{h.details}</p>
                               </Card>
                             ))
                          ) : <p className="text-slate-300 italic px-4 text-right">لا توجد أدوية مسجلة حالياً.</p>}
                       </div>
                    </section>
                    <section>
                       <HistorySectionHeader icon="fa-scalpel-path" title="العمليات الجراحية" color="bg-rose-500" />
                       <div className="grid gap-4">
                          {selectedPatient.history.filter(h => h.type === 'surgery').length > 0 ? (
                             selectedPatient.history.filter(h => h.type === 'surgery').map(h => (
                               <Card key={h.id} className="border-r-4 border-r-rose-500">
                                  <p className="text-xs text-slate-400 mb-1">{h.date}</p>
                                  <h4 className="font-black text-slate-800 mb-2">{h.title}</h4>
                                  <p className="text-sm text-slate-500 leading-relaxed text-right">{h.details}</p>
                               </Card>
                             ))
                          ) : <p className="text-slate-300 italic px-4 text-right">لا توجد عمليات جراحية مسجلة.</p>}
                       </div>
                    </section>
                    <section>
                       <HistorySectionHeader icon="fa-circle-check" title="تاريخ الأمراض السابقة (تم الشفاء)" color="bg-blue-500" />
                       <div className="grid gap-4">
                          {selectedPatient.history.filter(h => h.type === 'past_diagnosis').length > 0 ? (
                             selectedPatient.history.filter(h => h.type === 'past_diagnosis').map(h => (
                               <Card key={h.id} className="border-r-4 border-r-blue-500">
                                  <p className="text-xs text-slate-400 mb-1">{h.date}</p>
                                  <h4 className="font-black text-slate-800 mb-2">{h.title}</h4>
                                  <p className="text-sm text-slate-500 leading-relaxed text-right">{h.details}</p>
                               </Card>
                             ))
                          ) : <p className="text-slate-300 italic px-4 text-right">لا يوجد تاريخ لأمراض سابقة معالجة.</p>}
                       </div>
                    </section>
                  </>
                )}
             </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai_assistant' && !isDoctor && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6">
             <header className="text-center">
                <h2 className="text-3xl font-black">مساعد التشخيص الذكي</h2>
                <p className="text-slate-400 mt-2">اشرح أعراضك وسيقوم المساعد بتحليلها واقتراح التخصص المناسب</p>
             </header>
             <Card>
                <textarea 
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="مثال: أشعر بألم في الصدر مع ضيق في التنفس عند المشي..."
                  className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none font-medium text-right"
                />
                <button 
                  onClick={handleAIDiagnosis}
                  disabled={isAiLoading || !symptoms.trim()}
                  className={`w-full py-5 mt-6 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 ${isAiLoading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-xl hover:bg-blue-700'}`}
                >
                  {isAiLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> جاري التحليل...</> : <><i className="fa-solid fa-wand-magic-sparkles"></i> تحليل الأعراض الآن</>}
                </button>
             </Card>
             {aiResponse && (
               <Card className="bg-blue-50 border-blue-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-end gap-3 mb-4 text-blue-600">
                     <h4 className="font-black text-xl">نتائج التحليل الذكي</h4>
                     <i className="fa-solid fa-robot text-2xl"></i>
                  </div>
                  <div className="prose prose-slate leading-relaxed text-slate-700 whitespace-pre-wrap font-medium text-right">
                     {aiResponse}
                  </div>
               </Card>
             )}
          </div>
        )}

        {/* Doctor Tabs */}
        {activeTab === 'patients' && isDoctor && (
          <div className="space-y-8 animate-in fade-in">
             <h2 className="text-3xl font-black text-slate-800">قائمة المعاينات المسجلة</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patients.map(p => (
                  <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setIsViewingPatientFile(true); setActiveTab('history'); }} className={`flex items-center gap-6 p-8 rounded-[2.5rem] text-right transition-all border-2 ${selectedPatientId === p.id && isViewingPatientFile ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100/50' : 'border-white bg-white shadow-sm hover:shadow-md'}`}>
                    <i className="fa-solid fa-chevron-left text-slate-300"></i>
                    <div className="flex-grow text-right">
                        <p className="font-black text-xl text-slate-800">مريض رقم {p.displayId}</p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                           <span className="text-xs font-bold text-slate-400">{p.gender}</span>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span className="text-xs font-bold text-slate-400">{p.age} عاماً</span>
                        </div>
                    </div>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${selectedPatientId === p.id && isViewingPatientFile ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {p.displayId}
                    </div>
                  </button>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'scanner' && isDoctor && (
          <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-10">
            <header className="text-center">
              <h2 className="text-3xl font-black text-slate-800">ماسح الهوية الرقمية</h2>
              <p className="text-slate-400 mt-2">امسح كود المريض للوصول السريع لسجله</p>
            </header>
            <Card className={`relative overflow-hidden border-4 transition-all duration-500 p-4 ${scanSuccess ? 'border-emerald-500 shadow-emerald-100 shadow-2xl' : 'border-slate-100'}`}>
              <div id="reader" className="w-full aspect-square bg-slate-50 rounded-3xl overflow-hidden shadow-inner"></div>
              {scanSuccess && (
                <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in">
                  <i className="fa-solid fa-circle-check text-7xl mb-6 animate-bounce"></i>
                  <h3 className="text-3xl font-black">تم تحديد المريض</h3>
                  <p className="mt-2 font-bold opacity-80">جاري تحميل السجلات الطبية المصنفة...</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'add' && isDoctor && (
           <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
           <h2 className="text-3xl font-black text-center text-slate-800">توثيق حالة طبية</h2>
           <Card className="p-10 text-right">
             <form onSubmit={(e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               addRecord({ 
                 type: fd.get('type') as any, 
                 title: fd.get('title') as string, 
                 date: fd.get('date') as string, 
                 details: fd.get('details') as string, 
                 doctorName: user.name
               });
             }} className="space-y-6">
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 text-right">نوع السجل</label>
               <select name="type" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-right">
                 <option value="medication">دواء أو وصفة علاجية</option>
                 <option value="surgery">عملية جراحية</option>
                 <option value="chronic">مرض مزمن</option>
                 <option value="past_diagnosis">تشخيص سابق (تم الشفاء)</option>
               </select>
               <input name="title" required placeholder="العنوان..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-right" />
               <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-right" />
               <textarea name="details" required placeholder="التفاصيل..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-40 outline-none resize-none text-right" />
               <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black">حفظ السجل الطبي</button>
             </form>
           </Card>
         </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in">
             <h2 className="text-3xl font-black">إعدادات التطبيق</h2>
             <div className="grid gap-4">
                <SettingItem icon="fa-user-gear" title="إدارة الحساب" desc="تعديل البيانات الشخصية وكلمة المرور" />
                <SettingItem icon="fa-bell" title="التنبيهات" desc="إدارة مواعيد الأدوية والزيوات القادمة" />
                <SettingItem icon="fa-shield-halved" title="الخصوصية والأمان" desc="تشفير البيانات والوصول الرقمي" />
                <SettingItem icon="fa-globe" title="اللغة والمظهر" desc="العربية، المظهر الفاتح والداكن" />
                <SettingItem icon="fa-circle-info" title="حول التطبيق" desc="الإصدار 12.0.0 - الرعاية الذكية" />
             </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card className="max-w-2xl mx-auto p-12 text-center">
             <div className="w-32 h-32 bg-blue-600 rounded-[3rem] mx-auto mb-8 flex items-center justify-center text-4xl text-white font-black">
                {user.name[0]}
             </div>
             <h2 className="text-3xl font-black">{user.name}</h2>
             <p className="text-blue-600 font-bold mt-2">{isDoctor ? user.doctorInfo?.specialty : 'مريض مسجل'}</p>
             <div className="mt-12 text-right space-y-4">
                {isDoctor ? (
                  <>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs text-slate-400 font-bold uppercase mb-1">المرض الذي يعالجه</p><p className="font-bold text-lg">{user.doctorInfo?.treatedDisease}</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs text-slate-400 font-bold uppercase mb-1">العمر</p><p className="font-bold text-lg">{user.doctorInfo?.age} عاماً</p></div>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs text-slate-400 font-bold uppercase mb-1">السن</p><p className="font-bold text-lg">{selectedPatient.age} عاماً</p></div>
                    <div className="p-6 bg-slate-50 rounded-3xl"><p className="text-xs text-slate-400 font-bold uppercase mb-1">فصيلة الدم</p><p className="font-bold text-lg">{selectedPatient.bloodType}</p></div>
                  </>
                )}
             </div>
          </Card>
        )}

      </main>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center p-4 pb-10 z-20 shadow-2xl">
        <NavBtn active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setIsViewingPatientFile(false); }} icon="fa-house" label="الرئيسية" />
        {isDoctor ? (
           <>
            <NavBtn active={activeTab === 'patients'} onClick={() => { setActiveTab('patients'); setIsViewingPatientFile(false); }} icon="fa-users" label="المرضى" />
            <NavBtn active={activeTab === 'scanner'} onClick={() => { setActiveTab('scanner'); setIsViewingPatientFile(false); }} icon="fa-qrcode" label="QR" />
           </>
        ) : (
           <NavBtn active={activeTab === 'ai_assistant'} onClick={() => setActiveTab('ai_assistant')} icon="fa-brain" label="AI" />
        )}
        <NavBtn active={activeTab === 'history'} onClick={() => { setActiveTab('history'); if(isDoctor) setIsViewingPatientFile(false); }} icon="fa-folder-open" label={isDoctor ? "نشاطي" : "سجلي"} />
        <NavBtn active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsViewingPatientFile(false); }} icon="fa-gear" label="إعدادات" />
      </nav>

      {/* QR Identity Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full text-center relative animate-in zoom-in">
             <button onClick={() => setShowQRModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600"><i className="fa-solid fa-times text-xl"></i></button>
             <h3 className="text-2xl font-black mb-8 text-slate-800">هويتك الطبية الرقمية</h3>
             <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-dashed border-slate-200 mb-10 flex justify-center">
               <QRCodeSVG value={selectedPatient.id} size={180} level="H" />
             </div>
             <button onClick={() => window.print()} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all">طباعة البطاقة الصحية</button>
          </div>
        </div>
      )}

      {/* Document Scanner Processing Modal */}
      {showDocScanner && (
         <div className="fixed inset-0 bg-blue-900/80 backdrop-blur-2xl z-[60] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center text-white">
               {isDocProcessing ? (
                  <div className="animate-in fade-in zoom-in">
                     <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <i className="fa-solid fa-wand-magic-sparkles text-3xl text-blue-300 animate-pulse"></i>
                     </div>
                     <h3 className="text-2xl font-black mb-4 tracking-tight">جاري قراءة الملف...</h3>
                     <p className="opacity-70 text-sm font-medium leading-relaxed">يقوم المساعد الذكي بتحليل الورقة الطبية الآن<br/>سيتم تسجيل البيانات تلقائياً في حسابك</p>
                  </div>
               ) : scanSuccess && (
                  <div className="animate-in zoom-in">
                     <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
                        <i className="fa-solid fa-check text-4xl text-white"></i>
                     </div>
                     <h3 className="text-2xl font-black mb-2">تم التسجيل بنجاح</h3>
                     <p className="opacity-70 text-sm">تم تحديث سجلك الطبي بالمعلومات الجديدة</p>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

// --- المكونات الفرعية ---

const SidebarLink = ({ active, onClick, icon, label, isDark }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-end gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-600/30' : (isDark ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-blue-600')}`}>
    <span className="text-sm font-bold">{label}</span>
    <i className={`fa-solid ${icon} w-6 text-center text-lg`}></i>
  </button>
);

const NavBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 flex-1 py-1 transition-all ${active ? 'text-blue-600' : 'text-slate-300'}`}>
    <i className={`fa-solid ${icon} text-xl`}></i>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const SettingItem = ({ icon, title, desc }: any) => (
  <Card className="p-6 flex items-center gap-6 hover:border-blue-200 cursor-pointer transition-all group flex-row-reverse">
     <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"><i className={`fa-solid ${icon} text-xl`}></i></div>
     <div className="flex-grow text-right">
        <h4 className="font-black text-slate-800">{title}</h4>
        <p className="text-xs text-slate-400 mt-1">{desc}</p>
     </div>
     <i className="fa-solid fa-chevron-left text-slate-200 group-hover:text-blue-600"></i>
  </Card>
);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
