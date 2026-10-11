import type { FrameIssue, PosturePattern } from '@/core/types';

export type Locale = 'en' | 'ja' | 'ko';

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
  avatar_woman: '女性',
  avatar_man: '男性',
  avatar_senior: 'シニア',
  avatar_womanSporty: 'スポーツ女性',
  avatar_hamu: 'ハムスター',
  avatar_dino: 'きょうりゅう',
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
    'Using only your laptop camera, SitRight measures how far your head juts forward, how much you look down and how much your back rounds. It shows the side view a front camera cannot see in 3D, and nudges you only when bad posture persists.',
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
    'SitRight is not a medical device and does not diagnose. See a professional if you have pain or numbness.',

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
    'This becomes your baseline. SitRight measures how far you drift from it.',
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
  avatar_woman: 'Woman',
  avatar_man: 'Man',
  avatar_senior: 'Senior',
  avatar_womanSporty: 'Woman (sporty)',
  avatar_hamu: 'Hamster',
  avatar_dino: 'Dino',
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

const ko: Messages = {
  appTagline: '목과 등 자세를, 옆에서 본 모습으로.',
  loading: '준비하고 있어요…',

  // welcome
  welcomeEyebrow: '일자목·스마트폰 목·굽은 등 예방에',
  welcomeTitle: '당신의 목,\n옆에서 보면 이래요.',
  welcomeBody:
    '노트북 카메라만으로 머리가 앞으로 나온 정도, 고개 숙임, 등이 굽은 정도를 측정해요. 정면 카메라로는 보이지 않는 "옆모습 자세"를 3D로 보여 주고, 나쁜 자세가 이어질 때만 살짝 알려 드려요.',
  welcomeStart: '시작하기',
  welcomeResume: '모니터링 재개',
  welcomeRecalibrate: '기준 자세 다시 잡기',
  privacyTitle: '영상은 이 기기를 벗어나지 않아요',
  privacyBody:
    '골격 추정은 모두 브라우저 안에서 이루어져요. 영상을 저장하거나 전송하지 않아요.',
  featureMeasure: 'cm와 각도로 측정',
  featureMeasureBody:
    '머리가 몇 cm 앞으로 나왔는지, 몇 도 숙였는지를 수치로 표시해요',
  featureSide: '옆모습 자세를 3D로',
  featureSideBody:
    '이상적인 위치(고스트)와 지금 머리·척추의 차이를 한눈에 확인해요',
  featureQuiet: '필요할 때만 알림',
  featureQuietBody:
    '나쁜 자세가 이어질 때만 알려요. 잠깐 숙인 정도로는 울리지 않아요',
  demoLabel: '데모 표시',
  disclaimer:
    '이 앱은 의료기기가 아니며 진단을 하지 않아요. 통증이나 저림이 있으면 의료기관에 상담하세요.',

  // setup
  setupStep: '단계 {n} / 2',
  setupTitle: '카메라 위치를 맞춰 볼까요',
  setupBody: '화면 정면에 앉아 머리와 양쪽 어깨가 카메라에 보이게 해 주세요.',
  setupCameraButton: '카메라 켜기',
  setupCameraStarting: '카메라를 시작하고 있어요…',
  setupModelLoading: '자세 추정 모델을 불러오는 중…',
  checkFace: '얼굴이 보여요',
  checkShoulders: '양쪽 어깨가 보여요',
  checkFacing: '화면 정면을 보고 있어요',
  checkReady: '준비 완료',
  setupNext: '다음: 기준 자세 기록',
  setupTip: '노트북이라면 화면을 조금 뒤로 젖히면 어깨까지 잘 나와요.',
  cameraSelect: '카메라',

  // camera errors
  cameraError_denied:
    '카메라 사용이 허용되지 않았어요. 주소창의 카메라 아이콘에서 허용해 주세요.',
  cameraError_not_found: '카메라를 찾을 수 없어요. 연결을 확인해 주세요.',
  cameraError_in_use:
    '다른 앱에서 카메라를 사용 중이에요. 화상 회의 앱 등을 닫고 다시 시도해 주세요.',
  cameraError_insecure:
    '이 환경에서는 카메라를 사용할 수 없어요 (HTTPS로 접속해 주세요).',
  cameraError_unknown: '카메라를 시작하지 못했어요.',
  engineError:
    '자세 추정 모델을 불러오지 못했어요. 페이지를 새로고침해 주세요.',
  retry: '다시 시도',

  // calibrate
  calibrateTitle: '좋은 자세를 3초간 유지하세요',
  calibrateBody:
    '이 자세가 당신의 "기준 자세"가 돼요. 이후에는 이 자세에서 벗어난 정도를 측정해요.',
  calibrateTip1: '골반을 세우고 깊숙이 앉기',
  calibrateTip2: '귀가 어깨 바로 위에 오도록 턱을 살짝 당기기',
  calibrateTip3: '시선은 화면으로, 어깨 힘은 빼기',
  calibrateStart: '기록 시작',
  calibrateHold: '그대로 멈춰 주세요…',
  calibrateUnstable: '움직임이 감지됐어요. 멈추면 다시 시작해요',
  calibrateWaiting: '머리와 양쪽 어깨가 보이기를 기다리고 있어요',
  calibrateDone: '기준 자세를 기록했어요',
  back: '뒤로',

  // monitor
  statusGood: '좋은 자세',
  statusFair: '조금 흐트러졌어요',
  statusPoor: '자세가 무너졌어요',
  statusPaused: '일시 정지 중',
  statusAway: '자리 비움',
  statusChecking: '측정할 수 없음',
  scoreLabel: '자세 점수',
  alertIn: '{s}초 이어지면 알림',
  metricForward: '머리 앞쪽 돌출',
  metricDown: '고개 숙임',
  metricSlump: '등 처짐',
  metricLean: '좌우 기울기',
  sideLeft: '왼쪽',
  sideRight: '오른쪽',
  backView: '뒤에서',
  metricLoad: '목 부담 (추정)',
  metricLoadHint:
    '머리를 지탱하는 목에 걸리는 무게의 추정치예요 (Hansraj, 2014)',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: '이상',
  you: '나',
  plumbLine: '귀와 어깨를 잇는 선',
  sideView: '옆에서 본 내 자세',
  sideViewHint: '드래그로 회전',
  resetView: '시점 초기화',
  xray: '골격',
  avatar: '3D 모델',
  avatar_woman: '여성',
  avatar_man: '남성',
  avatar_senior: '시니어',
  avatar_womanSporty: '스포티 여성',
  avatar_hamu: '햄스터',
  avatar_dino: '공룡',
  pipOpen: '작은 창으로 보기',
  pipClose: '작은 창 닫기',
  pipActive: '작은 창으로 표시 중',
  pause: '일시 정지',
  resume: '재개',
  recalibrate: '기준 다시 잡기',
  settings: '설정',
  hideCamera: '카메라 영상 숨기기',
  showCamera: '카메라 영상 표시',
  cameraHidden: '카메라 영상은 숨겨져 있어요 (측정은 계속 중)',
  sitting: '연속 착석',
  minutes: '{n}분',
  baselineSuspect:
    '기준 자세보다 많이 뒤로 물러나 있어요. 기준을 다시 잡으면 정확도가 올라가요.',

  // today
  todayTitle: '오늘의 기록',
  goodRatio: '좋은 자세 비율',
  monitored: '측정 시간',
  alertsCount: '알림',
  times: '{n}회',
  timelineTitle: '최근 60분',
  breakdownTitle: '자주 무너진 자세',
  noBreakdown: '아직 무너진 기록이 없어요',
  weekTitle: '지난 7일',
  noData: '데이터 없음',

  // alerts
  alertTitle: '자세를 확인하세요',
  recoveredToast: '좋은 자세로 돌아왔어요',
  breakTitle: '잠깐 쉬어요',
  breakBody: '{n}분째 앉아 있어요. 일어나서 목과 어깨를 돌려 보세요.',
  enableNotifications: '데스크톱 알림 켜기',
  notificationsHint:
    '다른 앱에서 작업 중에도 자세가 계속 무너지면 알려 드려요.',
  notificationsDenied:
    '알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요.',
  notificationsOn: '데스크톱 알림: 켜짐',
  dismiss: '닫기',

  // settings
  settingsTitle: '설정',
  sensitivity: '판정 엄격도',
  sensitivity_gentle: '느슨하게',
  sensitivity_standard: '표준',
  sensitivity_strict: '엄격하게',
  alertDelay: '알림까지 지속 시간',
  cooldown: '알림 최소 간격',
  seconds: '{n}초',
  minutesShort: '{n}분',
  sound: '효과음',
  desktopNotify: '데스크톱 알림',
  breakReminder: '휴식 알림',
  off: '끔',
  powerSaver: '절전 모드 (측정 빈도 낮춤)',
  language: '언어',
  resetData: '기록과 기준 모두 삭제',
  resetConfirm: '한 번 더 누르면 삭제해요',
  close: '닫기',
  testNotification: '알림 테스트',

  pattern: {
    straight_neck: {
      name: '일자목 자세',
      short: '머리가 앞으로 나왔어요',
      detail:
        '머리가 어깨보다 앞으로 튀어나와 목의 자연스러운 커브가 사라지기 쉬운 상태예요.',
      fix: '턱을 살짝 당기고 귀를 어깨 바로 위로 되돌려 주세요.',
    },
    text_neck: {
      name: '스마트폰 목',
      short: '고개가 아래를 향해 있어요',
      detail:
        '고개를 숙여 목이 앞으로 굽으면서 목 뒤쪽에 큰 부담이 걸리고 있어요.',
      fix: '시선만 내리고 머리는 세우세요. 화면은 눈높이로 올려 주세요.',
    },
    neck_hunch: {
      name: '거북목',
      short: '머리가 앞으로 떨어져 있어요',
      detail:
        '등 윗부분부터 목이 앞으로 기울어 머리가 앞쪽 아래로 처져 있어요.',
      fix: '가슴을 살짝 펴고, 정수리를 천장 쪽으로 끌어올리듯 세워 주세요.',
    },
    slouch: {
      name: '굽은 등',
      short: '등이 굽어 있어요',
      detail: '등이 굽고 상체가 아래로 처져 있어요.',
      fix: '골반을 세워 다시 앉고, 어깨를 뒤로 돌려 내려 주세요.',
    },
    lean: {
      name: '몸의 기울어짐',
      short: '몸이나 목이 좌우로 기울어 있어요',
      detail:
        '어깨선이나 머리가 한쪽으로 기울어 체중과 목의 부담이 한쪽에 쏠려 있어요.',
      fix: '양쪽 엉덩이에 체중을 고르게 싣고, 머리를 어깨 한가운데로 바로 되돌려 주세요.',
    },
  },

  issue: {
    no_person: '카메라 앞에 사람이 보이지 않아요',
    no_face: '얼굴이 보이지 않아요. 밝기와 위치를 확인해 주세요',
    shoulders_hidden:
      '양쪽 어깨가 보이지 않아요. 조금 떨어지거나 카메라 각도를 조정해 주세요',
    turned_away: '옆을 보는 동안에는 측정을 멈춰요',
    body_rotated: '몸이 비스듬히 돌아가 있어요. 화면을 정면으로 봐 주세요',
  },
};

export const MESSAGES: Record<Locale, Messages> = { en, ja, ko };

export function format(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
