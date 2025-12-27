/**
 * Gemini Model Test Script
 * Tests all available Gemini models to find which ones work
 * 
 * Usage: npx tsx test-gemini-models.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not set in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// All known Gemini model names to test
const MODELS_TO_TEST = [
  // Gemini 2.0 models (latest)
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp',
  'gemini-2.0-pro',
  'gemini-2.0-pro-exp',
  
  // Gemini 1.5 models (stable)
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  
  // Gemini 1.0 models (legacy)
  'gemini-1.0-pro',
  'gemini-pro',
  
  // Experimental/Preview models
  'gemini-exp-1206',
  'gemini-exp-1121',
  'learnlm-1.5-pro-experimental',
  
  // Gemini 3 (if available)
  'gemini-3-flash',
  'gemini-3-flash-preview',
  'gemini-3-pro',
  'gemini-3-pro-preview',
];

async function testModel(modelName: string): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "Hello" in one word.');
    const response = await result.response;
    const text = response.text();
    
    const responseTime = Date.now() - startTime;
    
    if (text) {
      return { success: true, responseTime };
    }
    return { success: false, error: 'Empty response' };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message?.substring(0, 80) || 'Unknown error'
    };
  }
}

async function main() {
  console.log('🧪 Gemini Model Test Script');
  console.log('═'.repeat(60));
  console.log(`Testing ${MODELS_TO_TEST.length} models...\n`);

  const results: Array<{ model: string; success: boolean; error?: string; responseTime?: number }> = [];

  for (const modelName of MODELS_TO_TEST) {
    process.stdout.write(`Testing ${modelName.padEnd(35)} `);
    
    const result = await testModel(modelName);
    results.push({ model: modelName, ...result });
    
    if (result.success) {
      console.log(`✅ OK (${result.responseTime}ms)`);
    } else {
      console.log(`❌ FAILED - ${result.error}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Working models (${working.length}):`);
  working.forEach(r => {
    console.log(`   - ${r.model} (${r.responseTime}ms)`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed models (${failed.length}):`);
    failed.forEach(r => {
      console.log(`   - ${r.model}: ${r.error}`);
    });
  }

  // Recommendation
  if (working.length > 0) {
    const fastest = working.reduce((a, b) => (a.responseTime! < b.responseTime! ? a : b));
    console.log(`\n🚀 Recommended model: ${fastest.model} (fastest at ${fastest.responseTime}ms)`);
    console.log(`\n💡 To use this model, set in your .env:`);
    console.log(`   GEMINI_MODEL=${fastest.model}`);
  } else {
    console.log('\n⚠️  No working models found. Check your API key.');
  }
}

main().catch(console.error);
