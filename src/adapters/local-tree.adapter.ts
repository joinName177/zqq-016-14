import { CounterfactualTree } from '../core/models';
import { normalizeCounterfactualTree } from '../core/tree-engine';
import { TreeStoragePort } from '../ports/tree-storage.port';

const TREE_STORAGE_KEY = 'parallel_life_tree_v1';

export class LocalTreeAdapter implements TreeStoragePort {
  /**
   * 恢复上次保存的反事实树。
   * 旧版本序列化的树缺少“意外分支”等新字段，统一经 normalizeCounterfactualTree
   * 补齐兼容默认值并保留全部节点；只有数据完全不可辨认时才返回 null，
   * 由调用方生长新树——不把旧资料当成空树。
   */
  load(): CounterfactualTree | null {
    const raw = localStorage.getItem(TREE_STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeCounterfactualTree(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  save(tree: CounterfactualTree): void {
    try {
      localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify(tree));
    } catch {
      // 存储不可用（如隐私模式）时静默降级为纯内存态
    }
  }

  clear(): void {
    localStorage.removeItem(TREE_STORAGE_KEY);
  }
}
