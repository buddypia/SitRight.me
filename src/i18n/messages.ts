import type { FrameIssue, PosturePattern } from '@/core/types';

export type Locale = 'ja' | 'en';

const ja = {
  appTagline: '首と背中の姿勢を、横から見える形に。',
  loading: '準備しています…',

  // welcome
  welcomeEyebrow: 'ストレートネック・スマホ首・猫背の予防に',
  welcomeTitle: 'あなたの首、\n横から見るとこうなっています。',
  welcomeBody:
    'ノートPCのカメラだけで、頭の前への突き出し・うつむき・背中の丸まりを計測。正面のカメラでは見えない「横からの姿勢」を3Dで映し、悪い姿勢が続いたときだけそっと知らせます。',
  welcomeStart: 'はじめる',
  welcomeResume: 'モニタリングを再開',
  welcomeRecalibrate: '基準姿勢を取り直す',
  privacyTitle: '映像はこの端末から出ません',
  privacyBody:
    '骨格の推定はすべてブラウザ内で行います。映像の保存・送信は一切ありません。',
  featureMeasure: 'cm と角度で計測',
  featureMeasureBody:
    '頭が何cm前に出ているか、何度うつむいているかを数値で表示',
  featureSide: '横からの姿勢を3Dで',
  featureSideBody: '理想の位置（ゴースト）と今の頭・背骨のずれが一目で分かる',
  featureQuiet: '必要なときだけ通知',
  featureQuietBody: '悪い姿勢が続いたときだけ。一瞬の前かがみでは鳴りません',
  demoLabel: 'デモ表示',
  disclaimer:
    '本アプリは医療機器ではなく、診断を行うものではありません。痛みやしびれがある場合は医療機関に相談してください。',

  // setup
  setupStep: 'ステップ {n} / 2',
  setupTitle: 'カメラの位置を合わせましょう',
  setupBody: '画面の正面に座り、頭と両肩がカメラに映るようにしてください。',
  setupCameraButton: 'カメラを有効にする',
  setupCameraStarting: 'カメラを起動しています…',
  setupModelLoading: '姿勢推定モデルを読み込み中…',
  checkFace: '顔が映っている',
  checkShoulders: '両肩が映っている',
  checkFacing: '画面の正面を向いている',
  checkReady: '準備OK',
  setupNext: '次へ：基準姿勢を記録',
  setupTip: 'ノートPCなら画面を少し後ろに倒すと肩まで映りやすくなります。',
  cameraSelect: 'カメラ',

  // camera errors
  cameraError_denied:
    'カメラの使用が許可されていません。アドレスバーのカメラアイコンから許可してください。',
  cameraError_not_found: 'カメラが見つかりません。接続を確認してください。',
  cameraError_in_use:
    'カメラが他のアプリで使用中です。ビデオ会議アプリ等を閉じてから再試行してください。',
  cameraError_insecure:
    'この環境ではカメラを使用できません（HTTPS でアクセスしてください）。',
  cameraError_unknown: 'カメラを起動できませんでした。',
  engineError:
    '姿勢推定モデルを読み込めませんでした。ページを再読み込みしてください。',
  retry: '再試行',

  // calibrate
  calibrateTitle: '良い姿勢を3秒キープ',
  calibrateBody:
    'これがあなたの「基準姿勢」になります。以降はこの姿勢からのずれを計測します。',
  calibrateTip1: '骨盤を立てて深く座る',
  calibrateTip2: '耳が肩の真上に来るように、あごを軽く引く',
  calibrateTip3: '目線は画面へ。肩の力を抜く',
  calibrateStart: '記録を開始',
  calibrateHold: 'そのまま静止…',
  calibrateUnstable: '動きを検知しました。静止すると再開します',
  calibrateWaiting: '頭と両肩が映るのを待っています',
  calibrateDone: '基準姿勢を記録しました',
  back: '戻る',

  // monitor
  statusGood: '良い姿勢',
  statusFair: 'やや崩れています',
  statusPoor: '姿勢が崩れています',
  statusPaused: '一時停止中',
  statusAway: '離席中',
  statusChecking: '計測できません',
  scoreLabel: '姿勢スコア',
  alertIn: '{s}秒続くと通知',
  metricForward: '頭の前方突出',
  metricDown: 'うつむき',
  metricSlump: '背中の沈み込み',
  metricLean: '左右の傾き',
  sideLeft: '左',
  sideRight: '右',
  backView: '後ろから',
  metricLoad: '首への負担（目安）',
  metricLoadHint: '頭を支える首にかかる重さの目安です（Hansraj, 2014）',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: '理想',
  you: 'あなた',
  plumbLine: '耳と肩を結ぶ線',
  sideView: '横から見たあなたの姿勢',
  sideViewHint: 'ドラッグで回転',
  resetView: '視点をリセット',
  xray: '骨格',
  avatar: '3Dモデル',
  avatar_buddy: 'キャラクター',
  avatar_cat: 'ネコ',
  avatar_bear: 'クマ',
  avatar_wood: 'デッサン人形',
  avatar_clay: 'クレイ',
  avatar_mannequin: 'リアル',
  pipOpen: '小窓で表示',
  pipClose: '小窓を閉じる',
  pipActive: '小窓で表示中',
  pause: '一時停止',
  resume: '再開',
  recalibrate: '基準を取り直す',
  settings: '設定',
  hideCamera: 'カメラ映像を隠す',
  showCamera: 'カメラ映像を表示',
  cameraHidden: 'カメラ映像は非表示です（計測は継続中）',
  sitting: '連続着席',
  minutes: '{n}分',
  baselineSuspect:
    '基準姿勢より大きく後ろに下がっています。基準を取り直すと精度が上がります。',

  // today
  todayTitle: '今日の記録',
  goodRatio: '良い姿勢の割合',
  monitored: '計測時間',
  alertsCount: '通知',
  times: '{n}回',
  timelineTitle: '直近60分',
  breakdownTitle: '多かった崩れ方',
  noBreakdown: 'まだ崩れた記録はありません',
  weekTitle: '過去7日',
  noData: 'データなし',

  // alerts
  alertTitle: '姿勢をチェック',
  recoveredToast: 'いい姿勢に戻りました',
  breakTitle: 'ひと休みしましょう',
  breakBody: '{n}分座り続けています。立ち上がって首と肩を回しましょう。',
  enableNotifications: 'デスクトップ通知を有効にする',
  notificationsHint: '別のアプリで作業中も、姿勢が崩れ続けたときに通知します。',
  notificationsDenied:
    '通知がブロックされています。ブラウザの設定から許可してください。',
  notificationsOn: 'デスクトップ通知: オン',
  dismiss: '閉じる',

  // settings
  settingsTitle: '設定',
  sensitivity: '判定の厳しさ',
  sensitivity_gentle: 'ゆるめ',
  sensitivity_standard: '標準',
  sensitivity_strict: 'きびしめ',
  alertDelay: '通知までの継続時間',
  cooldown: '通知の最短間隔',
  seconds: '{n}秒',
  minutesShort: '{n}分',
  sound: '効果音',
  desktopNotify: 'デスクトップ通知',
  breakReminder: '休憩リマインダー',
  off: 'オフ',
  powerSaver: '省電力モード（計測頻度を下げる）',
  language: '言語',
  resetData: '記録と基準をすべて削除',
  resetConfirm: 'もう一度押すと削除します',
  close: '閉じる',
  testNotification: '通知をテスト',

  pattern: {
    straight_neck: {
      name: 'ストレートネック姿勢',
      short: '頭が前に出ています',
      detail:
        '頭が肩より前に突き出し、首の自然なカーブが失われやすい状態です。',
      fix: 'あごを軽く引き、耳を肩の真上に戻しましょう。',
    },
    text_neck: {
      name: 'スマホ首',
      short: '頭が下を向いています',
      detail:
        'うつむいて首が前に曲がり、首の後ろに大きな負担がかかっています。',
      fix: '目線だけ下げ、頭は起こしましょう。画面は目の高さへ。',
    },
    neck_hunch: {
      name: '首猫背',
      short: '頭が前に落ちています',
      detail: '背中の上部から首が前に倒れ、頭が前下方に落ちています。',
      fix: '胸を軽く開き、頭のてっぺんを天井へ引き上げるように。',
    },
    slouch: {
      name: '猫背',
      short: '背中が丸まっています',
      detail: '背中が丸まり、上半身が沈み込んでいます。',
      fix: '骨盤を立てて座り直し、肩を後ろに回して下ろしましょう。',
    },
    lean: {
      name: '体の傾き',
      short: '体や首が左右に傾いています',
      detail:
        '肩のラインや頭が片側に傾き、体重や首の負担が片側に偏っています。',
      fix: '両方のお尻に均等に体重を乗せ、頭をまっすぐ肩の真ん中に戻しましょう。',
    },
  } satisfies Record<
    PosturePattern,
    { name: string; short: string; detail: string; fix: string }
  >,

  issue: {
    no_person: 'カメラの前に人が見つかりません',
    no_face: '顔が見つかりません。明るさや位置を確認してください',
    shoulders_hidden:
      '両肩が映っていません。少し離れるか、カメラの角度を調整してください',
    turned_away: '横を向いている間は計測を止めています',
    body_rotated: '体が斜めを向いています。画面に正対してください',
  } satisfies Record<FrameIssue, string>,
};

