import type {
  FrameIssue,
  PeriodicNotifyKind,
  PosturePattern,
} from '@/core/types';

export const SUPPORTED_LOCALES = ['en', 'ja', 'ko'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleInfo {
  code: Locale;
  nativeName: string;
  bcp47: string;
}

export const LOCALE_REGISTRY: Record<Locale, LocaleInfo> = {
  en: { code: 'en', nativeName: 'English', bcp47: 'en-US' },
  ja: { code: 'ja', nativeName: '日本語', bcp47: 'ja-JP' },
  ko: { code: 'ko', nativeName: '한국어', bcp47: 'ko-KR' },
};

export const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((code) => ({
  value: code,
  label: LOCALE_REGISTRY[code].nativeName,
}));

export function isSupportedLocale(val: unknown): val is Locale {
  return (
    typeof val === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(val)
  );
}

export function resolveLocale(
  candidates: readonly (string | undefined | null | unknown)[]
): Locale {
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim().toLowerCase();
    if (!clean) continue;

    if (isSupportedLocale(clean)) {
      return clean;
    }

    const primary = clean.split('-')[0]?.split('_')[0];
    if (primary && isSupportedLocale(primary)) {
      return primary;
    }
  }
  return DEFAULT_LOCALE;
}

/** 言語ごとのページの URL。既定の言語はトップ（/）で、ほかは /ja・/ko */
export function localePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}

/** 言語ごとの解説ページ（仕組み・よくある質問）の URL。/guide・/ja/guide・/ko/guide */
export function guidePath(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '/guide' : `/${locale}/guide`;
}

/** 言語ごとのページ（/・/ja・/ko）なら true。/lab などは含まない */
export function isLocalePath(pathname: string): boolean {
  return pathname === '/' || localeFromPath(pathname) !== null;
}

/** /ja・/ko（末尾の / はあってもよい）から言語を返す。トップやほかのページは null */
export function localeFromPath(pathname: string): Locale | null {
  const seg = pathname.replace(/\/+$/, '').slice(1);
  return seg !== DEFAULT_LOCALE && isSupportedLocale(seg) ? seg : null;
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const preferred: string[] = [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    preferred.push(...navigator.languages);
  }
  if (navigator.language) {
    preferred.push(navigator.language);
  }

  return resolveLocale(preferred);
}

