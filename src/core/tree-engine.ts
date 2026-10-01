import {
  CounterfactualTree,
  LifeNode,
  LifeSpecimen,
  LifeCategory
} from './models';

const ERA_LABELS = ['起点分歧点', '+1年·涟漪微漾', '+3年·风向转折', '+5年·航道分野', '+10年·宿命标本'];

const CATEGORY_MAP: Record<LifeCategory, { name: string; color: string }> = {
  career: { name: '职业与天命', color: '#e2b168' },
  romance: { name: '亲密与连结', color: '#d67568' },
  inner: { name: '心性与自洽', color: '#7ba085' },
  twist: { name: '奇点与宿命', color: '#8b80b6' }
};

const VALID_CATEGORIES: LifeCategory[] = ['career', 'romance', 'inner', 'twist'];

const clampLayerIndex = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.min(Math.max(n, 0), ERA_LABELS.length - 1);
};

const clampVitality = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 60;
  return Math.min(Math.max(Math.round(n), 0), 100);
};

const toCategory = (v: unknown): LifeCategory =>
  VALID_CATEGORIES.includes(v as LifeCategory) ? (v as LifeCategory) : 'twist';

/**
 * 旧版本树数据兼容归一化。
 *
 * 早期序列化的树缺少“意外分支”等后来新增的字段（甚至缺 childrenIds / waterCount），
 * 直接交给渲染或引擎会抛错。这里为缺失字段补齐兼容默认值、修复父子引用，
 * 并保留旧树里的全部节点；只有当数据完全不可辨认（没有可用节点）时才返回 null，
 * 由调用方生长新树——绝不把旧资料当成空树丢弃。
 */
export function normalizeCounterfactualTree(raw: unknown): CounterfactualTree | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<CounterfactualTree>;
  if (!data.nodes || typeof data.nodes !== 'object') return null;

  const entries = Object.entries(data.nodes).filter(([, n]) => n && typeof n === 'object');
  if (entries.length === 0) return null;

  const nodes: Record<string, LifeNode> = {};
  entries.forEach(([key, rawNode], idx) => {
    const n = rawNode as Partial<LifeNode>;
    const id = typeof n.id === 'string' && n.id ? n.id : key || `node-legacy-${idx}`;
    const layerIndex = clampLayerIndex(n.layerIndex);
    const category = toCategory(n.category);
    const title = typeof n.title === 'string' && n.title ? n.title : '未命名的平行分支';
    const eraLabel = typeof n.eraLabel === 'string' && n.eraLabel ? n.eraLabel : ERA_LABELS[layerIndex];

    nodes[id] = {
      id,
      parentId: typeof n.parentId === 'string' && n.parentId ? n.parentId : undefined,
      layerIndex,
      eraLabel,
      title,
      scenarioDescription:
        typeof n.scenarioDescription === 'string' && n.scenarioDescription
          ? n.scenarioDescription
          : '这段平行人生的细节已随旧时光模糊，但枝桠本身仍被完整保留。',
      vitality: clampVitality(n.vitality),
      isPruned: n.isPruned === true,
      waterCount:
        typeof n.waterCount === 'number' && Number.isFinite(n.waterCount) && n.waterCount > 0
          ? Math.floor(n.waterCount)
          : 0,
      category,
      categoryName:
        typeof n.categoryName === 'string' && n.categoryName ? n.categoryName : CATEGORY_MAP[category].name,
      color: typeof n.color === 'string' && n.color ? n.color : CATEGORY_MAP[category].color,
      specimenQuote:
        typeof n.specimenQuote === 'string' && n.specimenQuote
          ? n.specimenQuote
          : '“未被言说的命运，同样在虚空中生长。”',
      // 旧树没有“意外分支”字段：缺省 false；若旧节点从标题/时代标签可辨认出是奇遇枝桠，则回填标记
      isSerendipity:
        n.isSerendipity === true || eraLabel.includes('奇遇') || title.includes('意外分支'),
      childrenIds: Array.isArray(n.childrenIds)
        ? [...new Set(n.childrenIds.filter((c): c is string => typeof c === 'string'))]
        : []
    };
  });

  // 修复结构：剔除悬空引用，但保留所有节点本身；并按 parentId 补全父节点的 childrenIds
  Object.values(nodes).forEach(node => {
    node.childrenIds = node.childrenIds.filter(cid => cid !== node.id && nodes[cid]);
    if (node.parentId && !nodes[node.parentId]) node.parentId = undefined;
  });
  Object.values(nodes).forEach(node => {
    if (node.parentId) {
      const parent = nodes[node.parentId];
      if (parent && !parent.childrenIds.includes(node.id)) parent.childrenIds.push(node.id);
    }
  });

  const rootId =
    typeof data.rootId === 'string' && nodes[data.rootId]
      ? data.rootId
      : (Object.values(nodes).find(n => !n.parentId)?.id ?? Object.keys(nodes)[0]);

  return {
    id: typeof data.id === 'string' && data.id ? data.id : `tree-${Date.now()}`,
    assumption:
      typeof data.assumption === 'string' && data.assumption ? data.assumption : '如果当初……（旧时空遗留的假设）',
    rootId,
    nodes,
    createdAt:
      typeof data.createdAt === 'string' && data.createdAt ? data.createdAt : new Date().toLocaleDateString('zh-CN'),
    specimens: Array.isArray(data.specimens)
      ? data.specimens.filter((s): s is LifeSpecimen => Boolean(s) && typeof s === 'object')
      : []
  };
}

