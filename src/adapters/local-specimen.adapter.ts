import { LifeSpecimen } from '../core/models';
import { SpecimenStoragePort } from '../ports/specimen-storage.port';

const SPECIMEN_STORAGE_KEY = 'parallel_life_specimens_v1';

// 旧版本标本可能缺少新字段：逐条补齐兼容默认值并保留，而不是当成空集丢弃
function normalizeSpecimen(raw: unknown, idx: number): LifeSpecimen | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<LifeSpecimen>;
  return {
    id: typeof s.id === 'string' && s.id ? s.id : `specimen-legacy-${idx}`,
    nodeId: typeof s.nodeId === 'string' ? s.nodeId : '',
    title: typeof s.title === 'string' && s.title ? s.title : '未命名的平行人生标本',
    eraLabel: typeof s.eraLabel === 'string' ? s.eraLabel : '',
    assumption: typeof s.assumption === 'string' ? s.assumption : '',
    pathWay: Array.isArray(s.pathWay) ? s.pathWay.filter((p): p is string => typeof p === 'string') : [],
    quote: typeof s.quote === 'string' ? s.quote : '',
    butterflyTag: typeof s.butterflyTag === 'string' && s.butterflyTag ? s.butterflyTag : '未知领域',
    resonanceRating:
      typeof s.resonanceRating === 'number' && Number.isFinite(s.resonanceRating) ? s.resonanceRating : 60,
    harvestedAt: typeof s.harvestedAt === 'string' ? s.harvestedAt : ''
  };
}

export class LocalSpecimenAdapter implements SpecimenStoragePort {
  getAll(): LifeSpecimen[] {
    const raw = localStorage.getItem(SPECIMEN_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : [];
      return list
        .map((item, idx) => normalizeSpecimen(item, idx))
        .filter((s): s is LifeSpecimen => s !== null);
    } catch {
      return [];
    }
  }

  save(specimen: LifeSpecimen): void {
    const list = this.getAll();
    const existingIdx = list.findIndex(s => s.id === specimen.id);
    if (existingIdx >= 0) {
      list[existingIdx] = specimen;
    } else {
      list.unshift(specimen);
    }
    localStorage.setItem(SPECIMEN_STORAGE_KEY, JSON.stringify(list));
  }

  remove(id: string): void {
    const list = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(SPECIMEN_STORAGE_KEY, JSON.stringify(list));
  }

  clear(): void {
    localStorage.removeItem(SPECIMEN_STORAGE_KEY);
  }
}
