import type { GlobalOptions } from './types.js';

// ─── Rich Text / Property Flattening ────────────────────────────────────────

type RichTextItem = { plain_text?: string };
type RichTextArray = RichTextItem[];

function flattenRichText(rt: RichTextArray | unknown): string {
  if (!Array.isArray(rt)) return '';
  return rt.map((item: RichTextItem) => item.plain_text ?? '').join('');
}

type PropertyValue = {
  type?: string;
  title?: RichTextArray;
  rich_text?: RichTextArray;
  number?: number | null;
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  status?: { name?: string } | null;
  date?: { start?: string; end?: string | null } | null;
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  formula?: { type?: string; string?: string; number?: number; boolean?: boolean; date?: unknown };
  people?: Array<{ name?: string; id?: string }>;
  files?: Array<{ name?: string }>;
  relation?: Array<{ id?: string }>;
  rollup?: { type?: string; number?: number; array?: unknown[] };
  created_time?: string;
  last_edited_time?: string;
  created_by?: { id?: string; name?: string };
  last_edited_by?: { id?: string; name?: string };
  unique_id?: { prefix?: string | null; number?: number };
};

/**
 * Flatten a single property value into a human/agent-readable scalar.
 * Converts Notion's deeply nested property objects into strings/primitives.
 */
export function flattenProperty(prop: PropertyValue): unknown {
  if (!prop || !prop.type) return null;
  switch (prop.type) {
    case 'title': return flattenRichText(prop.title);
    case 'rich_text': return flattenRichText(prop.rich_text);
    case 'number': return prop.number ?? null;
    case 'select': return prop.select?.name ?? null;
    case 'multi_select': return prop.multi_select?.map((s) => s.name).join(', ') ?? '';
    case 'status': return prop.status?.name ?? null;
    case 'date': {
      const d = prop.date;
      if (!d) return null;
      return d.end ? `${d.start} → ${d.end}` : d.start ?? null;
    }
    case 'checkbox': return prop.checkbox ?? false;
    case 'url': return prop.url ?? null;
    case 'email': return prop.email ?? null;
    case 'phone_number': return prop.phone_number ?? null;
    case 'formula': {
      const f = prop.formula;
      if (!f) return null;
      return f.string ?? f.number ?? f.boolean ?? f.date ?? null;
    }
    case 'people': return prop.people?.map((p) => p.name ?? p.id).join(', ') ?? '';
    case 'files': return prop.files?.map((f) => f.name).join(', ') ?? '';
    case 'relation': return prop.relation?.map((r) => r.id).join(', ') ?? '';
    case 'rollup': {
      const r = prop.rollup;
      if (!r) return null;
      return r.type === 'number' ? r.number : JSON.stringify(r.array ?? r);
    }
    case 'created_time': return prop.created_time ?? null;
    case 'last_edited_time': return prop.last_edited_time ?? null;
    case 'created_by': return prop.created_by?.name ?? prop.created_by?.id ?? null;
    case 'last_edited_by': return prop.last_edited_by?.name ?? prop.last_edited_by?.id ?? null;
    case 'unique_id': {
      const u = prop.unique_id;
      if (!u) return null;
      return u.prefix ? `${u.prefix}-${u.number}` : String(u.number ?? '');
    }
    default: return null;
  }
}

/**
 * Given a page's properties object, return a flat key→value map.
 * Makes MCP responses readable without deep Notion schema knowledge.
 */
export function flattenProperties(
  properties: Record<string, PropertyValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(properties)) {
    result[key] = flattenProperty(val);
  }
  return result;
}

// ─── Output Helpers ──────────────────────────────────────────────────────────

function pickFields(obj: unknown, fields: string[]): unknown {
  if (Array.isArray(obj)) return obj.map((item) => pickFields(item, fields));
  if (typeof obj !== 'object' || obj === null) return obj;
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    result[f] = (obj as Record<string, unknown>)[f];
  }
  return result;
}

/**
 * Optionally flatten page properties when --flat is set.
 */
function maybeFlatten(obj: unknown, flat: boolean): unknown {
  if (!flat) return obj;
  if (Array.isArray(obj)) return obj.map((item) => maybeFlatten(item, flat));
  if (typeof obj !== 'object' || obj === null) return obj;
  const record = obj as Record<string, unknown>;

  // Flatten database objects: title is a rich_text array, normalize to a string (Friction #2)
  if (record.object === 'database' && Array.isArray(record.title)) {
    return {
      ...record,
      title: flattenRichText(record.title as RichTextArray),
    };
  }

  // Flatten page objects: properties map
  if (record.properties && typeof record.properties === 'object') {
    return {
      ...record,
      properties: flattenProperties(record.properties as Record<string, PropertyValue>),
    };
  }

  // Recurse into paginated result sets
  if (record.results && Array.isArray(record.results)) {
    return {
      ...record,
      results: record.results.map((item) => maybeFlatten(item, flat)),
    };
  }
  return obj;
}

/**
 * Normalize database titles unconditionally — always convert rich_text array to string.
 * This runs on every response, not just --flat, because raw rich_text is never useful output.
 */
function normalizeDbTitles(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeDbTitles);
  if (typeof obj !== 'object' || obj === null) return obj;
  const record = obj as Record<string, unknown>;
  if (record.object === 'database' && Array.isArray(record.title)) {
    return { ...record, title: flattenRichText(record.title as RichTextArray) };
  }
  if (record.results && Array.isArray(record.results)) {
    return { ...record, results: record.results.map(normalizeDbTitles) };
  }
  return obj;
}

export function printResult(result: unknown, opts: GlobalOptions): void {
  if (opts.quiet) return;

  // Always normalize database titles (rich_text array → string)
  let output = normalizeDbTitles(result);

  if (opts.flat) output = maybeFlatten(output, true);

  if (opts.fields) {
    const fields = opts.fields.split(',').map((f) => f.trim());
    output = pickFields(output, fields);
  }

  if (opts.pretty) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(JSON.stringify(output));
  }
}

export function printError(error: unknown): void {
  const msg =
    error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ error: msg }));
}

/**
 * Convert a plain string into a Notion rich_text array.
 * Used by commands that accept --text as a simple string input.
 */
export function toRichText(text: string): Array<{ type: 'text'; text: { content: string } }> {
  return [{ type: 'text', text: { content: text } }];
}