const ja = {
  appTagline: 'Webカメラで姿勢チェック',
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
    '骨格の推定はブラウザ内で行われ、カメラ映像を保存したり外部へ送信することはありません。',
  privacyLearnMore: '詳細を見る',
  privacyModalTitle: 'プライバシーとデータ利用について',
  privacyNeverTitle: '端末から外に出ないデータ',
  privacyNeverItem1: 'カメラ映像・録画データ',
  privacyNeverItem2: '顔・骨格の3D座標データ',
  privacyNeverItem3: '氏名・メールアドレス・IPアドレス等の個人特定情報',
  privacyCameraTitle: 'カメラ映像と姿勢推定',
  privacyCameraBody:
    'カメラ映像と姿勢の推定はブラウザ内で処理され、サーバーへの送信や録画・保存は行いません。顔認識による個人特定も行いません。',
  privacyStorageTitle: '端末内への保存（localStorage）',
  privacyStorageBody:
    '基準姿勢、設定、日々の記録はお使いのブラウザ内に保存されます。設定画面からいつでも削除できます。',
  privacyTelemetryTitle: 'サービス改善のための外部送信について',
  privacyTelemetryIntro:
    '動作の安定性向上と使いやすさの改善のため、個人を特定しない統計情報を送信する場合があります。第三者の広告やトラッキングツールは使用していません。',
  privacyTelemetryItem1:
    '送信される情報：利用時間、セットアップの進行状況、動作性能・エラー情報、ランダムな匿名ID（IPアドレスは保存されません）',
  privacyTelemetryItem2: '送信先：SitRight（Cloudflare上の自社サーバー）',
  privacyTelemetryItem3:
    '利用目的：不具合の検知・修正、機能改善および利用状況の把握',
  privacyControlTitle: '設定とデータの管理',
  privacyControlBody:
    '設定画面からいつでも「匿名診断データの送信」をオフにできます。また、ブラウザ内の記録や基準姿勢も設定から削除できます。',
  featureMeasure: 'cmと角度で計測',
  featureMeasureBody:
    '頭が何cm前に出ているか、何度うつむいているかを数値で表示',
  featureSide: '横からの姿勢を3Dで',
  featureSideBody: '理想の姿勢と今の頭・背骨のずれが一目で分かる',
  featureQuiet: '必要なときだけ通知',
  featureQuietBody: '悪い姿勢が続いたときだけ。一瞬の前かがみでは鳴りません',
  demoLabel: 'デモ表示',
  disclaimer:
    '本アプリは医療機器ではなく、診断を行うものではありません。痛みやしびれがある場合は医療機関に相談してください。',
  guideLink: '仕組みとよくある質問',

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
  cameraDefault: '標準',
  cameraNumbered: 'カメラ {n}',

  // camera errors
  cameraError_denied:
    'カメラの使用が許可されていません。アドレスバーのカメラアイコンから許可してください。',
  cameraError_not_found: 'カメラが見つかりません。接続を確認してください。',
  cameraError_in_use:
    'カメラが他のアプリで使用中です。ビデオ会議アプリ等を閉じてから再試行してください。',
  cameraError_insecure:
    'この環境ではカメラを使用できません（HTTPSでアクセスしてください）。',
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
  calibrateUnstable: '体が動きました。そのまま止まると再開します',
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
  scoreHint:
    '現在の姿勢スコア（0〜100）。100に近いほど基準姿勢に近く、70以上が「良い姿勢」です',
  alertIn: '{s}秒続くと通知',
  metricForward: '頭の前方突出',
  metricForwardHint:
    '基準姿勢から頭が前に出ている距離（cm）です。前に出るほどバーが伸び、首への負担が増えます',
  metricDown: 'うつむき',
  metricDownHint:
    '基準姿勢から頭が下を向いている角度（°）です。うつむきが大きいほどバーが伸びます',
  metricSlump: '背中の丸まり',
  metricSlumpHint:
    '基準姿勢からの背中の丸まり・上体の沈み込み（%）です。丸まるほどバーが伸びます',
  metricLean: '左右の傾き',
  metricLeanHint:
    '基準姿勢からの体や頭の左右への傾き角度（°）です。中央（0°）がまっすぐな状態です',
  sideLeft: '左',
  sideRight: '右',
  leanLevel: 'まっすぐ',
  metricLoad: '首への負担（目安）',
  metricLoadHint: '頭を支える首にかかる重さの目安です（Hansraj, 2014）',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: '理想の姿勢',
  idealHint: '記録した基準姿勢（緑のシルエット）です',
  you: '現在の姿勢',
  youHint: 'カメラで計測中の現在の姿勢（3Dモデル）です',
  plumbLine: '耳と肩を結ぶ線',
  plumbLineHint:
    '肩の真上を通る基準の垂線です。耳の点がこの線の近くにあると首への負担が少なくなります',
  sideView: '横から見たあなたの姿勢',
  sideViewHint: 'ドラッグで回転',
  resetView: '視点をリセット',
  modelLoadFailed: '3Dモデルの読み込みに失敗しました',
  modelLoadingScene: '3Dアバターを読み込み中…',
  modelLoadingVision: '姿勢推定モデルを読み込み中…',
  alignmentOptimal: '正しい姿勢',
  alignmentBalanced: '基準の姿勢に近い状態です',
  alignmentLoadOptimal: '首への負担 約{kg}kg',
  alignmentAllGood: 'バランス良好',
  balanceHudHint:
    '中央の線が基準姿勢（0）です。緑の点が中央に近いほど基準の姿勢に保たれています',
  neckLoad: '首への負担',
  neckLoadZero: '負担なし',
  neckLoadRatio: '頭の重さの {ratio} 倍',
  xray: '骨格',
  avatar: '3Dモデル',
  gender: '性別',
  gender_all: 'すべて',
  gender_male: '男性',
  gender_female: '女性',
  avatar_man: '男性（セミフォーマル）',
  avatar_manBusiness: '男性（ビジネス）',
  avatar_manCasual: '男性（カジュアル）',
  avatar_senior: 'シニア',
  avatar_woman: '女性（ビジネス）',
  avatar_womanCasual: '女性（カジュアル）',
  avatar_womanSporty: '女性（スポーティ）',
  avatar_womanSmart: '女性（エレガント）',
  pipOpen: 'ピクチャー イン ピクチャー',
  pipClose: 'ピクチャー イン ピクチャーを閉じる',
  pipActive: 'ピクチャー イン ピクチャーで表示中',
  pause: '一時停止',
  resume: '再開',
  recalibrate: '基準を取り直す',
  settings: '設定',
  hideCamera: 'カメラ映像を隠す',
  showCamera: 'カメラ映像を表示',
  cameraHidden: 'カメラ映像は非表示です（モニタリングは継続中）',
  sitting: '連続着席',
  sittingHint: '現在続けて座っている時間です。離席すると0分にリセットされます',
  minutes: '{n}分',
  durationHoursMinutes: '{h}時間{m}分',
  durationMinutes: '{m}分',
  baselineSuspect:
    '基準姿勢より大きく後ろに下がっています。基準を取り直すと精度が上がります。',

  // today
  todayTitle: '今日の記録',
  goodRatio: '良い姿勢の割合',
  goodRatioHint:
    '今日の計測時間のうち、良い姿勢（スコア70以上）だった時間の割合です',
  monitored: '計測時間',
  monitoredHint:
    '今日カメラで姿勢を計測した合計時間です（一時停止・離席中は含みません）',
  alertsCount: '通知',
  alertsCountHint: '姿勢の崩れが続いて通知が出た回数です',
  resetsCount: '姿勢改善',
  resetsCountHint:
    '通知のあとに良い姿勢へ戻せた回数です（括弧内は通知に対する復帰率）',
  recoveryRate: '復帰率 {n}%',
  times: '{n}回',
  timelineTitle: '直近60分',
  timelineAgo60: '60分前',
  timelineAgo30: '30分前',
  timelineNow: '現在',
  timelineHint:
    '直近60分の1分ごとの平均姿勢スコア（0〜100）です。棒が高いほど良い姿勢で、緑は70以上、黄は40〜69、赤は39以下、グレーは未計測の分です',
  timelineBarMeasured: '{time} — 姿勢スコア {score} / 100（{status}）',
  timelineBarEmpty: '{time} — 計測なし（開始前・一時停止・離席）',
  breakdownTitle: '多かった崩れ方',
  breakdownHint:
    '今日、姿勢が崩れていた時間の内訳（長かった順・最大3つ）です。項目にカーソルを当てると詳しい説明と直し方を表示します',
  breakdownBarDetail: '{name}: {duration}（崩れた時間の {pct}%）',
  noBreakdown: 'まだ崩れた記録はありません',
  weekTitle: '過去7日',
  weekHint:
    '過去7日間の日ごとの「良い姿勢の割合（0〜100%）」です。棒が高い日ほど良い姿勢を保てており、白枠の棒が今日です',
  weekBarMeasured: '{date} — 良い姿勢 {pct}%（計測 {duration}）',
  weekBarEmpty: '{date} — データなし（計測記録なし）',
  noData: 'データなし',
  insightTitle: '改善のヒント',
  insightGood:
    'ここまで大きな崩れはありません。1時間に1回は立ち上がって体を伸ばしましょう。',
  peakCollapse: '崩れやすい時間帯: {start}〜{end}時',
  insightTips: {
    straight_neck:
      '画面が遠いか、文字が小さいかもしれません。画面を少し近づけるか表示を大きくして、あごを軽く引いてみましょう。',
    text_neck:
      'うつむく時間が長くなっています。スタンドなどで画面を目の高さに上げると、首への負担がぐっと減ります。',
    neck_hunch:
      '頭が前に下がっています。胸を軽く開き、肩甲骨を寄せて頭のてっぺんを天井へ引き上げるように座りましょう。',
    slouch:
      '骨盤が後ろに倒れて背中が丸まっています。椅子の奥まで深く座り、骨盤を立てて背筋を伸ばしましょう。',
    lean: '体や首が片側に傾いています。両足の裏を床につけ、左右の坐骨に均等に体重を乗せましょう。',
  },

  // alerts
  alertTitle: '姿勢をチェック',
  recoveredToast: '良い姿勢に戻りました',
  fixed: '姿勢を直しました',
  breakTitle: 'ひと休みしましょう',
  breakBody: '{n}分座り続けています。立ち上がって首と肩を回しましょう。',
  periodicCheckTitle: '姿勢チェック',
  periodicCheckBadge: 'スコア {score} · {kg}kg',
  periodicCheckGoodBody:
    '現在の姿勢スコアは {score}（首への負担 約{kg}kg）です。耳と肩のラインをこのままキープしましょう。',
  periodicCheckPatternBody: '現在のスコアは {score}（{pattern}）です。{fix}',
  periodicCheckIdleBody:
    '背筋を軽く伸ばし、あごを引いて耳を肩の真上に整えましょう。',
  periodicAdviceTitle: '姿勢のヒント',
  periodicReportTitle: '今日のミニレポート',
  periodicReportBadge: '良い姿勢 {ratio}%',
  periodicReportBody:
    '今日の計測 {duration}・良い姿勢 {ratio}%・姿勢改善 {resets}回。こまめに肩の力を抜いて続けましょう。',
  enableNotifications: 'デスクトップ通知を有効にする',
  notificationsHint: '別のアプリで作業中も、姿勢が崩れ続けたときに通知します。',
  notificationsDenied:
    '通知がブロックされています。ブラウザの設定から許可してください。',
  notificationsOn: 'デスクトップ通知: オン',
  dismiss: '閉じる',

  // settings
  settingsTitle: '設定',
  settingsGroupAlerts: '姿勢の通知',
  settingsGroupNotify: '通知と効果音',
  settingsGroupDisplay: '表示と動作',
  sensitivity: '判定の厳しさ',
  sensitivity_gentle: 'ゆるめ',
  sensitivity_standard: '標準',
  sensitivity_strict: '厳しめ',
  alertDelay: '通知までの継続時間',
  cooldown: '通知の最短間隔',
  seconds: '{n}秒',
  minutesShort: '{n}分',
  sound: '効果音',
  soundTheme: '効果音の種類',
  soundTheme_snap_horn: 'パキッ！(深め)',
  soundTheme_snap_bio: 'パキッ！(関節音)',
  soundTheme_snap_click: 'パキッ！(クリック)',
  soundTheme_snap_pop: 'ポキッ (やわらかめ)',
  soundTheme_chime: 'チャイム',
  desktopNotify: 'デスクトップ通知',
  breakReminder: '休憩リマインダー',
  periodicNotify: '定期通知の間隔',
  periodicMode: '定期通知の内容',
  periodicMode_auto: 'おまかせ',
  periodicMode_check: '姿勢チェック',
  periodicMode_advice: '姿勢のヒント',
  periodicMode_break: '休憩',
  periodicMode_report: 'ミニレポート',
  periodicModeHint_auto:
    '着席時間や今日の崩れ方に合わせて、姿勢チェック・ヒント・レポート・休憩を自動で切り替えます。',
  periodicModeHint_check:
    '姿勢が崩れていなくても、一定間隔で現在のスコアと首への負担をお知らせします。',
  periodicModeHint_advice:
    '今日いちばん多かった崩れ方に合わせて、画面の位置やストレッチのヒントをお知らせします。',
  periodicModeHint_break:
    '連続して座り続けている時間を計測し、立ち上がって首や肩をほぐすタイミングを知らせます。',
  periodicModeHint_report:
    '今日の良い姿勢の割合・計測時間・姿勢改善回数のサマリーを定期的にお知らせします。',
  testPeriodicNotify: '定期通知をプレビュー',
  off: 'オフ',
  powerSaver: '省電力モード（計測頻度を下げる）',
  language: '言語',
  resetData: '記録と基準をすべて削除',
  resetConfirm: 'もう一度押すと削除します',
  exportData: 'データのエクスポート',
  exportButton: 'エクスポート',
  exportSummaryCsv: '日次サマリー (CSV)',
  exportTimelineCsv: '詳細タイムライン (CSV)',
  exportJson: '全データ (JSON)',
  exportHint:
    'ブラウザ内に保存された統計データをCSVまたはJSON形式でダウンロードします。',
  privacySectionTitle: 'データとプライバシー',
  privacyNoticeButton: 'プライバシーと外部送信について',
  licensesNoticeButton: 'オープンソースライセンス',
  contactNoticeButton: 'お問い合わせ・フィードバック',
  licensesModalTitle: 'オープンソースライセンス・権利表記',
  licensesIntro:
    'SitRightは以下のオープンソースソフトウェアおよびアセットを活用して開発されています。各著作権者およびライセンス条項は以下の通りです。',
  licensesSourceLink: '公式サイト',
  licenseViewText: 'ライセンス条文を表示',
  licenseHideText: 'ライセンス条文を閉じる',
  licenseCopyButton: 'ライセンス条文をコピー',
  licenseCopied: 'コピーしました',
  licenseCategory_core: 'コアライブラリ & 姿勢推定エンジン',
  licenseCategory_framework: 'フレームワーク & 状態管理',
  licenseCategory_assets: '3Dモデル & アセット',
  telemetryLabel: '匿名診断データの送信',
  telemetryHint: '不具合の修正や改善のため、個人を特定しない統計のみ送信します',
  close: '閉じる',
  testNotification: '通知をテスト',

  pattern: {
    straight_neck: {
      name: 'ストレートネック',
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
      short: '首から頭が前に下がっています',
      detail: '背中の上側から首が前に傾き、頭が前へ下がっています。',
      fix: '胸を軽く開き、頭のてっぺんを天井へ引き上げるように座りましょう。',
    },
    slouch: {
      name: '猫背',
      short: '背中が丸まっています',
      detail: '背中が丸まり、上半身が沈み込んでいます。',
      fix: '骨盤を立てて座り直し、肩を後ろに回して下ろしましょう。',
    },
    lean: {
      name: '体の傾き',
      short: '体や首が片側に傾いています',
      detail:
        '肩のラインや頭が片側に傾き、体重や首の負担が片側に偏っています。',
      fix: '左右の坐骨に均等に体重を乗せ、頭を両肩の真ん中に戻しましょう。',
    },
  } satisfies Record<
    PosturePattern,
    { name: string; short: string; detail: string; fix: string }
  >,

  issue: {
    no_person: 'カメラに人が映っていません',
    no_face: '顔が映っていません。明るさやカメラの向きを確認してください',
    shoulders_hidden:
      '両肩が映っていません。少し離れるか、カメラの角度を調整してください',
    turned_away: '横を向いているため計測を一時停止しています',
    body_rotated: '体が斜めを向いています。画面の正面を向いてください',
  } satisfies Record<FrameIssue, string>,
};

