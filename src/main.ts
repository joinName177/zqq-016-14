import './ui/styles.css';
import { TreeEngineAdapter } from './adapters/tree-engine.adapter';
import { LocalSpecimenAdapter } from './adapters/local-specimen.adapter';
import { LocalTreeAdapter } from './adapters/local-tree.adapter';
import { CounterfactualTree } from './core/models';
import { renderTreeApp } from './ui/app';

const treeAdapter = new TreeEngineAdapter();
const specimenAdapter = new LocalSpecimenAdapter();
const treeStorage = new LocalTreeAdapter();

const PRESETS = [
  '如果当初我留在了故乡小城',
  '如果当初我鼓起勇气向TA表白了心意',
  '如果当年我选择了读纯艺术专业',
  '如果当年我没有接受那家大厂的Offer'
];

// 优先恢复本地保存的树（旧版本数据会自动补齐缺失字段并保留全部节点），
// 完全没有可用存档时才生长一棵新树
let currentTree: CounterfactualTree = treeStorage.load() ?? treeAdapter.createTree(PRESETS[0]);
let isCabinetOpen = false;

const rootEl = document.getElementById('app')!;

function refreshView() {
  const specimens = specimenAdapter.getAll();

  renderTreeApp(
    rootEl,
    currentTree,
    specimens,
    isCabinetOpen,
    PRESETS,
    {
      onGrowNewTree: (assumption: string) => {
        currentTree = treeAdapter.createTree(assumption);
        treeStorage.save(currentTree);
        refreshView();
      },
      onWaterNode: (nodeId: string) => {
        currentTree = treeAdapter.water(currentTree, nodeId);
        treeStorage.save(currentTree);
        refreshView();
      },
      onPruneNode: (nodeId: string) => {
        currentTree = treeAdapter.prune(currentTree, nodeId);
        treeStorage.save(currentTree);
        refreshView();
      },
      onHarvestNode: (nodeId: string) => {
        const sp = treeAdapter.harvest(currentTree, nodeId);
        specimenAdapter.save(sp);
        treeStorage.save(currentTree);
        alert(`已成功将节点【${sp.title}】收入平行人生标本馆！`);
        refreshView();
      },
      onDeleteSpecimen: (id: string) => {
        specimenAdapter.remove(id);
        refreshView();
      },
      onToggleCabinet: (open: boolean) => {
        isCabinetOpen = open;
        refreshView();
      }
    }
  );
}

// Initial render
refreshView();
