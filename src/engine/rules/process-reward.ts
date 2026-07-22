import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * Assessment should reward process (documentation, iteration, decision-making)
 * not only final polish. At least one assessment should target process evidence.
 */
export function processRewardRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];

  if (design.assessments.length === 0) return { findings };

  // Process-indicating keywords in question text or assessment name
  const processKeywords = [
    'log', 'journal', 'decision', 'rationale', 'iteration', 'debug', 'reflection',
    'process', 'approach', 'reasoning', 'evidence', 'documentation', 'revision',
    'how you', 'why you', 'explain your', 'describe your',
  ];

  const hasProcessQuestion = design.assessments.some(assessment =>
    assessment.questions.some(q => {
      const text = (q.text + ' ' + (assessment.name ?? '')).toLowerCase();
      return processKeywords.some(kw => text.includes(kw));
    }) ||
    processKeywords.some(kw => (assessment.name ?? '').toLowerCase().includes(kw))
  );

  if (!hasProcessQuestion) {
    findings.push(finding(
      'processReward',
      'high',
      'No assessment appears to evaluate the learning process (decisions, iterations, debugging, reflection). Only outputs are measured.',
      {
        suggestion: 'Add questions that ask learners to explain their approach, document a debugging episode, or reflect on decisions made.',
      }
    ));
  }

  // Self-assessment is valuable for process awareness
  const hasSelfAssessment = design.assessments.some(a => a.type === 'self_assessment');
  if (!hasSelfAssessment) {
    findings.push(finding(
      'processReward',
      'info',
      'No self-assessment activity is included. Self-reflection helps learners recognize their own development.',
      { suggestion: 'Consider adding a brief self-assessment or individual reflection at the end.' }
    ));
  }

  return { findings };
}
