export type RoleId =
  | 'werewolf'
  | 'alpha_wolf'
  | 'white_wolf'
  | 'cursed_wolf'
  | 'seer'
  | 'aura_seer'
  | 'witch'
  | 'bodyguard'
  | 'hunter'
  | 'cupid'
  | 'elder'
  | 'little_girl'
  | 'mayor'
  | 'jester'
  | 'villager';

export type Faction = 'werewolves' | 'villagers' | 'lovers' | 'solo';

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'night'
  | 'day_announcement'
  | 'day_discussion'
  | 'day_voting'
  | 'day_trial'
  | 'hunter_revenge'
  | 'ended';

export const NIGHT_PHASE_DURATION_MS = 60_000; // 1 phút suy nghĩ & thực hiện chức năng đêm
export const DAY_DISCUSSION_DURATION_MS = 180_000; // 3 phút thảo luận & bỏ phiếu ban ngày
export const DAY_TRIAL_DURATION_MS = 30_000; // 30 giây biện minh trên giàn & vote Giết / Sống

export type HeadgearStyle =
  | 'witch_hat'
  | 'plague_mask'
  | 'hunter_tricorne'
  | 'noble_crown'
  | 'crimson_hood'
  | 'wolf_skull';

export interface CharacterAppearance {
  cloakColor: string;
  trimColor: string;
  headgear: HeadgearStyle;
  lanternColor: string;
  skinTone: string;
  epithet: string;
}

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  isAlive: boolean;
  role: RoleId;
  seatIndex: number;
  // 3D world position & rotation in Gothic Village
  x: number;
  z: number;
  rotY: number;
  appearance: CharacterAppearance;
  // Voice & status
  isMuted: boolean;
  isSpeaking: boolean;
  isReady: boolean;
  loverId: string | null;
  elderExtraLife?: boolean;
}

export interface RoleMetadata {
  id: RoleId;
  nameVi: string;
  titleLatin: string;
  romanNumeral: string;
  faction: 'werewolves' | 'villagers' | 'solo';
  accentColor: string;
  summary: string;
  nightPrompt: string;
  winCondition: string;
}

export function isWolfPackRole(role: RoleId): boolean {
  return role === 'werewolf' || role === 'alpha_wolf' || role === 'white_wolf';
}

