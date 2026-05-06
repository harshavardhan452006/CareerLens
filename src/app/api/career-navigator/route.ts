import { NextRequest, NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/gemini';


const CAREER_NAVIGATOR_PROMPT = `You are CareerLens AI — an expert career architect trained on global and Indian education pathways.

Your task is to generate a focused multi-level "Career Path Tree" based on the student's current grade, interests, and region.

🎓 COVER RELEVANT EDUCATION STREAMS based on student interests:
- Science streams (PCMC, PCMB, CS) for tech/medical interests
- Commerce streams for business/finance interests  
- Arts/Humanities for creative/law interests
- Diploma/Polytechnic as alternate path

💼 FOR EACH NODE INCLUDE (keep values concise):
- label: short name (max 5 words)
- summary: one sentence description
- score: 0-100 match score
- salaryRange: min/max in INR numbers only
- topCompanies: max 3 company names
- skills: max 4 skills

📊 OUTPUT EXACT JSON SCHEMA — keep it compact:
{
  "root": { "id": "root", "label": "Your Career Paths", "type": "root" },
  "nodes": [
    {
      "id": "unique-id",
      "label": "Computer Science & AI",
      "type": "stream",
      "level": "grade11",
      "score": 95,
      "summary": "Top choice for tech careers.",
      "metadata": {
        "durationYears": 4,
        "salaryRange": { "min": 400000, "max": 3500000 },
        "difficulty": "high",
        "demand": "high",
        "demandTrend": "rising",
        "futureProofRating": 9,
        "topCompanies": ["Google", "Microsoft", "TCS"]
      },
      "actions": {
        "exams": ["JEE Main", "BITSAT"],
        "courses": ["BTech CSE", "BTech AI/ML"],
        "certifications": [
          { "title": "AWS Cloud Practitioner", "platform": "AWS", "url": "https://aws.training" }
        ],
        "skills": ["Python", "Data Structures", "ML", "Cloud"],
        "projects": ["Build ML model", "Create web app"]
      },
      "children": ["child-id-1"],
      "sources": ["NASSCOM 2025"]
    }
  ],
  "edges": [
    { "from": "root", "to": "node-id", "type": "leads_to", "label": "Best Match" }
  ],
  "insights": [
    "Tech careers offer highest starting salaries in India"
  ]
}

🎯 CRITICAL RULES:
1. Generate EXACTLY 12-15 nodes — no more, no less
2. Keep all string values SHORT (summaries under 15 words, labels under 6 words)
3. Output ONLY valid JSON — no markdown, no code blocks, no text before { or after }
4. Ensure all strings use double quotes and no trailing commas
5. Do NOT include universities list or long descriptions — keep each node compact`;

/** Attempt to repair JSON that was cut off mid-output by the model token limit */
function repairTruncatedJson(raw: string): string {
  // Track nesting to know what needs closing
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // Remove trailing comma before we close, then close all open structures
  let repaired = raw.trimEnd().replace(/,\s*$/, '');
  while (stack.length) repaired += stack.pop();
  return repaired;
}

export async function POST(request: NextRequest) {

  try {
    const { currentGrade, selectedStream, selectedSubjects, interests, region } = await request.json();
    
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY not configured in environment variables');
    }

    const userContext = `
INPUT:
{
  "currentLevel": "${currentGrade}",
  "currentSubjects": ${selectedSubjects ? JSON.stringify(selectedSubjects) : '[]'},
  "preferredInterests": ${interests ? JSON.stringify(interests) : '["general"]'},
  "region": "${region || 'India'}"
}

INSTRUCTION:
Generate a complete career decision tree for the above student profile. Include:
- All possible streams/subjects for next academic level
- Major entrance exams with difficulty ratings
- Bachelor/Master degree options with top colleges
- Career paths with salary ranges (INR), job roles, companies
- Certifications and online courses (Coursera, NPTEL, Udemy)
- Score each path based on: market demand + salary potential + student interests
- Include modern tech careers (AI/ML, Cloud, DevOps, Data Science)
- Add traditional careers (Doctor, Engineer, CA, IAS, Lawyer)
- Provide 15-25 nodes with parent-child relationships

Output ONLY the JSON schema specified above. NO markdown, NO extra text.`;

    const fullPrompt = CAREER_NAVIGATOR_PROMPT + '\n\n' + userContext;

    const result = await generateWithFallback(fullPrompt, {
      temperature: 0.7,
      maxOutputTokens: 65536,
      topP: 0.9,
      topK: 40,
    });
    let responseText: string = result || '{}';

    
    // Clean up response - remove markdown, code fences, extra whitespace
    responseText = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    
    // Find the first { and last }
    const firstBrace = responseText.indexOf('{');
    const lastBrace = responseText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No valid JSON found in response');
    }
    
    responseText = responseText.substring(firstBrace, lastBrace + 1);
    
    // Try to fix common JSON issues
    responseText = responseText
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/\n/g, ' ')      // Remove newlines
      .replace(/\r/g, '')       // Remove carriage returns
      .replace(/\t/g, ' ')      // Replace tabs with spaces
      .replace(/\s+/g, ' ');    // Normalize whitespace
    
    let careerData;
    try {
      careerData = JSON.parse(responseText);
    } catch (parseError: any) {
      // Attempt to salvage truncated JSON by closing open structures
      console.warn('Initial parse failed, attempting truncation repair...');
      const repaired = repairTruncatedJson(responseText);
      try {
        careerData = JSON.parse(repaired);
        console.log('✅ Truncation repair succeeded');
      } catch {
        console.error('JSON Parse Error:', parseError.message);
        console.error('First 300 chars:', responseText.substring(0, 300));
        console.error('Last 300 chars:', responseText.substring(responseText.length - 300));
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
    }

    // Validate structure
    if (!careerData.nodes || !Array.isArray(careerData.nodes)) {
      throw new Error('Invalid response structure from AI: missing or invalid nodes array');
    }
    
    if (!careerData.edges || !Array.isArray(careerData.edges)) {
      careerData.edges = []; // Default to empty edges if not provided
    }

    return NextResponse.json({
      success: true,
      data: careerData,
      metadata: {
        nodesCount: careerData.nodes.length,
        edgesCount: careerData.edges?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Career Navigator API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate career pathway',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
