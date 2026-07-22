import { marked } from 'marked';
import { ExperienceDesign, ActivityDesign, AssessmentDesign } from '../schema/experience-design.js';
import { deterministicUuid } from './id-generator.js';
import type {
  PracteraExportPackage,
  PracteraExportProgram,
  PracteraExportExperience,
  PracteraExportProject,
  PracteraExportMilestone,
  PracteraExportActivity,
  PracteraExportActivitySequence,
  PracteraExportTopic,
  PracteraExportAssessment,
  PracteraExportAssessmentGroup,
  PracteraExportAssessmentRecord,
  PracteraExportAssessmentGroupQuestion,
  PracteraExportAssessmentQuestion,
  PracteraExportAssessmentQuestionChoice,
  PracteraExportAssessmentChoice,
  PracteraExportAchievement,
  PracteraExportAchievementCondition,
  PracteraExportContext,
  CompilerResult,
} from './types.js';

const TS = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string;
  return html.trim();
}

/**
 * Compile an ExperienceDesign into a Practera legacy export package.
 * The output is importable via importExperienceData / importExperienceJson.
 */
export function compileDesign(design: ExperienceDesign, institutionId = 'default'): CompilerResult {
  const warnings: string[] = [];
  const d = design.id;

  // Stable UUIDs
  const programUuid = deterministicUuid(d, 'program');
  const experienceUuid = deterministicUuid(d, 'experience');
  const projectUuid = deterministicUuid(d, 'project');

  // -------------------------------------------------------------------------
  // Program
  // -------------------------------------------------------------------------
  const program: PracteraExportProgram = {
    id: programUuid,
    experience_id: experienceUuid,
    institution_id: institutionId,
    name: design.brief.concept,
    description: design.brief.desiredOutcome,
    program_code: slug(design.brief.concept).slice(0, 20),
    slug: slug(design.brief.concept),
    login_content: '',
    dashboard_content: null,
    support_email: 'support@practera.com',
    max_achievable_points: 100,
    archived: false,
    deleted: false,
    created: TS(),
    modified: TS(),
  };

  // -------------------------------------------------------------------------
  // Experience
  // -------------------------------------------------------------------------
  const experience: PracteraExportExperience = {
    id: experienceUuid,
    uuid: experienceUuid,
    institution_id: institutionId,
    name: design.brief.concept,
    description: toHtml(design.challenge?.scenario ?? design.brief.desiredOutcome),
    experience_type: 'Accelerator',
    status: 'draft',
    slug: slug(design.brief.concept),
    appkey: deterministicUuid(d, 'appkey').replace(/-/g, '').slice(0, 32),
    lead_url: '',
    logo_url: '',
    tags: '',
    allow_signup: false,
    archived: false,
    deleted: false,
    created: TS(),
    modified: TS(),
    config: {},
  };

  // -------------------------------------------------------------------------
  // Project
  // -------------------------------------------------------------------------
  const project: PracteraExportProject = {
    id: projectUuid,
    experience_id: experienceUuid,
    program_id: programUuid,
    institution_id: institutionId,
    name: design.challenge?.title ?? design.brief.concept,
    description: toHtml(design.challenge?.scenario ?? ''),
    lead_image: '',
    is_template: false,
    archived: false,
    deleted: false,
    created: TS(),
    modified: TS(),
  };

  // -------------------------------------------------------------------------
  // Milestones
  // -------------------------------------------------------------------------
  const sortedMilestones = [...design.milestones].sort((a, b) => a.order - b.order);
  const milestones: PracteraExportMilestone[] = sortedMilestones.map((ms, idx) => ({
    id: deterministicUuid(d, 'milestone', ms.id),
    project_id: projectUuid,
    name: ms.name,
    description: ms.description ? toHtml(ms.description) : '',
    order: idx + 1,
    duration: ms.durationDays ?? 0,
    visibility: 15,
    delivery: 0,
    unlock_id: null,
    reveal_id: null,
    parent_id: null,
    deleted: false,
    created: TS(),
    modified: TS(),
  }));

  // Milestone uuid map: design ID -> export UUID
  const milestoneUuidMap = new Map(
    design.milestones.map(ms => [ms.id, deterministicUuid(d, 'milestone', ms.id)])
  );

  // -------------------------------------------------------------------------
  // Activities + ActivitySequences + Topics
  // -------------------------------------------------------------------------
  const activities: PracteraExportActivity[] = [];
  const sequences: PracteraExportActivitySequence[] = [];
  const topics: PracteraExportTopic[] = [];

  // Pre-build assessment uuid map
  const assessmentUuidMap = new Map(
    design.assessments.map(a => [a.id, deterministicUuid(d, 'assessment', a.id)])
  );

  const sortedActivities = [...design.activities].sort((a, b) => {
    const msA = design.milestones.find(m => m.id === a.milestoneId)?.order ?? 0;
    const msB = design.milestones.find(m => m.id === b.milestoneId)?.order ?? 0;
    if (msA !== msB) return msA - msB;
    return a.order - b.order;
  });

  // Track sequence order per activity
  const activitySequenceCounters = new Map<string, number>();

  for (const act of sortedActivities) {
    const actUuid = deterministicUuid(d, 'activity', act.id);
    const msUuid = milestoneUuidMap.get(act.milestoneId);

    if (!msUuid) {
      warnings.push(`Activity "${act.name}" references missing milestone ${act.milestoneId}`);
      continue;
    }

    // Get activities in the same milestone for ordering
    const msActivities = sortedActivities.filter(a => a.milestoneId === act.milestoneId);
    const actOrderInMs = msActivities.findIndex(a => a.id === act.id) + 1;

    activities.push({
      id: actUuid,
      milestone_id: msUuid,
      name: act.name,
      description: act.description ? toHtml(act.description) : '',
      instructions: act.instructions ? toHtml(act.instructions) : '',
      order: actOrderInMs,
      duration: act.estimatedMinutes ?? 0,
      offset: 0,
      visibility: 15,
      delivery: 0,
      type: 'default',
      lead_image: '',
      video_url: '',
      unlock_id: null,
      reveal_id: null,
      parent_id: null,
      deleted: false,
      created: TS(),
      modified: TS(),
    });

    activitySequenceCounters.set(actUuid, 0);

    // Create an intro topic for the activity (from instructions/description)
    const introContent = act.instructions ?? act.description;
    if (introContent) {
      const topicUuid = deterministicUuid(d, 'topic', act.id, 'intro');
      topics.push({
        id: topicUuid,
        program_id: programUuid,
        experience_id: experienceUuid,
        project_id: projectUuid,
        title: act.name,
        summary: act.description ?? '',
        content: toHtml(introContent),
        story_type: 'topic',
        videolink: '',
        visibility: 15,
        author_id: '',
        assessment_id: null,
        has_comments: false,
        tags: '',
        deleted: false,
        created: TS(),
        modified: TS(),
      });

      const seqOrder = (activitySequenceCounters.get(actUuid) ?? 0) + 1;
      activitySequenceCounters.set(actUuid, seqOrder);
      sequences.push({
        id: deterministicUuid(d, 'seq', actUuid, 'topic', topicUuid),
        activity_id: actUuid,
        model: 'Story.Topic',
        model_id: topicUuid,
        order: seqOrder,
        value: null,
        branch: null,
        unlock_id: null,
        reveal_id: null,
        deleted: false,
        created: TS(),
        modified: TS(),
      });
    }

    // Add assessment sequences for assessments in this activity
    for (const assessmentId of act.assessmentIds) {
      const assessmentUuid = assessmentUuidMap.get(assessmentId);
      if (!assessmentUuid) {
        warnings.push(`Activity "${act.name}" references missing assessment ${assessmentId}`);
        continue;
      }
      const seqOrder = (activitySequenceCounters.get(actUuid) ?? 0) + 1;
      activitySequenceCounters.set(actUuid, seqOrder);
      sequences.push({
        id: deterministicUuid(d, 'seq', actUuid, 'assessment', assessmentUuid),
        activity_id: actUuid,
        model: 'Assess.Assessment',
        model_id: assessmentUuid,
        order: seqOrder,
        value: null,
        branch: null,
        unlock_id: null,
        reveal_id: null,
        deleted: false,
        created: TS(),
        modified: TS(),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Assessments (nested format)
  // -------------------------------------------------------------------------
  const assessments: PracteraExportAssessment[] = design.assessments.map(a => {
    const assessUuid = assessmentUuidMap.get(a.id)!;
    return buildAssessment(a, assessUuid, experienceUuid, programUuid, projectUuid, d);
  });

  // -------------------------------------------------------------------------
  // Achievements (one per unlock-on-submit per assessment)
  // -------------------------------------------------------------------------
  const achievements: PracteraExportAchievement[] = [];
  const achievementConditions: PracteraExportAchievementCondition[] = [];

  for (const rc of design.reviewCycles) {
    const submissionAssessUuid = assessmentUuidMap.get(rc.submissionAssessmentId);
    if (!submissionAssessUuid) continue;

    const achieveUuid = deterministicUuid(d, 'achievement', 'submit', rc.id);
    achievements.push({
      id: achieveUuid,
      uuid: achieveUuid,
      name: `Submitted: ${rc.name}`,
      description: `Awarded when learner submits their work for ${rc.name}.`,
      unearned_description: `Submit your work to earn this.`,
      model: 'Project.Project',
      model_id: projectUuid,
      project_id: projectUuid,
      condition: 'AND',
      scope: 'individual',
      points: 10,
      threshold: '1',
      visibility: 15,
      is_default: false,
      multi_achievable: false,
      check_past: false,
      tags: '',
      deleted: false,
      created: TS(),
      modified: TS(),
    });

    achievementConditions.push({
      id: deterministicUuid(d, 'ach-cond', achieveUuid, submissionAssessUuid),
      achievement_id: achieveUuid,
      model_name: 'Assess.Assessment',
      model_id: submissionAssessUuid,
      property: 'submitted',
      operator: '=',
      value: '1',
      weight: '1',
      required: true,
      team_criteria: 0,
      created: TS(),
      modified: TS(),
    });
  }

  // -------------------------------------------------------------------------
  // Contexts (link assessments to activities)
  // -------------------------------------------------------------------------
  const contexts: PracteraExportContext[] = [];

  for (const act of sortedActivities) {
    const actUuid = deterministicUuid(d, 'activity', act.id);

    for (const assessmentId of act.assessmentIds) {
      const assessmentUuid = assessmentUuidMap.get(assessmentId);
      if (!assessmentUuid) continue;

      contexts.push({
        id: deterministicUuid(d, 'context', actUuid, assessmentUuid),
        uuid: deterministicUuid(d, 'context-uuid', actUuid, assessmentUuid),
        context_model: 'Project.Activity',
        context_model_id: actUuid,
        reference_model: 'Assess.Assessment',
        reference_model_id: assessmentUuid,
        scope: 'project',
        scope_id: projectUuid,
        order: 1,
        created: TS(),
        modified: TS(),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Package assembly
  // -------------------------------------------------------------------------
  const pkg: PracteraExportPackage = {
    name: design.brief.concept,
    description: design.brief.desiredOutcome,
    type: 'Accelerator',
    isPublic: false,
    attributes: [],
    data: {
      Program: program,
      Experience: experience,
      Project: project,
      Milestone: milestones,
      Activity: activities,
      ActivitySequence: sequences,
      Topic: topics,
      Assessment: assessments,
      Achievement: achievements,
      AchievementCondition: achievementConditions,
      Context: contexts,
      Filestore: [],
      Export: { id: 0 },
    },
  };

  return {
    package: pkg,
    stats: {
      milestones: milestones.length,
      activities: activities.length,
      sequences: sequences.length,
      topics: topics.length,
      assessments: assessments.length,
      achievements: achievements.length,
      achievementConditions: achievementConditions.length,
      contexts: contexts.length,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Assessment compiler helper
// ---------------------------------------------------------------------------

function mapAssessmentType(type: AssessmentDesign['type']): string {
  const map: Record<AssessmentDesign['type'], string> = {
    submission: 'moderated',
    peer_review: 'moderated',
    self_assessment: 'moderated',
    quiz: 'quiz',
    checkpoint: 'moderated',
  };
  return map[type] ?? 'moderated';
}

function mapQuestionType(type: string): string {
  const map: Record<string, string> = {
    text: 'text',
    oneof: 'oneof',
    multiple: 'multiple',
    slider: 'slider',
    file: 'file',
  };
  return map[type] ?? 'text';
}

function buildAssessment(
  a: AssessmentDesign,
  assessUuid: string,
  experienceUuid: string,
  programUuid: string,
  projectUuid: string,
  designId: string,
): PracteraExportAssessment {
  const assessmentRecord: PracteraExportAssessmentRecord = {
    id: assessUuid,
    name: a.name,
    description: a.description ? toHtml(a.description) : '',
    assessment_type: mapAssessmentType(a.type),
    is_team: a.isTeam,
    is_live: false,
    pulse_check: false,
    score_type: 'numeric',
    experience_id: experienceUuid,
    program_id: programUuid,
    project_id: projectUuid,
    visibility: 15,
    review_type: a.type === 'peer_review' ? 'peer' : 'none',
    review_role: a.type === 'peer_review' ? 'participant' : '',
    review_scope: 'individual',
    review_period: a.reviewConfig?.numReviews ?? 0,
    num_reviews: a.reviewConfig?.numReviews ?? 0,
    review_instructions: a.reviewConfig?.reviewerInstructions ?? null,
    is_repeatable: false,
    auto_publish_reviews: a.reviewConfig ? !a.reviewConfig.anonymized : false,
    parent_id: null,
    deleted: false,
    created: TS(),
    modified: TS(),
  };

  // Build one group containing all questions
  const groupUuid = deterministicUuid(designId, 'agroup', assessUuid);
  const groupQuestions: PracteraExportAssessmentGroupQuestion[] = a.questions.map((q, qIdx) => {
    const questionUuid = deterministicUuid(designId, 'question', assessUuid, q.id);
    const choices: PracteraExportAssessmentQuestionChoice[] = (q.choices ?? []).map((c, cIdx) => {
      const choiceUuid = deterministicUuid(designId, 'choice', questionUuid, c.id);
      const assessmentChoice: PracteraExportAssessmentChoice = {
        id: choiceUuid,
        name: c.label,
        description: '',
        order: cIdx + 1,
        weight: c.weight ?? 0,
      };
      const qChoice: PracteraExportAssessmentQuestionChoice = {
        id: deterministicUuid(designId, 'qchoice', questionUuid, choiceUuid),
        assessment_question_id: questionUuid,
        assessment_choice_id: choiceUuid,
        order: cIdx + 1,
        weight: c.weight ?? 0,
        explanation: '',
        AssessmentChoice: assessmentChoice,
      };
      return qChoice;
    });

    const question: PracteraExportAssessmentQuestion = {
      id: questionUuid,
      assessment_id: assessUuid,
      name: q.text,
      description: '',
      hint: '',
      prompt: '',
      question_type: mapQuestionType(q.type),
      is_required: q.required,
      has_comment: false,
      audience: q.audience === 'submitter' ? 'reviewer' : q.audience === 'reviewer' ? 'reviewer' : 'reviewer',
      file_type: null,
      answer: null,
      exemplar: null,
      score: null,
      created: TS(),
      modified: TS(),
      AssessmentQuestionChoice: choices,
    };

    const gq: PracteraExportAssessmentGroupQuestion = {
      id: deterministicUuid(designId, 'gq', groupUuid, questionUuid),
      assessment_group_id: groupUuid,
      assessment_question_id: questionUuid,
      order: qIdx + 1,
      AssessmentQuestion: question,
    };
    return gq;
  });

  const group: PracteraExportAssessmentGroup = {
    id: groupUuid,
    assessment_id: assessUuid,
    name: 'Questions',
    description: '',
    order: 1,
    review_instructions: a.reviewConfig?.reviewerInstructions ?? '',
    restart_numbering: false,
    AssessmentGroupQuestion: groupQuestions,
  };

  return {
    Assessment: assessmentRecord,
    AssessmentGroup: [group],
  };
}

// ---------------------------------------------------------------------------
// Integrity validator
// ---------------------------------------------------------------------------

export function validateIntegrity(pkg: PracteraExportPackage): string[] {
  const errors: string[] = [];
  const data = pkg.data;

  const milestoneIds = new Set(data.Milestone.map(m => m.id));
  const activityIds = new Set(data.Activity.map(a => a.id));
  const topicIds = new Set(data.Topic.map(t => t.id));
  const assessmentIds = new Set(data.Assessment.map(a => a.Assessment.id));

  for (const act of data.Activity) {
    if (!milestoneIds.has(act.milestone_id)) {
      errors.push(`Activity "${act.name}" references missing milestone ${act.milestone_id}`);
    }
  }

  for (const seq of data.ActivitySequence) {
    if (!activityIds.has(seq.activity_id)) {
      errors.push(`Sequence ${seq.id} references missing activity ${seq.activity_id}`);
    }
    if (seq.model === 'Story.Topic' && !topicIds.has(seq.model_id)) {
      errors.push(`Sequence ${seq.id} references missing topic ${seq.model_id}`);
    }
    if (seq.model === 'Assess.Assessment' && !assessmentIds.has(seq.model_id)) {
      errors.push(`Sequence ${seq.id} references missing assessment ${seq.model_id}`);
    }
  }

  for (const ctx of data.Context) {
    if (ctx.context_model === 'Project.Activity' && !activityIds.has(ctx.context_model_id)) {
      errors.push(`Context ${ctx.id} references missing activity ${ctx.context_model_id}`);
    }
    if (ctx.reference_model === 'Assess.Assessment' && !assessmentIds.has(ctx.reference_model_id)) {
      errors.push(`Context ${ctx.id} references missing assessment ${ctx.reference_model_id}`);
    }
  }

  return errors;
}
