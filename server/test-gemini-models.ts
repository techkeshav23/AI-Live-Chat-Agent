import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('🔑 API Key:', GEMINI_API_KEY.substring(0, 10) + '...');
console.log('');

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function listAvailableModels() {
  console.log('📋 Fetching Available Models from API\n');
  console.log('='.repeat(60));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('❌ No models found for this API key');
      return [];
    }

    console.log(`✅ Found ${data.models.length} available models:\n`);

    const modelInfo = data.models.map((model: any) => {
      const name = model.name.replace('models/', '');
      const supportedMethods = model.supportedGenerationMethods || [];
      const supportsGenerate = supportedMethods.includes('generateContent');
      
      return {
        name,
        displayName: model.displayName || name,
        description: model.description || 'N/A',
        supportedMethods,
        supportsGenerate,
        inputTokenLimit: model.inputTokenLimit || 'N/A',
        outputTokenLimit: model.outputTokenLimit || 'N/A',
      };
    });

    // Display in a readable format
    modelInfo.forEach((model: any, index: number) => {
      console.log(`${index + 1}. ${model.displayName}`);
      console.log(`   ID: ${model.name}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Input Token Limit: ${model.inputTokenLimit}`);
      console.log(`   Output Token Limit: ${model.outputTokenLimit}`);
      console.log(`   Supported Methods: ${model.supportedMethods.join(', ')}`);
      console.log(`   Can Generate Content: ${model.supportsGenerate ? '✅' : '❌'}`);
      console.log('');
    });

    return modelInfo;
  } catch (error: any) {
    console.error('❌ Error fetching models:', error.message);
    return [];
  }
}

async function testModels() {
  console.log('='.repeat(60));
  console.log('Testing Models with Sample Request\n');
  console.log('='.repeat(60));

  // List of common Gemini models to test
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
  ];

  const testMessage = 'Hello! Please respond with "OK" if you can read this.';
  const results: Array<{
    model: string;
    supported: boolean;
    response?: string;
    error?: string;
    latency?: number;
  }> = [];

  for (const modelName of modelsToTest) {
    process.stdout.write(`Testing ${modelName.padEnd(30)} ... `);
    
    try {
      const startTime = Date.now();
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent(testMessage);
      const response = await result.response;
      const text = response.text();
      const latency = Date.now() - startTime;
      
      console.log(`✅ SUCCESS (${latency}ms)`);
      results.push({
        model: modelName,
        supported: true,
        response: text.substring(0, 50),
        latency,
      });
    } catch (error: any) {
      console.log(`❌ FAILED`);
      results.push({
        model: modelName,
        supported: false,
        error: error.message || 'Unknown error',
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');
  
  const supported = results.filter(r => r.supported);
  const unsupported = results.filter(r => !r.supported);

  console.log(`✅ Supported Models (${supported.length}):`);
  supported.forEach(r => {
    console.log(`   • ${r.model} (${r.latency}ms)`);
  });

  console.log(`\n❌ Unsupported Models (${unsupported.length}):`);
  unsupported.forEach(r => {
    console.log(`   • ${r.model}`);
    console.log(`     Error: ${r.error}`);
  });

  // Recommended model
  if (supported.length > 0) {
    const fastest = supported.reduce((prev, curr) => 
      (curr.latency || Infinity) < (prev.latency || Infinity) ? curr : prev
    );
    console.log(`\n⚡ Fastest Model: ${fastest.model} (${fastest.latency}ms)`);
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  // First, list all available models
  const availableModels = await listAvailableModels();
  
  // Then test models that support generateContent
  if (availableModels.length > 0) {
    const testableModels = availableModels
      .filter((m: any) => m.supportsGenerate)
      .map((m: any) => m.name);
    
    if (testableModels.length > 0) {
      console.log('='.repeat(60));
      console.log(`🧪 Testing ${testableModels.length} models that support generateContent\n`);
      
      for (const modelName of testableModels.slice(0, 3)) { // Test first 3 to avoid quota
        await testSingleModel(modelName);
      }
    }
  }
}

async function testSingleModel(modelName: string) {
  process.stdout.write(`Testing ${modelName.padEnd(30)} ... `);
  
  try {
    const startTime = Date.now();
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent('Say "OK"');
    const response = await result.response;
    const text = response.text();
    const latency = Date.now() - startTime;
    
    console.log(`✅ SUCCESS (${latency}ms) - Response: "${text.trim()}"`);
  } catch (error: any) {
    if (error.message.includes('429')) {
      console.log(`⚠️  QUOTA EXCEEDED`);
    } else if (error.message.includes('404')) {
      console.log(`❌ NOT FOUND`);
    } else {
      console.log(`❌ ERROR: ${error.message.substring(0, 50)}...`);
    }
  }
}

main().catch(console.error);
