'use server';
/**
 * Gemini AI-Powered Skill Gap Analysis
 * Real-time intelligent skill matching with BigQuery market data
 */

import { z } from 'zod';
import { getSkillsForRole, getTrendingSkills } from '@/lib/bigquery/service';
import { generateWithFallback } from '@/lib/gemini';

// Schema for Gemini AI response
const SkillGapAnalysisSchema = z.object({
    matchPercentage: z.number().min(0).max(100).describe('Overall skill match percentage'),
    skillAlignment: z.enum(['excellent', 'good', 'fair', 'poor']).describe('Overall alignment level'),

    skillBreakdown: z.object({
        matchedSkills: z.array(z.object({
            skill: z.string(),
            proficiencyLevel: z.enum(['expert', 'advanced', 'intermediate', 'beginner']),
            marketDemand: z.enum(['critical', 'high', 'medium', 'low']),
        })).describe('Skills you have that match the role'),

        missingCriticalSkills: z.array(z.object({
            skill: z.string(),
            importance: z.enum(['must-have', 'highly-recommended', 'nice-to-have']),
            learnability: z.enum(['easy', 'moderate', 'challenging']),
            timeToLearn: z.string().describe('Estimated time to learn, e.g., "2-3 months"'),
        })).describe('Critical skills you need to acquire'),

        emergingSkills: z.array(z.object({
            skill: z.string(),
            trendScore: z.number().describe('How trending this skill is, 0-10'),
            futureValue: z.enum(['very-high', 'high', 'medium', 'low']),
        })).describe('Trending skills that will increase your market value'),
    }),

    recommendations: z.array(z.object({
        priority: z.enum(['immediate', 'short-term', 'long-term']),
        category: z.enum(['technical', 'soft-skills', 'tools', 'certifications']),
        action: z.string(),
        rationale: z.string(),
        impact: z.enum(['high', 'medium', 'low']),
    })).describe('Prioritized recommendations'),

    careerInsights: z.object({
        readinessLevel: z.enum(['ready', 'almost-ready', 'needs-preparation', 'significant-gap']),
        estimatedTimeToReady: z.string().describe('Time needed to be job-ready'),
        strengthAreas: z.array(z.string()),
        weaknessAreas: z.array(z.string()),
        competitiveAdvantages: z.array(z.string()),
    }),

    learningPath: z.array(z.object({
        phase: z.string(),
        duration: z.string(),
        skills: z.array(z.string()),
        resources: z.array(z.string()),
    })).describe('Suggested learning path to bridge the gap'),

    marketContext: z.object({
        demandLevel: z.enum(['very-high', 'high', 'moderate', 'low']),
        competitionLevel: z.enum(['very-competitive', 'competitive', 'moderate', 'low']),
        salaryOutlook: z.string(),
        jobOpenings: z.string(),
    }),
});

export type SkillGapAnalysisResult = z.infer<typeof SkillGapAnalysisSchema>;

/**
 * Analyze skill gap with Gemini AI + BigQuery market data
 */
