// ============================================================================
// CLAIMS SUMMARY MOCK API SERVER - PHASE 1
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// LOAD DATA
// ============================================================================

// Load Claims Summary Data
let claimsData = { reviewclaimsCountMap: [] };
const possiblePaths = [
  path.join(__dirname, 'claims.json'),
  path.join(__dirname, '../data/claims.json'),
  path.join(__dirname, 'data/claims.json'),
];

let dataLoaded = false;
for (const filePath of possiblePaths) {
  if (fs.existsSync(filePath)) {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      claimsData = JSON.parse(rawData);
      console.log(
        `✅ Loaded ${claimsData.reviewclaimsCountMap?.length || 0} claim streams from: ${filePath}`
      );
      dataLoaded = true;
      break;
    } catch (err) {
      console.error(`❌ Error reading ${filePath}:`, err.message);
    }
  }
}

if (!dataLoaded) {
  console.warn('⚠️  No claims data loaded. Using empty array.');
}

// Load Halted Claims Data (PHASE 1)
let haltedClaimsData = { queues: {} };
const haltedClaimsPaths = [
  path.join(__dirname, 'haltedClaims.json'),
  path.join(__dirname, '../data/haltedClaims.json'),
  path.join(__dirname, 'data/haltedClaims.json'),
];

let haltedDataLoaded = false;
for (const filePath of haltedClaimsPaths) {
  if (fs.existsSync(filePath)) {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      haltedClaimsData = JSON.parse(rawData);
      const totalClaims = Object.values(haltedClaimsData.queues).reduce(
        (sum, queue) => sum + queue.length,
        0
      );
      console.log(
        `✅ Loaded ${totalClaims} halted claims in ${Object.keys(haltedClaimsData.queues).length} queues from: ${filePath}`
      );
      haltedDataLoaded = true;
      break;
    } catch (err) {
      console.error(`❌ Error reading ${filePath}:`, err.message);
    }
  }
}

if (!haltedDataLoaded) {
  console.warn('⚠️  No halted claims data loaded.');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Search for a claim by EDP Claim ID or Client Claim ID
 * @param {string} claimId - EDP Claim ID or Client Claim ID
 * @returns {object|null} - Claim object if found, null otherwise
 */
function findClaimById(claimId) {
  if (!claimId) return null;

  // Search through all queues
  for (const queueKey in haltedClaimsData.queues) {
    const queue = haltedClaimsData.queues[queueKey];
    const claim = queue.find(
      (c) =>
        c.claimNumber === claimId ||
        c.clientClaimId === claimId ||
        c.claimNumber.toLowerCase() === claimId.toLowerCase() ||
        c.clientClaimId.toLowerCase() === claimId.toLowerCase()
    );
    if (claim) {
      return claim;
    }
  }

  return null;
}

/**
 * Get queue key from parameters
 * @param {string} claimStream - HEOS, ALC, etc.
 * @param {string} category - manual-review or manual-pended
 * @param {string} formType - hcfa or ub
 * @returns {string} - Queue key
 */
function getQueueKey(claimStream, category, formType) {
  const categoryKey =
    category === 'manual-review' ? 'MANUAL_REVIEW' : 'MANUAL_REVIEW_PENDED';
  const formTypeKey = formType.toUpperCase();
  return `${claimStream.toUpperCase()}_${categoryKey}_${formTypeKey}`;
}

/**
 * Get next available claim from queue
 * @param {string} queueKey - Queue identifier
 * @returns {object|null} - Next claim or null if queue empty
 */
function getNextClaimFromQueue(queueKey) {
  const queue = haltedClaimsData.queues[queueKey];
  if (!queue || queue.length === 0) {
    return null;
  }

  // Find first unlocked claim
  const claim = queue.find((c) => c.status === 'HALTED' && !c.lockedBy);
  return claim || null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - req.startTime;
    const statusEmoji = res.statusCode < 400 ? '✅' : '❌';
    console.log(
      `${statusEmoji} ${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`
    );
    originalSend.call(this, data);
  };
  next();
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health Check
 * GET /health
 */
app.get('/health', (req, res) => {
  const totalClaims = Object.values(haltedClaimsData.queues).reduce(
    (sum, queue) => sum + queue.length,
    0
  );

  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dataLoaded: {
      claimStreams: claimsData.reviewclaimsCountMap?.length || 0,
      haltedClaims: totalClaims,
      queues: Object.keys(haltedClaimsData.queues).length,
    },
  });
});

