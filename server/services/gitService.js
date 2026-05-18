const { simpleGit } = require("simple-git");
const { existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { tmpdir } = require("os");

/**
 * Git Service - Centralized Git operations management
 * Handles repo initialization, state management, and error recovery
 */

const gitInstances = new Map(); // Cache git instances by roomId

/**
 * Get or create a Git instance for a room
 */
function getGit(roomId) {
  const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
  
  // Ensure room directory exists
  if (!existsSync(roomCwd)) {
    mkdirSync(roomCwd, { recursive: true });
  }
  
  // Return fresh instance each time (avoids stale state issues)
  return simpleGit(roomCwd);
}

/**
 * Check if a room has a valid Git repository
 */
async function isValidRepo(roomId) {
  try {
    const git = getGit(roomId);
    const isRepo = await git.checkIsRepo();
    return isRepo;
  } catch (err) {
    return false;
  }
}

/**
 * Ensure Git repo is initialized for a room
 * If not initialized, automatically initializes it
 */
async function ensureRepoInitialized(roomId, defaultBranch = "main", authorName, authorEmail) {
  try {
    const git = getGit(roomId);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      // Auto-initialize
      await git.init();
      
      // Set branch
      const currentBranch = (await git.branch(["--show-current"])).current;
      if (currentBranch !== defaultBranch) {
        await git.checkout(["-b", defaultBranch]);
      }

      // Configure user if provided
      if (authorName) await git.addConfig("user.name", authorName);
      if (authorEmail) await git.addConfig("user.email", authorEmail);

      return { initialized: true, branch: defaultBranch };
    }

    return { initialized: false, branch: null };
  } catch (err) {
    throw new Error(`Failed to ensure repo initialization: ${err.message}`);
  }
}

/**
 * Normalize GitHub PAT token
 */
function normalizePat(pat) {
  return typeof pat === "string" ? pat.trim() : "";
}

/**
 * Redact sensitive tokens from error messages
 */
function redactSecret(value, secret) {
  const text = value instanceof Error ? value.message : String(value || "");
  const token = normalizePat(secret);
  return token ? text.split(token).join("[redacted]") : text;
}

/**
 * Build authenticated GitHub URL for push/pull operations
 */
function buildAuthenticatedGitHubUrl(remoteUrl, token, username) {
  let url = remoteUrl.trim();

  // Convert SSH to HTTPS if needed
  if (url.startsWith("git@github.com:")) {
    url = `https://github.com/${url.slice("git@github.com:".length)}`;
  }

  // Ensure it's an HTTPS URL
  if (!url.startsWith("https://")) {
    url = url.replace("http://", "https://");
  }

  // Parse and rebuild with authentication
  try {
    const urlObj = new URL(url);
    urlObj.username = "x-access-token";
    urlObj.password = token;
    return urlObj.toString();
  } catch (err) {
    // Fallback manual construction if URL parsing fails
    const cleanUrl = url
      .replace("https://", "")
      .replace("http://", "")
      .replace(/\.git$/, "");
    
    return `https://x-access-token:${token}@${cleanUrl}.git`;
  }
}

/**
 * Resolve the branch we should operate on.
 * Falls back to a sensible default for freshly initialized repos.
 */
async function resolveCurrentBranch(git, fallbackBranch = "main") {
  const status = await git.status();
  if (status.current) {
    return status.current;
  }

  const branchSummary = await git.branchLocal();
  if (branchSummary.current) {
    return branchSummary.current;
  }

  const allBranches = branchSummary.all || [];
  if (allBranches.includes(fallbackBranch)) {
    return fallbackBranch;
  }
  if (allBranches.length > 0) {
    return allBranches[0];
  }

  return fallbackBranch;
}

/**
 * Temporarily authenticate the existing origin remote for a single operation.
 */
async function withAuthenticatedOrigin(roomId, token, username, operation) {
  const git = getGit(roomId);
  const remoteUrl = (await git.remote(["get-url", "origin"])).trim();
  const authUrl = buildAuthenticatedGitHubUrl(remoteUrl, token, username);

  await git.remote(["set-url", "origin", authUrl]);

  try {
    return await operation({ git, remoteUrl, authUrl });
  } finally {
    try {
      await git.remote(["set-url", "origin", remoteUrl]);
    } catch (restoreErr) {
      console.warn("[git] Failed to restore clean remote URL:", restoreErr.message);
    }
  }
}

/**
 * Simplify Git error messages for users
 */
function simplifyGitError(err, secret) {
  const msg = redactSecret(err.message || String(err), secret);
  const lower = msg.toLowerCase();

  if (lower.includes("authentication failed") || lower.includes("invalid username or password")) {
    return "Your GitHub Token (PAT) is invalid or expired. Please check your settings.";
  }
  if (lower.includes("write access to repository not granted") || lower.includes("permission to") || lower.includes("permission denied") || lower.includes("403")) {
    return "GitHub denied repository access. Classic PATs need the 'repo' scope; fine-grained PATs must include this repository with Contents read/write permission.";
  }
  if (lower.includes("remote: repository not found")) {
    return "GitHub repository not found, or this token does not have access to it. Check the remote URL and token repository access.";
  }
  if (lower.includes("couldn't find remote ref")) {
    return "Branch not found on GitHub. Try pushing your code first.";
  }
  if (lower.includes("rejected") || lower.includes("non-fast-forward")) {
    return "Push rejected. Remote has changes you don't have locally. Try pulling first.";
  }
  if (msg.includes("CONFLICT") || lower.includes("automatic merge failed")) {
    return "Merge conflict! Manually resolve differences in the conflicted files.";
  }
  if (lower.includes("already exists") && lower.includes("remote origin")) {
    return "Remote already exists. Updated it to your new URL.";
  }

  return msg.split(':').pop().trim() || "An unexpected Git error occurred.";
}

/**
 * Check if branch exists on remote
 */
async function remoteBranchExists(roomId, token, branchName) {
  try {
    if (!branchName) return false;

    return await withAuthenticatedOrigin(roomId, token, "", async ({ git }) => {
      const result = await git.raw(["ls-remote", "--heads", "origin", branchName]);
      return Boolean(String(result || "").trim());
    });
  } catch (err) {
    console.error("Error checking remote branch:", err.message);
    return false;
  }
}

/**
 * Force reinitialize a Git repo (for recovery)
 */
async function reinitRepo(roomId, defaultBranch = "main") {
  try {
    const git = getGit(roomId);
    
    // Check if .git exists and remove it
    const roomCwd = join(tmpdir(), `liveshare_room_${roomId}`);
    const gitDir = join(roomCwd, ".git");
    
    if (existsSync(gitDir)) {
      const { rmSync } = require("fs");
      rmSync(gitDir, { recursive: true, force: true });
    }

    // Reinitialize
    await git.init();
    
    const currentBranch = (await git.branch(["--show-current"])).current;
    if (currentBranch !== defaultBranch) {
      await git.checkout(["-b", defaultBranch]);
    }

    return { reinitialized: true, branch: defaultBranch };
  } catch (err) {
    throw new Error(`Failed to reinitialize repo: ${err.message}`);
  }
}

module.exports = {
  getGit,
  isValidRepo,
  ensureRepoInitialized,
  normalizePat,
  redactSecret,
  buildAuthenticatedGitHubUrl,
  resolveCurrentBranch,
  withAuthenticatedOrigin,
  simplifyGitError,
  remoteBranchExists,
  reinitRepo
};
