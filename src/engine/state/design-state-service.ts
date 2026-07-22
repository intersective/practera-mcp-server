import { v4 as uuidv4 } from 'uuid';
import {
  ExperienceDesign,
  ExperienceDesignSchema,
  DesignBrief,
  MilestoneDesign,
  ActivityDesign,
  ArtifactDefinition,
  AssessmentDesign,
  ReviewCycle,
  LearningOutcome,
  Capability,
  AuthenticChallenge,
  Rubric,
} from '../schema/experience-design.js';
import type { StorageAdapter } from './storage-adapter.js';
import { MemoryAdapter } from './memory-adapter.js';

function now(): string {
  return new Date().toISOString();
}

/**
 * Central service for creating and mutating ExperienceDesign documents.
 * Every mutating operation produces a new version (the adapter handles incrementing).
 */
export class DesignStateService {
  private adapter: StorageAdapter;

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter ?? new MemoryAdapter();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async create(brief: DesignBrief): Promise<ExperienceDesign> {
    const design: ExperienceDesign = ExperienceDesignSchema.parse({
      id: uuidv4(),
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      brief,
      assumptions: [],
      outcomes: [],
      capabilities: [],
      milestones: [],
      activities: [],
      artifacts: [],
      assessments: [],
      rubrics: [],
      reviewCycles: [],
      dependencies: [],
    });
    return this.adapter.save(design);
  }

  async get(id: string): Promise<ExperienceDesign | null> {
    return this.adapter.get(id);
  }

  async getVersion(id: string, version: number): Promise<ExperienceDesign | null> {
    return this.adapter.getVersion(id, version);
  }

  async list() {
    return this.adapter.list();
  }

  async listVersions(id: string) {
    return this.adapter.listVersions(id);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }

  // ---------------------------------------------------------------------------
  // Brief updates
  // ---------------------------------------------------------------------------

  async updateBrief(id: string, updates: Partial<DesignBrief>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({ ...design, brief: { ...design.brief, ...updates } });
  }

  // ---------------------------------------------------------------------------
  // Outcomes and capabilities
  // ---------------------------------------------------------------------------

  async addOutcome(id: string, outcome: Omit<LearningOutcome, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newOutcome: LearningOutcome = { ...outcome, id: uuidv4() };
    return this.save({ ...design, outcomes: [...design.outcomes, newOutcome] });
  }

  async updateOutcome(id: string, outcomeId: string, updates: Partial<LearningOutcome>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({
      ...design,
      outcomes: design.outcomes.map(o => o.id === outcomeId ? { ...o, ...updates } : o),
    });
  }

  async addCapability(id: string, capability: Omit<Capability, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newCap: Capability = { ...capability, id: uuidv4() };
    return this.save({ ...design, capabilities: [...design.capabilities, newCap] });
  }

  async setChallenge(id: string, challenge: Omit<AuthenticChallenge, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({ ...design, challenge: { ...challenge, id: uuidv4() } });
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async addMilestone(id: string, milestone: Omit<MilestoneDesign, 'id' | 'order'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newMs: MilestoneDesign = {
      ...milestone,
      id: uuidv4(),
      order: design.milestones.length + 1,
      activityIds: milestone.activityIds ?? [],
    };
    return this.save({ ...design, milestones: [...design.milestones, newMs] });
  }

  async updateMilestone(id: string, milestoneId: string, updates: Partial<MilestoneDesign>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({
      ...design,
      milestones: design.milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m),
    });
  }

  async removeMilestone(id: string, milestoneId: string): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({
      ...design,
      milestones: design.milestones.filter(m => m.id !== milestoneId),
      activities: design.activities.filter(a => a.milestoneId !== milestoneId),
    });
  }

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------

  async addActivity(id: string, activity: Omit<ActivityDesign, 'id' | 'order'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const siblingsInMilestone = design.activities.filter(a => a.milestoneId === activity.milestoneId);
    const newAct: ActivityDesign = {
      ...activity,
      id: uuidv4(),
      order: siblingsInMilestone.length + 1,
      artifactIds: activity.artifactIds ?? [],
      assessmentIds: activity.assessmentIds ?? [],
      prerequisiteActivityIds: activity.prerequisiteActivityIds ?? [],
    };

    const milestone = design.milestones.find(m => m.id === activity.milestoneId);
    const updatedMilestones = milestone
      ? design.milestones.map(m =>
          m.id === milestone.id
            ? { ...m, activityIds: [...m.activityIds, newAct.id] }
            : m
        )
      : design.milestones;

    return this.save({ ...design, activities: [...design.activities, newAct], milestones: updatedMilestones });
  }

  async updateActivity(id: string, activityId: string, updates: Partial<ActivityDesign>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({
      ...design,
      activities: design.activities.map(a => a.id === activityId ? { ...a, ...updates } : a),
    });
  }

  // ---------------------------------------------------------------------------
  // Artifacts, assessments, rubrics, review cycles
  // ---------------------------------------------------------------------------

  async addArtifact(id: string, artifact: Omit<ArtifactDefinition, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newArtifact: ArtifactDefinition = { ...artifact, id: uuidv4() };
    return this.save({ ...design, artifacts: [...design.artifacts, newArtifact] });
  }

  async addAssessment(id: string, assessment: Omit<AssessmentDesign, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newAssessment: AssessmentDesign = { ...assessment, id: uuidv4() };
    return this.save({ ...design, assessments: [...design.assessments, newAssessment] });
  }

  async addRubric(id: string, rubric: Omit<Rubric, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newRubric: Rubric = { ...rubric, id: uuidv4() };
    return this.save({ ...design, rubrics: [...design.rubrics, newRubric] });
  }

  async addReviewCycle(id: string, cycle: Omit<ReviewCycle, 'id'>): Promise<ExperienceDesign> {
    const design = await this.require(id);
    const newCycle: ReviewCycle = { ...cycle, id: uuidv4() };
    return this.save({ ...design, reviewCycles: [...design.reviewCycles, newCycle] });
  }

  // ---------------------------------------------------------------------------
  // Bulk replace (for architecture generation)
  // ---------------------------------------------------------------------------

  async replaceArchitecture(
    id: string,
    payload: Pick<ExperienceDesign, 'milestones' | 'activities' | 'artifacts' | 'assessments' | 'rubrics' | 'reviewCycles' | 'dependencies' | 'outcomes' | 'capabilities' | 'challenge'>
  ): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({ ...design, ...payload });
  }

  async setQualityReport(id: string, report: ExperienceDesign['qualityReport']): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({ ...design, qualityReport: report });
  }

  async setPracteraMapping(id: string, mapping: ExperienceDesign['practeraMapping']): Promise<ExperienceDesign> {
    const design = await this.require(id);
    return this.save({ ...design, practeraMapping: mapping });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async require(id: string): Promise<ExperienceDesign> {
    const design = await this.adapter.get(id);
    if (!design) throw new Error(`Design not found: ${id}`);
    return design;
  }

  private async save(design: ExperienceDesign): Promise<ExperienceDesign> {
    return this.adapter.save({ ...design, updatedAt: now() });
  }
}

/** Singleton instance backed by the in-memory adapter (swappable via environment) */
export const designStateService = new DesignStateService();