export const ROLE_CATALOG: Record<RoleId, RoleMetadata> = {
  werewolf: {
    id: 'werewolf',
    nameVi: 'Ma Sói Huyết Nguyệt',
    titleLatin: 'Lycanthropus Sanguinis',
    romanNumeral: 'XV',
    faction: 'werewolves',
    accentColor: '#dc2626',
    summary: 'Thức tỉnh mỗi đêm dưới ánh trăng máu để cùng bầy đàn săn lùng và xé xác một dân làng.',
    nightPrompt: 'Chọn một con mồi để bầy Ma Sói kết liễu đêm nay.',
    winCondition: 'Chiến thắng khi số lượng Ma Sói bằng hoặc vượt quá số Dân Làng còn sống.',
  },
  alpha_wolf: {
    id: 'alpha_wolf',
    nameVi: 'Sói Đầu Đàn (Sói Nguyền)',
    titleLatin: 'Rex Luporum',
    romanNumeral: 'XVI',
    faction: 'werewolves',
    accentColor: '#b91c1c',
    summary: 'Thủ lĩnh bầy Sói. Có quyền năng Huyết Nguyền (1 lần/ván): biến nạn nhân bị cắn thành Ma Sói mới thay vì giết họ.',
    nightPrompt: 'Chọn con mồi cùng bầy Sói hoặc kích hoạt Huyết Nguyền để biến mục tiêu thành Ma Sói.',
    winCondition: 'Chiến thắng cùng bầy Ma Sói khi áp đảo hoàn toàn Dân Làng.',
  },
  white_wolf: {
    id: 'white_wolf',
    nameVi: 'Sói Trắng Độc Hành',
    titleLatin: 'Lupus Albus Solitarius',
    romanNumeral: 'XIII',
    faction: 'werewolves',
    accentColor: '#e2e8f0',
    summary: 'Thức dậy cùng bầy Sói, nhưng có thể âm thầm cắn chết cả đồng loại Ma Sói khác để độc chiếm ngôi làng.',
    nightPrompt: 'Săn mồi cùng bầy Sói hoặc chọn một Ma Sói khác để âm thầm trừ khử.',
    winCondition: 'Chiến thắng độc lập khi trở thành kẻ sống sót cuối cùng, hoặc thắng cùng bầy Sói.',
  },
  cursed_wolf: {
    id: 'cursed_wolf',
    nameVi: 'Bán Sói (Kẻ Bị Nguyền)',
    titleLatin: 'Sanguis Maledictus',
    romanNumeral: 'XVIII',
    faction: 'werewolves',
    accentColor: '#f97316',
    summary: 'Mang dòng máu nguyền rủa tiềm ẩn. Khởi đầu như Dân Làng, nhưng nếu bị Ma Sói cắn trong đêm sẽ hóa thành Ma Sói!',
    nightPrompt: 'Lắng nghe tiếng gọi hoang dã trong huyết quản qua màn đêm.',
    winCondition: 'Thắng cùng Dân Làng nếu chưa hóa Sói, hoặc thắng cùng Bầy Sói sau khi bị cắn.',
  },
  seer: {
    id: 'seer',
    nameVi: 'Nhà Tiên Tri Mù',
    titleLatin: 'Oraculum Noctis',
    romanNumeral: 'II',
    faction: 'villagers',
    accentColor: '#a855f7',
    summary: 'Nhìn thấu màn sương huyết nguyệt mỗi đêm để soi rõ bản chất thiện hay ác của một người.',
    nightPrompt: 'Chọn một kẻ khả nghi để soi thấu linh hồn của họ.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  aura_seer: {
    id: 'aura_seer',
    nameVi: 'Tiên Tri Hào Quang',
    titleLatin: 'Speculum Aurae',
    romanNumeral: 'XVII',
    faction: 'villagers',
    accentColor: '#c084fc',
    summary: 'Cảm nhận luồng sinh khí mỗi đêm để biết mục tiêu mang Chức Năng Đặc Biệt hay chỉ là Dân Thường.',
    nightPrompt: 'Chọn một người để cảm nhận hào quang ma thuật quanh họ.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  witch: {
    id: 'witch',
    nameVi: 'Phù Thủy Cổ Thuật',
    titleLatin: 'Malefica Herbarum',
    romanNumeral: 'I',
    faction: 'villagers',
    accentColor: '#10b981',
    summary: 'Nắm giữ bình Tiên Dược Cứu Mạng và bình Độc Dược Tử Thần. Mỗi bình chỉ dùng một lần duy nhất.',
    nightPrompt: 'Quyết định cứu nạn nhân đêm nay hoặc quăng bình độc dược vào kẻ tình nghi.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  bodyguard: {
    id: 'bodyguard',
    nameVi: 'Kỵ Sĩ Bảo Vệ',
    titleLatin: 'Custos Sacramenti',
    romanNumeral: 'VII',
    faction: 'villagers',
    accentColor: '#3b82f6',
    summary: 'Canh gác một ngôi nhà mỗi đêm khỏi nanh vuốt Ma Sói. Không thể bảo vệ cùng một người 2 đêm liên tiếp.',
    nightPrompt: 'Chọn một người để giương khiên thánh che chở đêm nay.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  hunter: {
    id: 'hunter',
    nameVi: 'Thợ Săn Bạc',
    titleLatin: 'Venator Argenti',
    romanNumeral: 'IX',
    faction: 'villagers',
    accentColor: '#f59e0b',
    summary: 'Mang theo khẩu súng đạn bạc. Khi ngã xuống, lập tức nổ súng kéo theo một kẻ khác xuống mồ.',
    nightPrompt: 'Đặt mục tiêu báo thù nếu bạn chẳng may bỏ mạng đêm nay.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  cupid: {
    id: 'cupid',
    nameVi: 'Thần Tình Ái',
    titleLatin: 'Amor Mortalis',
    romanNumeral: 'VI',
    faction: 'villagers',
    accentColor: '#ec4899',
    summary: 'Trong đêm đầu tiên, bắn mũi tên định mệnh gắn kết hai sinh mạng. Nếu một người chết, người kia sẽ chết theo.',
    nightPrompt: 'Chọn hai người trong làng để kết dây tơ hồng sinh tử.',
    winCondition: 'Chiến thắng cùng phe Dân Làng (hoặc bảo vệ Cặp Đôi định mệnh).',
  },
  elder: {
    id: 'elder',
    nameVi: 'Già Làng Cổ Thụ',
    titleLatin: 'Senex Antiquus',
    romanNumeral: 'IV',
    faction: 'villagers',
    accentColor: '#eab308',
    summary: 'Bậc trưởng lão thông thái sở hữu 2 mạng sống trước nanh vuốt Ma Sói nhờ cổ ấn hộ mệnh của tổ tiên.',
    nightPrompt: 'Cổ ấn hộ mệnh đang bảo vệ bạn trước nhát cắn đầu tiên của Ma Sói.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  little_girl: {
    id: 'little_girl',
    nameVi: 'Cô Bé Lén Nhìn',
    titleLatin: 'Puella Umbrarum',
    romanNumeral: 'XIX',
    faction: 'villagers',
    accentColor: '#38bdf8',
    summary: 'Hé cửa sổ rình xem động tĩnh trong đêm để thu thập manh mối về những kẻ khả nghi thuộc bầy Ma Sói.',
    nightPrompt: 'Hé cửa sổ rình xem bóng dáng bầy Ma Sói trong màn sương đêm nay.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  mayor: {
    id: 'mayor',
    nameVi: 'Thị Trưởng Danh Giá',
    titleLatin: 'Magistratus Urbis',
    romanNumeral: 'XI',
    faction: 'villagers',
    accentColor: '#fbbf24',
    summary: 'Người đứng đầu hội đồng thôn. Lá phiếu phán xét của Thị Trưởng tại phiên tòa ban ngày được tính gấp đôi (2 phiếu)!',
    nightPrompt: 'Suy ngẫm về các chứng cứ để dẫn dắt phiên tòa ban ngày với lá phiếu nhân đôi.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
  jester: {
    id: 'jester',
    nameVi: 'Thằng Ngố (Kẻ Chán Đời)',
    titleLatin: 'Morio Patibuli',
    romanNumeral: 'XXII',
    faction: 'solo',
    accentColor: '#f43f5e',
    summary: 'Kẻ điên loạn thuộc Phe Độc Lập. Thắng ngay lập tức nếu đánh lừa được cả làng bỏ phiếu treo cổ chính mình vào ban ngày!',
    nightPrompt: 'Lên kế hoạch diễn kịch khả nghi để dụ dân làng treo cổ bạn vào sáng mai.',
    winCondition: 'Chiến thắng độc lập ngay khi bị Dân Làng bỏ phiếu treo cổ vào ban ngày.',
  },
  villager: {
    id: 'villager',
    nameVi: 'Dân Làng Cổ Thôn',
    titleLatin: 'Civis Umbrarum',
    romanNumeral: '0',
    faction: 'villagers',
    accentColor: '#94a3b8',
    summary: 'Không có phép thuật ban đêm, nhưng sở hữu lá phiếu phán xét trên giá treo cổ và đôi tai nhạy bén.',
    nightPrompt: 'Cầu nguyện qua đêm dài và lắng nghe tiếng động khả nghi quanh thôn.',
    winCondition: 'Chiến thắng khi toàn bộ Ma Sói bị thanh trừng khỏi ngôi làng.',
  },
};

export const APPEARANCE_PRESETS: CharacterAppearance[] = [
  {
    cloakColor: '#5c141b',
    trimColor: '#d4af37',
    headgear: 'crimson_hood',
    lanternColor: '#f59e0b',
    skinTone: '#d6c3b3',
    epithet: 'Kẻ Gác Đêm',
  },
  {
    cloakColor: '#1e1b2e',
    trimColor: '#a855f7',
    headgear: 'witch_hat',
    lanternColor: '#c084fc',
    skinTone: '#dfd3c3',
    epithet: 'Nhà Chiêm Tinh',
  },
  {
    cloakColor: '#14261c',
    trimColor: '#10b981',
    headgear: 'plague_mask',
    lanternColor: '#34d399',
    skinTone: '#c7b8a8',
    epithet: 'Y Sĩ Dịch Hạch',
  },
  {
    cloakColor: '#2b2118',
    trimColor: '#f59e0b',
    headgear: 'hunter_tricorne',
    lanternColor: '#fbbf24',
    skinTone: '#c9a98d',
    epithet: 'Thợ Săn Cổ Thụ',
  },
  {
    cloakColor: '#1a2436',
    trimColor: '#60a5fa',
    headgear: 'noble_crown',
    lanternColor: '#38bdf8',
    skinTone: '#e2d4c8',
    epithet: 'Lãnh Chúa Sương Mù',
  },
  {
    cloakColor: '#281822',
    trimColor: '#f43f5e',
    headgear: 'wolf_skull',
    lanternColor: '#ef4444',
    skinTone: '#bda898',
    epithet: 'Kẻ Hành Hương',
  },
];

export const MIN_ROOM_PLAYERS = 5;
export const MAX_ROOM_PLAYERS = 15;

export function clampRoomPlayerCount(count: number): number {
  if (!Number.isFinite(count)) return 8;
  return Math.max(MIN_ROOM_PLAYERS, Math.min(MAX_ROOM_PLAYERS, Math.round(count)));
}

export const BOT_NAMES = [
  'Bá Tước Alistair',
  'Phu Nhân Carmilla',
  'Cha Xứ Solomon',
  'Thợ Rèn Gideon',
  'Tiểu Thư Lenore',
  'Y Sĩ Corvus',
  'Kẻ Đào Mộ Silas',
  'Bà Đồng Vespera',
  'Thuyền Trưởng Thorne',
  'Hầu Tước Malakor',
  'Nữ Tu Beatrice',
  'Nhạc Sĩ Orpheus',
  'Quản Gia Sebastian',
  'Thợ Săn Viktor',
  'Chiêm Tinh Gia Lyra',
];

export interface RoleDeckConfig {
  werewolf: number;
  alpha_wolf?: number;
  white_wolf?: number;
  cursed_wolf?: number;
  seer: number;
  aura_seer?: number;
  witch: number;
  bodyguard: number;
  hunter: number;
  cupid: number;
  elder?: number;
  little_girl?: number;
  mayor?: number;
  jester?: number;
}

export const DEFAULT_ROLE_DECK: RoleDeckConfig = {
  werewolf: 2,
  alpha_wolf: 0,
  white_wolf: 0,
  cursed_wolf: 0,
  seer: 1,
  aura_seer: 0,
  witch: 1,
  bodyguard: 1,
  hunter: 1,
  cupid: 1,
  elder: 0,
  little_girl: 0,
  mayor: 0,
  jester: 0,
};

/**
 * Returns a balanced recommended RoleDeckConfig tailored to the current room player count (5..15 players).
 */
export function getRecommendedRoleDeckForCount(playerCount: number): RoleDeckConfig {
  const n = clampRoomPlayerCount(playerCount);
  if (n <= 5) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 0,
      hunter: 0,
      cupid: 0,
    };
  }
  if (n === 6) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 0,
      cupid: 0,
    };
  }
  if (n === 7) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 0,
    };
  }
  if (n === 8) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
    };
  }
  if (n === 9) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      alpha_wolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
    };
  }
  if (n === 10) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      alpha_wolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
      jester: 1,
    };
  }
  if (n === 11) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      alpha_wolf: 1,
      cursed_wolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
      jester: 1,
    };
  }
  if (n === 12) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      alpha_wolf: 1,
      white_wolf: 1,
      cursed_wolf: 1,
      seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
      jester: 1,
    };
  }
  if (n === 13) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 2,
      alpha_wolf: 1,
      white_wolf: 1,
      cursed_wolf: 1,
      seer: 1,
      aura_seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
      mayor: 1,
      jester: 1,
    };
  }
  if (n === 14) {
    return {
      ...DEFAULT_ROLE_DECK,
      werewolf: 3,
      alpha_wolf: 1,
      white_wolf: 1,
      cursed_wolf: 1,
      seer: 1,
      aura_seer: 1,
      bodyguard: 1,
      witch: 1,
      hunter: 1,
      cupid: 1,
      elder: 1,
      mayor: 1,
      jester: 1,
    };
  }
  return {
    ...DEFAULT_ROLE_DECK,
    werewolf: 3,
    alpha_wolf: 1,
    white_wolf: 1,
    cursed_wolf: 1,
    seer: 1,
    aura_seer: 1,
    bodyguard: 1,
    witch: 1,
    hunter: 1,
    cupid: 1,
    elder: 1,
    little_girl: 1,
    mayor: 1,
    jester: 1,
  };
}

