export type Floss = {
  code: string;
  name: string;
  hex: string;
  rgb: number[];
  symbol: string;
  count: number;
  index: number;
  skeins?: number;
};

export type Pattern = {
  width: number;
  height: number;
  aida_count: number;
  size_inches: [number, number];
  grid: number[][];
  palette: Floss[];
  difficulty: {
    score: number;
    level: string;
    estimated_hours: number;
    factors: Record<string, number>;
    stretch_goals: string[];
  };
  preview_png_base64: string;
  skeins: Floss[];
};

export type InterruptEvent = {
  type: "interrupt";
  palette?: Floss[];
  difficulty?: Pattern["difficulty"];
  preview_png_base64?: string;
  width?: number;
  height?: number;
  aida_count?: number;
  size_inches?: [number, number];
};

export type ChatEvent =
  | { type: "thread"; thread_id: string }
  | { type: "agent"; name: string }
  | { type: "token"; text: string; agent?: string }
  | { type: "message"; text: string; agent?: string }
  | { type: "pattern"; pattern: Pattern }
  | InterruptEvent
  | { type: "done"; thread_id?: string }
  | { type: "error"; message: string };

export type Lesson = {
  id: string;
  title: string;
  level: string;
  minutes: number;
  body: string;
};

export type CatalogItem = {
  id: string;
  title: string;
  hours: number;
  colors: number;
  level: string;
  techniques: string[];
  why: string;
};

export type Profile = {
  display_name: string;
  experience: string;
  known_techniques: string[];
  max_colors_comfortable: number;
  preferred_hours: number;
  goals: string;
};
