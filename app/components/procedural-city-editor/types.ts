export type StreetPattern = "grid" | "organic" | "radial";
export type CityStyle = "modern-glass" | "european" | "tokyo-dense" | "cyberpunk" | "brutalist";
export type TerrainStyle = "coastline" | "mountains" | "plains";
export type ViewPreset = "orbit" | "overhead" | "cinematic";
export type PresetName = "neon-megacity" | "balanced-core" | "industrial-belt" | "residential-area" | "river-port";
export type ZoneType = "commercial" | "residential" | "industrial";

export type EditorState = {
  citySize: number;
  cityDensity: number;
  blockSize: number;
  streetPattern: StreetPattern;
  commercial: number;
  residential: number;
  industrial: number;
  averageHeight: number;
  heightVariance: number;
  cityStyle: CityStyle;
  riverProbability: number;
  parksPercent: number;
  terrainRoughness: number;
  terrainStyle: TerrainStyle;
  viewPreset: ViewPreset;
  preset: PresetName;
};

export type StyleTheme = {
  skyTop: string;
  skyBottom: string;
  fog: string;
  ground: string;
  road: string;
  roadGlow: string;
  water: string;
  park: string;
  commercialBase: string;
  commercialGlow: string;
  residentialBase: string;
  residentialGlow: string;
  industrialBase: string;
  industrialGlow: string;
  accent: string;
};

export type ThemeMeta = {
  label: string;
  description: string;
};

export type RepoHint = {
  name: string;
  url: string;
  language: string | null;
  description: string | null;
};

export type Cell = {
  x: number;
  z: number;
  worldX: number;
  worldZ: number;
  road: false;
  water: false;
  park: false;
  zone: ZoneType;
  height: number;
  width: number;
  depth: number;
  tower: boolean;
  seed: number;
  contributionCount: number;
  lightBands: number;
  lightStrength: number;
  repo: RepoHint;
  date: string;
  stars: number;
  forks: number;
  activityScore: number;
  isDecorative: boolean;
};

export type RoadAxis = "x" | "z" | "junction";

export type RoadSegment = {
  axis: RoadAxis;
  position: [number, number, number];
  size: [number, number, number];
};

export type CarInstance = {
  axis: Exclude<RoadAxis, "junction">;
  position: [number, number, number];
  bodyColor: string;
  glowColor: string;
  direction: 1 | -1;
  length: number;
  width: number;
  speed: number;
  phase: number;
  travelSpan: number;
};

export type ParkPatch = {
  position: [number, number, number];
  size: [number, number, number];
};

export type WaterStrip = {
  position: [number, number, number];
  size: [number, number, number];
};

export type TerrainRidge = {
  position: [number, number, number];
  radius: number;
  height: number;
};

export type CityModel = {
  cells: Cell[];
  roads: RoadSegment[];
  cars: CarInstance[];
  parks: ParkPatch[];
  water: WaterStrip[];
  ridges: TerrainRidge[];
  bounds: { width: number; depth: number };
};

export type ProfileSnapshot = {
  username: string;
  name: string;
  totalContributions: number;
  publicRepos: number;
  stars: number;
  longestStreak: number;
  topLanguage: string;
};

export type RepoSignal = {
  repo: RepoHint;
  activityCount: number;
  stars: number;
  forks: number;
  score: number;
  updatedAt: string | null;
  index: number;
};