export function buildCounterfactualTree(assumption: string): CounterfactualTree {
  const seed = [...assumption].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const nodes: Record<string, LifeNode> = {};
  const rootId = 'node-root';

  nodes[rootId] = {
    id: rootId,
    layerIndex: 0,
    eraLabel: ERA_LABELS[0],
    title: `假设原点：${assumption}`,
    scenarioDescription: '如果时间倒流至那个关键的岔路口，世界在一毫秒的迟疑中，分化为两条平行奔流的因果之河。',
    vitality: 100,
    isPruned: false,
    waterCount: 0,
    category: 'twist',
    categoryName: CATEGORY_MAP.twist.name,
    color: CATEGORY_MAP.twist.color,
    specimenQuote: '“所有的未曾发生，都曾在虚空中剧烈生长。”',
    isSerendipity: false,
    childrenIds: ['node-1-a', 'node-1-b']
  };

  // Branch A: Bold exploration / radical divergence
  // Branch B: Quiet retreat / gentle serenity
  const storiesA = [
    {
      id: 'node-1-a',
      parentId: rootId,
      layerIndex: 1,
      title: '脱轨的列车：辞别熟悉的舒适区',
      desc: '第一年，你承受着剧烈的不安与外界的质疑，但一种近乎野性的专注在你体内觉醒。',
      cat: 'career' as LifeCategory,
      quote: '“当不再寻求所有人的赞许，真正的旅程才刚刚启航。”'
    },
    {
      id: 'node-2-a',
      parentId: 'node-1-a',
      layerIndex: 2,
      title: '暴风雨中的破局：核心技艺的蜕变',
      desc: '第三年，一次濒临崩溃的危机反向倒逼出你最坚韧的潜能，你在此领域建立起辨识度。',
      cat: 'twist' as LifeCategory,
      quote: '“痛苦不是障碍，而是你灵魂被锻造的火候。”'
    },
    {
      id: 'node-3-a',
      parentId: 'node-2-a',
      layerIndex: 3,
      title: '自立的孤岛：同频者的共振群落',
      desc: '第五年，你吸引了一批志同道合的同行者，创建了完全属于你价值观的创作生态。',
      cat: 'romance' as LifeCategory,
      quote: '“孤独的跋涉最终会让你与真正的同类相逢。”'
    },
    {
      id: 'node-4-a',
      parentId: 'node-3-a',
      layerIndex: 4,
      title: '【终局标本】开拓者之果：广袤而沧桑的丰碑',
      desc: '第十年，你成为了许多人眼中的灯塔，虽然偶尔在深夜怀念起最初的温软，但你知道自己从未辜负过那一颗种子。',
      cat: 'inner' as LifeCategory,
      quote: '“我走了一条人迹罕至的路，而这决定了一切。”'
    }
  ];

  const storiesB = [
    {
      id: 'node-1-b',
      parentId: rootId,
      layerIndex: 1,
      title: '扎根的土壤：在细碎日常中重建秩序',
      desc: '第一年，你放下了紧绷的宏大叙事，开始专注照顾一餐一饭，内心的杂音渐渐沉寂。',
      cat: 'inner' as LifeCategory,
      quote: '“平凡不是妥协，而是对生活本质最深沉的温柔。”'
    },
    {
      id: 'node-2-b',
      parentId: 'node-1-b',
      layerIndex: 2,
      title: '暖意融融的小院：建立深刻的情感羁绊',
      desc: '第三年，你与知心的人构筑起温暖稳定的庇护所，生活节奏变得舒缓而富有韵律。',
      cat: 'romance' as LifeCategory,
      quote: '“幸福是一蔬一饭，是夜晚回家时窗前永远亮着的那盏灯。”'
    },
    {
      id: 'node-3-b',
      parentId: 'node-2-b',
      layerIndex: 3,
      title: '岁月的陈酿：掌握了一种从容的生活美学',
      desc: '第五年，你的身心呈现出罕见的澄澈，外界的焦虑风暴无法再穿透你筑起的护城河。',
      cat: 'career' as LifeCategory,
      quote: '“真正的富有，是拥有按自己心意度过清晨与黄昏的自由。”'
    },
    {
      id: 'node-4-b',
      parentId: 'node-3-b',
      layerIndex: 4,
      title: '【终局标本】守常者之花：宁静祥和的心灵绿洲',
      desc: '第十年，你拥有了极其健康的身心与丰盈的家庭记忆。你平静地老去，每一个日子都充盈而踏实。',
      cat: 'inner' as LifeCategory,
      quote: '“此心安处是吾乡，所有的风景都不及内心的明月。”'
    }
  ];

  // Wire children
  const buildNodes = (storyList: typeof storiesA) => {
    storyList.forEach((s, idx) => {
      const next = storyList[idx + 1];
      nodes[s.id] = {
        id: s.id,
        parentId: s.parentId,
        layerIndex: s.layerIndex,
        eraLabel: ERA_LABELS[s.layerIndex],
        title: s.title,
        scenarioDescription: s.desc,
        vitality: 70 + ((seed + idx * 11) % 25),
        isPruned: false,
        waterCount: 0,
        category: s.cat,
        categoryName: CATEGORY_MAP[s.cat].name,
        color: CATEGORY_MAP[s.cat].color,
        specimenQuote: s.quote,
        isSerendipity: false,
        childrenIds: next ? [next.id] : []
      };
    });
  };

  buildNodes(storiesA);
  buildNodes(storiesB);

  return {
    id: `tree-${Date.now()}`,
    assumption,
    rootId,
    nodes,
    createdAt: new Date().toLocaleDateString('zh-CN'),
    specimens: []
  };
}

