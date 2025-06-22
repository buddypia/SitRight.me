'use client';

import { CameraControl } from '@/components/CameraControl';
import { PostureFeedback } from '@/components/PostureFeedback';
import { SlouchingMonitor } from '@/components/SlouchingMonitor';
import { Settings } from '@/components/Settings';
import { Onboarding } from '@/components/Onboarding';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePoseStore } from '@/stores/poseStore';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  const { loadSettings, setSettingsOpen, isFirstTime, checkFirstTime, markOnboardingCompleted } = useSettingsStore();
  const { loadBaselineFromStorage } = usePoseStore();

  useEffect(() => {
    // 起動時に設定と基準姿勢を読み込み
    loadSettings();
    loadBaselineFromStorage();
    
    // URL パラメータで強制表示オプションをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const forceOnboarding = urlParams.get('onboarding') === 'true';
    
    if (forceOnboarding) {
      console.log('URL パラメータによりオンボーディングを強制表示');
      // URL パラメータを削除してリロードを防ぐ
      window.history.replaceState({}, document.title, window.location.pathname);
      return; // isFirstTime は true のまま
    }
    
    checkFirstTime();
  }, [loadSettings, loadBaselineFromStorage, checkFirstTime]);

  const handleOnboardingComplete = () => {
    markOnboardingCompleted();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8 relative">
          <div className="absolute top-0 right-0 flex items-center space-x-2">
            <LanguageSwitcher />
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-3 text-gray-700 hover:text-gray-900 hover:bg-white/90 rounded-lg shadow-sm border border-gray-200 bg-white/70 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
              title={t('common.settings')}
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {t('header.title')}
          </h1>
  
          <p className="text-gray-500 mt-2 max-w-2xl mx-auto leading-relaxed">
            {t('header.subtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="xl:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              {t('header.sections.camera')}
            </h2>
            <CameraControl />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                {t('header.sections.analysis')}
              </h2>
              <PostureFeedback />
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                {t('header.sections.monitor')}
              </h2>
              <SlouchingMonitor />
            </div>
          </div>
        </div>

        <footer className="text-center mt-12 text-gray-500">
          <p>{t('footer.copyright')}</p>
        </footer>
      </div>
      
      <Settings />
      
      {isFirstTime && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </main>
  );
}