export type AssetLanguage =
  | { kind: 'global'; tags: readonly [] }
  | { kind: 'localized'; tags: readonly string[] };

export function parseAssetLanguage(value: unknown): AssetLanguage {
  if (!value || typeof value !== 'object') throw new Error('Invalid language classification');
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.tags)) throw new Error('Language tags are required');
  if (input.kind === 'global' && input.tags.length === 0) return { kind: 'global', tags: [] };
  if (input.kind !== 'localized' || input.tags.length === 0 || input.tags.length > 8) {
    throw new Error('Localized artwork requires language tags; Global has none');
  }
  const tags = input.tags.map((tag: unknown) => {
    if (typeof tag !== 'string' || tag.length > 35 || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(tag)) {
      throw new Error('Invalid language tag');
    }
    const canonical = Intl.getCanonicalLocales(tag)[0];
    if (!canonical || canonical === 'und') throw new Error('Unknown is not Global');
    return canonical;
  });
  return { kind: 'localized', tags: [...new Set(tags)] };
}

export function languageRank(
  asset: AssetLanguage,
  requested: string | 'global',
  allowBaseFallback = false,
): number | null {
  if (requested === 'global') return asset.kind === 'global' ? 0 : null;
  const request = parseAssetLanguage({ kind: 'localized', tags: [requested] });
  if (request.kind !== 'localized') return null;
  const tag = request.tags[0]!;
  if (asset.kind === 'global') return 2;
  if (asset.tags.includes(tag)) return 0;
  if (allowBaseFallback && tag.includes('-') && asset.tags.includes(tag.split('-')[0]!)) return 1;
  return null;
}