export type Messages = typeof ja;

const en: Messages = {
  appTagline: 'Webcam posture check',
  loading: 'Getting ready…',

  welcomeEyebrow: 'Prevent forward head posture, text neck, and slouching',
  welcomeTitle: 'This is what your neck\nlooks like from the side.',
  welcomeBody:
    'Using only your laptop camera, SitRight measures how far your head juts forward, how much you look down, and how much your back rounds. It shows your posture from the side in 3D—an angle your front camera normally can’t capture—and nudges you only when bad posture persists.',
  welcomeStart: 'Get started',
  welcomeResume: 'Resume monitoring',
  welcomeRecalibrate: 'Recalibrate',
  privacyTitle: 'Video never leaves this device',
  privacyBody:
    'Pose estimation runs in your browser. Camera video is not recorded or sent to a server.',
  privacyLearnMore: 'Learn more',
  privacyModalTitle: 'Privacy & data',
  privacyNeverTitle: 'Stays on your device',
  privacyNeverItem1: 'Camera video feeds and recordings',
  privacyNeverItem2: '3D facial and skeletal coordinate data',
  privacyNeverItem3:
    'Personal information (such as name, email, or IP address)',
  privacyCameraTitle: 'Camera and pose estimation',
  privacyCameraBody:
    'Camera video and pose estimation are processed locally in your browser. Video is not uploaded, recorded, or saved to a server, and no facial recognition is performed.',
  privacyStorageTitle: 'Browser storage (localStorage)',
  privacyStorageBody:
    'Your baseline posture, settings, and daily stats are saved in your browser to provide core features. You can delete this data at any time in Settings.',
  privacyTelemetryTitle: 'Anonymous diagnostics',
  privacyTelemetryIntro:
    'To improve stability and usability, SitRight may send non-identifiable diagnostic data. No third-party advertising or tracking tools are used.',
  privacyTelemetryItem1:
    'What is sent: session duration, setup progress, performance and error metrics, and a random anonymous ID (IP addresses are not stored).',
  privacyTelemetryItem2: 'Where it goes: SitRight’s own servers on Cloudflare.',
  privacyTelemetryItem3:
    'Why: to find errors, check performance, and improve the app.',
  privacyControlTitle: 'Your controls',
  privacyControlBody:
    'You can turn off anonymous diagnostics or delete your saved browser data at any time in Settings.',
  featureMeasure: 'Measured in cm and degrees',
  featureMeasureBody:
    'See exactly how far forward your head is and how much you look down',
  featureSide: 'Your side view in 3D',
  featureSideBody:
    'Compare your head and spine with your ideal posture at a glance',
  featureQuiet: 'Alerts only when it matters',
  featureQuietBody:
    'Only when bad posture persists — not when you briefly lean in',
  demoLabel: 'Demo',
  disclaimer:
    'SitRight is not a medical device and does not diagnose. See a professional if you have pain or numbness.',
  guideLink: 'How it works & FAQ',

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
  cameraDefault: 'Default',
  cameraNumbered: 'Camera {n}',

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
  calibrateUnstable: 'You moved. Hold still to continue',
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
  scoreHint:
    'Current posture score (0–100). Closer to 100 means closer to your baseline; 70 or above is good posture',
  alertIn: 'Alert after {s}s',
  metricForward: 'Head forward',
  metricForwardHint:
    'How far forward your head is from your baseline (cm). The bar fills as your head moves forward',
  metricDown: 'Looking down',
  metricDownHint:
    'How many degrees your head tilts down from your baseline (°). The bar fills as you look further down',
  metricSlump: 'Back rounding',
  metricSlumpHint:
    'How much your upper body sinks or rounds compared with your baseline (%). The bar fills as you slouch',
  metricLean: 'Side tilt',
  metricLeanHint:
    'How many degrees your body or head tilts left or right from your baseline (°). 0° is level',
  sideLeft: 'L',
  sideRight: 'R',
  leanLevel: 'Level',
  metricLoad: 'Neck load (est.)',
  metricLoadHint: 'Estimated weight your neck supports (Hansraj, 2014)',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: 'Ideal posture',
  idealHint: 'Your recorded baseline posture (green silhouette)',
  you: 'Current posture',
  youHint: 'Your live posture measured by the camera (3D model)',
  plumbLine: 'Ear–shoulder line',
  plumbLineHint:
    'Vertical reference line above your shoulder. Keeping your ear near this line reduces load on your neck',
  sideView: 'Your posture from the side',
  sideViewHint: 'Drag to rotate',
  resetView: 'Reset view',
  modelLoadFailed: '3D model failed to load.',
  modelLoadingScene: 'Loading 3D avatar…',
  modelLoadingVision: 'Loading the pose model…',
  alignmentOptimal: 'Proper posture',
  alignmentBalanced: 'Close to your baseline',
  alignmentLoadOptimal: 'Neck load ~{kg}kg',
  alignmentAllGood: 'Well balanced',
  balanceHudHint:
    'The center line is your baseline (0). The closer the green dot is to the center, the closer you are to your baseline',
  neckLoad: 'Load on neck',
  neckLoadZero: 'No extra load',
  neckLoadRatio: '{ratio}× head weight',
  xray: 'Skeleton',
  avatar: '3D model',
  gender: 'Gender',
  gender_all: 'All',
  gender_male: 'Men',
  gender_female: 'Women',
  avatar_man: 'Man (smart casual)',
  avatar_manBusiness: 'Man (business)',
  avatar_manCasual: 'Man (casual)',
  avatar_senior: 'Senior',
  avatar_woman: 'Woman (business)',
  avatar_womanCasual: 'Woman (casual)',
  avatar_womanSporty: 'Woman (sporty)',
  avatar_womanSmart: 'Woman (elegant)',
  pipOpen: 'Picture-in-Picture',
  pipClose: 'Exit Picture-in-Picture',
  pipActive: 'Showing in Picture-in-Picture',
  pause: 'Pause',
  resume: 'Resume',
  recalibrate: 'Recalibrate',
  settings: 'Settings',
  hideCamera: 'Hide camera',
  showCamera: 'Show camera',
  cameraHidden: 'Camera preview hidden (still monitoring)',
  sitting: 'Sitting',
  sittingHint:
    'How long you have been sitting continuously. Resets to 0 when you step away',
  minutes: '{n} min',
  durationHoursMinutes: '{h}h {m}m',
  durationMinutes: '{m}m',
  baselineSuspect:
    'You are sitting well behind your baseline. Recalibrating will improve accuracy.',

  todayTitle: 'Today',
  goodRatio: 'Good posture',
  goodRatioHint:
    'Share of today’s monitored time spent in good posture (score 70 or above)',
  monitored: 'Monitored',
  monitoredHint:
    'Total time your posture was measured today (excludes paused and away time)',
  alertsCount: 'Alerts',
  alertsCountHint:
    'Number of times an alert was shown after posture stayed off',
  resetsCount: 'Recoveries',
  resetsCountHint:
    'Times you returned to good posture after an alert (percentage shows recovery rate)',
  recoveryRate: '{n}% recovered',
  times: '{n}',
  timelineTitle: 'Last 60 minutes',
  timelineAgo60: '60m ago',
  timelineAgo30: '30m ago',
  timelineNow: 'now',
  timelineHint:
    'Minute-by-minute average posture score (0–100) over the last 60 minutes. Taller bars mean better posture: green is 70+, yellow 40–69, red under 40, and gray is unmeasured',
  timelineBarMeasured: '{time} — Posture score {score} / 100 ({status})',
  timelineBarEmpty: '{time} — Not measured (before start, paused, or away)',
  breakdownTitle: 'Most common slips',
  breakdownHint:
    'Top posture slips recorded today, ordered by duration (up to 3). Hover an item to see details and how to fix it',
  breakdownBarDetail: '{name}: {duration} ({pct}% of slip time)',
  noBreakdown: 'No posture slips recorded yet',
  weekTitle: 'Last 7 days',
  weekHint:
    'Daily good posture ratio (0–100%) over the last 7 days. Taller bars mean more time in good posture; the outlined bar is today',
  weekBarMeasured: '{date} — {pct}% good posture ({duration} monitored)',
  weekBarEmpty: '{date} — No data (not monitored)',
  noData: 'No data',
  insightTitle: 'Posture tip',
  insightGood:
    'No major slips so far. Stand up and stretch about once an hour.',
  peakCollapse: 'Most slips: {start}:00–{end}:00',
  insightTips: {
    straight_neck:
      'Your screen may be too far away or the text too small. Move it closer or zoom in, and tuck your chin slightly.',
    text_neck:
      'You have been looking down for a while. Raise the screen to eye level, for example with a laptop stand.',
    neck_hunch:
      'Your head keeps dropping forward. Open your chest, draw your shoulder blades together, and lift the crown of your head.',
    slouch:
      'Your pelvis is tipping back and rounding your back. Sit all the way back in the chair and sit up on your sit bones.',
    lean: 'Your weight is shifting to one side. Put both feet flat on the floor and share your weight evenly across both hips.',
  },

  alertTitle: 'Posture check',
  recoveredToast: 'Back to good posture',
  fixed: 'I fixed it',
  breakTitle: 'Time for a break',
  breakBody:
    'You have been sitting for {n} minutes. Stand up and roll your neck and shoulders.',
  periodicCheckTitle: 'Posture check-in',
  periodicCheckBadge: 'Score {score} · {kg}kg',
  periodicCheckGoodBody:
    'Current posture score is {score} (~{kg}kg neck load). Keep your ears stacked over your shoulders.',
  periodicCheckPatternBody: 'Current score: {score} ({pattern}). {fix}',
  periodicCheckIdleBody:
    'Sit tall, tuck your chin slightly, and bring your ears over your shoulders.',
  periodicAdviceTitle: 'Posture tip',
  periodicReportTitle: 'Today’s posture report',
  periodicReportBadge: '{ratio}% good posture',
  periodicReportBody:
    'Monitored {duration} today · {ratio}% good posture · {resets} recoveries. Relax your shoulders and keep going.',
  enableNotifications: 'Enable desktop notifications',
  notificationsHint: 'Get notified even while you work in other apps.',
  notificationsDenied:
    'Notifications are blocked. Allow them in your browser settings.',
  notificationsOn: 'Desktop notifications: on',
  dismiss: 'Dismiss',

  settingsTitle: 'Settings',
  settingsGroupAlerts: 'Posture alerts',
  settingsGroupNotify: 'Notifications & sound',
  settingsGroupDisplay: 'Display & performance',
  sensitivity: 'Strictness',
  sensitivity_gentle: 'Gentle',
  sensitivity_standard: 'Standard',
  sensitivity_strict: 'Strict',
  alertDelay: 'Alert after',
  cooldown: 'Minimum gap between alerts',
  seconds: '{n}s',
  minutesShort: '{n} min',
  sound: 'Sound',
  soundTheme: 'Sound theme',
  soundTheme_snap_horn: 'Snap (deep)',
  soundTheme_snap_bio: 'Snap (joint)',
  soundTheme_snap_click: 'Click',
  soundTheme_snap_pop: 'Pop (soft)',
  soundTheme_chime: 'Chime',
  desktopNotify: 'Desktop notifications',
  breakReminder: 'Break reminder',
  periodicNotify: 'Periodic notification interval',
  periodicMode: 'Periodic notification type',
  periodicMode_auto: 'Auto',
  periodicMode_check: 'Posture check',
  periodicMode_advice: 'Posture tip',
  periodicMode_break: 'Break',
  periodicMode_report: 'Mini report',
  periodicModeHint_auto:
    'Switches between posture checks, tips, reports, and break reminders based on how long you have been sitting and today’s slips.',
  periodicModeHint_check:
    'Shows your current posture score and neck load at each interval, even when your posture is fine.',
  periodicModeHint_advice:
    'Suggests desk setup changes and stretches for today’s most common slip.',
  periodicModeHint_break:
    'Tracks how long you have been sitting and reminds you to stand up and roll your neck and shoulders.',
  periodicModeHint_report:
    'Sums up today’s good posture ratio, monitored time, and recoveries.',
  testPeriodicNotify: 'Preview periodic notification',
  off: 'Off',
  powerSaver: 'Power saver (measure less often)',
  language: 'Language',
  resetData: 'Delete all history and baseline',
  resetConfirm: 'Press again to delete',
  exportData: 'Export data',
  exportButton: 'Export',
  exportSummaryCsv: 'Daily summary (CSV)',
  exportTimelineCsv: 'Detailed timeline (CSV)',
  exportJson: 'All data (JSON)',
  exportHint:
    'Download posture statistics stored in your browser as CSV or JSON.',
  privacySectionTitle: 'Data & privacy',
  privacyNoticeButton: 'Privacy & data use',
  licensesNoticeButton: 'Open source licenses',
  contactNoticeButton: 'Contact & feedback',
  licensesModalTitle: 'Open source licenses',
  licensesIntro:
    'SitRight is built with the following open source software and assets. Copyright notices and license terms are listed below.',
  licensesSourceLink: 'Official website',
  licenseViewText: 'View license text',
  licenseHideText: 'Hide license text',
  licenseCopyButton: 'Copy license text',
  licenseCopied: 'Copied to clipboard',
  licenseCategory_core: 'Core libraries & pose engine',
  licenseCategory_framework: 'Framework & state management',
  licenseCategory_assets: '3D models & assets',
  telemetryLabel: 'Send anonymous diagnostics',
  telemetryHint:
    'Sends non-identifiable metrics to help fix errors and improve stability',
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
      fix: 'Open your chest and sit tall as if lifting the crown of your head.',
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
    no_face: 'Can’t see your face. Check the lighting and camera angle',
    shoulders_hidden:
      'Both shoulders must be visible. Move back or adjust the camera',
    turned_away: 'Paused while you look away',
    body_rotated: 'Your body is turned. Face the screen',
  },
};

