#!/usr/bin/env node

/**
 * Test script for the Daily City Design Improvement system
 * Run this locally to test the AI improvement generation
 * 
 * Usage:
 *   GOOGLE_API_KEY="your-key" node .github/scripts/test-improvement.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

async function testConnection() {
    console.log('🧪 Testing Google AI connection...');
    
    if (!process.env.GOOGLE_API_KEY) {
        console.error('❌ GOOGLE_API_KEY environment variable not set');
        console.log('Usage: GOOGLE_API_KEY="your-key" node test-improvement.js');
        process.exit(1);
    }
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        const result = await model.generateContent("Hello! Can you respond with just 'Connection successful'?");
        const response = result.response.text();
        
        console.log('✅ Google AI connection successful');
        console.log('📨 Response:', response.trim());
        
        return true;
    } catch (error) {
        console.error('❌ Google AI connection failed:', error.message);
        return false;
    }
}

async function testContentReading() {
    console.log('\n📁 Testing content file reading...');
    
    try {
        const contentDir = path.join(process.cwd(), 'docs', 'content');
        const files = await fs.readdir(contentDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        console.log('✅ Found content files:', mdFiles);
        
        for (const file of mdFiles) {
            const filePath = path.join(contentDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').length;
            const chars = content.length;
            console.log(`   ${file}: ${lines} lines, ${chars} characters`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Content reading failed:', error.message);
        return false;
    }
}

async function testImprovementGeneration() {
    console.log('\n🤖 Testing improvement generation (this may take 10-30 seconds)...');
    
    try {
        // Import the main generation function
        const generateScript = require('./generate-improvement.js');
        
        // Note: We can't directly test the main function since it modifies files
        // Instead, we'll test a simplified version
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        const testPrompt = `You are testing the Utopia city improvement system.
        
As an Urban Planner using Green Hat (Creative Thinking), suggest a brief improvement to Transportation Systems.

Respond with this exact JSON format:
{
  "file_to_update": "tech-specs.md",
  "improvement_title": "Test Improvement",
  "description": "This is a test improvement.",
  "rationale": "Testing the system works.",
  "impact": "Verifies functionality.",
  "markdown_addition": "## Test Section\\n\\nThis is a test addition.",
  "insertion_point": "## 🏗️ Infrastructure"
}`;
        
        const result = await model.generateContent(testPrompt);
        const responseText = result.response.text();
        
        // Try to parse the JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ AI generated valid JSON response');
            console.log('📋 Test improvement title:', parsed.improvement_title);
            return true;
        } else {
            console.error('❌ AI response was not valid JSON');
            console.log('Raw response:', responseText);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Improvement generation test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting Daily City Design Improvement Test Suite\n');
    console.log('=' .repeat(60));
    
    const tests = [
        { name: 'Google AI Connection', fn: testConnection },
        { name: 'Content File Reading', fn: testContentReading },
        { name: 'AI Improvement Generation', fn: testImprovementGeneration }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const success = await test.fn();
            if (success) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ ${test.name} threw error:`, error.message);
            failed++;
        }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Results Summary');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed! The system is ready to use.');
        console.log('\n📝 Next steps:');
        console.log('   1. Add GOOGLE_API_KEY to GitHub repository secrets');
        console.log('   2. Enable GitHub Actions in your repository');
        console.log('   3. Wait for the daily scheduled run or trigger manually');
    } else {
        console.log('\n⚠️  Some tests failed. Please fix the issues before using.');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('💥 Fatal error running tests:', error);
        process.exit(1);
    });
}

module.exports = {
    testConnection,
    testContentReading,
    testImprovementGeneration,
    runAllTests
};
