import { useState } from 'react';
import { CalendarView } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { VacationForm } from './components/VacationForm';
import { LayoutDashboard, Calendar, PlusCircle } from 'lucide-react';

enum Tab {
  CALENDAR = 'calendar',
  DASHBOARD = 'dashboard',
  REGISTER = 'register'
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CALENDAR);

  const NavButton = ({ tab, label, icon: Icon }: { tab: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex flex-1 sm:flex-none justify-center items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        activeTab === tab 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4 mr-1.5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between h-auto sm:h-16 py-2 sm:py-0 gap-2 sm:gap-0">
            <div className="flex items-center justify-center sm:justify-start">
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                현대해상다이렉트 휴가캘린더
              </span>
            </div>
            <div className="flex space-x-1 sm:space-x-2 items-center justify-between sm:justify-end w-full sm:w-auto bg-gray-50 sm:bg-transparent p-1 sm:p-0 rounded-lg">
              <NavButton tab={Tab.CALENDAR} label="월별 캘린더" icon={Calendar} />
              <NavButton tab={Tab.DASHBOARD} label="인원 현황" icon={LayoutDashboard} />
              <NavButton tab={Tab.REGISTER} label="휴가 등록" icon={PlusCircle} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-4 sm:pt-6 animate-fade-in">
        {activeTab === Tab.CALENDAR && <CalendarView />}
        {activeTab === Tab.DASHBOARD && <Dashboard />}
        {activeTab === Tab.REGISTER && <VacationForm />}
      </main>
    </div>
  );
}

export default App;