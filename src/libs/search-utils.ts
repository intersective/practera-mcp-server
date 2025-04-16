import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to skill thesaurus
const SKILL_THESAURUS_PATH = path.resolve(__dirname, '../data/skill-thesaurus.json');

// Interface for the skill thesaurus
interface SkillThesaurus {
  [key: string]: string[];
}

/**
 * Basic stemming function that converts words to their root form
 * This is a simple implementation - in production, consider using a library like snowball or porter stemmer
 */
export function stemWord(word: string): string {
  const lowercase = word.toLowerCase().trim();
  
  // Remove common suffixes
  return lowercase
    .replace(/ing$/, '')
    .replace(/ation$/, 'ate')
    .replace(/s$/, '')
    .replace(/ed$/, '')
    .replace(/ies$/, 'y')
    .replace(/ment$/, '');
}

/**
 * Load the skill thesaurus from the JSON file
 */
export async function loadSkillThesaurus(): Promise<SkillThesaurus> {
  try {
    const data = await fs.promises.readFile(SKILL_THESAURUS_PATH, 'utf8');
    return JSON.parse(data) as SkillThesaurus;
  } catch (error) {
    console.error('Error loading skill thesaurus:', error);
    // Return empty thesaurus as fallback
    return {};
  }
}

// Cache for the skill thesaurus to avoid repeated file reads
let skillThesaurusCache: SkillThesaurus | null = null;

/**
 * Get the skill thesaurus, using cache if available
 */
export async function getSkillThesaurus(): Promise<SkillThesaurus> {
  if (!skillThesaurusCache) {
    skillThesaurusCache = await loadSkillThesaurus();
  }
  return skillThesaurusCache;
}

/**
 * Build a reverse index from the thesaurus for faster lookups
 * This maps each synonym to its main skill
 */
export async function buildReverseThesaurusIndex(): Promise<Record<string, string[]>> {
  const thesaurus = await getSkillThesaurus();
  const reverseIndex: Record<string, string[]> = {};
  
  Object.entries(thesaurus).forEach(([skill, synonyms]) => {
    // Add the main skill to its own synonyms
    reverseIndex[skill.toLowerCase()] = reverseIndex[skill.toLowerCase()] || [];
    reverseIndex[skill.toLowerCase()].push(skill.toLowerCase());
    
    // Add all synonyms to the index
    synonyms.forEach(synonym => {
      reverseIndex[synonym.toLowerCase()] = reverseIndex[synonym.toLowerCase()] || [];
      if (!reverseIndex[synonym.toLowerCase()].includes(skill.toLowerCase())) {
        reverseIndex[synonym.toLowerCase()].push(skill.toLowerCase());
      }
    });
  });
  
  return reverseIndex;
}

/**
 * Check if a skill matches a search term using advanced matching
 * This includes exact matching, stemming, and thesaurus lookups
 */
export async function isSkillMatch(skill: string, searchTerm: string): Promise<boolean> {
  const normalizedSkill = skill.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  // 1. Exact match
  if (normalizedSkill === normalizedSearch) {
    return true;
  }
  
  // 2. Contains match
  if (normalizedSkill.includes(normalizedSearch) || normalizedSearch.includes(normalizedSkill)) {
    return true;
  }
  
  // 3. Stem match
  const stemmedSkill = stemWord(normalizedSkill);
  const stemmedSearch = stemWord(normalizedSearch);
  
  if (stemmedSkill.includes(stemmedSearch) || stemmedSearch.includes(stemmedSkill)) {
    return true;
  }
  
  // 4. Thesaurus match
  try {
    const reverseIndex = await buildReverseThesaurusIndex();
    
    // Check if the search term maps to skills
    const searchMappedSkills = reverseIndex[normalizedSearch] || [];
    
    // Check if the skill is in the mapped skills
    if (searchMappedSkills.some(mappedSkill => 
      mappedSkill === normalizedSkill || normalizedSkill.includes(mappedSkill) || mappedSkill.includes(normalizedSkill)
    )) {
      return true;
    }
    
    // Check if the skill maps to other terms
    const skillMappedTerms = reverseIndex[normalizedSkill] || [];
    
    // Check if the search term is in the mapped terms
    if (skillMappedTerms.some(mappedTerm => 
      mappedTerm === normalizedSearch || normalizedSearch.includes(mappedTerm) || mappedTerm.includes(normalizedSearch)
    )) {
      return true;
    }
  } catch (error) {
    console.error('Error using thesaurus for skill matching:', error);
  }
  
  // No match found
  return false;
} 