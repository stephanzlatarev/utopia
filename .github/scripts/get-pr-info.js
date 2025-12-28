const fs = require('fs').promises;
const https = require('https');
const path = require('path');

async function getEvent(eventPath) {
  const raw = await fs.readFile(eventPath, 'utf8');
  return JSON.parse(raw);
}

function githubRequest(path, token) {
  const options = {
    hostname: 'api.github.com',
    path,
    headers: {
      'User-Agent': 'github-actions-followup-script',
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`
    }
  };

  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

(async function main(){
  try {
    const eventPath = process.argv[2] || process.env.GITHUB_EVENT_PATH;
    if (!eventPath) throw new Error('GITHUB_EVENT_PATH is not set');

    const event = await getEvent(eventPath);

    let out = {
      number: null,
      head_ref: null,
      title: null,
      comment: null,
      comment_id: null,
      comment_created_at: null,
      commenter: null
    };

    // If payload includes pull_request directly (pull_request_review_comment or pull_request events)
    if (event.pull_request) {
      out.number = event.pull_request.number;
      out.head_ref = event.pull_request.head.ref;
      out.title = event.pull_request.title;
      out.comment = (event.comment && event.comment.body) || '';
      out.comment_id = (event.comment && event.comment.id) || null;
      out.comment_created_at = (event.comment && event.comment.created_at) || null;
      out.commenter = (event.comment && event.comment.user && event.comment.user.login) || (event.sender && event.sender.login) || '';
    } else if (event.issue && event.issue.pull_request) {
      // It's an issue_comment on a PR — fetch PR data via API
      const issueNumber = event.issue.number;
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error('GITHUB_TOKEN is required to fetch PR info');
      const repo = process.env.GITHUB_REPOSITORY;
      const pr = await githubRequest(`/repos/${repo}/pulls/${issueNumber}`, token);
      out.number = pr.number;
      out.head_ref = pr.head.ref;
      out.title = pr.title;
      out.comment = (event.comment && event.comment.body) || '';
      out.comment_id = (event.comment && event.comment.id) || null;
      out.comment_created_at = (event.comment && event.comment.created_at) || null;
      out.commenter = (event.comment && event.comment.user && event.comment.user.login) || '';
    } else {
      // Unknown event structure
      out.comment = (event.comment && event.comment.body) || '';
      out.comment_id = (event.comment && event.comment.id) || null;
      out.comment_created_at = (event.comment && event.comment.created_at) || null;
      out.commenter = (event.comment && event.comment.user && event.comment.user.login) || '';
    }

    await fs.writeFile(path.join(process.cwd(), 'pr.json'), JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote pr.json');
  } catch (err) {
    console.error('Failed to get PR info:', err);
    process.exit(1);
  }
})();