export async function analyzeSkillGapWithAI(
    targetRole: string,
    currentSkills: string[],
    industry: string = 'Technology'
): Promise<SkillGapAnalysisResult> {
    try {
        // 1. Fetch real-time job market data from BigQuery (falls back to mock if not configured)
        const [jobSkills, trendingSkillsData] = await Promise.all([
            getSkillsForRole(targetRole, industry),
            getTrendingSkills(industry, 20),
        ]);

        const requiredSkills = jobSkills.flatMap(job => job.required_skills || []);
        const trendingSkills = [
            ...jobSkills.flatMap(job => job.trending_skills || []),
            ...trendingSkillsData.map(skill =>
                typeof skill === 'string' ? skill : skill.skill
            ),
        ];
        const atsKeywords = jobSkills.flatMap(job => job.ats_keywords || []);

        const uniqueRequired = [...new Set(requiredSkills)].slice(0, 30);
        const uniqueTrending = [...new Set(trendingSkills)].slice(0, 25);
        const uniqueAts = [...new Set(atsKeywords)].slice(0, 20);

        // 2. Build prompt
        const prompt = `
You are an elite career counselor and skill gap analyst.

TARGET ROLE: ${targetRole}
INDUSTRY: ${industry}

CANDIDATE'S CURRENT SKILLS:
${currentSkills.map(s => `• ${s}`).join('\n')}

MARKET REQUIRED SKILLS (from job data):
${uniqueRequired.length > 0 ? uniqueRequired.map(s => `• ${s}`).join('\n') : '• Use general industry knowledge'}

TRENDING SKILLS IN ${industry}:
${uniqueTrending.length > 0 ? uniqueTrending.map(s => `• ${s}`).join('\n') : '• Use general industry knowledge'}

ATS KEYWORDS FOR ${targetRole}:
${uniqueAts.length > 0 ? uniqueAts.map(s => `• ${s}`).join('\n') : '• Use general industry knowledge'}

Perform a comprehensive skill gap analysis and return ONLY a valid JSON object (no markdown, no code blocks) matching this exact structure:
{
  "matchPercentage": <number 0-100>,
  "skillAlignment": <"excellent"|"good"|"fair"|"poor">,
  "skillBreakdown": {
    "matchedSkills": [{"skill": "...", "proficiencyLevel": "expert"|"advanced"|"intermediate"|"beginner", "marketDemand": "critical"|"high"|"medium"|"low"}],
    "missingCriticalSkills": [{"skill": "...", "importance": "must-have"|"highly-recommended"|"nice-to-have", "learnability": "easy"|"moderate"|"challenging", "timeToLearn": "..."}],
    "emergingSkills": [{"skill": "...", "trendScore": <0-10>, "futureValue": "very-high"|"high"|"medium"|"low"}]
  },
  "recommendations": [{"priority": "immediate"|"short-term"|"long-term", "category": "technical"|"soft-skills"|"tools"|"certifications", "action": "...", "rationale": "...", "impact": "high"|"medium"|"low"}],
  "careerInsights": {
    "readinessLevel": "ready"|"almost-ready"|"needs-preparation"|"significant-gap",
    "estimatedTimeToReady": "...",
    "strengthAreas": ["..."],
    "weaknessAreas": ["..."],
    "competitiveAdvantages": ["..."]
  },
  "learningPath": [{"phase": "...", "duration": "...", "skills": ["..."], "resources": ["..."]}],
  "marketContext": {
    "demandLevel": "very-high"|"high"|"moderate"|"low",
    "competitionLevel": "very-competitive"|"competitive"|"moderate"|"low",
    "salaryOutlook": "...",
    "jobOpenings": "..."
  }
}

RULES:
1. Be honest about match percentage — don't inflate it
2. Be specific in recommendations (e.g., "Learn React.js via freeCodeCamp" not "Learn web dev")
3. Base all analysis on the market data provided above
4. Output ONLY the JSON object — no markdown fences, no extra text
`;

        // 3. Call Gemini with automatic model fallback
        let responseText = await generateWithFallback(prompt, {
            temperature: 0.4,
            maxOutputTokens: 8192,
            topP: 0.9,
        });

        // Clean markdown fences if present
        responseText = responseText
            .replace(/```json\n?/gi, '')
            .replace(/```\n?/gi, '')
            .trim();

        // Extract JSON object
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(responseText);

        // Validate with zod (coerce/strip unknowns gracefully)
        const validated = SkillGapAnalysisSchema.parse(parsed);
        return validated;

    } catch (error) {
        console.error('Error analyzing skill gap with AI:', error);

        // Fallback response
        return {
            matchPercentage: 0,
            skillAlignment: 'poor',
            skillBreakdown: {
                matchedSkills: [],
                missingCriticalSkills: [{
                    skill: 'Analysis temporarily unavailable',
                    importance: 'must-have',
                    learnability: 'moderate',
                    timeToLearn: 'N/A',
                }],
                emergingSkills: [],
            },
            recommendations: [{
                priority: 'immediate',
                category: 'technical',
                action: 'Please try again in a moment',
                rationale: 'Temporary analysis error',
                impact: 'high',
            }],
            careerInsights: {
                readinessLevel: 'significant-gap',
                estimatedTimeToReady: 'Unable to determine',
                strengthAreas: [],
                weaknessAreas: ['Analysis error — please retry'],
                competitiveAdvantages: [],
            },
            learningPath: [],
            marketContext: {
                demandLevel: 'moderate',
                competitionLevel: 'moderate',
                salaryOutlook: 'Unable to determine',
                jobOpenings: '0',
            },
        };
    }
}

/**
 * Quick skill match check (lightweight)
 */
export async function quickSkillMatch(
    targetRole: string,
    currentSkills: string[],
    industry: string = 'Technology'
): Promise<{
    matchPercentage: number;
    matchedCount: number;
    missingCount: number;
}> {
    try {
        const jobSkills = await getSkillsForRole(targetRole, industry);
        const requiredSkills = [...new Set(jobSkills.flatMap(job => job.required_skills || []))];

        const normalizedCurrent = currentSkills.map(s => s.toLowerCase().trim());
        const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());

        const matchedCount = normalizedCurrent.filter(skill =>
            normalizedRequired.some(req =>
                req.includes(skill) || skill.includes(req)
            )
        ).length;

        const matchPercentage = requiredSkills.length > 0
            ? Math.round((matchedCount / requiredSkills.length) * 100)
            : 0;

        return {
            matchPercentage,
            matchedCount,
            missingCount: requiredSkills.length - matchedCount,
        };
    } catch (error) {
        console.error('Quick skill match error:', error);
        return {
            matchPercentage: 0,
            matchedCount: 0,
            missingCount: 0,
        };
    }
}
