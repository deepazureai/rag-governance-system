import { execSync } from 'child_process';

try {
  console.log('[v0] Starting Git operations...');
  
  // Check git status
  console.log('[v0] Checking git status...');
  const status = execSync('git status', { cwd: '/vercel/share/v0-project', encoding: 'utf-8' });
  console.log('[v0] Git status:\n', status);
  
  // Stage the evaluation.ts file
  console.log('[v0] Staging evaluation.ts...');
  execSync('git add backend/src/services/evaluation.ts', { cwd: '/vercel/share/v0-project' });
  console.log('[v0] Successfully staged evaluation.ts');
  
  // Commit the changes
  console.log('[v0] Committing changes...');
  execSync('git commit -m "Fix: Update evaluation.ts with proper RAGA metrics evaluation, corrected parameter naming, and type safety"', { 
    cwd: '/vercel/share/v0-project' 
  });
  console.log('[v0] Successfully committed changes');
  
  // Push to GitHub
  console.log('[v0] Pushing to GitHub...');
  execSync('git push -u origin master', { cwd: '/vercel/share/v0-project', encoding: 'utf-8' });
  console.log('[v0] Successfully pushed to GitHub master branch');
  
  console.log('[v0] All Git operations completed successfully!');
} catch (error) {
  console.error('[v0] Git operation failed:', error.message);
  process.exit(1);
}
