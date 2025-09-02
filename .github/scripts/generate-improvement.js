const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Perspectives and thinking methods
const perspectives = [
    "Urban Planner", "Citizen Resident", "Environmental Engineer", "Fire Fighter",
    "Police Officer", "Healthcare Worker", "Teacher", "Transportation Engineer",
    "Social Worker", "Sustainability Expert", "Technology Specialist", "Artist",
    "Economist", "Accessibility Advocate", "Emergency Response Coordinator",
    "Community Organizer", "Child", "Elder", "Business Owner", "Maintenance Worker"
];

const thinkingMethods = [
    "White Hat (Facts & Information)",
    "Red Hat (Emotions & Feelings)",
    "Black Hat (Critical Thinking)",
    "Yellow Hat (Optimistic Thinking)",
    "Green Hat (Creative Thinking)",
    "Blue Hat (Process & Control)"
];

const focusAreas = [
    "Transportation Systems",
    "Energy Infrastructure",
    "Housing & Residential",
    "Healthcare Facilities",
    "Education Systems",
    "Environmental Sustainability",
    "Community Spaces",
    "Emergency Preparedness",
    "Digital Infrastructure",
    "Economic Systems",
    "Governance & Democracy",
    "Cultural & Arts Programs",
    "Food Production",
    "Waste Management",
    "Water Systems",
    "Public Safety",
    "Recreation & Wellness",
    "Innovation & Research"
];

async function readContentFiles() {
    const contentDir = path.join(process.cwd(), 'docs', 'content');
    const files = await fs.readdir(contentDir);
    const content = {};
    
    for (const file of files) {
        if (file.endsWith('.md')) {
            const filePath = path.join(contentDir, file);
            const fileContent = await fs.readFile(filePath, 'utf8');
            content[file] = fileContent;
        }
    }
    
    return content;
}

