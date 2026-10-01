import { CounterfactualTree } from '../core/models';

export interface TreeStoragePort {
  load(): CounterfactualTree | null;
  save(tree: CounterfactualTree): void;
  clear(): void;
}
