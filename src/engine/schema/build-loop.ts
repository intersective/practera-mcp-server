import { z } from 'zod';

/**
 * BUILD Loop — proprietary framework for experiential learning design.
 *
 * B — Brief:             Encounter an authentic goal, audience and constraint.
 * U — Unpack:            Examine examples, tools, concepts and success criteria.
 * I — Implement:         Produce an initial working artifact.
 * L — Learn from evidence: Test, review, diagnose and receive feedback.
 * D — Develop again:     Revise, demonstrate and reflect.
 *
 * A module contains one or more BUILD loops. Loops may be nested (e.g.
 * a discovery loop inside a larger delivery loop).
 */
export const BuildLoopPhase = z.enum([
  'brief',           // B: encounter the authentic challenge
  'unpack',          // U: explore examples, concepts, tools
  'implement',       // I: produce initial artifact
  'learn',           // L: test, review, receive feedback
  'develop',         // D: revise, demonstrate, reflect
]);

export type BuildLoopPhase = z.infer<typeof BuildLoopPhase>;

export const BUILD_LOOP_PHASE_LABELS: Record<BuildLoopPhase, string> = {
  brief: 'Brief',
  unpack: 'Unpack',
  implement: 'Implement',
  learn: 'Learn from evidence',
  develop: 'Develop again',
};

export const BUILD_LOOP_PHASE_ORDER: BuildLoopPhase[] = [
  'brief',
  'unpack',
  'implement',
  'learn',
  'develop',
];

/**
 * Activity types used for workload estimation.
 */
export const ActivityKind = z.enum([
  'reading',           // Topic / content consumption
  'guided_task',       // Structured step-by-step task
  'independent_task',  // Open-ended work
  'peer_review',       // Reviewing another learner's work
  'reflection',        // Written or structured reflection
  'team_coordination', // Synchronous team collaboration
  'presentation',      // Demonstration / showcase
  'research',          // Independent research
  'feedback_response', // Acting on received feedback
  'assessment',        // Quiz / test
]);

export type ActivityKind = z.infer<typeof ActivityKind>;

/** Estimated minutes range [min, max] per activity kind for a single item */
export const ACTIVITY_KIND_MINUTES: Record<ActivityKind, [number, number]> = {
  reading:           [10, 30],
  guided_task:       [20, 60],
  independent_task:  [45, 120],
  peer_review:       [20, 45],
  reflection:        [15, 30],
  team_coordination: [30, 60],
  presentation:      [20, 45],
  research:          [30, 90],
  feedback_response: [20, 45],
  assessment:        [10, 30],
};
