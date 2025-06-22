'use client';

import { useState } from 'react';
import { usePoseStore } from '@/stores/poseStore';
import { useCamera } from '@/hooks/useCamera';
import { useTranslation } from 'react-i18next';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { camera, baselinePosture } = usePoseStore();
  const { startCamera } = useCamera();

  const steps = [
    {
      title: t('onboarding.steps.welcome.title'),
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <p className="text-lg mb-4">
            {t('onboarding.steps.welcome.description')}
          </p>
          <p className="text-gray-600">
            {t('onboarding.steps.welcome.privacy')}
          </p>
        </div>
      ),
    },
    {
      title: t('onboarding.steps.camera.title'),
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-lg mb-4">
            {t('onboarding.steps.camera.description')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>{t('onboarding.steps.camera.privacy.title')}</strong><br />
              • {t('onboarding.steps.camera.privacy.point1')}<br />
              • {t('onboarding.steps.camera.privacy.point2')}<br />
              • {t('onboarding.steps.camera.privacy.point3')}
            </p>
          </div>
          {!camera.isActive && !camera.error && (
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              {t('onboarding.steps.camera.enableCamera')}
            </button>
          )}
          
          {camera.isActive && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 font-medium">
                {t('onboarding.steps.camera.cameraEnabled')}
              </p>
            </div>
          )}
          
          {camera.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                {t('onboarding.steps.camera.cameraError')}
              </p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
              >
                {t('common.retry')}
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('onboarding.steps.posture.title'),
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🪑</div>
          <p className="text-lg mb-4">
            {t('onboarding.steps.posture.description')}
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-green-800 mb-2">{t('onboarding.steps.posture.tips.title')}</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• {t('onboarding.steps.posture.tips.tip1')}</li>
              <li>• {t('onboarding.steps.posture.tips.tip2')}</li>
              <li>• {t('onboarding.steps.posture.tips.tip3')}</li>
              <li>• {t('onboarding.steps.posture.tips.tip4')}</li>
              <li>• {t('onboarding.steps.posture.tips.tip5')}</li>
            </ul>
          </div>
          {camera.isActive && (
            <p className="text-green-600 font-medium">
              {t('onboarding.steps.posture.ready')}
            </p>
          )}
        </div>
      ),
    },
    {
      title: t('onboarding.steps.baseline.title'),
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">📐</div>
          <p className="text-lg mb-4">
            {t('onboarding.steps.baseline.description')}
          </p>
          <p className="text-gray-600 mb-4">
            {t('onboarding.steps.baseline.instruction')}
          </p>
          {baselinePosture && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                {t('onboarding.steps.baseline.success')}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('onboarding.steps.complete.title'),
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg mb-4">
            {t('onboarding.steps.complete.description')}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-blue-800 mb-2">{t('onboarding.steps.complete.features.title')}</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('onboarding.steps.complete.features.feature1')}</li>
              <li>• {t('onboarding.steps.complete.features.feature2')}</li>
              <li>• {t('onboarding.steps.complete.features.feature3')}</li>
              <li>• {t('onboarding.steps.complete.features.feature4')}</li>
            </ul>
          </div>
          <p className="text-gray-600">
            {t('onboarding.steps.complete.note')}
          </p>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // カメラ許可画面：カメラが有効になったら次へ進める
        return camera.isActive && !camera.error;
      case 2:
        // 姿勢説明画面：カメラが有効であれば進める
        return camera.isActive;
      case 3:
        // 基準姿勢設定画面：基準姿勢が設定されたら進める
        return baselinePosture !== null;
      default:
        return true;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-blue-100 mt-1">
                {t('onboarding.navigation.step', { current: currentStep + 1, total: steps.length })}
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="text-white hover:text-gray-200 text-xl"
              title={t('onboarding.navigation.skip')}
            >
              ✕
            </button>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="bg-gray-200 h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* コンテンツ */}
        <div className="p-8">
          {steps[currentStep].content}
        </div>

        {/* フッター */}
        <div className="flex justify-between items-center p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {t('onboarding.navigation.back')}
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === steps.length - 1 ? t('onboarding.navigation.start') : t('onboarding.navigation.next')}
          </button>
        </div>
      </div>
    </div>
  );
};