/**
 * Returns a "Full All-Star Roles" deck preset so players can experience the new advanced roles immediately.
 */
export function getFullVarietyRoleDeckForCount(playerCount: number): RoleDeckConfig {
  const n = clampRoomPlayerCount(playerCount);
  return clampRoleDeckToPlayerCount(
    {
      werewolf: n >= 14 ? 2 : 1,
      alpha_wolf: 1,
      white_wolf: n >= 9 ? 1 : 0,
      cursed_wolf: n >= 8 ? 1 : 0,
      seer: 1,
      aura_seer: n >= 10 ? 1 : 0,
      witch: 1,
      bodyguard: 1,
      hunter: 1,
      cupid: n >= 8 ? 1 : 0,
      elder: 1,
      little_girl: n >= 9 ? 1 : 0,
      mayor: 1,
      jester: 1,
    },
    n
  ).deck;
}

export type SocialInteractionType = 'friend' | 'heart' | 'stone';

export interface LobbyStartValidation {
  canStart: boolean;
  hasEnoughPlayers: boolean;
  allPlayersReady: boolean;
  currentCount: number;
  requiredCount: number;
  readyCount: number;
  reasonVi: string;
}

/**
 * Validates whether the Host can start the match in Lobby:
 * 1. The room must have reached its configured maxPlayers capacity (>= MIN_ROOM_PLAYERS).
 * 2. All non-host players in the room must have pressed Ready (`isReady === true`).
 */
export function validateLobbyStart(
  players: PlayerState[],
  maxPlayers: number
): LobbyStartValidation {
  const requiredCount = clampRoomPlayerCount(maxPlayers);
  const currentCount = players.length;
  const hasEnoughPlayers = currentCount >= requiredCount && currentCount >= MIN_ROOM_PLAYERS;
  const readyCount = players.filter((p) => p.isHost || p.isReady).length;
  const allPlayersReady = currentCount > 0 && readyCount === currentCount;
  const canStart = hasEnoughPlayers && allPlayersReady;

  let reasonVi = 'Sẵn sàng';
  if (!hasEnoughPlayers) {
    reasonVi = `Chưa đủ người (${currentCount}/${requiredCount})`;
  } else if (!allPlayersReady) {
    reasonVi = `Chờ sẵn sàng (${readyCount}/${currentCount})`;
  }

  return {
    canStart,
    hasEnoughPlayers,
    allPlayersReady,
    currentCount,
    requiredCount,
    readyCount,
    reasonVi,
  };
}


/**
 * Clamps a RoleDeckConfig so that total assigned roles never exceed playerCount,
 * and returns the exact villagerCount and specialCount breakdown.
 */
export function clampRoleDeckToPlayerCount(
  config: RoleDeckConfig,
  playerCount: number
): {
  deck: Required<RoleDeckConfig>;
  werewolfCount: number;
  specialCount: number;
  soloCount: number;
  villagerCount: number;
  totalAllocated: number;
} {
  const totalSlots = Math.max(4, Math.min(MAX_ROOM_PLAYERS, playerCount));
  let remaining = totalSlots;

  const maxWolves = Math.max(1, Math.floor((totalSlots - 1) / 2));

  // Ensure at least 1 wolf-pack member exists
  const reqAlpha = Math.max(0, Math.min(1, config.alpha_wolf ?? 0));
  const reqWhite = Math.max(0, Math.min(1, config.white_wolf ?? 0));
  const reqBaseWolf = Math.max(
    reqAlpha + reqWhite === 0 ? 1 : 0,
    config.werewolf ?? 1
  );

  let wolfBudget = Math.min(maxWolves, remaining);
  const alpha_wolf = Math.min(reqAlpha, wolfBudget);
  wolfBudget -= alpha_wolf;
  const white_wolf = Math.min(reqWhite, wolfBudget);
  wolfBudget -= white_wolf;
  const werewolf = Math.max(
    alpha_wolf + white_wolf === 0 ? 1 : 0,
    Math.min(reqBaseWolf, wolfBudget)
  );
  remaining -= werewolf + alpha_wolf + white_wolf;

  const clampSlot = (requested: number | undefined, maxAllowed: number) => {
    const val = Math.max(0, Math.min(maxAllowed, requested ?? 0, remaining));
    remaining -= val;
    return val;
  };

  const cursed_wolf = clampSlot(config.cursed_wolf, 1);
  const seer = clampSlot(config.seer, 2);
  const aura_seer = clampSlot(config.aura_seer, 1);
  const bodyguard = clampSlot(config.bodyguard, 2);
  const witch = clampSlot(config.witch, 2);
  const hunter = clampSlot(config.hunter, 2);
  const cupid = clampSlot(config.cupid, 1);
  const elder = clampSlot(config.elder, 1);
  const little_girl = clampSlot(config.little_girl, 1);
  const mayor = clampSlot(config.mayor, 1);
  const jester = clampSlot(config.jester, 1);

  const werewolfCount = werewolf + alpha_wolf + white_wolf;
  const specialCount =
    cursed_wolf +
    seer +
    aura_seer +
    bodyguard +
    witch +
    hunter +
    cupid +
    elder +
    little_girl +
    mayor;
  const soloCount = jester;
  const totalAllocated = werewolfCount + specialCount + soloCount;
  const villagerCount = Math.max(0, totalSlots - totalAllocated);

  return {
    deck: {
      werewolf,
      alpha_wolf,
      white_wolf,
      cursed_wolf,
      seer,
      aura_seer,
      witch,
      bodyguard,
      hunter,
      cupid,
      elder,
      little_girl,
      mayor,
      jester,
    },
    werewolfCount,
    specialCount: specialCount + soloCount,
    soloCount,
    villagerCount,
    totalAllocated,
  };
}