async function generateImprovement() {
    try {
        // Read current content
        const content = await readContentFiles();
        
        // Randomly select perspective, method, and focus area
        const perspective = "All";
        const thinkingMethod = thinkingMethods[Math.floor(Math.random() * thinkingMethods.length)];
        const focusArea = focusAreas[Math.floor(Math.random() * focusAreas.length)];
        
        console.log(`Selected perspectives: ${perspectives.join(", ")}`);
        console.log(`Selected thinking method: ${thinkingMethod}`);
        console.log(`Selected focus area: ${focusArea}`);
        
        // Create the prompt
        const prompt = `You are analyzing the blueprint for Utopia, an all-inclusive city built on automation. Your task is to suggest ONE specific improvement in a specific area using a specific thinking approach.

THINKING METHOD: Use ${thinkingMethod} from Edward de Bono's Six Thinking Hats
FOCUS AREA: ${focusArea}

CURRENT CITY DOCUMENTATION:

=== DESCRIPTION ===
${content['description.md'] || 'Not available'}

=== PRINCIPLES ===
${content['principles.md'] || 'Not available'}

=== TECHNICAL SPECIFICATIONS ===
${content['tech-specs.md'] || 'Not available'}

=== ROADMAP ===
${content['roadmap.md'] || 'Not available'}

INSTRUCTIONS:
1. Identify ONE weakness of the blueprint that is related to ${focusArea} and that is critical from the perspective of at least one of ${perspectives.join(", ")}
2. Apply ${thinkingMethod} to analyze the ${focusArea} from each perspective
3. Identify ONE specific area for improvement related to ${focusArea}
4. Propose a concrete, detailed enhancement
5. Your response must be in this EXACT JSON format:

{
  "file_to_update": "description.md|principles.md|tech-specs.md|roadmap.md",
  "improvement_title": "Brief title (max 50 chars)",
  "description": "Detailed description of the improvement (2-3 sentences)",
  "rationale": "Why this improvement is needed from your perspective (2-3 sentences)",
  "impact": "Expected positive outcomes (2-3 sentences)",
  "markdown_addition": "The exact markdown text to add/insert (properly formatted markdown with headers, bullets, etc.)",
  "insertion_point": "After which heading/section to insert (exact text match)"
}

REQUIREMENTS:
- Be specific and actionable
- Stay true to the roles of the individual perspectives
- Apply ${thinkingMethod} consistently
- Focus on ${focusArea}
- Provide markdown that fits the existing structure
- Make meaningful improvements, not just additions
- Suggest improvements only based on technologies that either already exist or are being researched but have clear estimations for ranges for timeline and implementation cost. 

Your improvement should be practical, using ${thinkingMethod}.`;

        // Get model and generate content
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
        
        const result = await callAi(prompt);
        const responseText = result.response.text();
        
        console.log('AI Response:', responseText);
        
        // Parse the JSON response
        let improvement;
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                improvement = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError);
            console.error('Raw response:', responseText);
            return null;
        }
        
        // Validate required fields
        const requiredFields = ['file_to_update', 'improvement_title', 'description', 'rationale', 'impact', 'markdown_addition', 'insertion_point'];
        for (const field of requiredFields) {
            if (!improvement[field]) {
                console.error(`Missing required field: ${field}`);
                return null;
            }
        }
        
        console.log('Parsed improvement:', improvement);
        
        // Apply the improvement to the specified file
        const targetFile = path.join(process.cwd(), 'docs', 'content', improvement.file_to_update);
        let fileContent = await fs.readFile(targetFile, 'utf8');
        
        // Find insertion point and add content
        const insertionPoint = improvement.insertion_point;
        const lines = fileContent.split('\n');
        let insertionIndex = -1;
        
        // Find the line with the insertion point
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === insertionPoint.trim() || 
                lines[i].includes(insertionPoint) ||
                lines[i].trim().endsWith(insertionPoint.trim())) {
                insertionIndex = i;
                break;
            }
        }
        
        if (insertionIndex === -1) {
            // If exact match not found, append to end of file
            console.log(`Insertion point "${insertionPoint}" not found, appending to end of file`);
            fileContent += '\n\n' + improvement.markdown_addition;
        } else {
            // Insert after the found line
            lines.splice(insertionIndex + 1, 0, '', improvement.markdown_addition);
            fileContent = lines.join('\n');
        }
        
        // Write the updated content back to file
        await fs.writeFile(targetFile, fileContent, 'utf8');
        
        console.log(`Updated ${improvement.file_to_update} with improvement`);
        
        // Set outputs for GitHub Actions
        const date = new Date().toISOString().split('T')[0];
        const branchSuffix = date + '-' + Math.random().toString(36).substring(2, 8);
        
        // Write outputs to environment file for GitHub Actions
        const outputs = [
            `has_changes=true`,
            `improvement_title=${improvement.improvement_title}`,
            `perspective=${perspective}`,
            `thinking_method=${thinkingMethod}`,
            `focus_area=${focusArea}`,
            `description=${improvement.description}`,
            `rationale=${improvement.rationale}`,
            `impact=${improvement.impact}`,
            `generation_date=${new Date().toISOString()}`,
            `branch_suffix=${branchSuffix}`
        ];
        
        if (process.env.GITHUB_OUTPUT) {
            await fs.appendFile(process.env.GITHUB_OUTPUT, outputs.join('\n') + '\n');
        }
        
        return {
            success: true,
            improvement,
            perspective,
            thinkingMethod,
            focusArea
        };
        
    } catch (error) {
        console.error('Error generating improvement:', error);
        
        if (process.env.GITHUB_OUTPUT) {
            await fs.appendFile(process.env.GITHUB_OUTPUT, 'has_changes=false\n');
        }
        
        return null;
    }
}

async function callAi(prompt) {
  while (true) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      console.error(error);
    }

    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

// Main execution
async function main() {
    console.log('Starting daily city design improvement generation...');
    
    if (!process.env.GOOGLE_API_KEY) {
        console.error('GOOGLE_API_KEY environment variable is not set');
        process.exit(1);
    }
    
    const result = await generateImprovement();
    
    if (result) {
        console.log('✅ Successfully generated improvement');
        console.log(`Perspective: ${result.perspective}`);
        console.log(`Method: ${result.thinkingMethod}`);
        console.log(`Focus: ${result.focusArea}`);
        console.log(`Title: ${result.improvement.improvement_title}`);
    } else {
        console.log('❌ Failed to generate improvement');
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
