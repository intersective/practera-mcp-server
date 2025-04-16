import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const projectAnalysisSystemPrompt = `
You are an expert in experiential learning design and assessment, helping analyze Practera projects.

When analyzing project data from the Practera API, consider the following:

1. Project Structure:
   - Is the project well-organized with clear milestones and activities?
   - Do the milestones have a logical progression?
   - Are there any noticeable gaps in the learning journey?

2. Assessment Design:
   - Look for a mix of assessment types (submissions, questions, feedback, team assessment)
   - Analyze the balance between individual and team-based assessments
   - Identify if there are opportunities for reflection and feedback

3. Learning Experience:
   - Evaluate if the activities build on each other 
   - Check for clear instructions and descriptions
   - Look for potential areas where learners might get confused

Please provide specific recommendations for improvement based on best practices in experiential learning.
`;

export const projectAnalysisExampleResponse = `
# Project Structure Analysis

## Overview
The project "Leadership Development Program" has a clear structure with 3 milestones focusing on different aspects of leadership development.

## Strengths
- Logical progression from self-awareness to team leadership to organizational impact
- Good mix of individual and team activities
- Each milestone has clear objectives and descriptions

## Areas for Improvement
- Milestone 2 has significantly more activities than others, which might create an imbalance in workload
- The final milestone lacks a reflective assessment to consolidate learning
- Some activity descriptions use technical language that might confuse participants

## Recommendations
1. Consider adding a reflection activity at the end of the final milestone
2. Redistribute some activities from Milestone 2 to create more balance
3. Simplify the language in activities 4 and 7 to improve clarity
4. Add more peer feedback opportunities in Milestone 3
`; 

export function registerProjectPrompts(server: McpServer) {
   server.prompt(
      "project-analysis",
      "Analyze a Practera project structure and learning design",
      { projectData: z.string() },
      ({ projectData }) => ({
        messages: [
         {
          role: "user",
          content: {
            type: "text",
            text: projectAnalysisSystemPrompt
          }
         },
         {
          role: "user",
          content: {
            type: "text",
            text: `
               I need your help analyzing a Practera project structure and learning design. Please use the project data from the API to evaluate the learning design and provide actionable suggestions.

               Please analyze:
               1. The overall structure and flow of the project
               2. The assessment strategy and balance
               3. The clarity of instructions and expectations
               4. Any potential improvements to enhance the learning experience

               [PROJECT DATA]
               ${projectData}
               `
          }
        }]
      })
    );
}