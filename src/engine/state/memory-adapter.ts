import { ExperienceDesign } from '../schema/experience-design.js';
import type { StorageAdapter } from './storage-adapter.js';

interface StoredDesign {
  current: ExperienceDesign;
  history: ExperienceDesign[];
}

/**
 * In-memory storage adapter — all data is lost on process restart.
 * Use for local development, testing, and stdio transport.
 *
 * For production, replace with a PostgreSQL adapter (JSONB + version rows).
 */
export class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, StoredDesign>();

  async save(design: ExperienceDesign): Promise<ExperienceDesign> {
    const existing = this.store.get(design.id);
    const nextVersion = existing ? existing.current.version + 1 : design.version;
    const saved: ExperienceDesign = {
      ...design,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      existing.history.push(existing.current);
      existing.current = saved;
    } else {
      this.store.set(design.id, { current: saved, history: [] });
    }

    return saved;
  }

  async get(id: string): Promise<ExperienceDesign | null> {
    return this.store.get(id)?.current ?? null;
  }

  async getVersion(id: string, version: number): Promise<ExperienceDesign | null> {
    const stored = this.store.get(id);
    if (!stored) return null;
    if (stored.current.version === version) return stored.current;
    return stored.history.find(h => h.version === version) ?? null;
  }

  async listVersions(id: string): Promise<Array<{ version: number; updatedAt: string }>> {
    const stored = this.store.get(id);
    if (!stored) return [];
    return [
      ...stored.history.map(h => ({ version: h.version, updatedAt: h.updatedAt })),
      { version: stored.current.version, updatedAt: stored.current.updatedAt },
    ].sort((a, b) => a.version - b.version);
  }

  async list(): Promise<Array<{ id: string; version: number; concept: string; updatedAt: string }>> {
    return Array.from(this.store.values()).map(s => ({
      id: s.current.id,
      version: s.current.version,
      concept: s.current.brief.concept,
      updatedAt: s.current.updatedAt,
    }));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