/**
 * Get Claims Summary Data
 * GET /api/claims
 */
app.get('/api/claims', (req, res) => {
  try {
    res.json(claimsData);
  } catch (error) {
    console.error('❌ Error fetching claims:', error);
    res.status(500).json({
      error: 'Failed to fetch claims data',
      message: error.message,
    });
  }
});

/**
 * Search for a halted claim by ID
 * GET /api/claims/search?claimId=EDP-272120489
 *
 * Returns:
 * - 200: { found: true, claim: {...} }
 * - 404: { found: false, error: 'NOT_FOUND', message: '...' }
 */
app.get('/api/claims/search', (req, res) => {
  try {
    const { claimId } = req.query;

    if (!claimId) {
      return res.status(400).json({
        found: false,
        error: 'INVALID_REQUEST',
        message: 'Claim ID is required',
      });
    }

    console.log(`🔍 Searching for claim: ${claimId}`);

    const claim = findClaimById(claimId);

    if (!claim) {
      return res.status(404).json({
        found: false,
        error: 'NOT_FOUND',
        message:
          'The specified claim was not found. Either it is not a halted claim, it is locked by another user, or it does not exist.',
      });
    }

    // Check if claim is locked
    if (claim.status === 'LOCKED' || claim.lockedBy) {
      return res.status(200).json({
        found: false,
        error: 'LOCKED',
        message: 'This claim is currently locked by another user.',
      });
    }

    // Return found claim
    res.json({
      found: true,
      claim: claim,
    });
  } catch (error) {
    console.error('❌ Error searching claim:', error);
    res.status(500).json({
      found: false,
      error: 'SERVER_ERROR',
      message: 'An error occurred while searching for the claim.',
    });
  }
});

/**
 * Get next claim from queue
 * GET /api/claims/queue/next?claimStream=HEOS&category=manual-review&formType=hcfa
 *
 * This endpoint is called when user clicks on a count in the claims table
 * It returns the next available (unlocked) claim from the specified queue
 */
app.get('/api/claims/queue/next', (req, res) => {
  try {
    const { claimStream, category, formType } = req.query;

    if (!claimStream || !category || !formType) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'claimStream, category, and formType are required',
      });
    }

    const queueKey = getQueueKey(claimStream, category, formType);
    console.log(`📋 Getting next claim from queue: ${queueKey}`);

    const claim = getNextClaimFromQueue(queueKey);

    if (!claim) {
      return res.status(404).json({
        error: 'QUEUE_EMPTY',
        message: 'No claims available in this queue',
      });
    }

    // Return claim
    res.json({
      claim: claim,
      queueKey: queueKey,
    });
  } catch (error) {
    console.error('❌ Error getting next claim:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while fetching the next claim.',
    });
  }
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('\n🚀 Claims API Server Started - Phase 1!');
  console.log('================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(
    `📊 Claims Streams: ${claimsData.reviewclaimsCountMap?.length || 0}`
  );
  console.log(
    `🔍 Halted Claims: ${Object.values(haltedClaimsData.queues).reduce((sum, queue) => sum + queue.length, 0)}`
  );
  console.log(`📋 Queues: ${Object.keys(haltedClaimsData.queues).length}`);
  console.log('\nEndpoints:');
  console.log(`  GET  /health`);
  console.log(`  GET  /api/claims`);
  console.log(`  GET  /api/claims/search?claimId=XXX`);
  console.log(
    `  GET  /api/claims/queue/next?claimStream=XXX&category=XXX&formType=XXX`
  );
  console.log('================================\n');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => {
    console.log('Server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received: closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
