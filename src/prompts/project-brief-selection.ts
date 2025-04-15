export const projectBriefSearchSystemPrompt = `
You are an expert in experiential learning and project-based education, helping educators and learners find appropriate project briefs based on skills they want to develop.

When recommending project briefs based on skills:

1. Consider the relevance of each project to the requested skills
2. Look at the complexity and duration to ensure it's appropriate
3. Consider how the project's deliverables align with skill development
4. Provide a clear explanation of why each project is a good match

Always focus on explaining how the project will help develop the requested skills specifically, not just general benefits of project-based learning.
`;

export const skillBasedBriefSelectionPromptTemplate = `
I'm looking for project briefs that would help develop skills in {skill}. Please recommend appropriate projects that would be a good match.

For each recommended project, please explain:
1. Why it's particularly relevant for developing {skill}
2. What specific aspects of the project help build this skill
3. How the deliverables demonstrate mastery of the skill
4. Any complementary skills that would also be developed

[PROJECT BRIEF DATA]
{projectBriefData}
`;

export const projectBriefSelectionExampleResponse = `
# Project Briefs for Data Analysis Skills

Based on your interest in data analysis skills, I've found several project briefs that would be excellent for developing these capabilities:

## Supply Chain Optimization

This project is ideal for developing data analysis skills because:
- You'll need to analyze complex supply chain data to identify inefficiencies
- The process requires statistical analysis to determine optimal solutions
- Creating process flow diagrams will help you visualize data relationships
- The ROI calculation deliverable demonstrates applied analytical skills

This project will also develop complementary skills in logistics, process optimization, and business analysis.

## AI-Powered Healthcare Assistant

This project leverages data analysis in the healthcare context:
- You'll work with healthcare datasets to train machine learning models
- Pattern recognition in medical data requires sophisticated analytical techniques
- The project demands rigorous validation of data-driven insights
- Technical documentation will demonstrate your ability to communicate analytical findings

While working on this project, you'll also build skills in machine learning, healthcare domain knowledge, and software development.

## Digital Marketing Campaign

This marketing-focused project applies data analysis in a different context:
- Performance metrics tracking requires setting up proper analytics
- Customer segmentation involves statistical analysis of audience data
- Campaign optimization relies on interpreting performance data
- The final report demonstrates your ability to derive insights from analytics

This project helps build complementary skills in marketing strategy, content creation, and digital media.
`;

export const complexProjectBriefFinderPromptTemplate = `
I need help finding a suitable project brief that matches a specific set of requirements:

Primary skill focus: {primarySkill}
Additional skills: {additionalSkills}
Desired complexity: {complexity}
Available time frame: {timeFrame}

Please recommend the most appropriate project briefs from the available options, explaining why each would be a good fit given these requirements.

[PROJECT BRIEF DATA]
{projectBriefData}
`; 