import { CounterfactualTree, LifeSpecimen } from '../core/models';

export interface TreeEnginePort {
  createTree(assumption: string): CounterfactualTree;
  /**
   * 兼容迁移：补齐旧树缺少的意外分支等字段；输入不是有效树对象时返回 null。
   * 旧资料不会被当作空树丢弃。
   */
  normalizeTree(input: unknown): CounterfactualTree | null;
  water(tree: CounterfactualTree, nodeId: string): CounterfactualTree;
  prune(tree: CounterfactualTree, nodeId: string): CounterfactualTree;
  harvest(tree: CounterfactualTree, nodeId: string): LifeSpecimen;
}
