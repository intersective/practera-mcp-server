import fs from 'fs';
import { PROJECT_BRIEFS_PATH } from './data-paths.js';
import { isSkillMatch } from './search-utils.js';

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
   * Search project briefs by skill using advanced matching techniques
   * @param skill The skill to search for
   * @param limit Maximum number of results to return
   * @returns Array of matching project briefs
   */
  async searchBySkill(skill: string, limit: number = 5): Promise<ProjectBrief[]> {
    await this.initialize();
    
    // Advanced search for exact matches first (using thesaurus, stemming, etc.)
    const exactMatches = await this.filterBriefsBySkill(this.projectBriefs, skill, true);
    
    // Get remaining briefs (not exact matches)
    const remainingBriefs = this.projectBriefs.filter(brief => 
      !exactMatches.includes(brief)
    );
    
    // Then look for partial matches
    const partialMatches = await this.filterBriefsBySkill(remainingBriefs, skill, false);
    
    // Combine results, prioritizing exact matches
    const results = [...exactMatches, ...partialMatches].slice(0, limit);
    
    return results;
  }

  /**
   * Helper method to filter briefs by skill
   * @param briefs The list of briefs to filter
   * @param skill The skill to search for
   * @param exactMatch Whether to perform exact matching
   * @returns Filtered array of briefs
   */
  private async filterBriefsBySkill(
    briefs: ProjectBrief[], 
    skill: string, 
    exactMatch: boolean
  ): Promise<ProjectBrief[]> {
    const results: ProjectBrief[] = [];
    
    for (const brief of briefs) {
      // Check technical skills
      for (const techSkill of brief.technical_skills_required) {
        if (await isSkillMatch(techSkill, skill)) {
          results.push(brief);
          break; // Found a match, no need to check other skills
        }
      }
      
      // If already found in technical skills, skip to next brief
      if (results.includes(brief)) continue;
      
      // Check professional skills
      for (const profSkill of brief.professional_skills_required) {
        if (await isSkillMatch(profSkill, skill)) {
          results.push(brief);
          break; // Found a match, no need to check other skills
        }
      }
    }
    
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