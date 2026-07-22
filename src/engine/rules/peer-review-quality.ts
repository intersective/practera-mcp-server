import { ExperienceDesign } from '../schema/experience-design.js';
import { finding, RuleResult } from './types.js';

/** Peer reviews must be meaningful: criteria, calibration, response required. */
export function peerReviewQualityRule(design: ExperienceDesign): RuleResult {
  const findings = [];
  const peerReviews = design.assessments.filter(a => a.type === 'peer_review');

  if (design.reviewCycles.length === 0 && peerReviews.length > 0) {
    findings.push(finding(
      'peerReviewQuality',
      'medium',
      'Peer review assessments exist but no review cycles have been configured. Review workflow is undefined.',
      { suggestion: 'Use design_peer_review_cycle to configure the review workflow.' }
    ));
  }

  for (const cycle of design.reviewCycles) {
    const reviewAssessment = cycle.reviewAssessmentId
      ? design.assessments.find(a => a.id === cycle.reviewAssessmentId)
      : null;

    if (!cycle.reviewAssessmentId || !reviewAssessment) {
      findings.push(finding(
        'peerReviewQuality',
        'high',
        `Review cycle "${cycle.name}" has no review assessment defined. Reviewers have no structured form.`,
        {
          affectedIds: [cycle.id],
          suggestion: 'Create a peer_review assessment and link it to this cycle.',
        }
      ));
      continue;
    }

    if (!reviewAssessment.rubricId) {
      findings.push(finding(
        'peerReviewQuality',
        'high',
        `Review cycle "${cycle.name}" has no rubric. Reviewers lack criteria and consistent standards.`,
        {
          affectedIds: [cycle.id, reviewAssessment.id],
          suggestion: 'Generate a rubric for the review assessment.',
        }
      ));
    }

    if (!reviewAssessment.reviewConfig?.calibrationExampleProvided) {
      findings.push(finding(
        'peerReviewQuality',
        'medium',
        `Review cycle "${cycle.name}" has no calibration example. Reviewers may apply criteria inconsistently.`,
        {
          affectedIds: [cycle.id],
          suggestion: 'Provide an annotated example submission to calibrate reviewers.',
        }
      ));
    }

    if (!cycle.revisionEnabled) {
      findings.push(finding(
        'peerReviewQuality',
        'medium',
        `Review cycle "${cycle.name}" does not require learners to act on feedback. Review becomes ceremonial.`,
        {
          affectedIds: [cycle.id],
          suggestion: 'Enable revision and require a response-to-feedback statement.',
        }
      ));
    }

    if (cycle.numReviewsPerSubmission < 2) {
      findings.push(finding(
        'peerReviewQuality',
        'info',
        `Review cycle "${cycle.name}" assigns only ${cycle.numReviewsPerSubmission} reviewer per submission. Multiple reviewers reduce bias.`,
        { affectedIds: [cycle.id], suggestion: 'Consider assigning 2–3 reviewers per submission.' }
      ));
    }
  }

  return { findings };
}