/**
 * Deterministic role builder and Fisher-Yates shuffle for a given player count.
 */
export function buildRoleDeck(
  playerCount: number,
  config: RoleDeckConfig = DEFAULT_ROLE_DECK
): RoleId[] {
  const { deck, villagerCount } = clampRoleDeckToPlayerCount(config, playerCount);
  const roles: RoleId[] = [];

  const orderedRoles: Array<[RoleId, number]> = [
    ['werewolf', deck.werewolf],
    ['alpha_wolf', deck.alpha_wolf],
    ['white_wolf', deck.white_wolf],
    ['cursed_wolf', deck.cursed_wolf],
    ['seer', deck.seer],
    ['aura_seer', deck.aura_seer],
    ['bodyguard', deck.bodyguard],
    ['witch', deck.witch],
    ['hunter', deck.hunter],
    ['cupid', deck.cupid],
    ['elder', deck.elder],
    ['little_girl', deck.little_girl],
    ['mayor', deck.mayor],
    ['jester', deck.jester],
  ];

  for (const [roleId, count] of orderedRoles) {
    for (let i = 0; i < count; i++) {
      roles.push(roleId);
    }
  }

  for (let i = 0; i < villagerCount; i++) {
    roles.push('villager');
  }

  return roles;
}

export function shuffleRoles(roles: RoleId[], rng: () => number = Math.random): RoleId[] {
  const copy = [...roles];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Computes circular seating around the central Gothic Bonfire (scales radius gently for 11..15 players).
 */
export function getSeatTransform(
  seatIndex: number,
  totalSeats: number,
  radius = 8.2
): { x: number; z: number; rotY: number } {
  const count = Math.max(1, totalSeats);
  const effectiveRadius = count > 10 ? radius + (count - 10) * 0.22 : radius;
  const angle = Math.PI * 0.5 + (seatIndex / count) * Math.PI * 2;
  const x = Math.cos(angle) * effectiveRadius;
  const z = Math.sin(angle) * effectiveRadius;
  // Face inward toward the central bonfire (0, 0)
  const rotY = Math.atan2(-x, -z);
  return { x, z, rotY };
}

/**
 * Validates Bodyguard target rule: cannot protect the same player two nights in a row.
 */
export function canBodyguardProtect(
  lastProtectedId: string | null,
  targetId: string
): boolean {
  if (!targetId) return false;
  return lastProtectedId !== targetId;
}

export interface NightActionsInput {
  wolfVotes: Record<string, string>; // wolfId -> victimId
  alphaConvertUsed?: boolean; // Alpha Wolf chooses to infect victim instead of killing
  whiteWolfTargetId?: string | null; // White Wolf solo kill on another wolf
  bodyguardTargetId: string | null;
  seerTargetId: string | null;
  auraSeerTargetId?: string | null;
  witchSaveUsed: boolean;
  witchPoisonTargetId: string | null;
  hunterRevengeTargetId: string | null;
  cupidLovers: [string, string] | null;
  actedPlayerIds?: string[]; // Explicitly tracks players who have completed or skipped their night action
}

export interface WitchPotionState {
  hasHealPotion: boolean;
  hasPoisonPotion: boolean;
  hasAlphaConvert?: boolean;
}

/**
 * Determines whether a given role has an active decision to make on the current night.
 */
export function doesRoleHaveNightAction(
  role: RoleId,
  dayNumber: number,
  witchState: WitchPotionState,
  hasLovers: boolean
): boolean {
  if (isWolfPackRole(role)) return true;
  if (role === 'seer' || role === 'aura_seer' || role === 'bodyguard' || role === 'hunter' || role === 'little_girl') {
    return true;
  }
  if (role === 'cupid') {
    return dayNumber === 1 && !hasLovers;
  }
  if (role === 'witch') {
    return Boolean(witchState.hasHealPotion || witchState.hasPoisonPotion);
  }
  return false;
}

/**
 * Computes how many alive players with night abilities have completed their action this night.
 * When all required night roles have acted, the village can immediately skip or auto-advance to day.
 */
export function computeNightActionProgress(
  players: PlayerState[],
  input: NightActionsInput,
  dayNumber: number,
  witchState: WitchPotionState,
  hasLovers: boolean
): { completedCount: number; requiredCount: number; allCompleted: boolean } {
  const actedSet = new Set(input.actedPlayerIds ?? []);
  let requiredCount = 0;
  let completedCount = 0;

  for (const p of players) {
    if (!p.isAlive) continue;
    if (!doesRoleHaveNightAction(p.role, dayNumber, witchState, hasLovers)) continue;
    requiredCount += 1;

    let done = actedSet.has(p.id);
    if (!done) {
      if (isWolfPackRole(p.role)) {
        done = Boolean(input.wolfVotes[p.id] || (p.role === 'white_wolf' && input.whiteWolfTargetId));
      } else if (p.role === 'seer') {
        done = Boolean(input.seerTargetId);
      } else if (p.role === 'aura_seer') {
        done = Boolean(input.auraSeerTargetId);
      } else if (p.role === 'bodyguard') {
        done = Boolean(input.bodyguardTargetId);
      } else if (p.role === 'hunter') {
        done = Boolean(input.hunterRevengeTargetId);
      } else if (p.role === 'cupid') {
        done = Boolean(input.cupidLovers);
      } else if (p.role === 'witch') {
        done = Boolean(input.witchSaveUsed || input.witchPoisonTargetId);
      }
    }

    if (done) {
      completedCount += 1;
    }
  }

  return {
    completedCount,
    requiredCount,
    allCompleted: requiredCount === 0 || completedCount >= requiredCount,
  };
}

export interface NightResolutionResult {
  wolfTargetId: string | null;
  savedByBodyguard: boolean;
  savedByWitch: boolean;
  savedByElderShield?: boolean;
  convertedWolfId?: string | null;
  poisonedId: string | null;
  deadPlayerIds: string[];
  loverHeartbreakIds: string[];
  hunterTriggeredIds: string[];
  seerInspection: { targetId: string; isWerewolf: boolean; role: RoleId } | null;
  nextWitchState: WitchPotionState;
  updatedLovers: [string, string] | null;
  logs: string[];
}

/**
 * Resolves all night actions in canonical Gothic Werewolf order:
 * 1. Cupid links Lovers (Night 1)
 * 2. Bodyguard protects a target
 * 3. Werewolves (including Alpha Wolf & White Wolf) vote for a victim
 * 4. Seer / Aura Seer inspects a target
 * 5. Cursed Wolf / Alpha Wolf infection OR Elder 2-life shield OR Witch Heal & Poison
 * 6. White Wolf solo kill on another wolf
 * 7. Lover heartbreak chain & Hunter trigger check
 */
export function resolveNightActions(
  players: PlayerState[],
  input: NightActionsInput,
  witchState: WitchPotionState,
  currentLovers: [string, string] | null,
  lastProtectedId: string | null
): NightResolutionResult {
  const logs: string[] = [];
  const aliveSet = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const byId = new Map(players.map((p) => [p.id, p]));

  // 1. Cupid Lovers
  let updatedLovers = currentLovers;
  if (
    !updatedLovers &&
    input.cupidLovers &&
    input.cupidLovers[0] !== input.cupidLovers[1] &&
    aliveSet.has(input.cupidLovers[0]) &&
    aliveSet.has(input.cupidLovers[1])
  ) {
    updatedLovers = [input.cupidLovers[0], input.cupidLovers[1]];
    const p1 = byId.get(updatedLovers[0])?.name ?? 'Người chơi 1';
    const p2 = byId.get(updatedLovers[1])?.name ?? 'Người chơi 2';
    logs.push(`Mũi tên của Thần Tình Ái đã gắn kết định mệnh giữa ${p1} và ${p2}.`);
  }

  // 2. Bodyguard protection
  const validProtectedId =
    input.bodyguardTargetId &&
    aliveSet.has(input.bodyguardTargetId) &&
    canBodyguardProtect(lastProtectedId, input.bodyguardTargetId)
      ? input.bodyguardTargetId
      : null;

  // 3. Tally Werewolf pack target
  const tally = new Map<string, number>();
  for (const [wolfId, targetId] of Object.entries(input.wolfVotes)) {
    const wolf = byId.get(wolfId);
    if (wolf && wolf.isAlive && isWolfPackRole(wolf.role) && aliveSet.has(targetId)) {
      tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
    }
  }

  let wolfTargetId: string | null = null;
  let maxVotes = 0;
  for (const [targetId, count] of tally.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      wolfTargetId = targetId;
    }
  }

  // 4. Seer / Aura Seer inspection
  let seerInspection: { targetId: string; isWerewolf: boolean; role: RoleId } | null = null;
  const inspectId = input.seerTargetId || input.auraSeerTargetId || null;
  if (inspectId && byId.has(inspectId)) {
    const target = byId.get(inspectId)!;
    seerInspection = {
      targetId: target.id,
      isWerewolf: isWolfPackRole(target.role),
      role: target.role,
    };
  }

  // 5. Evaluate Bodyguard, Cursed Wolf, Alpha Wolf Convert, Elder Shield & Witch
  const savedByBodyguard = Boolean(wolfTargetId && wolfTargetId === validProtectedId);
  const nextWitchState: WitchPotionState = { ...witchState };
  let savedByWitch = false;
  let savedByElderShield = false;
  let convertedWolfId: string | null = null;

  const victimObj = wolfTargetId ? byId.get(wolfTargetId) : undefined;

  if (wolfTargetId && !savedByBodyguard && victimObj) {
    if (victimObj.role === 'cursed_wolf') {
      convertedWolfId = victimObj.id;
      logs.push(
        `Một tiếng gầm trầm đục vang lên trong bóng tối — Bán Sói ${victimObj.name} đã bị cắn và thức tỉnh dòng máu Ma Sói!`
      );
    } else if (
      input.alphaConvertUsed &&
      nextWitchState.hasAlphaConvert !== false &&
      players.some((p) => p.isAlive && p.role === 'alpha_wolf')
    ) {
      convertedWolfId = victimObj.id;
      nextWitchState.hasAlphaConvert = false;
      logs.push(
        `Sói Đầu Đàn đã khắc Huyết Nguyền lên ${victimObj.name}, biến họ thành thành viên mới của Bầy Ma Sói!`
      );
    } else if (victimObj.role === 'elder' && victimObj.elderExtraLife !== false) {
      savedByElderShield = true;
      logs.push(
        `Cổ ấn hộ mệnh của Già Làng ${victimObj.name} đã vỡ vụn để chặn đứng nhát cắn đầu tiên của Ma Sói!`
      );
    } else if (input.witchSaveUsed && nextWitchState.hasHealPotion) {
      savedByWitch = true;
      nextWitchState.hasHealPotion = false;
    }
  }

  let poisonedId: string | null = null;
  if (
    input.witchPoisonTargetId &&
    aliveSet.has(input.witchPoisonTargetId) &&
    nextWitchState.hasPoisonPotion
  ) {
    poisonedId = input.witchPoisonTargetId;
    nextWitchState.hasPoisonPotion = false;
  }

  const deadSet = new Set<string>();
  if (
    wolfTargetId &&
    !savedByBodyguard &&
    !savedByWitch &&
    !savedByElderShield &&
    !convertedWolfId
  ) {
    deadSet.add(wolfTargetId);
  }
  if (poisonedId) {
    deadSet.add(poisonedId);
  }

  // White Wolf solo betrayal kill on a fellow wolf
  if (input.whiteWolfTargetId && aliveSet.has(input.whiteWolfTargetId)) {
    const wwVictim = byId.get(input.whiteWolfTargetId);
    if (wwVictim && isWolfPackRole(wwVictim.role) && wwVictim.role !== 'white_wolf') {
      deadSet.add(wwVictim.id);
      logs.push(
        `Dưới ánh trăng trắng lạnh lẽo, Sói Trắng Độc Hành đã âm thầm xé xác đồng loại ${wwVictim.name}!`
      );
    }
  }

  // 6. Lover heartbreak chain
  const loverHeartbreakIds: string[] = [];
  if (updatedLovers) {
    const [l1, l2] = updatedLovers;
    if (deadSet.has(l1) && !deadSet.has(l2) && aliveSet.has(l2)) {
      deadSet.add(l2);
      loverHeartbreakIds.push(l2);
    } else if (deadSet.has(l2) && !deadSet.has(l1) && aliveSet.has(l1)) {
      deadSet.add(l1);
      loverHeartbreakIds.push(l1);
    }
  }

  // 7. Hunter revenge check
  const hunterTriggeredIds: string[] = [];
  for (const deadId of Array.from(deadSet)) {
    const p = byId.get(deadId);
    if (p && p.role === 'hunter') {
      hunterTriggeredIds.push(deadId);
      if (
        input.hunterRevengeTargetId &&
        aliveSet.has(input.hunterRevengeTargetId) &&
        !deadSet.has(input.hunterRevengeTargetId)
      ) {
        deadSet.add(input.hunterRevengeTargetId);
        const revengeVictim = byId.get(input.hunterRevengeTargetId);
        logs.push(
          `Trước lúc gục ngã, Thợ Săn ${p.name} đã bóp cò bắn hạ ${revengeVictim?.name ?? 'mục tiêu'}!`
        );
      }
    }
  }

  // Second pass on Lovers in case Hunter shot a Lover
  if (updatedLovers) {
    const [l1, l2] = updatedLovers;
    if (deadSet.has(l1) && !deadSet.has(l2) && aliveSet.has(l2)) {
      deadSet.add(l2);
      loverHeartbreakIds.push(l2);
    } else if (deadSet.has(l2) && !deadSet.has(l1) && aliveSet.has(l1)) {
      deadSet.add(l1);
      loverHeartbreakIds.push(l1);
    }
  }

  const deadPlayerIds = Array.from(deadSet);
  if (deadPlayerIds.length === 0) {
    if (savedByBodyguard) {
      logs.push('Đêm qua bình yên kỳ lạ — khiên thánh của Kỵ Sĩ Bảo Vệ đã chặn đứng đòn tấn công của Ma Sói!');
    } else if (savedByWitch) {
      logs.push('Đêm qua không ai thiệt mạng — bình Tiên Dược của Phù Thủy đã kéo một linh hồn về từ cõi chết.');
    } else if (savedByElderShield || convertedWolfId) {
      logs.push('Bình minh ló dạng trên Huyết Nguyệt Thôn. Không có thi thể nào được tìm thấy sáng nay.');
    } else {
      logs.push('Bình minh ló dạng trên Huyết Nguyệt Thôn. Đêm qua không một ai bỏ mạng.');
    }
  } else {
    const names = deadPlayerIds
      .map((id) => {
        const p = byId.get(id);
        return p ? `${p.name} (${ROLE_CATALOG[p.role].nameVi})` : id;
      })
      .join(', ');
    logs.push(`Tiếng chuông nhà thờ ngân vang báo tử: ${names} đã thiệt mạng trong đêm!`);
  }

  for (const hbId of loverHeartbreakIds) {
    const hbPlayer = byId.get(hbId);
    if (hbPlayer) {
      logs.push(`Vì nỗi đau mất đi người tình định mệnh, ${hbPlayer.name} đã tự vẫn theo.`);
    }
  }

  return {
    wolfTargetId,
    savedByBodyguard,
    savedByWitch,
    savedByElderShield,
    convertedWolfId,
    poisonedId,
    deadPlayerIds,
    loverHeartbreakIds,
    hunterTriggeredIds,
    seerInspection,
    nextWitchState,
    updatedLovers,
    logs,
  };
}

