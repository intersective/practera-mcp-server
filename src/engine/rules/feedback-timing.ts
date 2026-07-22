import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * Feedback must arrive before the final submission activity.
 * Specifically: a 'learn' phase (feedback) activity must come before
 * the last 'develop' phase (revision/final submission) activity.
 */
export function feedbackTimingRule(design: ExperienceDesign): RuleResult {
  const findings = [];

  const sortedActivities = [...design.activities].sort((a, b) => {
    const mA = design.milestones.find(m => m.id === a.milestoneId)?.order ?? 0;
    const mB = design.milestones.find(m => m.id === b.milestoneId)?.order ?? 0;
    if (mA !== mB) return mA - mB;
    return a.order - b.order;
  });

  const learnPhaseActivities = sortedActivities.filter(a => a.buildLoopPhase === 'learn');
  const developPhaseActivities = sortedActivities.filter(a => a.buildLoopPhase === 'develop');

  if (learnPhaseActivities.length === 0 && design.activities.length > 0) {
    findings.push(finding(
      'feedbackTiming',
      'critical',
      'No feedback/review activities (BUILD phase: learn) have been defined. Learners receive no structured feedback before final submission.',
      { suggestion: 'Add at least one "learn" phase activity where learners receive feedback from peers or experts.' }
    ));
    return { findings };
  }

  if (developPhaseActivities.length === 0 && design.activities.length > 0) {
    findings.push(finding(
      'feedbackTiming',
      'high',
      'No revision/develop activities have been defined. The design lacks an improvement loop.',
      { suggestion: 'Add a "develop" phase activity where learners revise based on feedback.' }
    ));
    return { findings };
  }

  // Check that at least one learn activity precedes the last develop activity
  const lastDevelopIndex = sortedActivities.map(a => a.buildLoopPhase).lastIndexOf('develop');
  const lastLearnIndex = sortedActivities.map(a => a.buildLoopPhase).lastIndexOf('learn');

  if (lastLearnIndex > lastDevelopIndex && lastDevelopIndex !== -1) {
    findings.push(finding(
      'feedbackTiming',
      'critical',
      'The last feedback activity comes AFTER the last revision activity. Feedback cannot influence learner performance.',
      {
        affectedIds: [sortedActivities[lastLearnIndex]?.id, sortedActivities[lastDevelopIndex]?.id].filter(Boolean) as string[],
        suggestion: 'Reorder activities so feedback arrives before the final revision or submission.',
      }
    ));
  }

  // Check review cycles — review should not be post-final
  for (const cycle of design.reviewCycles) {
    if (cycle.reviewAfterDeadline) {
      findings.push(finding(
        'feedbackTiming',
        'high',
        `Review cycle "${cycle.name}" is configured to allow review after the final deadline. This feedback cannot affect performance.`,
        {
          affectedIds: [cycle.id],
          suggestion: 'Schedule the review to occur before the final submission deadline.',
        }
      ));
    }
  }

  return { findings };
}
