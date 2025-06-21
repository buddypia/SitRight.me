'use client';

import { useState } from 'react';
import { usePoseStore } from '@/stores/poseStore';
import { useCamera } from '@/hooks/useCamera';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { camera, baselinePosture } = usePoseStore();
  const { startCamera } = useCamera();

  const steps = [
    {
      title: 'SitSmartへようこそ！',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <p className="text-lg mb-4">
            AIを使って姿勢をリアルタイムで分析し、<br />
            健康的な座り方をサポートします。
          </p>
          <p className="text-gray-600">
            カメラを使用してあなたの姿勢を確認します。<br />
            映像はあなたのブラウザ内でのみ処理され、外部に送信されることはありません。
          </p>
        </div>
      ),
    },
    {
      title: 'カメラの許可が必要です',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-lg mb-4">
            姿勢を分析するために、カメラへのアクセス許可が必要です。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>プライバシーについて：</strong><br />
              • 映像はあなたのデバイス内でのみ処理されます<br />
              • サーバーに送信されることはありません<br />
              • データは保存されません
            </p>
          </div>
          {!camera.isActive && !camera.error && (
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              📹 カメラを有効にする
            </button>
          )}
          
          {camera.isActive && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 font-medium">
                ✅ カメラが有効になりました！
              </p>
            </div>
          )}
          
          {camera.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                カメラへのアクセスが拒否されました。<br />
                ブラウザの設定でカメラの許可を有効にしてください。
              </p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
              >
                再試行
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '正しい姿勢で座ってください',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🪑</div>
          <p className="text-lg mb-4">
            まず、基準となる正しい姿勢を設定しましょう。
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-green-800 mb-2">正しい座り方：</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• 背筋をまっすぐ伸ばす</li>
              <li>• 肩の力を抜いてリラックス</li>
              <li>• 顎を軽く引く</li>
              <li>• 足を床にしっかりつける</li>
              <li>• 画面との距離は50-70cm</li>
            </ul>
          </div>
          {camera.isActive && (
            <p className="text-green-600 font-medium">
              ✅ カメラが有効になりました！正しい姿勢で座り、次へ進んでください。
            </p>
          )}
        </div>
      ),
    },
    {
      title: '基準姿勢を設定',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">📐</div>
          <p className="text-lg mb-4">
            現在の姿勢を基準として設定します。
          </p>
          <p className="text-gray-600 mb-4">
            カメラ画面の「基準姿勢を設定」ボタンを押して、<br />
            3秒間正しい姿勢を保ってください。
          </p>
          {baselinePosture && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✅ 基準姿勢が設定されました！
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '準備完了！',
      content: (
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg mb-4">
            SitSmartの準備が完了しました！
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-blue-800 mb-2">これからできること：</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• リアルタイムの姿勢分析</li>
              <li>• 猫背の検出とアラート</li>
              <li>• 姿勢スコアの確認</li>
              <li>• 改善のためのフィードバック</li>
            </ul>
          </div>
          <p className="text-gray-600">
            設定は後からいつでも変更できます。<br />
            右上の⚙️アイコンから設定画面にアクセスできます。
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
                ステップ {currentStep + 1} / {steps.length}
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="text-white hover:text-gray-200 text-xl"
              title="スキップ"
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
            ← 戻る
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
            {currentStep === steps.length - 1 ? '開始' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  );
};