import type { Locale } from '@/i18n/messages';

/** 初めて公開した日（構造化データの datePublished）。変えない */
export const GUIDE_PUBLISHED = '2026-10-22';
/** 本文の最終確認日。内容や出典を見直したら更新する（構造化データの dateModified になる） */
export const GUIDE_UPDATED = '2026-10-22';

export type SourceId = 'hansraj' | 'mahmoud' | 'osha' | 'who' | 'aao' | 'mediapipe';

/** 本文で参照する出典。名前は原題のまま、どの言語でも同じものを示す */
export const SOURCES: Record<SourceId, { name: string; url: string }> = {
  hansraj: {
    name: 'Hansraj KK. Assessment of stresses in the cervical spine caused by posture and position of the head. Surgical Technology International. 2014;25:277-279.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25393825/',
  },
  mahmoud: {
    name: 'Mahmoud NF, et al. The Relationship Between Forward Head Posture and Neck Pain: a Systematic Review and Meta-Analysis. Current Reviews in Musculoskeletal Medicine. 2019;12(4):562-577.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31773477/',
  },
  osha: {
    name: 'OSHA. Computer Workstations eTool: Monitors.',
    url: 'https://www.osha.gov/etools/computer-workstations/components/monitors',
  },
  who: {
    name: 'WHO. Guidelines on physical activity and sedentary behaviour (2020).',
    url: 'https://www.who.int/publications/i/item/9789240015128',
  },
  aao: {
    name: 'American Academy of Ophthalmology. Should You Be Worried About Blue Light?',
    url: 'https://www.aao.org/eye-health/tips-prevention/should-you-be-worried-about-blue-light',
  },
  mediapipe: {
    name: 'Google AI Edge. MediaPipe Pose Landmarker.',
    url: 'https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker',
  },
};

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  /** 箇条書き（任意） */
  items?: string[];
  /** 出典からの引用（任意）。text は原文、note はその言語での要約 */
  quote?: { text: string; note?: string; source: SourceId };
  /** この節の根拠 */
  sources: SourceId[];
}

export interface GuideCopy {
  title: string;
  description: string;
  heading: string;
  /** 冒頭の要約。検索結果や AI の回答に引用されやすいよう、問いに直接答える */
  summary: string;
  updatedLabel: string;
  imageAlt: string;
  sections: GuideSection[];
  faqHeading: string;
  faq: { q: string; a: string }[];
  sourcesHeading: string;
  cta: string;
  homeLabel: string;
}

