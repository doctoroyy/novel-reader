import { v4 as uuidv4 } from 'uuid';
import { ReplaceRule } from '../types';
import { queryAll, queryFirst, execute } from './database';

export const addReplaceRule = async (rule: Partial<ReplaceRule>): Promise<ReplaceRule> => {
  const newRule: ReplaceRule = {
    id: rule.id || uuidv4(),
    name: rule.name || '',
    group: rule.group,
    pattern: rule.pattern || '',
    replacement: rule.replacement || '',
    scope: rule.scope,
    isEnabled: rule.isEnabled !== false,
    isRegex: rule.isRegex === true,
    order: rule.order || 0,
  };

  await execute(
    `INSERT OR REPLACE INTO replace_rules
     (id, name, rule_group, pattern, replacement, scope, isEnabled, isRegex, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newRule.id, newRule.name, newRule.group, newRule.pattern, newRule.replacement,
     newRule.scope, newRule.isEnabled ? 1 : 0, newRule.isRegex ? 1 : 0, newRule.order]
  );

  return newRule;
};

export const importReplaceRules = async (rules: Partial<ReplaceRule>[]): Promise<number> => {
  let count = 0;
  for (const rule of rules) {
    try {
      await addReplaceRule(rule);
      count++;
    } catch {}
  }
  return count;
};

export const getAllReplaceRules = async (): Promise<ReplaceRule[]> => {
  const rows = await queryAll<any>('SELECT * FROM replace_rules ORDER BY sort_order ASC');
  return rows.map(mapRowToRule);
};

export const getEnabledReplaceRules = async (): Promise<ReplaceRule[]> => {
  const rows = await queryAll<any>(
    'SELECT * FROM replace_rules WHERE isEnabled = 1 ORDER BY sort_order ASC'
  );
  return rows.map(mapRowToRule);
};

export const toggleReplaceRule = async (id: string, enabled: boolean): Promise<void> => {
  await execute('UPDATE replace_rules SET isEnabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
};

export const deleteReplaceRule = async (id: string): Promise<void> => {
  await execute('DELETE FROM replace_rules WHERE id = ?', [id]);
};

export const applyReplaceRules = async (content: string): Promise<string> => {
  const rules = await getEnabledReplaceRules();

  for (const rule of rules) {
    try {
      if (rule.isRegex) {
        content = content.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
      } else {
        content = content.split(rule.pattern).join(rule.replacement);
      }
    } catch {}
  }

  return content;
};

const mapRowToRule = (row: any): ReplaceRule => ({
  id: row.id,
  name: row.name,
  group: row.rule_group,
  pattern: row.pattern,
  replacement: row.replacement,
  scope: row.scope,
  isEnabled: row.isEnabled === 1,
  isRegex: row.isRegex === 1,
  order: row.sort_order,
});
