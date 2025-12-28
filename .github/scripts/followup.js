const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const cp = require('child_process');
const https = require('https');

async function readPrJson() {
  const p = path.join(process.cwd(), 'pr.json');
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

function callAiFactory(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  async function callAi(prompt) {
    for (const name of ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"]) {
      try {
        console.log('Calling model', name);
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent(prompt);
        return { modelName: name, responseText: result.response.text() };
      } catch (err) {
        console.error('Model call error', err?.message || err);
      }
    }
    throw new Error('All model calls failed');
  }
  return callAi;
}

async function applyImprovement(improvement) {
  const targetFile = path.join(process.cwd(), 'docs', 'content', improvement.file_to_update);
  let fileContent = await fs.readFile(targetFile, 'utf8');

  const insertionPoint = improvement.insertion_point;
  const lines = fileContent.split('\n');
  let insertionIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === insertionPoint.trim() || lines[i].includes(insertionPoint) || lines[i].trim().endsWith(insertionPoint.trim())) {
      insertionIndex = i;
      break;
    }
  }

  if (insertionIndex === -1) {
    console.log(`Insertion point "${insertionPoint}" not found, appending to end of file`);
    fileContent += '\n\n' + improvement.markdown_addition;
  } else {
    lines.splice(insertionIndex + 1, 0, '', improvement.markdown_addition);
    fileContent = lines.join('\n');
  }

  await fs.writeFile(targetFile, fileContent, 'utf8');
  console.log(`Updated ${improvement.file_to_update}`);
}

function exec(cmd) {
  console.log('>', cmd);
  return cp.execSync(cmd, { stdio: 'inherit' });
}

