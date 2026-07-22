import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/**
 * Learners must be able to demonstrate genuine competence even when AI tools
 * are available. The design should require explanation, decision-making, and
 * debugging — not just AI output submission.
 */
export function aiResilienceRule(design: ExperienceDesign): RuleResult {
  const findings: import("../schema/experience-design.js").QualityFinding[] = [];

  if (design.assessments.length === 0 && design.artifacts.length === 0) return { findings };

  const explanationKeywords = [
    'explain', 'justify', 'why', 'decision', 'rationale', 'critique', 'evaluate',
    'defend', 'compare', 'analyse', 'analyze', 'reflect', 'describe your process',
    'what would you change', 'what did you learn', 'debugging', 'error', 'test',
  ];

  const hasExplanationRequirement = design.assessments.some(a =>
    a.questions.some(q => {
      const text = q.text.toLowerCase();
      return explanationKeywords.some(kw => text.includes(kw));
    })
  );

  if (!hasExplanationRequirement) {
    findings.push(finding(
      'aiResilience',
      'high',
      'No assessment requires learners to explain, justify, or critique their work. A learner could submit AI-generated content without demonstrating understanding.',
      {
        suggestion: 'Add questions requiring learners to explain a decision, critique an AI output, or describe a debugging step in their own words.',
      }
    ));
  }

  // Check for artifacts that require observable process evidence
  const hasProcessEvidence = design.artifacts.some(a =>
    a.requiredEvidence.some(e => {
      const lower = e.toLowerCase();
      return explanationKeywords.some(kw => lower.includes(kw)) ||
        lower.includes('log') || lower.includes('commit') || lower.includes('iteration');
    })
  );

  if (design.artifacts.length > 0 && !hasProcessEvidence) {
    findings.push(finding(
      'aiResilience',
      'medium',
      'No artifact requires process evidence (logs, commits, iterations). Learners could submit polished AI output without demonstrating their own work.',
      {
        suggestion: 'Add process evidence requirements to at least one artifact (e.g. git history, AI interaction log, test notes).',
      }
    ));
  }

  return { findings };
}