export const GUIDE: Record<Locale, GuideCopy> = {
  en: {
    title: 'How SitRight works: webcam posture check for forward head posture & text neck',
    description:
      'What forward head posture is, why head position changes the load on your neck, how SitRight measures it with your webcam in the browser, a desk setup checklist, and answers to common questions, with sources.',
    heading: 'How SitRight checks your posture with a webcam',
    summary:
      'SitRight is a free web app that uses your laptop or desktop webcam to estimate how far your head moves forward, how much you look down, and how much your upper back rounds, compared with your own upright posture. Pose estimation runs inside your browser, so the camera video is never uploaded. It notifies you only when bad posture lasts, not when you lean forward for a moment.',
    updatedLabel: 'Last reviewed',
    imageAlt:
      'Side view of a person at a laptop: upright with the ear above the shoulder on the left, and with the head forward and upper back rounded on the right',
    sections: [
      {
        heading: 'What is forward head posture (text neck)?',
        paragraphs: [
          'Forward head posture means the head sits in front of the shoulders instead of above them, often with the chin tilted down toward a screen. Clinicians commonly measure it with the craniovertebral angle: the angle between a horizontal line through the C7 vertebra and a line to the ear. A smaller angle means the head is further forward.',
          'A 2019 systematic review and meta-analysis of 15 studies found that adults with neck pain had more forward head posture than adults without it, and that a more forward head was moderately associated with higher pain intensity and disability. The same review found no clear association in adolescents.',
        ],
        sources: ['mahmoud'],
      },
      {
        heading: 'Why does the angle of your head matter?',
        paragraphs: [
          'An adult head weighs about 4.5–5.4 kg (10–12 lb). In a biomechanical model of the cervical spine, the load on the neck rose as the head tilted forward:',
        ],
        items: [
          '0° (upright): about 4.5–5.4 kg (10–12 lb)',
          '15°: about 12 kg (27 lb)',
          '30°: about 18 kg (40 lb)',
          '45°: about 22 kg (49 lb)',
          '60°: about 27 kg (60 lb)',
        ],
        quote: {
          text: 'Loss of the natural curve of the cervical spine leads to incrementally increased stresses about the cervical spine.',
          source: 'hansraj',
        },
        sources: ['hansraj'],
      },
      {
        heading: 'How SitRight measures your posture',
        paragraphs: [
          'SitRight uses Google’s MediaPipe Pose Landmarker and Face Landmarker, which estimate body and face landmarks from each camera frame directly in the browser.',
          'First, you sit upright for a few seconds so SitRight can record your own baseline. After that, it compares each moment with that baseline and shows how many centimeters your head has moved forward, how many degrees you are looking down, and how much your upper back is rounding, along with a 3D side view.',
          'A notification appears only after bad posture continues for the time you choose in Settings. Reaching for something or glancing down does not trigger it. The values are estimates from a front-facing camera, not clinical measurements.',
        ],
        sources: ['mediapipe'],
      },
      {
        heading: 'Desk setup checklist',
        paragraphs: [
          'Measurement helps you notice posture; the desk setup and regular breaks make good posture easier to keep.',
        ],
        items: [
          'Put the monitor directly in front of you, at least 50 cm (20 in) away; OSHA describes 50–100 cm (20–40 in) as the preferred viewing distance.',
          'Set the top of the screen at or slightly below eye level, so the center of the screen is about 15–20° below your line of sight.',
          'With a laptop, raise the screen with a stand and use a separate keyboard and mouse.',
          'Limit long periods of sitting. WHO recommends reducing sedentary time and replacing it with physical activity of any intensity.',
          'Rest your eyes with the 20-20-20 rule recommended by the American Academy of Ophthalmology: every 20 minutes, look at something at least 20 feet (6 m) away for 20 seconds.',
        ],
        sources: ['osha', 'who', 'aao'],
      },
    ],
    faqHeading: 'Frequently asked questions',
    faq: [
      {
        q: 'Is my camera video uploaded or recorded?',
        a: 'No. Pose estimation runs in your browser, and SitRight does not record, save, or send camera video or body landmarks. The site’s security policy blocks the page from sending data to any outside server. Only anonymous diagnostics such as usage time and errors may be sent to SitRight’s own server, and you can turn that off in Settings.',
      },
      {
        q: 'Is SitRight free? Do I need an account?',
        a: 'SitRight is free and needs no account or installation. Open the page, allow camera access, and record your upright posture once.',
      },
      {
        q: 'Which devices and browsers does it work on?',
        a: 'It works in current versions of Chrome, Edge, Safari, and Firefox on a computer with a webcam. The 3D view needs WebGL. You can also install it as an app from the browser and keep it running in its own window.',
      },
      {
        q: 'Can a front-facing webcam really see forward head posture?',
        a: 'A front camera cannot see your profile directly, so SitRight estimates forward movement from changes in the size and position of your face and shoulders relative to your own baseline. That is why it asks you to record your upright posture first. Treat the numbers as a guide for noticing changes, not as a medical measurement.',
      },
      {
        q: 'Does it keep working when I switch to another tab?',
        a: 'Yes. Monitoring continues in the background while the tab stays open. In Chrome and Edge, you can also show the side view in Picture-in-Picture while you work in other apps.',
      },
      {
        q: 'Is SitRight a medical device?',
        a: 'No. SitRight does not diagnose or treat any condition. If you have neck or back pain, numbness, or tingling, consult a doctor or physical therapist.',
      },
    ],
    sourcesHeading: 'Sources',
    cta: 'Start checking your posture',
    homeLabel: 'Home',
  },
  ja: {
    title: 'SitRightの仕組み：Webカメラでストレートネック・猫背をチェック',
    description:
      'ストレートネック（頭部前方突出）とは何か、頭の角度で首の負担がどう変わるか、SitRightがブラウザ内でどう計測するか、デスク環境のチェックリストとよくある質問を出典付きでまとめました。',
    heading: 'SitRightがWebカメラで姿勢をチェックする仕組み',
    summary:
      'SitRightは、ノートPCやデスクトップのWebカメラだけで、頭が前に出た距離・うつむいた角度・背中の丸まりを、あなた自身の良い姿勢と比べて推定する無料のWebアプリです。姿勢の推定はブラウザの中で行われ、カメラ映像がアップロードされることはありません。一瞬の前かがみでは通知せず、悪い姿勢が続いたときだけ知らせます。',
    updatedLabel: '最終確認日',
    imageAlt:
      'ノートPCに向かう人を横から見た図。左は耳が肩の真上にある姿勢、右は頭が前に出て背中が丸まった姿勢',
    sections: [
      {
        heading: 'ストレートネック（頭部前方突出）とは',
        paragraphs: [
          '頭部前方突出は、頭が肩の真上ではなく前に出た姿勢で、画面をのぞき込むようにあごが下がることも多くあります。臨床では頭蓋脊椎角（craniovertebral angle）で測るのが一般的です。第7頸椎を通る水平線と、そこから耳へ引いた線のなす角度で、角度が小さいほど頭が前に出ています。',
          '15件の研究をまとめた2019年のシステマティックレビューとメタ分析では、首の痛みがある成人は痛みのない成人より頭が前に出ており、頭が前に出ているほど痛みの強さや生活上の支障が大きい傾向（中程度の相関）がありました。一方、10代では明確な関連は見られませんでした。',
        ],
        sources: ['mahmoud'],
      },
      {
        heading: '頭の角度で首の負担はどう変わるか',
        paragraphs: [
          '成人の頭の重さは約4.5〜5.4kgです。頸椎の力学モデルを使った研究では、頭を前に傾けるほど首にかかる負荷が大きくなると試算されています。',
        ],
        items: [
          '0°（まっすぐ）：約4.5〜5.4kg',
          '15°：約12kg',
          '30°：約18kg',
          '45°：約22kg',
          '60°：約27kg',
        ],
        quote: {
          text: 'Loss of the natural curve of the cervical spine leads to incrementally increased stresses about the cervical spine.',
          note: '頸椎の自然なカーブが失われるほど、頸椎にかかるストレスは段階的に大きくなる（論文の結論より）',
          source: 'hansraj',
        },
        sources: ['hansraj'],
      },
      {
        heading: 'SitRightの計測方法',
        paragraphs: [
          'SitRightは、GoogleのMediaPipe Pose LandmarkerとFace Landmarkerを使い、カメラ映像の各フレームから体と顔の特徴点をブラウザ内で推定します。',
          '最初に数秒間良い姿勢で座ってもらい、その姿勢を基準として記録します。その後は基準との差から、頭が何cm前に出ているか、何度うつむいているか、背中がどれだけ丸まっているかを数値と横からの3D表示で示します。',
          '通知は、悪い姿勢が設定した時間続いたときだけです。物を取る、一瞬下を見るといった動きでは鳴りません。数値は正面のカメラからの推定で、医療用の測定ではありません。',
        ],
        sources: ['mediapipe'],
      },
      {
        heading: 'デスク環境のチェックリスト',
        paragraphs: [
          '計測は姿勢の崩れに気づくためのものです。良い姿勢を保ちやすくするには、机まわりの調整と定期的な休憩が役立ちます。',
        ],
        items: [
          'モニターは体の正面、目から50cm以上離して置く（米国労働安全衛生局OSHAは50〜100cmを推奨範囲としています）',
          '画面の上端を目の高さか少し下に合わせ、画面の中心が視線より15〜20°ほど下になるようにする',
          'ノートPCはスタンドで画面を上げ、外付けのキーボードとマウスを使う',
          '長く座り続けない。WHOは座っている時間を減らし、強度を問わず体を動かす時間に置き換えることを勧めています',
          '米国眼科学会が勧める「20-20-20ルール」で目を休める：20分ごとに、約6m（20フィート）以上先を20秒見る',
        ],
        sources: ['osha', 'who', 'aao'],
      },
    ],
    faqHeading: 'よくある質問',
    faq: [
      {
        q: 'カメラ映像はアップロード・録画されますか？',
        a: 'されません。姿勢の推定はブラウザ内で行い、カメラ映像や骨格の座標を録画・保存・送信しません。サイトのセキュリティ設定で、外部のサーバーへデータを送れないようにしています。送信されるのは利用時間やエラーなど個人を特定しない診断情報だけで、送信先はSitRightの自社サーバーです。設定からオフにできます。',
      },
      {
        q: '無料ですか？アカウント登録は必要ですか？',
        a: '無料で、アカウント登録やインストールは不要です。ページを開いてカメラを許可し、良い姿勢を一度記録すれば使えます。',
      },
      {
        q: '対応している端末とブラウザは？',
        a: 'Webカメラ付きのパソコンで、最新のChrome・Edge・Safari・Firefoxで動作します。3D表示にはWebGLが必要です。ブラウザからアプリとしてインストールし、独立したウィンドウで使うこともできます。',
      },
      {
        q: '正面のWebカメラでストレートネックが分かるのですか？',
        a: '正面のカメラでは横顔を直接見られないため、基準の姿勢と比べた顔や肩の大きさ・位置の変化から、頭が前に出た量を推定しています。最初に良い姿勢を記録してもらうのはそのためです。数値は変化に気づくための目安で、医療用の測定ではありません。',
      },
      {
        q: 'ほかのタブに切り替えても計測は続きますか？',
        a: '続きます。タブを開いたままならバックグラウンドで計測を続けます。ChromeとEdgeでは、ピクチャー イン ピクチャーで横からの姿勢を表示したまま、ほかのアプリで作業することもできます。',
      },
      {
        q: 'SitRightは医療機器ですか？',
        a: '医療機器ではなく、診断や治療は行いません。首や背中の痛み、しびれがある場合は、医師や理学療法士に相談してください。',
      },
    ],
    sourcesHeading: '出典',
    cta: '姿勢チェックをはじめる',
    homeLabel: 'ホーム',
  },
  ko: {
    title: 'SitRight 작동 방식: 웹캠으로 거북목·일자목·굽은 등 체크',
    description:
      '거북목(전방 머리 자세)이 무엇인지, 머리 각도에 따라 목 부담이 어떻게 달라지는지, SitRight가 브라우저 안에서 어떻게 측정하는지, 책상 환경 체크리스트와 자주 묻는 질문을 출처와 함께 정리했어요.',
    heading: 'SitRight가 웹캠으로 자세를 체크하는 방식',
    summary:
      'SitRight는 노트북이나 데스크톱 웹캠만으로 고개가 앞으로 나온 거리, 숙인 각도, 등이 굽은 정도를 내 바른 자세와 비교해 추정하는 무료 웹 앱이에요. 자세 추정은 브라우저 안에서 이루어지고 카메라 영상은 업로드되지 않아요. 잠깐 몸을 숙일 때는 알리지 않고, 나쁜 자세가 계속될 때만 알려 드려요.',
    updatedLabel: '최종 검토일',
    imageAlt:
      '노트북 앞에 앉은 사람을 옆에서 본 그림. 왼쪽은 귀가 어깨 바로 위에 있는 자세, 오른쪽은 머리가 앞으로 나오고 등이 굽은 자세',
    sections: [
      {
        heading: '거북목·일자목(전방 머리 자세)이란?',
        paragraphs: [
          '전방 머리 자세는 머리가 어깨 바로 위가 아니라 앞쪽에 있는 자세로, 화면을 들여다보느라 턱이 내려가는 경우가 많아요. 임상에서는 보통 두개척추각(craniovertebral angle)으로 측정해요. 7번 목뼈를 지나는 수평선과 그 지점에서 귀까지 그은 선이 이루는 각도로, 각도가 작을수록 머리가 앞으로 나와 있어요.',
          '연구 15건을 종합한 2019년 체계적 문헌고찰과 메타분석에서는, 목 통증이 있는 성인이 통증이 없는 성인보다 머리가 더 앞으로 나와 있었고, 머리가 앞으로 나올수록 통증 강도와 생활의 불편이 큰 경향(중간 정도의 상관)이 있었어요. 반면 청소년에게서는 뚜렷한 관련이 확인되지 않았어요.',
        ],
        sources: ['mahmoud'],
      },
      {
        heading: '머리 각도에 따라 목 부담은 어떻게 달라질까?',
        paragraphs: [
          '성인의 머리 무게는 약 4.5~5.4kg이에요. 목뼈의 역학 모델을 이용한 연구에서는 머리를 앞으로 숙일수록 목에 걸리는 부하가 커진다고 추정했어요.',
        ],
        items: [
          '0°(바로 선 자세): 약 4.5~5.4kg',
          '15°: 약 12kg',
          '30°: 약 18kg',
          '45°: 약 22kg',
          '60°: 약 27kg',
        ],
        quote: {
          text: 'Loss of the natural curve of the cervical spine leads to incrementally increased stresses about the cervical spine.',
          note: '목뼈의 자연스러운 곡선이 사라질수록 목뼈에 걸리는 스트레스가 단계적으로 커진다(논문의 결론)',
          source: 'hansraj',
        },
        sources: ['hansraj'],
      },
      {
        heading: 'SitRight의 측정 방법',
        paragraphs: [
          'SitRight는 Google의 MediaPipe Pose Landmarker와 Face Landmarker로 카메라 영상의 각 프레임에서 몸과 얼굴의 특징점을 브라우저 안에서 추정해요.',
          '먼저 몇 초 동안 바른 자세로 앉아 기준 자세를 기록해요. 그다음부터는 기준과의 차이로 고개가 몇 cm 앞으로 나왔는지, 몇 도 숙였는지, 등이 얼마나 굽었는지를 숫자와 옆에서 본 3D 화면으로 보여 줘요.',
          '알림은 나쁜 자세가 설정한 시간만큼 계속될 때만 울려요. 물건을 집거나 잠깐 아래를 볼 때는 울리지 않아요. 숫자는 정면 카메라로 추정한 값이며 의료용 측정이 아니에요.',
        ],
        sources: ['mediapipe'],
      },
      {
        heading: '책상 환경 체크리스트',
        paragraphs: [
          '측정은 자세가 무너진 것을 알아차리기 위한 거예요. 바른 자세를 유지하기 쉽게 하려면 책상 주변 조정과 규칙적인 휴식이 도움이 돼요.',
        ],
        items: [
          '모니터는 몸 정면에, 눈에서 50cm 이상 떨어뜨려 두기(미국 산업안전보건청 OSHA는 50~100cm를 권장 범위로 안내해요)',
          '화면 위쪽 끝을 눈높이 또는 약간 아래에 맞춰, 화면 중심이 시선보다 15~20° 정도 아래에 오게 하기',
          '노트북은 거치대로 화면을 올리고 별도의 키보드와 마우스 사용하기',
          '오래 앉아 있지 않기. WHO는 앉아 있는 시간을 줄이고 강도와 관계없이 몸을 움직이는 시간으로 바꾸기를 권해요',
          '미국안과학회가 권하는 「20-20-20 규칙」으로 눈 쉬기: 20분마다 약 6m(20피트) 이상 떨어진 곳을 20초 동안 보기',
        ],
        sources: ['osha', 'who', 'aao'],
      },
    ],
    faqHeading: '자주 묻는 질문',
    faq: [
      {
        q: '카메라 영상이 업로드되거나 녹화되나요?',
        a: '아니요. 자세 추정은 브라우저 안에서 이루어지고, 카메라 영상이나 골격 좌표를 녹화·저장·전송하지 않아요. 사이트의 보안 설정으로 외부 서버에 데이터를 보낼 수 없게 막아 두었어요. 전송되는 것은 사용 시간이나 오류 같은 개인을 식별하지 않는 진단 정보뿐이며, 받는 곳은 SitRight 자체 서버예요. 설정에서 끌 수 있어요.',
      },
      {
        q: '무료인가요? 회원 가입이 필요한가요?',
        a: '무료이고 회원 가입이나 설치가 필요 없어요. 페이지를 열고 카메라를 허용한 뒤 바른 자세를 한 번 기록하면 바로 쓸 수 있어요.',
      },
      {
        q: '어떤 기기와 브라우저에서 쓸 수 있나요?',
        a: '웹캠이 있는 컴퓨터의 최신 Chrome, Edge, Safari, Firefox에서 동작해요. 3D 화면에는 WebGL이 필요해요. 브라우저에서 앱으로 설치해 별도 창으로 쓸 수도 있어요.',
      },
      {
        q: '정면 웹캠으로 거북목을 알 수 있나요?',
        a: '정면 카메라로는 옆모습을 직접 볼 수 없어서, 기준 자세와 비교한 얼굴과 어깨의 크기·위치 변화로 머리가 앞으로 나온 정도를 추정해요. 처음에 바른 자세를 기록하는 이유예요. 숫자는 변화를 알아차리기 위한 참고값이며 의료용 측정이 아니에요.',
      },
      {
        q: '다른 탭으로 바꿔도 측정이 계속되나요?',
        a: '네. 탭을 열어 두면 백그라운드에서 측정을 계속해요. Chrome과 Edge에서는 PIP 모드로 옆에서 본 자세를 띄워 둔 채 다른 앱에서 작업할 수도 있어요.',
      },
      {
        q: 'SitRight는 의료기기인가요?',
        a: '아니요. 진단이나 치료를 하지 않아요. 목이나 등에 통증, 저림이 있으면 의사나 물리치료사와 상담하세요.',
      },
    ],
    sourcesHeading: '출처',
    cta: '자세 체크 시작하기',
    homeLabel: '홈',
  },
};
