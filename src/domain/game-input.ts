export interface GameInput {
  title: string; language: string; description: string | null;
  source_reference: string; confidence: number; status: string;
  is_primary: boolean; approved: boolean;
}

export function parseGameInput(value: unknown): GameInput {
  if (!value || typeof value !== 'object') throw new Error('invalid_request');
  const data = value as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const source = typeof data.source_reference === 'string' ? data.source_reference.trim() : '';
  if (!title || title.length > 300 || !source || source.length > 2000 ||
      typeof data.language !== 'string' || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(data.language) ||
      typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) ||
      data.confidence < 0 || data.confidence > 1 ||
      !['draft', 'published', 'withdrawn'].includes(String(data.status)) ||
      typeof data.is_primary !== 'boolean' || typeof data.approved !== 'boolean' ||
      (data.description !== null && (typeof data.description !== 'string' || data.description.length > 20000))) {
    throw new Error('invalid_request');
  }
  let language: string | undefined;
  try { language = Intl.getCanonicalLocales(data.language)[0]; }
  catch { throw new Error('invalid_request'); }
  if (!language || language === 'und') throw new Error('invalid_request');
  return { title, language, source_reference: source, description: data.description as string | null,
    confidence: data.confidence, status: String(data.status), is_primary: data.is_primary, approved: data.approved };
}
