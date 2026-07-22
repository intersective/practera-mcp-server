import { ExperienceDesign } from '../schema/experience-design.js';
import { ACTIVITY_KIND_MINUTES } from '../schema/build-loop.js';
import { finding, RuleResult } from './types.js';

const OVERLOAD_THRESHOLD = 1.25; // 25% over budget triggers warning
const UNDERLOAD_THRESHOLD = 0.5;  // 50% under budget triggers warning

/** Estimated workload must fit the stated duration budget. */
export function workloadFitRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];
  const budgetMinutes = design.brief.durationHours * 60;

  if (design.activities.length === 0) return { findings };

  let minTotal = 0;
  let maxTotal = 0;

  for (const activity of design.activities) {
    if (activity.estimatedMinutes) {
      minTotal += activity.estimatedMinutes;
      maxTotal += activity.estimatedMinutes;
    } else {
      const [min, max] = ACTIVITY_KIND_MINUTES[activity.kind];
      minTotal += min;
      maxTotal += max;
    }
  }

  const estimatedMidpoint = (minTotal + maxTotal) / 2;
  const estimatedHours = Math.round(estimatedMidpoint / 6) / 10;

  if (estimatedMidpoint > budgetMinutes * OVERLOAD_THRESHOLD) {
    findings.push(finding(
      'workloadFit',
      'high',
      `Estimated workload (~${estimatedHours}h) exceeds the ${design.brief.durationHours}h budget by more than 25%. Learners will not finish.`,
      {
        suggestion: 'Remove or shorten activities, or increase the duration budget.',
      }
    ));
  } else if (estimatedMidpoint > budgetMinutes) {
    findings.push(finding(
      'workloadFit',
      'medium',
      `Estimated workload (~${estimatedHours}h) slightly exceeds the ${design.brief.durationHours}h budget. The schedule is tight.`,
      { suggestion: 'Review the scope of independent and research activities.' }
    ));
  } else if (estimatedMidpoint < budgetMinutes * UNDERLOAD_THRESHOLD) {
    findings.push(finding(
      'workloadFit',
      'medium',
      `Estimated workload (~${estimatedHours}h) is less than half the ${design.brief.durationHours}h budget. The experience may feel thin.`,
      { suggestion: 'Add depth: more research, iteration, or peer collaboration.' }
    ));
  }

  return { findings };
}
