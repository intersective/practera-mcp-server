import { ExperienceDesign, QualityFinding } from '../schema/experience-design.js';

export interface RuleResult {
  findings: QualityFinding[];
}

export type Rule = (design: ExperienceDesign) => RuleResult;

export function finding(
  rule: string,
  severity: QualityFinding['severity'],
  message: string,
  options?: { affectedIds?: string[]; suggestion?: string }
): QualityFinding {
  return { rule, severity, message, ...options };
}