export function waterBranch(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
  const target = tree.nodes[nodeId];
  if (!target) return tree;

  // 兼容旧树节点：缺失的数值/数组字段先按默认值补齐，避免直接抛错
  target.vitality = Math.min(100, (target.vitality ?? 0) + 20);
  target.waterCount = (target.waterCount ?? 0) + 1;
  if (!Array.isArray(target.childrenIds)) target.childrenIds = [];

  // If watered 2 times and in layer 1 or 2, sprout a serendipity branch!
  if (target.waterCount === 2 && target.layerIndex < 3 && target.childrenIds.length < 2) {
    const newId = `node-${target.layerIndex + 1}-twist-${Date.now().toString(36).slice(-4)}`;
    const nextLayer = target.layerIndex + 1;
    const cat: LifeCategory = 'twist';
    tree.nodes[newId] = {
      id: newId,
      parentId: target.id,
      layerIndex: nextLayer,
      eraLabel: `${ERA_LABELS[nextLayer]}·奇遇枝桠`,
      title: '因浇水而盛放的意外分支：突发奇遇',
      scenarioDescription: '生命在持续的滋养中孕育出意想不到的转折——一位旅人带来的消息彻底重构了你的人生构想。',
      vitality: 88,
      isPruned: false,
      waterCount: 0,
      category: cat,
      categoryName: CATEGORY_MAP[cat].name,
      color: CATEGORY_MAP[cat].color,
      specimenQuote: '“当你足够专注地灌溉，奇迹就会在干涸的断枝上抽芽。”',
      isSerendipity: true,
      childrenIds: []
    };
    target.childrenIds.push(newId);
  }

  return { ...tree };
}

export function pruneBranch(tree: CounterfactualTree, nodeId: string): CounterfactualTree {
  const pruneRecursive = (id: string) => {
    const n = tree.nodes[id];
    if (!n) return;
    n.isPruned = true;
    n.vitality = 0;
    // 旧树节点可能缺少 childrenIds，按空数组兼容
    (Array.isArray(n.childrenIds) ? n.childrenIds : []).forEach(pruneRecursive);
  };

  pruneRecursive(nodeId);
  return { ...tree };
}

export function harvestSpecimen(tree: CounterfactualTree, nodeId: string): LifeSpecimen {
  const node = tree.nodes[nodeId];
  if (!node) throw new Error('节点不存在');

  // Trace pathway back to root (visited 集合防止旧数据父链成环导致死循环)
  const pathWay: string[] = [];
  const visited = new Set<string>();
  let curr: LifeNode | undefined = node;
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    pathWay.unshift(curr.title);
    curr = curr.parentId ? tree.nodes[curr.parentId] : undefined;
  }

  const specimen: LifeSpecimen = {
    id: `specimen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    nodeId: node.id,
    title: node.title,
    eraLabel: node.eraLabel,
    assumption: tree.assumption,
    pathWay,
    quote: node.specimenQuote,
    butterflyTag: node.categoryName,
    resonanceRating: Math.min(99, 65 + (node.vitality ?? 0) / 3),
    harvestedAt: new Date().toLocaleString('zh-CN', { hour12: false })
  };

  tree.specimens.push(specimen);
  return specimen;
}
