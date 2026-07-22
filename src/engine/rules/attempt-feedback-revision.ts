import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * The design must contain at least one complete attempt → feedback → revision loop.
 * A complete loop requires: implement phase → learn phase → develop phase.
 */
export function attemptFeedbackRevisionRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];

  if (design.activities.length === 0) return { findings };

  const phases = new Set(design.activities.map(a => a.buildLoopPhase));

  const hasImplement = phases.has('implement');
  const hasLearn = phases.has('learn');
  const hasDevelop = phases.has('develop');

  if (!hasImplement) {
    findings.push(finding(
      'attemptFeedbackRevision',
      'critical',
      'No "implement" phase activities exist. Learners never produce an initial artifact to receive feedback on.',
      { suggestion: 'Add an implementation activity where learners produce their first artifact.' }
    ));
  }

  if (!hasLearn) {
    findings.push(finding(
      'attemptFeedbackRevision',
      'critical',
      'No "learn" phase activities exist. Learners receive no structured feedback.',
      { suggestion: 'Add a feedback or review activity.' }
    ));
  }

  if (!hasDevelop) {
    findings.push(finding(
      'attemptFeedbackRevision',
      'critical',
      'No "develop" phase activities exist. Learners cannot act on feedback — there is no improvement loop.',
      { suggestion: 'Add a revision or final submission activity after the feedback step.' }
    ));
  }

  // Check that revision activities are connected to feedback sources
  const revisionActivities = design.activities.filter(a => a.buildLoopPhase === 'develop');
  for (const rev of revisionActivities) {
    if (!rev.feedbackSource || rev.feedbackSource === 'none') {
      findings.push(finding(
        'attemptFeedbackRevision',
        'medium',
        `Revision activity "${rev.name}" has no feedback source defined. It is unclear what learners are responding to.`,
        {
          affectedIds: [rev.id],
          suggestion: 'Set a feedback source (peer, expert, or automated) for this activity.',
        }
      ));
    }
  }

  return { findings };
}
