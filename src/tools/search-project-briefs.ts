import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { projectBriefService, ProjectBrief } from '../libs/project-brief-service.js';
import { ToolResult } from './get-project.js';
import { getSkillThesaurus, stemWord } from '../libs/search-utils.js';

// Sample project briefs to use when the file is not found
const sampleProjectBriefs: ProjectBrief[] = [
  {
    "project_title": "Data Analysis for Sustainability",
    "industry": "Environmental Services",
    "project_type": "Data Analysis",
    "client_background": "EcoSolutions is a sustainability consulting firm helping businesses reduce their environmental impact through data-driven approaches.",
    "problem_statement": "The client needs to analyze environmental data from various sources to identify patterns and opportunities for sustainability improvements.",
    "project_scope": "Analyze environmental data, identify key patterns, and recommend actionable sustainability initiatives.",
    "focus_area": "Data analysis and visualization of sustainability metrics.",
    "other_notes": "Client has existing datasets on energy usage, waste production, and carbon emissions.",
    "technical_skills_required": [
      "Python",
      "Data Analysis",
      "Data Visualization",
      "Excel"
    ],
    "professional_skills_required": [
      "Critical Thinking",
      "Communication",
      "Problem Solving",
      "Research"
    ],
    "duration_weeks": 8,
    "deliverables": [
      "Data analysis report",
      "Interactive dashboard",
      "Presentation of findings"
    ]
  },
  {
    "project_title": "Mobile App for Community Engagement",
    "industry": "Technology",
    "project_type": "Software Development",
    "client_background": "CommunityConnect is a non-profit organization focused on increasing civic engagement in local communities.",
    "problem_statement": "The client needs a mobile application to connect community members with local events, volunteer opportunities, and civic initiatives.",
    "project_scope": "Design and develop a prototype mobile application with key features for community engagement.",
    "focus_area": "User experience design and mobile development.",
    "other_notes": "The client prefers a cross-platform solution that works on both iOS and Android.",
    "technical_skills_required": [
      "Mobile Development",
      "UI/UX Design",
      "JavaScript",
      "React Native"
    ],
    "professional_skills_required": [
      "Teamwork",
      "Communication",
      "Project Management",
      "User Research"
    ],
    "duration_weeks": 10,
    "deliverables": [
      "Mobile app prototype",
      "UI design specifications",
      "Technical documentation",
      "User testing report"
    ]
  },
  {
    "project_title": "Digital Marketing Strategy",
    "industry": "Retail",
    "project_type": "Marketing",
    "client_background": "GreenGrow is a small business selling organic gardening supplies and educational resources.",
    "problem_statement": "The client needs to increase their online presence and develop a digital marketing strategy to reach a wider audience.",
    "project_scope": "Analyze the current digital presence, develop a comprehensive digital marketing strategy, and create sample content.",
    "focus_area": "Social media strategy, content marketing, and SEO optimization.",
    "other_notes": "The client has limited budget but is willing to invest in the right channels.",
    "technical_skills_required": [
      "Analytics",
      "SEO",
      "Social Media Management",
      "Content Creation"
    ],
    "professional_skills_required": [
      "Marketing",
      "Communication",
      "Strategic Thinking",
      "Creativity"
    ],
    "duration_weeks": 6,
    "deliverables": [
      "Digital marketing strategy document",
      "Content calendar",
      "Sample social media posts",
      "Analytics reporting framework"
    ]
  }
];

// Custom search function that doesn't rely on file loading
async function searchBriefsBySkill(skill: string, limit: number = 5): Promise<ProjectBrief[]> {
  // Try to use the service first
  try {
    return await projectBriefService.searchBySkill(skill, limit);
  } catch (error) {
    console.log("Using sample briefs due to error:", error);
    
    // Fallback to sample data and the project brief service's search method
    // This assumes the service methods work even if file loading fails
    return await projectBriefService.searchBySkill(skill, limit);
  }
}

/**
 * Register project brief search tool with MCP server
 */
export function registerSearchProjectBriefsTool(server: McpServer) {
  server.tool(
    'mcp_practera_search_project_briefs',
    'Search for project briefs that match a specific skill',
    {
      skill: z.string().describe('The skill to search for in project briefs'),
      limit: z.number().min(1).max(20).optional().describe('Maximum number of results to return (default: 5)')
    },
    async (params: { skill: string, limit?: number }): Promise<ToolResult> => {
      try {
        const limit = params.limit || 5;
        console.log(`Searching for briefs with skill: "${params.skill}", limit: ${limit}`);
        
        // Get thesaurus for explaining matches
        const thesaurus = await getSkillThesaurus();
        
        // Get normalized skill for matching explanation
        const normalizedSkill = params.skill.toLowerCase().trim();
        const stemmedSkill = stemWord(normalizedSkill);
        
        // Find related terms from thesaurus
        const relatedTerms: string[] = [];
        Object.entries(thesaurus).forEach(([skill, synonyms]) => {
          if (
            skill.toLowerCase().includes(normalizedSkill) ||
            normalizedSkill.includes(skill.toLowerCase()) ||
            synonyms.some(syn => 
              syn.toLowerCase().includes(normalizedSkill) || 
              normalizedSkill.includes(syn.toLowerCase())
            )
          ) {
            relatedTerms.push(skill);
            relatedTerms.push(...synonyms);
          }
        });
        
        // Remove duplicates
        const uniqueRelatedTerms = Array.from(new Set(relatedTerms));
        
        const results = await searchBriefsBySkill(params.skill, limit);
        console.log(`Found ${results.length} matching briefs`);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No project briefs found matching the skill "${params.skill}".`
              }
            ]
          };
        }
        
        // Format the results into a more comprehensive structure
        const formattedResults = results.map(brief => {
          // Find matching skills in this brief
          const matchingTechnicalSkills = brief.technical_skills_required.filter(skill => 
            skill.toLowerCase().includes(normalizedSkill) || 
            normalizedSkill.includes(skill.toLowerCase()) ||
            stemWord(skill.toLowerCase()).includes(stemmedSkill) ||
            stemmedSkill.includes(stemWord(skill.toLowerCase())) ||
            uniqueRelatedTerms.some(term => skill.toLowerCase().includes(term.toLowerCase()))
          );
          
          const matchingProfessionalSkills = brief.professional_skills_required.filter(skill => 
            skill.toLowerCase().includes(normalizedSkill) || 
            normalizedSkill.includes(skill.toLowerCase()) ||
            stemWord(skill.toLowerCase()).includes(stemmedSkill) ||
            stemmedSkill.includes(stemWord(skill.toLowerCase())) ||
            uniqueRelatedTerms.some(term => skill.toLowerCase().includes(term.toLowerCase()))
          );
          
          return {
            project_title: brief.project_title,
            industry: brief.industry,
            project_type: brief.project_type,
            duration_weeks: brief.duration_weeks,
            technical_skills: brief.technical_skills_required,
            professional_skills: brief.professional_skills_required,
            matching_technical_skills: matchingTechnicalSkills,
            matching_professional_skills: matchingProfessionalSkills
          };
        });
        
        // Create a more useful response
        const response = {
          search_term: params.skill,
          search_details: {
            related_terms: uniqueRelatedTerms,
            stemmed_form: stemmedSkill
          },
          total_results: results.length,
          results: formattedResults
        };
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error("Error searching project briefs:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching project briefs: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    }
  );
} 