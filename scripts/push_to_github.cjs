const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

const projectRoot = path.resolve(__dirname, '..');
const token = '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';
const repoUrl = 'https://github.com/devJayesh14/PPL-Connect-.git';

console.log('Project root:', projectRoot);

const ignoredDirs = new Set([
  'node_modules',
  'dist',
  '.vercel',
  '.git',
  '.gemini',
]);

const ignoredFiles = new Set([
  '.DS_Store',
  '.env',
  '.env.local',
]);

function shouldIgnore(relPath) {
  const parts = relPath.split(path.sep);
  for (const part of parts) {
    if (ignoredDirs.has(part)) return true;
  }
  const basename = path.basename(relPath);
  if (ignoredFiles.has(basename)) return true;
  if (basename.endsWith('.sqlite') || basename.endsWith('.sqlite-journal') || basename.endsWith('.sqlite-wal')) {
    return true;
  }
  return false;
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(baseDir, fullPath);
    if (shouldIgnore(relPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

async function run() {
  console.log('1. Checking git repository...');
  await git.init({ fs, dir: projectRoot, defaultBranch: 'main' });

  console.log('2. Scanning project files...');
  const files = getAllFiles(projectRoot);
  console.log(`Found ${files.length} project files to stage.`);

  console.log('3. Staging files into git index...');
  for (const file of files) {
    await git.add({ fs, dir: projectRoot, filepath: file });
  }

  console.log('4. Creating commit...');
  let sha;
  try {
    sha = await git.commit({
      fs,
      dir: projectRoot,
      message: 'feat: add captains list access for all roles, link captains to players and exclude captained players from auction pool',
      author: {
        name: 'devJayesh14',
        email: 'devjayesh14@gmail.com',
      },
    });
    console.log('Committed commit SHA:', sha);
  } catch (err) {
    console.log('Commit note:', err.message);
  }

  console.log('5. Pushing to GitHub remote (main branch)...');
  const pushResult = await git.push({
    fs,
    http,
    dir: projectRoot,
    url: repoUrl,
    ref: 'main',
    force: true,
    onAuth: () => ({ username: token, password: '' }),
  });

  console.log('Push complete!', pushResult);
}

run().catch((err) => {
  console.error('Push failed:', err);
  process.exit(1);
});