(async function main(){
  try {
    const pr = await readPrJson();
    const comment = pr.comment || '';
    const commenter = pr.commenter || 'unknown';
    const prNumber = pr.number;
    const title = pr.title || '';
    const commentId = pr.comment_id || null;
    const commentCreatedAt = pr.comment_created_at || null;

    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY not set');
      process.exit(1);
    }

    if (!comment || comment.trim().length === 0) {
      console.log('No comment content - nothing to do');
      return;
    }

    // Avoid acting on bot comments
    if (/\[bot\]$|github-actions\[bot\]/i.test(commenter)) {
      console.log('Comment posted by a bot; skipping');
      return;
    }

    // Basic guard: require comment id to avoid reprocessing ambiguous payloads
    if (!commentId) {
      console.log('No comment id available; skipping to avoid potential duplicate processing');
      return;
    }

    // Helper to fetch issue comments for the PR
    async function fetchIssueComments(prNumber) {
      const repo = process.env.GITHUB_REPOSITORY;
      const token = process.env.GITHUB_TOKEN;
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${repo}/issues/${prNumber}/comments`,
        headers: {
          'User-Agent': 'github-actions-followup-script',
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${token}`
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.get(options, (res) => {
          let data = '';
          res.on('data', (c) => data += c);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(err);
            }
          });
        });
        req.on('error', reject);
      });
    }

    // If a previous bot reply marked this comment as processed, skip
    const existingComments = await fetchIssueComments(prNumber);
    if (existingComments.some(c => c && c.body && c.body.includes(`<!-- ai-followup-processed-comment-id: ${commentId} -->`))) {
      console.log('This comment was already processed by AI follow-up; skipping');
      return;
    }

    // Helper to add a label after successful processing
    async function addLabel(prNumber, label) {
      const repo = process.env.GITHUB_REPOSITORY;
      const token = process.env.GITHUB_TOKEN;
      const data = JSON.stringify([label]);
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${repo}/issues/${prNumber}/labels`,
        method: 'POST',
        headers: {
          'User-Agent': 'github-actions-followup-script',
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let resp = '';
          res.on('data', (c) => resp += c);
          res.on('end', () => resolve(resp));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
    }

    const callAi = callAiFactory(process.env.GOOGLE_API_KEY);

    // Determine which original workflow created the PR
    let mode = null; // 'improvement' or 'review'
    if (title.includes('Daily City Design Improvement')) {
      mode = 'improvement';
    } else if (title.includes('Daily Advisory Board Review')) {
      mode = 'review';
    } else {
      console.log('PR title does not match known AI workflows; skipping');
      return;
    }

    // Read docs content used in original prompts
    async function readContentFiles() {
      const contentDir = path.join(process.cwd(), 'docs', 'content');
      const files = await fs.readdir(contentDir);
      const content = {};
      for (const file of files) {
        if (file.endsWith('.md')) {
          const fp = path.join(contentDir, file);
          content[file] = await fs.readFile(fp, 'utf8');
        }
      }
      return content;
    }

    const content = await readContentFiles();

    // Build the same prompt as the original run, but append the follow-up comment and a clear instruction
    let prompt = '';

    if (mode === 'improvement') {
      prompt = `You are analyzing the blueprint for Utopia, an all-inclusive city built on automation. Your task is to suggest ONE specific improvement in a specific area using a specific thinking approach.\n\n`;
      prompt += `CURRENT CITY DOCUMENTATION:\n\n=== DESCRIPTION ===\n${content['description.md'] || 'Not available'}\n\n=== PRINCIPLES ===\n${content['principles.md'] || 'Not available'}\n\n=== TECHNICAL SPECIFICATIONS ===\n${content['tech-specs.md'] || 'Not available'}\n\n=== ROADMAP ===\n${content['roadmap.md'] || 'Not available'}\n\n`;
      prompt += `INSTRUCTIONS: Provide the same JSON format as the original Daily City Design Improvement. Then, because this is a follow-up request, incorporate the following PR comment into your analysis and either refine the previously proposed improvement or propose a targeted follow-up improvement that specifically addresses the comment.\n\nFOLLOW-UP COMMENT:\n${comment}\n\nYour JSON must be EXACT and match the original schema used by the generating workflow.`;
    } else {
      prompt = `You are a board of advisors proof-reading the blueprint for Utopia. Your task is to identify ONE specific and critical weakness of the blueprint documentation and propose a concrete correction.\n\n`;
      prompt += `CURRENT CITY BLUEPRINT DOCUMENTATION:\n\n=== DESCRIPTION ===\n${content['description.md'] || 'Not available'}\n\n=== PRINCIPLES ===\n${content['principles.md'] || 'Not available'}\n\n=== TECHNICAL SPECIFICATIONS ===\n${content['tech-specs.md'] || 'Not available'}\n\n=== ROADMAP ===\n${content['roadmap.md'] || 'Not available'}\n\n`;
      prompt += `INSTRUCTIONS: Provide the same JSON format as the original Daily Advisory Board Review. Then, because this is a follow-up request, incorporate the following PR comment into your analysis and either refine the previously proposed correction or propose a targeted follow-up correction that specifically addresses the comment.\n\nFOLLOW-UP COMMENT:\n${comment}\n\nYour JSON must be EXACT and match the original schema used by the generating workflow.`;
    }

    console.log('Prompt prepared — calling AI');
    const { modelName, responseText } = await callAi(prompt);

    console.log('AI response received');

    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in model response');
    }

    const improvement = JSON.parse(jsonMatch[0]);

    // Validate
    const required = ['file_to_update','improvement_title','description','rationale','impact','markdown_addition','insertion_point'];
    for (const r of required) {
      if (!improvement[r]) throw new Error(`Missing required field: ${r}`);
    }

    // Apply changes
    await applyImprovement(improvement);

    // If there are changes, commit and push
    const status = cp.execSync('git status --porcelain').toString().trim();
    if (!status) {
      console.log('No file changes after applying improvement');
      // Comment on PR noting no changes
      await postComment(prNumber, `🤖 Follow-up processed for comment by @${commenter}, but no file changes were required.`);
      // Mark PR as processed for this comment so we don't re-run on the same comment
      await addLabel(prNumber, 'ai-followup-processed');
      return;
    }

    // Commit and push
    exec('git config user.name "github-actions[bot]"');
    exec('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
    exec('git add -A');
    try {
      exec(`git commit -m "🤖 AI follow-up: ${improvement.improvement_title} (based on comment by @${commenter})"`);
    } catch (err) {
      console.log('Commit may have failed (maybe no staged changes)');
    }
    exec('git push origin HEAD');

    await postComment(prNumber, `✅ AI follow-up applied by @${commenter}. **Title:** ${improvement.improvement_title}. If you need further refinements, reply in this thread.`);
    // Mark PR as processed for this comment so we don't re-run on the same comment
    await addLabel(prNumber, 'ai-followup-processed');

    console.log('Follow-up complete');

    async function postComment(prNumber, body) {
      const repo = process.env.GITHUB_REPOSITORY;
      const token = process.env.GITHUB_TOKEN;
      if (!repo || !token) return;

      // Append a hidden marker so we can detect that this exact comment was processed already
      if (typeof commentId !== 'undefined' && commentId !== null) {
        body += `\n\n<!-- ai-followup-processed-comment-id: ${commentId} -->`;
      }

      const data = JSON.stringify({ body });

      const options = {
        hostname: 'api.github.com',
        path: `/repos/${repo}/issues/${prNumber}/comments`,
        method: 'POST',
        headers: {
          'User-Agent': 'github-actions-followup-script',
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let resp = '';
          res.on('data', (c) => resp += c);
          res.on('end', () => resolve(resp));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
    }

  } catch (err) {
    console.error('Follow-up script failed:', err);
    process.exit(1);
  }
})();
