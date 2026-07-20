const defaultProjects = [
  {
    id: "proj_1",
    title: "바다 고래를 구해줘! (유령그물 제거)",
    student: "김민재 (초등 5학년)",
    description: "바다에 떠다니는 유령그물과 플라스틱 병을 마우스로 클릭해 수거하는 게임입니다. 고래가 깨끗한 바다에서 살 수 있게 도와주세요!",
    category: "해양 쓰레기",
    likes: 48,
    views: 156,
    comments: [
      { id: "c1_1", author: "이서연", text: "고래가 웃는 모습이 너무 귀여워요! 시간 제한이 있어서 스릴 넘칩니다.", timestamp: "2026-07-18T14:30:00+09:00", likes: 12, anonymous: false },
      { id: "c1_2", author: "익명", text: "10개 겨우 채워서 해양 수호자 배지 받았어요! 꿀잼!", timestamp: "2026-07-19T09:15:00+09:00", likes: 4, anonymous: true }
    ],
    url: "projects/save-the-whale/index.html",
    thumbnail: "🐳",
    bgColor: "linear-gradient(135deg, #7EC8E3 0%, #2E8B57 100%)",
    approved: true,
    timestamp: "2026-07-15T10:00:00+09:00",
    todayRecommend: true
  },
  {
    id: "proj_2",
    title: "올바른 분리배출 마스터",
    student: "박준서 (중등 1학년)",
    description: "종이, 플라스틱, 캔, 음식물 쓰레기를 올바른 쓰레기통에 드래그 앤 드롭하여 매칭하는 교육용 퍼즐 게임입니다. 분리배출 요령을 배울 수 있습니다.",
    category: "재활용",
    likes: 38,
    views: 110,
    comments: [
      { id: "c2_1", author: "최우진", text: "사과껍질이 음식물인 거 가끔 헷갈렸는데 게임으로 다 맞췄어요!", timestamp: "2026-07-19T11:20:00+09:00", likes: 5, anonymous: false }
    ],
    url: "projects/recycle-sorting/index.html",
    thumbnail: "♻️",
    bgColor: "linear-gradient(135deg, #a8e6cf 0%, #56ab2f 100%)",
    approved: true,
    timestamp: "2026-07-16T12:00:00+09:00",
    todayRecommend: false
  },
  {
    id: "proj_3",
    title: "나의 일일 탄소 발자국 계산기",
    student: "정하은 (초등 6학년)",
    description: "일상에서 이용하는 교통수단, 먹는 음식, 대기전력 차단 습관을 선택하여 내가 하루에 배출하는 탄소량(CO2)을 측정하고 실천 팁을 제안합니다.",
    category: "탄소중립",
    likes: 54,
    views: 189,
    comments: [
      { id: "c3_1", author: "김동우", text: "저는 빨간색 황사 발자국 나왔네요 ㅜㅜ 오늘부터 안 쓰는 콘센트는 다 뽑아두겠습니다!", timestamp: "2026-07-17T16:45:00+09:00", likes: 9, anonymous: false }
    ],
    url: "projects/carbon-calculator/index.html",
    thumbnail: "👣",
    bgColor: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    approved: true,
    timestamp: "2026-07-14T09:30:00+09:00",
    todayRecommend: false
  },
  {
    id: "proj_4",
    title: "멸종위기 동물 수호대 도감",
    student: "이지훈 (중등 2학년)",
    description: "기후 변화와 지구 온난화로 설자리를 잃어가는 북극곰, 푸른바다거북, 자이언트판다, 토종꿀벌의 상태와 위협 요소를 직관적으로 보여주는 인터랙티브 도감입니다.",
    category: "멸종위기 동물",
    likes: 45,
    views: 142,
    comments: [
      { id: "c4_1", author: "안소희", text: "꿀벌이 사라지면 사과나 딸기도 못 먹게 된다는 사실에 놀랐어요. 정말 유익해요.", timestamp: "2026-07-19T20:10:00+09:00", likes: 7, anonymous: false }
    ],
    url: "projects/endangered-animals/index.html",
    thumbnail: "🐼",
    bgColor: "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)",
    approved: true,
    timestamp: "2026-07-18T10:15:00+09:00",
    todayRecommend: false
  },
  {
    id: "proj_5",
    title: "북극곰 빙하 지키기",
    student: "김태양 (초등 4학년)",
    description: "일회용 컵을 쓰지 않고 에코백을 쓸 때마다 얼음 조각이 생겨 북극곰을 빙하 위에 안전하게 살려두는 가상 시뮬레이터입니다.",
    category: "기후 변화",
    likes: 29,
    views: 88,
    comments: [
      { id: "c5_1", author: "익명", text: "환경 보호 아이디어가 매우 돋보여요!", timestamp: "2026-07-20T08:30:00+09:00", likes: 2, anonymous: true }
    ],
    url: "projects/save-the-whale/index.html", // Reusing the game as placeholder for layout demo
    thumbnail: "🐻‍❄️",
    bgColor: "linear-gradient(135deg, #1fa2ff 0%, #12d8fa 100%)",
    approved: true,
    timestamp: "2026-07-19T15:20:00+09:00",
    todayRecommend: false
  },
  {
    id: "proj_6",
    title: "에너지 도둑을 찾아라!",
    student: "최유나 (초등 6학년)",
    description: "집안 평면도에서 불필요하게 켜진 조명이나 플러그를 찾아 클릭해 대기전력을 차단하여 에너지를 절약하는 숨은 그림 찾기 게임입니다.",
    category: "숲 보호",
    likes: 21,
    views: 64,
    comments: [],
    url: "projects/carbon-calculator/index.html", // Reusing calculator as placeholder
    thumbnail: "🏠",
    bgColor: "linear-gradient(135deg, #ffe259 0%, #ffa751 100%)",
    approved: true,
    timestamp: "2026-07-19T18:40:00+09:00",
    todayRecommend: false
  }
];
