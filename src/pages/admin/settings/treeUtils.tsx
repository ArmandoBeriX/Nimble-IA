import { SettingGroupItem, SettingItem } from "../../../constants/table-defs";
import { FormController } from "../../../components/fields/form-controller";
import { TableField } from "../../../types/schema";

export type SettingItemField = SettingItem & {
  field: Omit<TableField, 'id'>
  controller: FormController
}

export interface GroupNode {
  group: SettingGroupItem;
  settings: SettingItemField[];
  children: GroupNode[];
}

const UNGROUPED_ID = "ungrouped";

export function buildSettingsGroupTree(
  settings: SettingItemField[], 
  groups: SettingGroupItem[]
): GroupNode[] {
  const groupMap = new Map<string, GroupNode>();

  for (const g of groups) {
    if (!groupMap.has(g.id)) {
      groupMap.set(g.id, {
        group: g,
        settings: [],
        children: [],
      });
    }
  }

  for (const setting of settings) {
    const gid = setting.setting_group?.id ?? setting.setting_group_id ?? UNGROUPED_ID;
    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        group: {
          id: gid,
          name: gid === UNGROUPED_ID ? "Sin grupo" : `Grupo ${gid}`,
          description: gid === UNGROUPED_ID ? "Settings sin grupo asignado" : "",
          parent_id: null,
        } as SettingGroupItem,
        settings: [],
        children: [],
      });
    }
  }

  for (const setting of settings) {
    const gid = setting.setting_group?.id ?? setting.setting_group_id ?? UNGROUPED_ID;
    const node = groupMap.get(gid)!;
    node.settings.push(setting);
  }

  const roots: GroupNode[] = [];

  for (const node of groupMap.values()) {
    const parentId = node.group.parent_id ?? null;
    if (parentId && groupMap.has(parentId)) {
      groupMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of groupMap.values()) {
    node.settings.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return roots;
}

export function pruneTreeKeepMatches(nodes: GroupNode[]): GroupNode[] {
  const out: GroupNode[] = [];

  for (const node of nodes) {
    const prunedChildren = pruneTreeKeepMatches(node.children);
    const hasSettings = (node.settings && node.settings.length > 0);
    if (hasSettings || prunedChildren.length > 0) {
      out.push({
        group: node.group,
        settings: node.settings,
        children: prunedChildren,
      });
    }
  }

  return out;
}