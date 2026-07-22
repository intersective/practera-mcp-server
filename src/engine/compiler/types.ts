/**
 * Legacy CakePHP export format — matches the structure in
 * practera-test-suite/suites/regression/seed-data/skills_modules_experience.json
 * and is consumed by importExperienceData / importExperienceJson mutations.
 */

export interface PracteraExportProgram {
  id: string;
  experience_id: string;
  institution_id: string;
  name: string;
  description: string;
  program_code: string;
  slug: string;
  login_content: string;
  dashboard_content: string | null;
  support_email: string;
  max_achievable_points: number;
  archived: boolean;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportExperience {
  id: string;
  uuid: string;
  institution_id: string;
  name: string;
  description: string;
  experience_type: string;
  status: string;
  slug: string;
  appkey: string;
  lead_url: string;
  logo_url: string;
  tags: string;
  allow_signup: boolean;
  archived: boolean;
  deleted: boolean;
  created: string;
  modified: string;
  config: Record<string, unknown>;
}

export interface PracteraExportProject {
  id: string;
  experience_id: string;
  program_id: string;
  institution_id: string;
  name: string;
  description: string;
  lead_image: string;
  is_template: boolean;
  archived: boolean;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  visibility: number;
  delivery: number;
  unlock_id: string | null;
  reveal_id: string | null;
  parent_id: string | null;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportActivity {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  instructions: string;
  order: number;
  duration: number;
  offset: number;
  visibility: number;
  delivery: number;
  type: string;
  lead_image: string;
  video_url: string;
  unlock_id: string | null;
  reveal_id: string | null;
  parent_id: string | null;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportActivitySequence {
  id: string;
  activity_id: string;
  model: 'Story.Topic' | 'Assess.Assessment';
  model_id: string;
  order: number;
  value: null;
  branch: null;
  unlock_id: string | null;
  reveal_id: string | null;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportTopic {
  id: string;
  program_id: string;
  experience_id: string;
  project_id: string;
  title: string;
  summary: string;
  content: string;
  story_type: string;
  videolink: string;
  visibility: number;
  author_id: string;
  assessment_id: string | null;
  has_comments: boolean;
  tags: string;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportAssessmentChoice {
  id: string;
  name: string;
  description: string;
  order: number;
  weight: number;
}

export interface PracteraExportAssessmentQuestionChoice {
  id: string;
  assessment_question_id: string;
  assessment_choice_id: string;
  order: number;
  weight: number;
  explanation: string;
  AssessmentChoice: PracteraExportAssessmentChoice;
}

export interface PracteraExportAssessmentQuestion {
  id: string;
  assessment_id: string;
  name: string;
  description: string;
  hint: string;
  prompt: string;
  question_type: string;
  is_required: boolean;
  has_comment: boolean;
  audience: string;
  file_type: string | null;
  answer: null;
  exemplar: null;
  score: null;
  created: string;
  modified: string;
  AssessmentQuestionChoice: PracteraExportAssessmentQuestionChoice[];
}

export interface PracteraExportAssessmentGroupQuestion {
  id: string;
  assessment_group_id: string;
  assessment_question_id: string;
  order: number;
  AssessmentQuestion: PracteraExportAssessmentQuestion;
}

export interface PracteraExportAssessmentGroup {
  id: string;
  assessment_id: string;
  name: string;
  description: string;
  order: number;
  review_instructions: string;
  restart_numbering: boolean;
  AssessmentGroupQuestion: PracteraExportAssessmentGroupQuestion[];
}

export interface PracteraExportAssessmentRecord {
  id: string;
  name: string;
  description: string;
  assessment_type: string;
  is_team: boolean;
  is_live: boolean;
  pulse_check: boolean;
  score_type: string;
  experience_id: string;
  program_id: string;
  project_id: string;
  visibility: number;
  review_type: string;
  review_role: string;
  review_scope: string;
  review_period: number;
  num_reviews: number;
  review_instructions: string | null;
  is_repeatable: boolean;
  auto_publish_reviews: boolean;
  parent_id: string | null;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportAssessment {
  Assessment: PracteraExportAssessmentRecord;
  AssessmentGroup: PracteraExportAssessmentGroup[];
}

export interface PracteraExportAchievement {
  id: string;
  uuid: string;
  name: string;
  description: string;
  unearned_description: string;
  model: string;
  model_id: string;
  project_id: string;
  condition: string;
  scope: string;
  points: number;
  threshold: string;
  visibility: number;
  is_default: boolean;
  multi_achievable: boolean;
  check_past: boolean;
  tags: string;
  deleted: boolean;
  created: string;
  modified: string;
}

export interface PracteraExportAchievementCondition {
  id: string;
  achievement_id: string;
  model_name: string;
  model_id: string;
  property: string;
  operator: string;
  value: string;
  weight: string;
  required: boolean;
  team_criteria: number;
  created: string;
  modified: string;
}

export interface PracteraExportContext {
  id: string;
  uuid: string;
  context_model: string;
  context_model_id: string;
  reference_model: string;
  reference_model_id: string;
  scope: string;
  scope_id: string;
  order: number;
  created: string;
  modified: string;
}

export interface PracteraExportPackage {
  name: string;
  description: string;
  type: string;
  isPublic: boolean;
  attributes: unknown[];
  data: {
    Program: PracteraExportProgram;
    Experience: PracteraExportExperience;
    Project: PracteraExportProject;
    Milestone: PracteraExportMilestone[];
    Activity: PracteraExportActivity[];
    ActivitySequence: PracteraExportActivitySequence[];
    Topic: PracteraExportTopic[];
    Assessment: PracteraExportAssessment[];
    Achievement: PracteraExportAchievement[];
    AchievementCondition: PracteraExportAchievementCondition[];
    Context: PracteraExportContext[];
    Filestore: unknown[];
    Export: { id: number };
  };
}

export interface CompilerResult {
  package: PracteraExportPackage;
  stats: {
    milestones: number;
    activities: number;
    sequences: number;
    topics: number;
    assessments: number;
    achievements: number;
    achievementConditions: number;
    contexts: number;
  };
  warnings: string[];
}
