# Daily City Design Improvement - GitHub Action

This GitHub Action uses Google's Gemini 2.5 Pro AI model to automatically generate daily improvements to the Utopia city design. The AI analyzes the current documentation from different perspectives and suggests enhancements using Edward de Bono's Six Thinking Hats methodology.

## 🔧 Setup Instructions

### 1. Enable GitHub Actions Permissions (REQUIRED)

**This step is crucial to avoid the "GitHub Actions is not permitted to create or approve pull requests" error.**

1. Go to your GitHub repository
2. Click **Settings** → **Actions** → **General**
3. Scroll down to **"Workflow permissions"**
4. Select **"Read and write permissions"**
5. ✅ Check **"Allow GitHub Actions to create and approve pull requests"**
6. Click **Save**

### 2. Get Google AI API Key (Free Tier)

### 2. Get Google AI API Key (Free Tier)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key (starts with `AIza...`)

### 3. Add API Key to Repository Secrets

### 3. Add API Key to Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `GOOGLE_API_KEY`
5. Value: Your Google AI API key
6. Click **Add secret**

### 4. Enable GitHub Actions

The action will automatically run daily at 9:00 AM UTC, but you can also trigger it manually:

1. Go to **Actions** tab in your repository
2. Select **Daily City Design Improvement**
3. Click **Run workflow**

## 🤖 How It Works

### Random Selection Process
Each day, the AI randomly selects:
- **Perspective**: Urban Planner, Citizen, Engineer, Fire Fighter, etc. (20 different roles)
- **Thinking Method**: One of de Bono's Six Thinking Hats
- **Focus Area**: Transportation, Energy, Housing, Healthcare, etc. (18 different areas)

### AI Analysis Process
1. **Reads** all current markdown files in `docs/content/`
2. **Analyzes** the content from the selected perspective
3. **Applies** the chosen thinking method
4. **Focuses** on the selected area of city design
5. **Generates** a specific, actionable improvement
6. **Creates** properly formatted markdown content

### Output
- **Pull Request** with detailed description
- **File Changes** with new content added to appropriate section
- **Rationale** explaining why the improvement is needed
- **Impact Assessment** of expected outcomes

## 🎭 Perspectives Available

The AI can analyze the city from these viewpoints:
- Urban Planner
- Citizen Resident
- Environmental Engineer
- Fire Fighter
- Police Officer
- Healthcare Worker
- Teacher
- Transportation Engineer
- Social Worker
- Sustainability Expert
- Technology Specialist
- Artist
- Economist
- Accessibility Advocate
- Emergency Response Coordinator
- Community Organizer
- Child
- Elder
- Business Owner
- Maintenance Worker

## 🎩 Six Thinking Hats Methods

- **White Hat**: Facts & Information analysis
- **Red Hat**: Emotions & Feelings consideration
- **Black Hat**: Critical thinking and risk assessment
- **Yellow Hat**: Optimistic thinking and benefits
- **Green Hat**: Creative thinking and alternatives
- **Blue Hat**: Process control and meta-thinking

## 🎯 Focus Areas

- Transportation Systems
- Energy Infrastructure
- Housing & Residential
- Healthcare Facilities
- Education Systems
- Environmental Sustainability
- Community Spaces
- Emergency Preparedness
- Digital Infrastructure
- Economic Systems
- Governance & Democracy
- Cultural & Arts Programs
- Food Production
- Waste Management
- Water Systems
- Public Safety
- Recreation & Wellness
- Innovation & Research

## 📋 Pull Request Format

Each AI-generated pull request includes:

### Header Information
- **Perspective**: Which role the AI took
- **Thinking Method**: Which thinking hat was used
- **Focus Area**: Which aspect of the city was analyzed

### Content Sections
- **Description of Changes**: What was modified
- **Rationale**: Why the change is needed
- **Expected Impact**: Predicted positive outcomes

### Labels
- `ai-generated`
- `enhancement`
- `city-design`
- `daily-improvement`

## ⚙️ Configuration Options

You can modify the action by editing `.github/workflows/daily-improvement.yml`:

### Change Schedule
```yaml
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
    # - cron: '0 9 * * 1'  # Weekly on Monday
    # - cron: '0 9 1 * *'  # Monthly on 1st day
```

### Add More Perspectives
Edit `.github/scripts/generate-improvement.js` and add to the `perspectives` array.

### Modify Focus Areas
Edit the `focusAreas` array in the script file.

## 🔍 Monitoring & Troubleshooting

### View Action Logs
1. Go to **Actions** tab
2. Click on a workflow run
3. Expand the job to see detailed logs

### Common Issues

#### "GitHub Actions is not permitted to create or approve pull requests"
**Solution**: Enable workflow permissions in repository settings:
1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select **"Read and write permissions"**
3. Check **"Allow GitHub Actions to create and approve pull requests"**
4. Save changes

#### API Key Issues
- **API Key Issues**: Check if `GOOGLE_API_KEY` is set correctly
- **Rate Limits**: Google AI has generous free tier limits
- **Parse Errors**: AI response wasn't valid JSON (usually retries work)

### Manual Testing
You can test the script locally:
```bash
cd .github/scripts
npm install @google/generative-ai
GOOGLE_API_KEY="your-key-here" node generate-improvement.js
```

## 📊 Free Tier Limits

Google AI Studio free tier includes:
- **60 requests per minute**
- **1,500 requests per day**
- **100,000 tokens per request**

This action uses approximately 1 request per day, well within limits.

## 🛡️ Security

- API key is stored securely in GitHub repository secrets
- No sensitive data is logged or exposed
- Pull requests can be reviewed before merging
- Action runs in isolated GitHub environment

## 🎛️ Customization Examples

### Add New Perspective
```javascript
const perspectives = [
    // ... existing perspectives
    "Climate Scientist",
    "Data Privacy Expert",
    "Youth Representative"
];
```

### Modify AI Instructions
Edit the `prompt` variable in `generate-improvement.js` to change how the AI analyzes the city.

### Change Target Files
The AI can update any markdown file in `docs/content/`. Modify the file selection logic if needed.

---

**Note**: This action creates pull requests that should be reviewed before merging. While the AI generates thoughtful improvements, human oversight ensures quality and alignment with your vision.
