import { ExperienceDesign } from '../schema/experience-design.js';

export interface StorageAdapter {
  /** Create or overwrite a design (version is set by the adapter) */
  save(design: ExperienceDesign): Promise<ExperienceDesign>;

  /** Get the current version of a design */
  get(id: string): Promise<ExperienceDesign | null>;

  /** Get a specific version */
  getVersion(id: string, version: number): Promise<ExperienceDesign | null>;

  /** List all versions of a design (metadata only) */
  listVersions(id: string): Promise<Array<{ version: number; updatedAt: string }>>;

  /** List all designs (current versions only) */
  list(): Promise<Array<{ id: string; version: number; concept: string; updatedAt: string }>>;

  /** Delete all versions of a design */
  delete(id: string): Promise<void>;
}
