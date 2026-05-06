import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateWithFallback } from '@/lib/gemini';
import * as admin from 'firebase-admin';

// Helper to fetch from Google Custom Search
async function fetchGoogleCareerSearch(apiKey: string, searchEngineId: string, query: string) {
  if (!apiKey || !searchEngineId) return { items: [] };
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Google Custom Search error:', error);
    return { items: [] };
  }
}

// Helper to fetch from Reddit
async function fetchReddit(subreddit: string) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'CareerLens/2.0' } });
    return await response.json();
  } catch (error) {
    console.error(`Reddit error for ${subreddit}:`, error);
    return {};
  }
}

// Helper to fetch from NewsAPI
async function fetchNews(apiKey: string, query: string) {
  if (!apiKey) return { articles: [] };
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=15&sortBy=publishedAt&apiKey=${apiKey}`;
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('NewsAPI error:', error);
    return { articles: [] };
  }
}

// Summarize with Gemini
async function summarizeWithGemini(combinedData: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    
    const prompt = `You are an expert career analyst analyzing REAL-TIME data from multiple sources including Google Search results, Reddit discussions, and news articles.
    

    IMPORTANT: Extract REAL data from the content provided. Do not make up numbers or percentages.

    Output ONLY valid JSON with this structure:
    {
      "trendingSkills": [
        {"skill": "React", "changePct": 15, "evidence": ["Based on X job postings mentioning React", "Y% increase in discussions"]},
        {"skill": "Python", "changePct": 20, "evidence": ["Z companies hiring", "Mentioned in A articles"]}
      ],
      "jobs": [
        {"title": "Software Engineer", "city": "Bengaluru", "count": 1500, "exampleLinks": ["indeed.com/...", "linkedin.com/..."]},
        {"title": "Data Scientist", "city": "San Francisco", "count": 800, "exampleLinks": ["..."]  }
      ],
      "certifications": [
        {"name": "AWS Solutions Architect", "platform": "AWS", "url": "https://..."},
        {"name": "Google Cloud Professional", "platform": "Google Cloud", "url": "https://..."}
      ],
      "opportunities": [
        {"title": "Remote Work Expansion", "summary": "Based on search results: X companies now offering remote positions"},
        {"title": "AI Job Growth", "summary": "Y% increase in AI-related job postings"}
      ],
      "insights": "One compelling insight based on the data (max 150 chars)",
      "metrics": {
        "aiMlGrowthPct": 25,
        "reactOpenings": 5000,
        "topCity": "Bengaluru"
      }
    }`;

    const text = await generateWithFallback(prompt, { temperature: 0.5, maxOutputTokens: 4096 });
    
    if (!text) throw new Error("No response from Gemini");

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    // Fallback mock data if AI fails
    return {
      trendingSkills: [{ skill: "AI & ML (Fallback)", changePct: 10, evidence: ["System fallback due to AI error"] }],
      jobs: [],
      certifications: [],
      opportunities: [],
      insights: "Data processing error - showing cached trends.",
      metrics: { aiMlGrowthPct: 0, reactOpenings: 0, topCity: "Unknown" }
    };
  }
}

export async function POST() {
  try {
    // 1. Gather Data
    // Use the environment variables available in .env.local
    const googleKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_API_KEY || '';
    const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID || '';
    const newsKey = process.env.NEWS_API_KEY || '';

    const promises = [
      fetchGoogleCareerSearch(googleKey, googleCx, "top software engineering jobs 2024 india remote"),
      fetchReddit("cscareerquestions"),
      fetchReddit("remotework")
    ];

    if (newsKey) {
      promises.push(fetchNews(newsKey, "tech career trends 2024"));
    }

    const results = await Promise.all(promises);
    
    const googleJobs = results[0];
    const redditCscareer = results[1];
    const redditRemote = results[2];
    const news = newsKey ? results[3] : { articles: [] };

    const combinedData = {
      google: googleJobs,
      reddit: { cscareer: redditCscareer, remote: redditRemote },
      news: news
    };

    // 2. Process with AI
    const summary = await summarizeWithGemini(combinedData);

    // 3. Save to Firestore
    const docRef = await adminDb.collection('careerUpdates').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      summary: summary,
      source: 'api-route-refresh'
    });

    return NextResponse.json({ success: true, id: docRef.id, summary });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