const ko: Messages = {
  appTagline: '웹캠으로 자세 체크',
  loading: '준비하고 있어요…',

  // welcome
  welcomeEyebrow: '거북목·일자목·굽은 등 예방에',
  welcomeTitle: '내 목과 등,\n옆에서 보면 이래요.',
  welcomeBody:
    '노트북 카메라만으로 고개가 앞으로 나온 정도, 숙인 각도, 등이 굽은 정도를 측정해요. 정면 카메라로는 볼 수 없는 옆모습을 3D로 보여 주고, 나쁜 자세가 계속될 때만 살짝 알려 드려요.',
  welcomeStart: '시작하기',
  welcomeResume: '모니터링 재개',
  welcomeRecalibrate: '기준 자세 다시 잡기',
  privacyTitle: '카메라 영상은 기기 밖으로 나가지 않아요',
  privacyBody:
    '자세 분석은 브라우저 안에서만 이루어지며, 카메라 영상을 저장하거나 외부로 전송하지 않아요.',
  privacyLearnMore: '자세히 보기',
  privacyModalTitle: '개인정보 및 데이터 처리 안내',
  privacyNeverTitle: '기기 밖으로 나가지 않는 데이터',
  privacyNeverItem1: '카메라 영상 및 녹화 데이터',
  privacyNeverItem2: '얼굴·골격의 3D 좌표 데이터',
  privacyNeverItem3: '이름, 이메일, IP 주소 등 개인 식별 정보',
  privacyCameraTitle: '카메라 영상과 자세 인식',
  privacyCameraBody:
    '카메라 영상과 자세 인식은 브라우저 안에서 처리되며, 영상을 녹화하거나 서버로 전송하지 않습니다. 얼굴 인식을 통한 개인 식별도 하지 않습니다.',
  privacyStorageTitle: '브라우저 내 저장 (localStorage)',
  privacyStorageBody:
    '기준 자세, 설정, 일별 기록은 기본 기능을 제공하기 위해 브라우저에만 저장됩니다. 설정에서 언제든지 삭제할 수 있습니다.',
  privacyTelemetryTitle: '서비스 개선을 위한 진단 데이터 안내',
  privacyTelemetryIntro:
    '안정적인 동작과 사용성 개선을 위해 개인을 식별하지 않는 최소한의 통계 정보를 전송할 수 있습니다. 제3자 광고나 추적 도구는 사용하지 않습니다.',
  privacyTelemetryItem1:
    '전송 항목: 이용 시간, 설정 진행 단계, 성능 및 오류 정보, 무작위 익명 ID (IP 주소는 저장되지 않음)',
  privacyTelemetryItem2: '전송처: SitRight 인프라 (Cloudflare)',
  privacyTelemetryItem3:
    '이용 목적: 오류 확인 및 수정, 기능 개선, 이용 현황 파악',
  privacyControlTitle: '설정 및 데이터 관리',
  privacyControlBody:
    '설정에서 언제든지 "익명 진단 데이터 전송"을 끌 수 있으며, 브라우저에 저장된 기록과 기준 데이터도 삭제할 수 있습니다.',
  featureMeasure: 'cm와 각도로 측정',
  featureMeasureBody:
    '머리가 몇 cm 앞으로 나왔는지, 몇 도 숙였는지를 수치로 표시해요',
  featureSide: '옆에서 본 자세를 3D로',
  featureSideBody: '바른 자세와 지금 내 머리·등 위치의 차이를 한눈에 비교해요',
  featureQuiet: '필요할 때만 알림',
  featureQuietBody:
    '나쁜 자세가 계속될 때만 알려요. 잠깐 숙인 정도로는 울리지 않아요',
  demoLabel: '데모 표시',
  disclaimer:
    '이 앱은 의료기기가 아니며 진단을 하지 않아요. 통증이나 저림이 있으면 의료기관에 상담하세요.',
  guideLink: '작동 방식과 자주 묻는 질문',

  // setup
  setupStep: '단계 {n} / 2',
  setupTitle: '카메라 위치를 맞춰 볼까요',
  setupBody: '화면 정면에 앉아 머리와 양쪽 어깨가 카메라에 보이게 해 주세요.',
  setupCameraButton: '카메라 켜기',
  setupCameraStarting: '카메라를 시작하고 있어요…',
  setupModelLoading: '자세 인식 모델을 불러오는 중…',
  checkFace: '얼굴이 보여요',
  checkShoulders: '양쪽 어깨가 보여요',
  checkFacing: '화면 정면을 보고 있어요',
  checkReady: '준비 완료',
  setupNext: '다음: 기준 자세 기록',
  setupTip: '노트북이라면 화면을 조금 뒤로 젖히면 어깨까지 잘 나와요.',
  cameraSelect: '카메라',
  cameraDefault: '기본',
  cameraNumbered: '카메라 {n}',

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
    '자세 인식 모델을 불러오지 못했어요. 페이지를 새로고침해 주세요.',
  retry: '다시 시도',

  // calibrate
  calibrateTitle: '좋은 자세를 3초간 유지하세요',
  calibrateBody:
    '지금 자세를 "기준 자세"로 저장해요. 이후에는 이 자세에서 얼마나 벗어나는지 측정해요.',
  calibrateTip1: '골반을 세우고 깊숙이 앉기',
  calibrateTip2: '귀가 어깨 바로 위에 오도록 턱을 살짝 당기기',
  calibrateTip3: '시선은 화면으로, 어깨 힘은 빼기',
  calibrateStart: '기록 시작',
  calibrateHold: '그대로 멈춰 주세요…',
  calibrateUnstable: '조금 움직였어요. 그대로 멈추면 다시 시작해요',
  calibrateWaiting: '머리와 양쪽 어깨가 보이기를 기다리고 있어요',
  calibrateDone: '기준 자세를 기록했어요',
  back: '뒤로',

  // monitor
  statusGood: '좋은 자세',
  statusFair: '조금 흐트러졌어요',
  statusPoor: '자세가 무너졌어요',
  statusPaused: '일시 정지 중',
  statusAway: '자리 비움',
  statusChecking: '측정할 수 없어요',
  scoreLabel: '자세 점수',
  scoreHint:
    '현재 자세 점수 (0~100). 100에 가까울수록 기준 자세에 가깝고, 70점 이상이 좋은 자세예요',
  alertIn: '{s}초 동안 계속되면 알림',
  metricForward: '고개 앞으로 나옴',
  metricForwardHint:
    '기준 자세에서 머리가 앞으로 나온 거리(cm)예요. 앞으로 나올수록 막대가 길어지고 목 부담이 커져요',
  metricDown: '고개 숙임',
  metricDownHint:
    '기준 자세에서 고개를 숙인 각도(°)예요. 많이 숙일수록 막대가 길어져요',
  metricSlump: '등 굽음',
  metricSlumpHint:
    '기준 자세보다 등이 굽거나 상체가 가라앉은 정도(%)예요. 많이 굽을수록 막대가 길어져요',
  metricLean: '좌우 기울기',
  metricLeanHint:
    '기준 자세에서 몸이나 머리가 좌우로 기운 각도(°)예요. 0°가 수평 상태예요',
  sideLeft: '좌',
  sideRight: '우',
  leanLevel: '수평',
  metricLoad: '목 부담 (추정)',
  metricLoadHint:
    '머리를 지탱하는 목에 걸리는 무게의 추정치예요 (Hansraj, 2014)',
  unitCm: 'cm',
  unitDeg: '°',
  unitKg: 'kg',
  ideal: '바른 자세',
  idealHint: '기록해 둔 기준 자세(초록색 실루엣)예요',
  you: '현재 자세',
  youHint: '카메라로 측정 중인 현재 자세(3D 모델)예요',
  plumbLine: '귀와 어깨를 잇는 선',
  plumbLineHint:
    '어깨 바로 위를 지나는 기준 수직선이에요. 귀 위치가 이 선 가까이에 있으면 목 부담이 줄어들어요',
  sideView: '옆에서 본 내 자세',
  sideViewHint: '드래그로 회전',
  resetView: '시점 초기화',
  modelLoadFailed: '3D 모델을 불러오지 못했어요.',
  modelLoadingScene: '3D 아바타를 불러오는 중…',
  modelLoadingVision: '자세 인식 모델을 불러오는 중…',
  alignmentOptimal: '바른 자세 유지 중',
  alignmentBalanced: '기준 자세에 가까워요',
  alignmentLoadOptimal: '목 부담 약 {kg}kg',
  alignmentAllGood: '자세 균형 양호',
  balanceHudHint:
    '가운데 선이 기준 자세(0)예요. 초록색 점이 가운데에 가까울수록 기준 자세에 잘 맞춰져 있어요',
  neckLoad: '목 부담',
  neckLoadZero: '부담 없음',
  neckLoadRatio: '머리 무게의 {ratio}배',
  xray: '골격',
  avatar: '3D 모델',
  gender: '성별',
  gender_all: '전체',
  gender_male: '남성',
  gender_female: '여성',
  avatar_man: '남성 (세미정장)',
  avatar_manBusiness: '남성 (비즈니스)',
  avatar_manCasual: '남성 (캐주얼)',
  avatar_senior: '시니어',
  avatar_woman: '여성 (비즈니스)',
  avatar_womanCasual: '여성 (캐주얼)',
  avatar_womanSporty: '여성 (스포티)',
  avatar_womanSmart: '여성 (정장)',
  pipOpen: 'PIP 모드',
  pipClose: 'PIP 모드 종료',
  pipActive: 'PIP 모드로 표시 중',
  pause: '일시 정지',
  resume: '이어하기',
  recalibrate: '기준 다시 잡기',
  settings: '설정',
  hideCamera: '카메라 영상 숨기기',
  showCamera: '카메라 영상 표시',
  cameraHidden: '카메라 영상은 숨겨져 있어요 (모니터링은 계속 중)',
  sitting: '연속 착석',
  sittingHint:
    '지금 연속으로 앉아 있는 시간이에요. 자리를 비우면 0분으로 초기화돼요',
  minutes: '{n}분',
  durationHoursMinutes: '{h}시간 {m}분',
  durationMinutes: '{m}분',
  baselineSuspect:
    '기준 자세보다 많이 뒤로 물러나 있어요. 기준을 다시 잡으면 정확도가 올라가요.',

  // today
  todayTitle: '오늘의 기록',
  goodRatio: '좋은 자세 비율',
  goodRatioHint:
    '오늘 측정한 시간 가운데 좋은 자세(점수 70점 이상)를 유지한 시간의 비율이에요',
  monitored: '측정 시간',
  monitoredHint:
    '오늘 카메라로 자세를 측정한 총 시간이에요 (일시 정지·자리 비움 제외)',
  alertsCount: '알림',
  alertsCountHint: '자세 흐트러짐이 계속되어 알림이 울린 횟수예요',
  resetsCount: '자세 복귀',
  resetsCountHint:
    '알림이 울린 뒤 좋은 자세로 돌아온 횟수예요 (괄호 안은 알림 대비 복귀율)',
  recoveryRate: '복귀율 {n}%',
  times: '{n}회',
  timelineTitle: '최근 60분',
  timelineAgo60: '60분 전',
  timelineAgo30: '30분 전',
  timelineNow: '지금',
  timelineHint:
    '최근 60분 동안의 1분 단위 평균 자세 점수(0~100)예요. 막대가 높을수록 좋은 자세이며 초록은 70점 이상, 노랑은 40~69점, 빨강은 39점 이하, 회색은 측정하지 않은 시간이에요',
  timelineBarMeasured: '{time} — 자세 점수 {score} / 100 ({status})',
  timelineBarEmpty: '{time} — 측정 기록 없음 (시작 전·일시 정지·자리 비움)',
  breakdownTitle: '자주 무너진 자세',
  breakdownHint:
    '오늘 자세가 흐트러졌던 시간의 내역(길었던 순, 최대 3개)이에요. 항목에 마우스를 올리면 자세한 설명과 교정 방법을 볼 수 있어요',
  breakdownBarDetail: '{name}: {duration} (흐트러진 시간의 {pct}%)',
  noBreakdown: '아직 무너진 기록이 없어요',
  weekTitle: '지난 7일',
  weekHint:
    '지난 7일 동안의 일별 좋은 자세 비율(0~100%)이에요. 막대가 높을수록 좋은 자세를 오래 유지한 날이고, 흰색 테두리가 오늘이에요',
  weekBarMeasured: '{date} — 좋은 자세 {pct}% (측정 {duration})',
  weekBarEmpty: '{date} — 데이터 없음 (측정 기록 없음)',
  noData: '데이터 없음',
  insightTitle: '개선 팁',
  insightGood:
    '지금까지 크게 무너진 기록이 없어요. 1시간에 한 번은 일어나서 몸을 펴 주세요.',
  peakCollapse: '자주 흐트러진 시간: {start}~{end}시',
  insightTips: {
    straight_neck:
      '화면이 멀거나 글자가 작을 수 있어요. 화면을 조금 앞으로 당기거나 글자 크기를 키우고, 턱을 가볍게 당겨 보세요.',
    text_neck:
      '고개를 숙이는 시간이 길어요. 거치대나 받침대로 화면을 눈높이에 맞추면 목 부담이 크게 줄어들어요.',
    neck_hunch:
      '머리가 앞쪽 아래로 처지고 있어요. 가슴을 펴고 날개뼈를 살짝 모은 뒤, 정수리를 위로 끌어올리듯 앉아 보세요.',
    slouch:
      '골반이 뒤로 기울면서 등이 굽고 있어요. 의자 깊숙이 앉아 골반을 세우고 허리를 곧게 펴 보세요.',
    lean: '몸이나 목이 한쪽으로 기울어 있어요. 두 발을 바닥에 나란히 두고 양쪽 엉덩이에 체중을 고르게 실어 보세요.',
  },

  // alerts
  alertTitle: '자세를 확인하세요',
  recoveredToast: '좋은 자세로 돌아왔어요',
  fixed: '자세를 고쳤어요',
  breakTitle: '잠깐 쉬어요',
  breakBody: '{n}분째 앉아 있어요. 일어나서 목과 어깨를 돌려 보세요.',
  periodicCheckTitle: '자세 점검',
  periodicCheckBadge: '점수 {score} · {kg}kg',
  periodicCheckGoodBody:
    '현재 자세 점수는 {score} (목 부담 약 {kg}kg)예요. 귀와 어깨 라인을 이대로 유지해 보세요.',
  periodicCheckPatternBody: '현재 점수는 {score}점 ({pattern})이에요. {fix}',
  periodicCheckIdleBody:
    '허리를 가볍게 펴고 턱을 살짝 당겨 귀가 어깨 바로 위에 오도록 맞춰 보세요.',
  periodicAdviceTitle: '자세 팁',
  periodicReportTitle: '오늘의 미니 리포트',
  periodicReportBadge: '좋은 자세 {ratio}%',
  periodicReportBody:
    '오늘 측정 {duration} · 좋은 자세 {ratio}% · 자세 복귀 {resets}회. 어깨 힘을 빼고 무리 없이 이어가 보세요.',
  enableNotifications: '데스크톱 알림 켜기',
  notificationsHint:
    '다른 앱에서 작업 중에도 자세가 계속 무너지면 알려 드려요.',
  notificationsDenied:
    '알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요.',
  notificationsOn: '데스크톱 알림: 켜짐',
  dismiss: '닫기',

  // settings
  settingsTitle: '설정',
  settingsGroupAlerts: '자세 알림',
  settingsGroupNotify: '알림과 효과음',
  settingsGroupDisplay: '화면과 동작',
  sensitivity: '감지 민감도',
  sensitivity_gentle: '느슨하게',
  sensitivity_standard: '표준',
  sensitivity_strict: '엄격하게',
  alertDelay: '알림까지 지속 시간',
  cooldown: '알림 최소 간격',
  seconds: '{n}초',
  minutesShort: '{n}분',
  sound: '효과음',
  soundTheme: '효과음 종류',
  soundTheme_snap_horn: '뚝! (묵직한 울림)',
  soundTheme_snap_bio: '뚝! (관절음)',
  soundTheme_snap_click: '찰칵 (클릭음)',
  soundTheme_snap_pop: '톡 (부드럽게)',
  soundTheme_chime: '차임벨',
  desktopNotify: '데스크톱 알림',
  breakReminder: '휴식 알림',
  periodicNotify: '정기 알림 간격',
  periodicMode: '정기 알림 종류',
  periodicMode_auto: '자동',
  periodicMode_check: '자세 점검',
  periodicMode_advice: '개선 팁',
  periodicMode_break: '휴식',
  periodicMode_report: '미니 리포트',
  periodicModeHint_auto:
    '착석 시간과 오늘 자주 무너진 자세에 맞춰 자세 점검·개선 팁·리포트·휴식 알림을 자동으로 전환해요.',
  periodicModeHint_check:
    '자세가 흐트러지지 않아도 일정 간격으로 현재 점수와 목 부담을 알려 드려 자세를 다시 챙기게 도와줘요.',
  periodicModeHint_advice:
    '오늘 가장 많이 나타난 자세 무너짐에 맞춰 화면 위치 조정과 스트레칭 팁을 알려 드려요.',
  periodicModeHint_break:
    '연속으로 앉아 있는 시간을 측정해 자리에서 일어나 목과 어깨를 풀 타이밍을 알려 드려요.',
  periodicModeHint_report:
    '오늘의 좋은 자세 비율, 측정 시간, 자세 복귀 횟수 요약을 정기적으로 알려 드려요.',
  testPeriodicNotify: '정기 알림 미리보기',
  off: '끔',
  powerSaver: '절전 모드 (측정 빈도 낮춤)',
  language: '언어',
  resetData: '기록과 기준 모두 삭제',
  resetConfirm: '한 번 더 누르면 삭제해요',
  exportData: '데이터 내보내기',
  exportButton: '내보내기',
  exportSummaryCsv: '일별 요약 (CSV)',
  exportTimelineCsv: '상세 타임라인 (CSV)',
  exportJson: '전체 데이터 (JSON)',
  exportHint: '브라우저에 저장된 자세 기록을 CSV 또는 JSON 파일로 내려받아요.',
  privacySectionTitle: '데이터 및 개인정보',
  privacyNoticeButton: '개인정보 처리 및 데이터 수집 안내',
  licensesNoticeButton: '오픈소스 라이선스',
  contactNoticeButton: '문의 및 피드백',
  licensesModalTitle: '오픈소스 라이선스 및 권리 표기',
  licensesIntro:
    'SitRight는 다음 오픈소스 소프트웨어 및 에셋을 활용하여 개발되었습니다. 각 저작권 표기 및 라이선스 약관은 다음과 같습니다.',
  licensesSourceLink: '공식 사이트',
  licenseViewText: '라이선스 전문 보기',
  licenseHideText: '라이선스 전문 닫기',
  licenseCopyButton: '라이선스 전문 복사',
  licenseCopied: '복사되었습니다',
  licenseCategory_core: '코어 라이브러리 및 자세 추정 엔진',
  licenseCategory_framework: '프레임워크 및 상태 관리',
  licenseCategory_assets: '3D 모델 및 에셋',
  telemetryLabel: '익명 진단 데이터 전송',
  telemetryHint: '오류 해결과 품질 개선을 위한 익명 통계만 전송돼요',
  close: '닫기',
  testNotification: '알림 테스트',

  pattern: {
    straight_neck: {
      name: '일자목',
      short: '머리가 앞으로 나왔어요',
      detail:
        '머리가 어깨보다 앞으로 나와 목의 자연스러운 곡선이 사라지기 쉬운 상태예요.',
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
      short: '머리가 앞쪽 아래로 처져 있어요',
      detail: '등 윗부분부터 목이 앞으로 굽어 머리가 아래로 처져 있어요.',
      fix: '가슴을 살짝 펴고, 정수리를 천장 쪽으로 끌어올리듯 세워 주세요.',
    },
    slouch: {
      name: '굽은 등',
      short: '등이 굽어 있어요',
      detail: '등이 굽고 상체가 아래로 가라앉아 있어요.',
      fix: '골반을 세워 바르게 고쳐 앉고, 어깨를 뒤로 가볍게 펴서 내려 주세요.',
    },
    lean: {
      name: '좌우 기울어짐',
      short: '몸이나 목이 한쪽으로 기울어 있어요',
      detail:
        '어깨선이나 머리가 한쪽으로 기울어 체중과 목 부담이 한쪽에 쏠려 있어요.',
      fix: '양쪽 엉덩이에 체중을 고르게 싣고, 머리를 어깨 한가운데로 바로 세워 주세요.',
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

export function formatDuration(sec: number, t: Messages): string {
  const safeSec = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const h = Math.floor(safeSec / 3600);
  const m = Math.floor((safeSec % 3600) / 60);
  if (h > 0) {
    return format(t.durationHoursMinutes, { h, m });
  }
  return format(t.durationMinutes, { m });
}

export interface PeriodicNotificationData {
  periodicKind: PeriodicNotifyKind;
  minutes: number;
  score?: number | null;
  neckLoadKg?: number | null;
  pattern?: PosturePattern | null;
  topPattern?: PosturePattern | null;
  goodRatioPct?: number | null;
  monitoredSec?: number | null;
  recoveries?: number | null;
}

export function buildPeriodicNotification(
  data: PeriodicNotificationData,
  t: Messages
): { title: string; body: string; badgeText: string } {
  const { periodicKind, minutes } = data;
  const safeMin = Math.max(1, Math.round(minutes || 0));

  if (periodicKind === 'check') {
    const hasScore =
      typeof data.score === 'number' && Number.isFinite(data.score);
    const score = hasScore ? Math.round(data.score!) : null;
    const kg =
      typeof data.neckLoadKg === 'number' && Number.isFinite(data.neckLoadKg)
        ? data.neckLoadKg.toFixed(1)
        : '5.0';
    const badgeText =
      score !== null
        ? format(t.periodicCheckBadge, { score, kg })
        : format(t.minutesShort, { n: safeMin });
    if (score !== null && data.pattern) {
      const p = t.pattern[data.pattern];
      return {
        title: t.periodicCheckTitle,
        body: format(t.periodicCheckPatternBody, {
          score,
          pattern: p.name,
          fix: p.fix,
        }),
        badgeText,
      };
    }
    if (score !== null) {
      return {
        title: t.periodicCheckTitle,
        body: format(t.periodicCheckGoodBody, { score, kg }),
        badgeText,
      };
    }
    return {
      title: t.periodicCheckTitle,
      body: t.periodicCheckIdleBody,
      badgeText,
    };
  }

  if (periodicKind === 'advice') {
    const targetPattern = data.topPattern ?? data.pattern ?? null;
    if (targetPattern) {
      return {
        title: t.periodicAdviceTitle,
        body: t.insightTips[targetPattern],
        badgeText: t.pattern[targetPattern].name,
      };
    }
    return {
      title: t.periodicAdviceTitle,
      body: t.insightGood,
      badgeText: t.insightTitle,
    };
  }

  if (periodicKind === 'report') {
    const ratio =
      typeof data.goodRatioPct === 'number' &&
      Number.isFinite(data.goodRatioPct)
        ? Math.round(data.goodRatioPct)
        : 100;
    const duration = formatDuration(data.monitoredSec ?? safeMin * 60, t);
    const resets = data.recoveries ?? 0;
    return {
      title: t.periodicReportTitle,
      body: format(t.periodicReportBody, { ratio, duration, resets }),
      badgeText: format(t.periodicReportBadge, { ratio }),
    };
  }

  return {
    title: t.breakTitle,
    body: format(t.breakBody, { n: safeMin }),
    badgeText: format(t.minutesShort, { n: safeMin }),
  };
}