export interface DayVoteResolution {
  executedId: string | null;
  isTie: boolean;
  jesterWon?: boolean;
  voteCounts: Record<string, number>;
  deadPlayerIds: string[];
  loverHeartbreakIds: string[];
  hunterTriggeredId: string | null;
  logs: string[];
}

/**
 * Tallies day execution votes. Requires a strict plurality (no execution on tie).
 * Mayor ('mayor') vote counts as 2 votes!
 * If Jester ('jester') is executed, Jester immediately wins!
 */
export function resolveDayVote(
  players: PlayerState[],
  votes: Record<string, string>, // voterId -> targetId ('skip' allowed)
  currentLovers: [string, string] | null
): DayVoteResolution {
  const aliveSet = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const voteCounts: Record<string, number> = {};

  for (const [voterId, targetId] of Object.entries(votes)) {
    if (!aliveSet.has(voterId)) continue;
    const voter = byId.get(voterId);
    const weight = voter?.role === 'mayor' ? 2 : 1;
    if (targetId === 'skip' || aliveSet.has(targetId)) {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + weight;
    }
  }

  let topTarget: string | null = null;
  let topCount = 0;
  let isTie = false;

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > topCount) {
      topCount = count;
      topTarget = targetId;
      isTie = false;
    } else if (count === topCount && count > 0) {
      isTie = true;
    }
  }

  const logs: string[] = [];
  if (!topTarget || topTarget === 'skip' || isTie || topCount === 0) {
    logs.push('Hội đồng thôn bất đồng ý kiến (hòa phiếu hoặc bỏ qua). Không ai bị đưa lên giá treo cổ hôm nay.');
    return {
      executedId: null,
      isTie,
      jesterWon: false,
      voteCounts,
      deadPlayerIds: [],
      loverHeartbreakIds: [],
      hunterTriggeredId: null,
      logs,
    };
  }

  const executedPlayer = byId.get(topTarget)!;
  const deadSet = new Set<string>([topTarget]);
  const loverHeartbreakIds: string[] = [];
  const jesterWon = executedPlayer.role === 'jester';

  logs.push(
    `Với ${topCount} phiếu thuận, ${executedPlayer.name} bị đưa lên giá treo cổ! Danh tính thật: ${ROLE_CATALOG[executedPlayer.role].nameVi}.`
  );

  if (jesterWon) {
    logs.push(
      `Thằng Ngố ${executedPlayer.name} bật cười ngạo nghễ trên giá treo cổ! Cả ngôi làng đã sập bẫy của Kẻ Chán Đời!`
    );
  }

  if (currentLovers) {
    const [l1, l2] = currentLovers;
    if (topTarget === l1 && aliveSet.has(l2)) {
      deadSet.add(l2);
      loverHeartbreakIds.push(l2);
      const p2 = byId.get(l2);
      if (p2) logs.push(`Chứng kiến người tình tắt thở, ${p2.name} cũng gục ngã vì tuyệt vọng.`);
    } else if (topTarget === l2 && aliveSet.has(l1)) {
      deadSet.add(l1);
      loverHeartbreakIds.push(l1);
      const p1 = byId.get(l1);
      if (p1) logs.push(`Chứng kiến người tình tắt thở, ${p1.name} cũng gục ngã vì tuyệt vọng.`);
    }
  }

  const hunterTriggeredId = executedPlayer.role === 'hunter' ? executedPlayer.id : null;

  return {
    executedId: topTarget,
    isTie: false,
    jesterWon,
    voteCounts,
    deadPlayerIds: Array.from(deadSet),
    loverHeartbreakIds,
    hunterTriggeredId,
    logs,
  };
}

