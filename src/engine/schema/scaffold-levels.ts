import { z } from 'zod';

/**
 * Scaffold taxonomy — tracks the degree of learner autonomy.
 * Progression rule: scaffold level must not decrease across sequential
 * activities unless a new skill domain is being introduced.
 */
export const ScaffoldLevel = z.enum([
  'modelled',     // Learner examines or modifies a completed example
  'guided',       // Learner follows structured steps with checkpoints
  'supported',    // Learner chooses approach, receives tools and prompts
  'independent',  // Learner defines and executes the approach
  'transferred',  // Learner applies capability in a new context
]);

export type ScaffoldLevel = z.infer<typeof ScaffoldLevel>;

export const SCAFFOLD_LEVEL_ORDER: Record<ScaffoldLevel, number> = {
  modelled: 0,
  guided: 1,
  supported: 2,
  independent: 3,
  transferred: 4,
};

export const ScaffoldLevelDescription: Record<ScaffoldLevel, string> = {
  modelled: 'Learner examines or modifies a completed example',
  guided: 'Learner follows structured steps with checkpoints',
  supported: 'Learner chooses approach but receives tools and prompts',
  independent: 'Learner defines and executes the approach',
  transferred: 'Learner applies capability in an unfamiliar context',
};
