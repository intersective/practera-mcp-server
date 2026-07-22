import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * Concepts and artifacts must be introduced before they are required.
 * Checks: prerequisite activity IDs must come before the dependent activity in the sequence.
 */
export function prerequisiteOrderingRule(design: ExperienceDesign): RuleResult {
  const findings = [];

  const milestoneOrder = new Map(design.milestones.map(m => [m.id, m.order]));

  // Build position index: activityId -> position (milestone_order * 1000 + activity_order)
  const positionOf = (activityId: string): number => {
    const act = design.activities.find(a => a.id === activityId);
    if (!act) return -1;
    const msOrder = milestoneOrder.get(act.milestoneId) ?? 0;
    return msOrder * 1000 + act.order;
  };

  for (const activity of design.activities) {
    const actPos = positionOf(activity.id);
    for (const prereqId of activity.prerequisiteActivityIds) {
      const prereqPos = positionOf(prereqId);
      if (prereqPos === -1) {
        findings.push(finding(
          'prerequisiteOrdering',
          'medium',
          `Activity "${activity.name}" references a prerequisite activity that does not exist (id: ${prereqId}).`,
          { affectedIds: [activity.id], suggestion: 'Remove the stale prerequisite reference.' }
        ));
      } else if (prereqPos >= actPos) {
        const prereqActivity = design.activities.find(a => a.id === prereqId);
        findings.push(finding(
          'prerequisiteOrdering',
          'critical',
          `Activity "${activity.name}" requires "${prereqActivity?.name ?? prereqId}" as a prerequisite, but it appears later in the sequence.`,
          {
            affectedIds: [activity.id, prereqId],
            suggestion: 'Move the prerequisite activity earlier or adjust the dependency.',
          }
        ));
      }
    }
  }

  // Check that 'learn' phase activities (feedback) come after 'implement' phase
  const implementActivities = design.activities.filter(a => a.buildLoopPhase === 'implement');
  const learnActivities = design.activities.filter(a => a.buildLoopPhase === 'learn');

  for (const learnAct of learnActivities) {
    const learnPos = positionOf(learnAct.id);
    const implementBefore = implementActivities.some(i => positionOf(i.id) < learnPos);
    if (!implementBefore && implementActivities.length > 0) {
      findings.push(finding(
        'prerequisiteOrdering',
        'high',
        `Feedback activity "${learnAct.name}" has no preceding implementation activity. There is nothing to review yet.`,
        {
          affectedIds: [learnAct.id],
          suggestion: 'Ensure an "implement" activity produces work before the "learn" (feedback) activity.',
        }
      ));
    }
  }

  return { findings };
}