export interface DayTrialNomination {
  accusedId: string | null;
  voteCount: number;
  isTie: boolean;
  skipped: boolean;
  voteCounts: Record<string, number>;
  logs: string[];
}

/**
 * Evaluates Day Discussion votes (180s phase) to determine if a player is put on the gallows
 * for a 30-second defense trial ('day_trial'), or if the village skips / ties.
 */
export function selectDayTrialNominee(
  players: PlayerState[],
  votes: Record<string, string>
): DayTrialNomination {
  const aliveSet = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const voteCounts: Record<string, number> = {};

  for (const [voterId, targetId] of Object.entries(votes)) {
    if (!aliveSet.has(voterId)) continue;
    const voter = byId.get(voterId);
    const weight = voter?.role === 'mayor' ? 2 : 1;
    if (targetId === 'skip' || aliveSet.has(targetId)) {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + weight;
    }
  }

  let topTarget: string | null = null;
  let topCount = 0;
  let isTie = false;

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > topCount) {
      topCount = count;
      topTarget = targetId;
      isTie = false;
    } else if (count === topCount && count > 0) {
      isTie = true;
    }
  }

  if (!topTarget || topTarget === 'skip' || isTie || topCount === 0) {
    return {
      accusedId: null,
      voteCount: topCount,
      isTie,
      skipped: topTarget === 'skip' || topCount === 0,
      voteCounts,
      logs: [
        topTarget === 'skip'
          ? 'Đa số dân làng bỏ phiếu trắng (Skip). Không ai bị đưa lên giàn treo cổ hôm nay.'
          : 'Phiên thảo luận hòa phiếu hoặc chưa đủ phiếu. Không ai bị đưa lên giàn treo cổ hôm nay.',
      ],
    };
  }

  const accused = byId.get(topTarget)!;
  return {
    accusedId: topTarget,
    voteCount: topCount,
    isTie: false,
    skipped: false,
    voteCounts,
    logs: [
      `${accused.name} bị bầu cao nhất (${topCount} phiếu) và bước lên giàn treo cổ! Có 30 giây để biện minh và biểu quyết Giết hoặc Sống.`,
    ],
  };
}

export interface TrialVerdictResolution {
  executedId: string | null;
  killVotes: number;
  saveVotes: number;
  jesterWon: boolean;
  deadPlayerIds: string[];
  loverHeartbreakIds: string[];
  hunterTriggeredId: string | null;
  logs: string[];
}

/**
 * Resolves the 30-second Gallows Defense Trial ('kill' vs 'save' votes).
 * Mayor's verdict vote counts as 2. If killVotes > saveVotes, the accused is executed.
 */
