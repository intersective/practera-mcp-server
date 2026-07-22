import { ExperienceDesign } from '../schema/experience-design.js';
import { SCAFFOLD_LEVEL_ORDER } from '../schema/scaffold-levels.js';
import { finding, RuleResult } from './types.js';

/**
 * Scaffold complexity must increase appropriately across the experience.
 * Beginners must not start at "independent". Advanced modules must not
 * remain at "guided" throughout.
 */
export function scaffoldProgressionRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];

  if (design.activities.length === 0) return { findings };

  const sortedActivities = [...design.activities].sort((a, b) => {
    const mA = design.milestones.find(m => m.id === a.milestoneId)?.order ?? 0;
    const mB = design.milestones.find(m => m.id === b.milestoneId)?.order ?? 0;
    if (mA !== mB) return mA - mB;
    return a.order - b.order;
  });

  const firstActivity = sortedActivities[0];
  const startingLevel = design.brief.startingLevel?.toLowerCase() ?? '';
  const isBeginner = startingLevel.includes('beginner') || startingLevel.includes('novice') || startingLevel.includes('no experience');

  // Beginners should not start at independent or transferred
  if (isBeginner && firstActivity) {
    const firstLevel = SCAFFOLD_LEVEL_ORDER[firstActivity.scaffoldLevel];
    if (firstLevel >= SCAFFOLD_LEVEL_ORDER['independent']) {
      findings.push(finding(
        'scaffoldProgression',
        'critical',
        `The first activity "${firstActivity.name}" uses "${firstActivity.scaffoldLevel}" scaffolding but learners are beginners. Starting without structure will cause early failure.`,
        {
          affectedIds: [firstActivity.id],
          suggestion: 'Begin with "modelled" or "guided" scaffolding for beginner audiences.',
        }
      ));
    }
  }

  // Detect scaffold regression (going backwards without a new domain introduction)
  let maxSeenLevel = SCAFFOLD_LEVEL_ORDER[sortedActivities[0].scaffoldLevel];
  for (let i = 1; i < sortedActivities.length; i++) {
    const act = sortedActivities[i];
    const currentLevel = SCAFFOLD_LEVEL_ORDER[act.scaffoldLevel];

    // Allow regression by at most one level (new sub-skill being introduced)
    if (currentLevel < maxSeenLevel - 1) {
      findings.push(finding(
        'scaffoldProgression',
        'medium',
        `Activity "${act.name}" (${act.scaffoldLevel}) is significantly less demanding than preceding activities. This may signal an unintended scaffold regression.`,
        {
          affectedIds: [act.id],
          suggestion: 'If this is a new sub-skill, add a note to the activity description. Otherwise adjust the scaffold level.',
        }
      ));
    }

    if (currentLevel > maxSeenLevel) maxSeenLevel = currentLevel;
  }

  // Advanced audiences should not be stuck at modelled/guided throughout
  const isAdvanced = startingLevel.includes('advanced') || startingLevel.includes('expert');
  const maxLevel = Math.max(...sortedActivities.map(a => SCAFFOLD_LEVEL_ORDER[a.scaffoldLevel]));
  if (isAdvanced && maxLevel <= SCAFFOLD_LEVEL_ORDER['guided']) {
    findings.push(finding(
      'scaffoldProgression',
      'medium',
      'The audience is described as advanced but no activity reaches "supported" or higher scaffolding. Advanced learners are over-structured.',
      { suggestion: 'Include "independent" or "transferred" activities for advanced learners.' }
    ));
  }

  // Experience should not remain at modelled the entire way through
  const allModelled = sortedActivities.every(a => a.scaffoldLevel === 'modelled');
  if (allModelled && sortedActivities.length > 2) {
    findings.push(finding(
      'scaffoldProgression',
      'high',
      'All activities use "modelled" scaffolding. Learners never produce independent work.',
      { suggestion: 'Progress to "guided" and then "supported" scaffolding in later activities.' }
    ));
  }

  return { findings };
}
