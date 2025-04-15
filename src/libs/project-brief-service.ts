import fs from 'fs';
import { PROJECT_BRIEFS_PATH } from './data-paths.js';

export interface ProjectBrief {
  project_title: string;
  industry: string;
  project_type: string;
  client_background: string;
  problem_statement: string;
  project_scope: string;
  focus_area: string;
  other_notes: string;
  technical_skills_required: string[];
  professional_skills_required: string[];
  duration_weeks: number;
  deliverables: string[];
}

/**
 * Service for searching and retrieving project briefs
 */
export class ProjectBriefService {
  private projectBriefs: ProjectBrief[] = [];
  private initialized: boolean = false;

  constructor(private dataPath: string = PROJECT_BRIEFS_PATH) {}

  /**
   * Initialize the service by loading project briefs from the JSON file
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const fileData = await fs.promises.readFile(this.dataPath, 'utf8');
      this.projectBriefs = JSON.parse(fileData);
      this.initialized = true;
      console.log(`Loaded ${this.projectBriefs.length} project briefs from ${this.dataPath}`);
    } catch (error) {
      console.error('Error loading project briefs:', error);
      // Initialize with empty array on error
      this.projectBriefs = [];
      this.initialized = true;
    }
  }

  /**
   * Search project briefs by skill
   * @param skill The skill to search for
   * @param limit Maximum number of results to return
   * @returns Array of matching project briefs
   */
  async searchBySkill(skill: string, limit: number = 5): Promise<ProjectBrief[]> {
    await this.initialize();
    
    const normalizedSkill = skill.toLowerCase().trim();
    
    // Find exact matches first
    const exactMatches = this.projectBriefs.filter(brief => 
      brief.technical_skills_required.some(s => s.toLowerCase() === normalizedSkill ||
      brief.professional_skills_required.some(s => s.toLowerCase() === normalizedSkill))
    );

    // Then find partial matches
    const partialMatches = this.projectBriefs.filter(brief => 
      !exactMatches.includes(brief) && // Exclude exact matches
      (brief.technical_skills_required.some(s => s.toLowerCase().includes(normalizedSkill)) ||
      brief.professional_skills_required.some(s => s.toLowerCase().includes(normalizedSkill)))
    );
    
    // Combine results, prioritizing exact matches
    const results = [...exactMatches, ...partialMatches].slice(0, limit);
    
    return results;
  }

  /**
   * Get all project briefs
   * @param limit Maximum number of results to return
   * @returns Array of all project briefs up to the limit
   */
  async getAllBriefs(limit: number = 10): Promise<ProjectBrief[]> {
    await this.initialize();
    return this.projectBriefs.slice(0, limit);
  }
}

// Export singleton instance
export const projectBriefService = new ProjectBriefService(); 