export function resolveTrialVerdict(
  players: PlayerState[],
  accusedId: string,
  trialVotes: Record<string, 'kill' | 'save'>,
  currentLovers: [string, string] | null
): TrialVerdictResolution {
  const aliveSet = new Set(players.filter((p) => p.isAlive).map((p) => p.id));
  const byId = new Map(players.map((p) => [p.id, p]));
  const accused = byId.get(accusedId);

  if (!accused || !accused.isAlive) {
    return {
      executedId: null,
      killVotes: 0,
      saveVotes: 0,
      jesterWon: false,
      deadPlayerIds: [],
      loverHeartbreakIds: [],
      hunterTriggeredId: null,
      logs: ['Phiên phán quyết kết thúc.'],
    };
  }

  let killVotes = 0;
  let saveVotes = 0;

  for (const [voterId, choice] of Object.entries(trialVotes)) {
    if (!aliveSet.has(voterId) || voterId === accusedId) continue;
    const voter = byId.get(voterId);
    const weight = voter?.role === 'mayor' ? 2 : 1;
    if (choice === 'kill') killVotes += weight;
    else if (choice === 'save') saveVotes += weight;
  }

  const logs: string[] = [];

  if (killVotes <= saveVotes) {
    logs.push(
      `Biểu quyết trên giàn (${killVotes} Giết - ${saveVotes} Sống): ${accused.name} được dân làng tha bổng và bước xuống giàn treo cổ!`
    );
    return {
      executedId: null,
      killVotes,
      saveVotes,
      jesterWon: false,
      deadPlayerIds: [],
      loverHeartbreakIds: [],
      hunterTriggeredId: null,
      logs,
    };
  }

  // Executed!
  const deadSet = new Set<string>([accusedId]);
  const loverHeartbreakIds: string[] = [];
  const jesterWon = accused.role === 'jester';

  logs.push(
    `Biểu quyết trên giàn (${killVotes} Giết - ${saveVotes} Sống): ${accused.name} bị xử tử! Danh tính thật: ${ROLE_CATALOG[accused.role].nameVi}.`
  );

  if (jesterWon) {
    logs.push(
      `Thằng Ngố ${accused.name} bật cười ngạo nghễ trên giá treo cổ! Cả ngôi làng đã sập bẫy của Kẻ Chán Đời!`
    );
  }

  if (currentLovers) {
    const [l1, l2] = currentLovers;
    if (accusedId === l1 && aliveSet.has(l2)) {
      deadSet.add(l2);
      loverHeartbreakIds.push(l2);
      const p2 = byId.get(l2);
      if (p2) logs.push(`Chứng kiến người tình tắt thở, ${p2.name} cũng gục ngã vì tuyệt vọng.`);
    } else if (accusedId === l2 && aliveSet.has(l1)) {
      deadSet.add(l1);
      loverHeartbreakIds.push(l1);
      const p1 = byId.get(l1);
      if (p1) logs.push(`Chứng kiến người tình tắt thở, ${p1.name} cũng gục ngã vì tuyệt vọng.`);
    }
  }

  const hunterTriggeredId = accused.role === 'hunter' ? accused.id : null;

  return {
    executedId: accusedId,
    killVotes,
    saveVotes,
    jesterWon,
    deadPlayerIds: Array.from(deadSet),
    loverHeartbreakIds,
    hunterTriggeredId,
    logs,
  };
}

export interface WinCheckResult {
  winner: 'ongoing' | Faction;
  reason: string;
}

/**
 * Checks whether the game has ended and which faction won.
 */
export function checkWinCondition(
  players: PlayerState[],
  currentLovers: [string, string] | null = null
): WinCheckResult {
  const alive = players.filter((p) => p.isAlive);
  const aliveWolves = alive.filter((p) => isWolfPackRole(p.role));
  const aliveNonWolves = alive.filter((p) => !isWolfPackRole(p.role));

  // White Wolf solo victory if White Wolf is the sole survivor
  if (alive.length === 1 && alive[0].role === 'white_wolf') {
    return {
      winner: 'solo',
      reason: `Sói Trắng Độc Hành (${alive[0].name}) là kẻ sống sót cuối cùng trên đống tro tàn của Huyết Nguyệt Thôn!`,
    };
  }

  // Special Lovers victory if only the 2 Lovers survive and they are cross-faction
  if (
    currentLovers &&
    alive.length === 2 &&
    alive.some((p) => p.id === currentLovers[0]) &&
    alive.some((p) => p.id === currentLovers[1]) &&
    aliveWolves.length === 1
  ) {
    return {
      winner: 'lovers',
      reason: 'Cặp Đôi Định Mệnh (Người & Sói) là những kẻ sống sót cuối cùng dưới ánh trăng máu!',
    };
  }

  if (aliveWolves.length === 0) {
    return {
      winner: 'villagers',
      reason: 'Toàn bộ bầy Ma Sói đã bị tiêu diệt! Bình minh thực sự đã trở lại với Huyết Nguyệt Thôn.',
    };
  }

  if (aliveWolves.length >= aliveNonWolves.length) {
    return {
      winner: 'werewolves',
      reason: 'Số lượng Ma Sói đã áp đảo Dân Làng! Huyết Nguyệt Thôn hoàn toàn chìm vào bóng tối vĩnh hằng.',
    };
  }

  return {
    winner: 'ongoing',
    reason: '',
  };
}

export interface CircleObstacle {
  x: number;
  z: number;
  radius: number;
  label?: string;
}

/**
 * Resolves 2D circle-vs-circle collisions and boundary clamping for smooth 3D player movement.
 */
export function resolvePlayerMovement(
  x: number,
  z: number,
  dx: number,
  dz: number,
  obstacles: CircleObstacle[],
  playerRadius = 0.65,
  worldRadius = 46
): { x: number; z: number } {
  let nextX = x + dx;
  let nextZ = z + dz;

  for (const obs of obstacles) {
    const distX = nextX - obs.x;
    const distZ = nextZ - obs.z;
    const minDist = obs.radius + playerRadius;
    const distSq = distX * distX + distZ * distZ;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = distX / dist;
      const nz = distZ / dist;
      nextX = obs.x + nx * minDist;
      nextZ = obs.z + nz * minDist;
    }
  }

  const rSq = nextX * nextX + nextZ * nextZ;
  if (rSq > worldRadius * worldRadius) {
    const r = Math.sqrt(rSq);
    nextX = (nextX / r) * worldRadius;
    nextZ = (nextZ / r) * worldRadius;
  }

  return { x: nextX, z: nextZ };
}

/**
 * Computes clamped knob offset and normalized (-1..1) analog movement vector for mobile virtual joystick.
 */
export function computeJoystickVector(
  deltaX: number,
  deltaY: number,
  maxRadius = 44,
  deadzone = 0.08
): { knobX: number; knobY: number; normX: number; normY: number; magnitude: number } {
  const rawDist = Math.hypot(deltaX, deltaY);
  if (rawDist === 0) {
    return { knobX: 0, knobY: 0, normX: 0, normY: 0, magnitude: 0 };
  }
  const clampedDist = Math.min(rawDist, maxRadius);
  const ratio = clampedDist / maxRadius;
  const angle = Math.atan2(deltaY, deltaX);
  const knobX = Math.cos(angle) * clampedDist;
  const knobY = Math.sin(angle) * clampedDist;

  if (ratio < deadzone) {
    return { knobX, knobY, normX: 0, normY: 0, magnitude: 0 };
  }

  const effectiveMag = (ratio - deadzone) / (1 - deadzone);
  return {
    knobX,
    knobY,
    normX: Math.cos(angle) * effectiveMag,
    normY: Math.sin(angle) * effectiveMag,
    magnitude: Math.min(1, effectiveMag),
  };
}

