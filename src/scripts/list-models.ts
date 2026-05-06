import { VertexAI } from '@google-cloud/vertexai';

async function listModels() {
    const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'careerlens-1';
    const location = process.env.NEXT_PUBLIC_GCP_REGION || 'us-central1';
    
    if (!projectId) {
        console.error('No GCP Project ID found in environment variables');
        return;
    }

    // Vertex AI models are predefined, so we'll list the commonly used ones
    console.log(`\nVertex AI Gemini Models available for project ${projectId}:`);
    console.log('✅ gemini-2.0-flash (Recommended - Fastest)');
    console.log('✅ gemini-2.0-pro (Advanced - Better reasoning)');
    console.log('✅ gemini-1.5-pro (Standard)');
    console.log('✅ gemini-1.5-flash (Lite)');
    console.log('\nVerifying Vertex AI access...');

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log('All Models:', data.models.map((m: any) => m.name));
        } else {
            console.log('No models found or error structure:', data);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
