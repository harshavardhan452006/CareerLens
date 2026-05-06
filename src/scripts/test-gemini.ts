import { VertexAI } from '@google-cloud/vertexai';


async function testGemini() {
    const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'careerlens-1';
    const location = process.env.NEXT_PUBLIC_GCP_REGION || 'us-central1';

    console.log('Checking GCP Configuration...');
    if (!projectId) {
        console.error('❌ No GCP Project ID found in environment variables');
        return;
    }
    console.log('✅ GCP Project ID found:', projectId);
    console.log('✅ GCP Region:', location);

    try {
        console.log('Initializing Vertex AI...');
        const vertexAI = new VertexAI({ project: projectId, location });
        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        console.log('Sending test prompt...');
        const result = await model.generateContent('Hello, are you working?');
        const response = result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        console.log('✅ Vertex AI Gemini Response:', text);
    } catch (error: any) {
        console.error('❌ Error testing Vertex AI Gemini:', error.message);
        if (error.response) {
            console.error('Error details:', JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();
