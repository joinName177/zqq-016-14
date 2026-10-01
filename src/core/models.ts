export type LifeCategory = 'career' | 'romance' | 'inner' | 'twist';

export interface LifeNode {
  id: string;
  parentId?: string;
  layerIndex: number; // 0: 假说分歧点, 1: 1年后涟漪, 2: 3年后质变, 3: 5年后分道, 4: 10年后平行归宿
  eraLabel: string;
  title: string;
  scenarioDescription: string;
  vitality: number; // 0 - 100
  isPruned: boolean;
  waterCount: number;
  category: LifeCategory;
  categoryName: string;
  color: string;
  specimenQuote: string;
  /**
   * 是否为浇水催生的“意外分支”（奇遇枝桠）。
   * 旧版本序列化的树数据没有该字段，读取时需按 false 兼容处理。
   */
  isSerendipity?: boolean;
  childrenIds: string[];
}

export interface LifeSpecimen {
  id: string;
  nodeId: string;
  title: string;
  eraLabel: string;
  assumption: string;
  pathWay: string[];
  quote: string;
  butterflyTag: string;
  resonanceRating: number;
  harvestedAt: string;
}

export interface CounterfactualTree {
  id: string;
  assumption: string;
  rootId: string;
  nodes: Record<string, LifeNode>;
  createdAt: string;
  specimens: LifeSpecimen[];
}