export interface FireballState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  kickCount: number;
  lastKickerName: string;
}

export interface FireballPlayerCollider {
  id: string;
  name: string;
  x: number;
  z: number;
  y?: number;
}

/**
 * Pure 3D physics step for the interactive Village Square Kickable Fireball ("Quả Cầu Lửa").
 * Handles player/bot proximity kicks, parabolic vertical arcs, ground bounces, friction,
 * and elastic reflections off village obstacles and perimeter boundaries.
 */
export function stepFireballPhysics(
  state: FireballState,
  players: FireballPlayerCollider[],
  obstacles: CircleObstacle[],
  dt: number,
  worldRadius = 33
): { state: FireballState; kickedBy: FireballPlayerCollider | null } {
  const next: FireballState = { ...state };
  let kickedBy: FireballPlayerCollider | null = null;
  const ballRadius = 0.52;
  const kickDistance = 1.42;

  // 1. Check if any player/bot runs or jumps into the fireball to kick it
  for (const p of players) {
    const dx = next.x - p.x;
    const dz = next.z - p.z;
    const dist = Math.hypot(dx, dz);
    const py = p.y ?? 0;
    if (dist < kickDistance && Math.abs(next.y - ballRadius - py) < 1.65) {
      const safeDist = dist > 0.001 ? dist : 0.001;
      const nx = dx / safeDist;
      const nz = dz / safeDist;
      const kickSpeed = 14.5 + (py > 0.15 ? 4.0 : 0);
      next.vx = nx * kickSpeed + (Math.random() - 0.5) * 1.2;
      next.vz = nz * kickSpeed + (Math.random() - 0.5) * 1.2;
      next.vy = Math.max(next.vy, 5.4 + (py > 0.15 ? 2.2 : 0));
      next.x = p.x + nx * (kickDistance + 0.08);
      next.z = p.z + nz * (kickDistance + 0.08);
      next.kickCount += 1;
      next.lastKickerName = p.name;
      kickedBy = p;
      break;
    }
  }

  // 2. Integrate horizontal velocity & ground drag
  next.x += next.vx * dt;
  next.z += next.vz * dt;
  const drag = Math.exp(-1.55 * dt);
  next.vx *= drag;
  next.vz *= drag;
  if (Math.hypot(next.vx, next.vz) < 0.05) {
    next.vx = 0;
    next.vz = 0;
  }

  // 3. Integrate vertical velocity & gravity bounce
  next.y += next.vy * dt;
  next.vy -= 18.5 * dt;
  if (next.y <= ballRadius) {
    next.y = ballRadius;
    if (next.vy < -1.2) {
      next.vy = -next.vy * 0.58;
    } else {
      next.vy = 0;
    }
  }

  // 4. Bounce off circular village obstacles (Bonfire altar, Gallows, Cottages, Bell Tower, Lamps)
  for (const obs of obstacles) {
    const dx = next.x - obs.x;
    const dz = next.z - obs.z;
    const minDist = obs.radius + ballRadius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const nz = dz / dist;
      next.x = obs.x + nx * (minDist + 0.02);
      next.z = obs.z + nz * (minDist + 0.02);
      const dot = next.vx * nx + next.vz * nz;
      if (dot < 0) {
        next.vx = (next.vx - 2 * dot * nx) * 0.78;
        next.vz = (next.vz - 2 * dot * nz) * 0.78;
        next.vy = Math.max(next.vy, 2.6);
      }
    }
  }

  // 5. Bounce inside village square perimeter so the fireball never gets lost in the outer forest
  const rSq = next.x * next.x + next.z * next.z;
  if (rSq > worldRadius * worldRadius) {
    const r = Math.sqrt(rSq) || 1;
    const nx = next.x / r;
    const nz = next.z / r;
    next.x = nx * (worldRadius - 0.1);
    next.z = nz * (worldRadius - 0.1);
    const dot = next.vx * nx + next.vz * nz;
    if (dot > 0) {
      next.vx = (next.vx - 2 * dot * nx) * 0.75;
      next.vz = (next.vz - 2 * dot * nz) * 0.75;
    }
  }

  return { state: next, kickedBy };
}

/**
 * Players can move freely in the 3D village during the waiting lobby phase,
 * and are locked into their ritual circle seats once the match is underway.
 */
export function canPlayerMoveInPhase(phase: GamePhase): boolean {
  return phase === 'lobby';
}

export const QUICK_CHAT_PRESETS: readonly string[] = [
  'Ai là Sói?',
  'Tôi là Dân lành!',
  'Tiên Tri báo đi!',
  'Vote người này!',
  'Phù Thủy cứu với!',
  'Khoan vote, nghe đã!',
];

export interface CameraCollisionResult {
  x: number;
  z: number;
  clampedDistance: number;
  occludedObstacleIndices: number[];
}

/**
 * Spring-arm 3rd-person camera collision & building occlusion resolver.
 * Prevents the camera from clipping inside or behind village cottages/towers.
 */
export function resolveCameraCollision(
  playerX: number,
  playerZ: number,
  desiredCamX: number,
  desiredCamZ: number,
  obstacles: CircleObstacle[],
  cameraBuffer = 1.8,
  minFollowDistance = 3.4
): CameraCollisionResult {
  const dx = desiredCamX - playerX;
  const dz = desiredCamZ - playerZ;
  const desiredDist = Math.hypot(dx, dz);
  if (desiredDist < 0.001) {
    return {
      x: desiredCamX,
      z: desiredCamZ,
      clampedDistance: 0,
      occludedObstacleIndices: [],
    };
  }

  const ux = dx / desiredDist;
  const uz = dz / desiredDist;
  let allowedDist = desiredDist;
  const occludedObstacleIndices: number[] = [];

  obstacles.forEach((obs, idx) => {
    // Only collide camera against large architectural structures (cottages, bell tower),
    // ignoring small props (street lamps, central low firepit).
    if (obs.radius < 3.2) return;

    const effRadius = obs.radius + cameraBuffer;
    const fx = obs.x - playerX;
    const fz = obs.z - playerZ;
    const tProj = fx * ux + fz * uz;

    if (tProj > -1.0 && tProj < desiredDist + effRadius) {
      const distSqToRay = fx * fx + fz * fz - tProj * tProj;
      if (distSqToRay < effRadius * effRadius) {
        const halfChord = Math.sqrt(Math.max(0, effRadius * effRadius - distSqToRay));
        const tHit = tProj - halfChord;
        if (tHit < allowedDist && tProj > 0) {
          allowedDist = Math.max(minFollowDistance, tHit);
        }
        if (tHit < desiredDist + 1.5) {
          occludedObstacleIndices.push(idx);
        }
      }
    }
  });

  const finalX = playerX + ux * allowedDist;
  const finalZ = playerZ + uz * allowedDist;

  // Double-check if final camera point is still inside any building's buffer zone
  obstacles.forEach((obs, idx) => {
    if (obs.radius < 3.2) return;
    const distToCam = Math.hypot(finalX - obs.x, finalZ - obs.z);
    if (distToCam < obs.radius + cameraBuffer + 0.8 && !occludedObstacleIndices.includes(idx)) {
      occludedObstacleIndices.push(idx);
    }
  });

  return {
    x: finalX,
    z: finalZ,
    clampedDistance: allowedDist,
    occludedObstacleIndices,
  };
}


