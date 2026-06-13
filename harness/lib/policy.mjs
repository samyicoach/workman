// Loads a policy module by id and normalizes its optional hooks.
import { join } from 'node:path';
import { ROOT } from './util.mjs';

export async function loadPolicy(policyId) {
  const mod = await import(join(ROOT, 'policies', policyId, 'scanner.mjs'));
  if (typeof mod.scanPage !== 'function') {
    throw new Error(`Policy "${policyId}" must export scanPage()`);
  }
  return {
    id: mod.id || policyId,
    name: mod.name || policyId,
    scanPage: mod.scanPage,
    scanSource: typeof mod.scanSource === 'function' ? mod.scanSource : null,
  };
}