export type Messages = typeof ja;

const en: Messages = {
  appTagline: 'See your neck and back posture from the side.',
  loading: 'Getting ready…',

  welcomeEyebrow: 'Prevent text neck, forward head and slouching',
  welcomeTitle: 'This is what your neck\nlooks like from the side.',
  welcomeBody:
    'Using only your laptop camera, SitSmart measures how far your head juts forward, how much you look down and how much your back rounds. It shows the side view a front camera cannot see in 3D, and nudges you only when bad posture persists.',
  welcomeStart: 'Get started',
  welcomeResume: 'Resume monitoring',
  welcomeRecalibrate: 'Recalibrate',
  privacyTitle: 'Video never leaves this device',
  privacyBody:
    'Pose estimation runs entirely in your browser. Nothing is recorded or uploaded.',
  featureMeasure: 'Measured in cm and degrees',
  featureMeasureBody:
    'See exactly how far forward your head is and how much you look down',
  featureSide: 'Your side view in 3D',
  featureSideBody:
    'Compare your head and spine with the ideal ghost at a glance',
  featureQuiet: 'Alerts only when it matters',
  featureQuietBody:
    'Only when bad posture persists — not when you briefly lean in',
  demoLabel: 'Demo',
  disclaimer:
    'SitSmart is not a medical device and does not diagnose. See a professional if you have pain or numbness.',

  setupStep: 'Step {n} of 2',
  setupTitle: 'Position your camera',
  setupBody:
    'Sit facing the screen so your head and both shoulders are visible.',
  setupCameraButton: 'Enable camera',
  setupCameraStarting: 'Starting camera…',
  setupModelLoading: 'Loading the pose model…',
  checkFace: 'Face visible',
  checkShoulders: 'Both shoulders visible',
  checkFacing: 'Facing the screen',
  checkReady: 'Ready',
  setupNext: 'Next: record your baseline',
  setupTip:
    'On a laptop, tilting the lid back a little helps fit your shoulders in view.',
  cameraSelect: 'Camera',

  cameraError_denied:
    'Camera access was blocked. Allow it from the camera icon in the address bar.',
  cameraError_not_found: 'No camera found. Check the connection.',
  cameraError_in_use:
    'The camera is in use by another app. Close video-call apps and retry.',
  cameraError_insecure: 'Camera is unavailable here (open the app over HTTPS).',
  cameraError_unknown: 'Could not start the camera.',
  engineError: 'Could not load the pose model. Please reload the page.',
  retry: 'Retry',

  calibrateTitle: 'Hold good posture for 3 seconds',
  calibrateBody:
    'This becomes your baseline. SitSmart measures how far you drift from it.',
  calibrateTip1: 'Sit back with your pelvis upright',
  calibrateTip2: 'Tuck your chin slightly so your ears are over your shoulders',
  calibrateTip3: 'Eyes on the screen, shoulders relaxed',
  calibrateStart: 'Start recording',
  calibrateHold: 'Hold still…',
  calibrateUnstable: 'Movement detected. Hold still to continue',
  calibrateWaiting: 'Waiting for your head and shoulders',
  calibrateDone: 'Baseline recorded',
  back: 'Back',

  statusGood: 'Good posture',
  statusFair: 'Slightly off',
  statusPoor: 'Posture slipping',
  statusPaused: 'Paused',
  statusAway: 'Away',
  statusChecking: 'Cannot measure',
  scoreLabel: 'Posture score',
  alertIn: 'Alert after {s}s',
  metricForward: 'Head forward',
  metricDown: 'Looking down',
  metricSlump: 'Back sinking',
  metricLean: 'Side tilt',
  sideLeft: 'L',
  sideRight: 'R',
  backView: 'Back view',
  metricLoad: 'Neck load (est.)',
  metricLoadHint: 'Estimated weight your neck supports (Hansraj, 2014)',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: 'Ideal',
  you: 'You',
  plumbLine: 'Ear–shoulder line',
  sideView: 'Your posture from the side',
  sideViewHint: 'Drag to rotate',
  resetView: 'Reset view',
  xray: 'Skeleton',
  avatar: '3D model',
  avatar_buddy: 'Character',
  avatar_cat: 'Cat',
  avatar_bear: 'Bear',
  avatar_wood: 'Wooden',
  avatar_clay: 'Clay',
  avatar_mannequin: 'Realistic',
  pipOpen: 'Pop out',
  pipClose: 'Close pop-out',
  pipActive: 'Showing in pop-out window',
  pause: 'Pause',
  resume: 'Resume',
  recalibrate: 'Recalibrate',
  settings: 'Settings',
  hideCamera: 'Hide camera',
  showCamera: 'Show camera',
  cameraHidden: 'Camera preview hidden (still measuring)',
  sitting: 'Sitting',
  minutes: '{n} min',
  baselineSuspect:
    'You are sitting well behind your baseline. Recalibrating will improve accuracy.',

  todayTitle: 'Today',
  goodRatio: 'Good posture',
  monitored: 'Monitored',
  alertsCount: 'Alerts',
  times: '{n}',
  timelineTitle: 'Last 60 minutes',
  breakdownTitle: 'Most common',
  noBreakdown: 'No posture slips recorded yet',
  weekTitle: 'Last 7 days',
  noData: 'No data',

  alertTitle: 'Posture check',
  recoveredToast: 'Back to good posture',
  breakTitle: 'Time for a break',
  breakBody:
    'You have been sitting for {n} minutes. Stand up and roll your neck and shoulders.',
  enableNotifications: 'Enable desktop notifications',
  notificationsHint: 'Get notified even while you work in other apps.',
  notificationsDenied:
    'Notifications are blocked. Allow them in your browser settings.',
  notificationsOn: 'Desktop notifications: on',
  dismiss: 'Dismiss',

  settingsTitle: 'Settings',
  sensitivity: 'Strictness',
  sensitivity_gentle: 'Gentle',
  sensitivity_standard: 'Standard',
  sensitivity_strict: 'Strict',
  alertDelay: 'Alert after',
  cooldown: 'Minimum gap between alerts',
  seconds: '{n}s',
  minutesShort: '{n} min',
  sound: 'Sound',
  desktopNotify: 'Desktop notifications',
  breakReminder: 'Break reminder',
  off: 'Off',
  powerSaver: 'Power saver (measure less often)',
  language: 'Language',
  resetData: 'Delete all history and baseline',
  resetConfirm: 'Press again to delete',
  close: 'Close',
  testNotification: 'Test notification',

  pattern: {
    straight_neck: {
      name: 'Forward head',
      short: 'Your head is jutting forward',
      detail:
        'Your head sits in front of your shoulders, flattening the natural curve of the neck.',
      fix: 'Tuck your chin slightly and bring your ears back over your shoulders.',
    },
    text_neck: {
      name: 'Text neck',
      short: 'Your head is tilted down',
      detail:
        'Looking down bends the neck forward and loads the back of the neck heavily.',
      fix: 'Lower your eyes, not your head. Raise the screen to eye level.',
    },
    neck_hunch: {
      name: 'Hunched neck',
      short: 'Your head is dropping forward',
      detail:
        'The neck tips forward from the upper back and the head drops forward and down.',
      fix: 'Open your chest and lengthen through the crown of your head.',
    },
    slouch: {
      name: 'Slouching',
      short: 'Your back is rounding',
      detail: 'Your upper back is rounding and your torso is sinking.',
      fix: 'Sit up on your sit bones, roll your shoulders back and down.',
    },
    lean: {
      name: 'Leaning',
      short: 'Your body or head is tilting to one side',
      detail:
        'Your shoulder line or head is tilted, putting weight and neck strain on one side.',
      fix: 'Rebalance your weight evenly on both hips and bring your head back to center.',
    },
  },

  issue: {
    no_person: 'No one in front of the camera',
    no_face: 'Face not found. Check lighting and position',
    shoulders_hidden:
      'Both shoulders must be visible. Move back or adjust the camera',
    turned_away: 'Paused while you look away',
    body_rotated: 'Your body is turned. Face the screen',
  },
};

export const MESSAGES: Record<Locale, Messages> = { ja, en };

export function format(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
