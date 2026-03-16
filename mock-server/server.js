// ============================================================================
// CLAIMS SUMMARY MOCK API SERVER - PHASE 2
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

// Load Halted Claims Data
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
 */
function getQueueKey(claimStream, category, claimType) {
  const categoryKey =
    category === 'manual-review' ? 'MANUAL_REVIEW' : 'MANUAL_REVIEW_PENDED';
  const claimTypeKey = claimType.toUpperCase();
  return `${claimStream.toUpperCase()}_${categoryKey}_${claimTypeKey}`;
}

/**
 * Get next available claim from queue
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

/**
 * Generate mock member search results
 */
function getMockMemberSearchResults(insuredId, network) {
  // Generate 1-3 mock member results based on insuredId
  const count = (parseInt(insuredId.slice(-3)) % 3) + 1;
  const results = [];

  for (let i = 0; i < count; i++) {
    results.push({
      memberId: `${insuredId}-${i + 1}`,
      name: `Member ${String.fromCharCode(65 + i)} ${insuredId.slice(-4)}`,
      dateOfBirth: '10/18/1986',
      gender: i % 2 === 0 ? 'F' : 'M',
      network: network,
      policyId: `POL-${insuredId.slice(-6)}`,
      status: i === 0 ? 'ACTIVE' : 'INACTIVE',
      relationship: i === 0 ? '01 - Self' : '18 - Spouse',
      effectiveDate: '01/01/2020',
      terminationDate: i === 0 ? null : '12/31/2023',
    });
  }

  return results;
}

/**
 * Generate mock employer group search results
 */
function getMockEmployerGroupSearchResults(insuredId, network) {
  // Generate 1-2 mock employer group results
  const count = (parseInt(insuredId.slice(-3)) % 2) + 1;
  const results = [];

  const groupNames = ['TEST GROUP', 'CORPORATE GROUP', 'EMPLOYEE GROUP'];
  const employers = ['ABC Corporation', 'XYZ Industries', 'Global Tech Inc'];
  const planTypes = ['PPO', 'HMO', 'EPO'];

  for (let i = 0; i < count; i++) {
    results.push({
      groupId: `GRP-${insuredId.slice(-6)}-${i + 1}`,
      groupName: groupNames[i % groupNames.length],
      employerName: employers[i % employers.length],
      network: network,
      effectiveDate: '01/01/2020',
      terminationDate: i === 0 ? null : '12/31/2023',
      status: i === 0 ? 'ACTIVE' : 'INACTIVE',
      memberCount: 50 + i * 25,
      planType: planTypes[i % planTypes.length],
    });
  }

  return results;
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
 * Get specific claim by claim number (PHASE 2 - NEW)
 * GET /api/claims/:claimId
 */
app.get('/api/claims/:claimId', (req, res) => {
  try {
    const { claimId } = req.params;

    console.log(`🔍 Fetching claim by ID: ${claimId}`);

    const claim = findClaimById(claimId);

    if (!claim) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Claim not found',
      });
    }

    res.json({
      claim: claim,
    });
  } catch (error) {
    console.error('❌ Error fetching claim:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while fetching the claim.',
    });
  }
});

/**
 * Get next claim from queue
 */
app.get('/api/claims/queue/next', (req, res) => {
  try {
    const { claimStream, category, claimType } = req.query;

    if (!claimStream || !category || !claimType) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'claimStream, category, and claimType are required',
      });
    }

    const queueKey = getQueueKey(claimStream, category, claimType);
    console.log(`📋 Getting next claim from queue: ${queueKey}`);

    const claim = getNextClaimFromQueue(queueKey);

    if (!claim) {
      return res.status(404).json({
        error: 'QUEUE_EMPTY',
        message: 'No claims available in this queue',
      });
    }

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

/**
 * Search for members (PHASE 2 - NEW)
 * GET /api/members/search?insuredId=XXX&network=YYY
 */
app.get('/api/members/search', (req, res) => {
  try {
    const { insuredId, network } = req.query;

    if (!insuredId || !network) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'insuredId and network are required',
      });
    }

    console.log(`👥 Searching members: ${insuredId} in ${network}`);

    const members = getMockMemberSearchResults(insuredId, network);

    res.json({
      members: members,
      count: members.length,
    });
  } catch (error) {
    console.error('❌ Error searching members:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while searching for members.',
    });
  }
});

/**
 * Search for employer groups (PHASE 2 - NEW)
 * GET /api/employer-groups/search?insuredId=XXX&network=YYY
 */
app.get('/api/employer-groups/search', (req, res) => {
  try {
    const { insuredId, network } = req.query;

    if (!insuredId || !network) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'insuredId and network are required',
      });
    }

    console.log(`🏢 Searching employer groups: ${insuredId} in ${network}`);

    const employerGroups = getMockEmployerGroupSearchResults(
      insuredId,
      network
    );

    res.json({
      employerGroups: employerGroups,
      count: employerGroups.length,
    });
  } catch (error) {
    console.error('❌ Error searching employer groups:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'An error occurred while searching for employer groups.',
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
  console.log('\n🚀 Claims API Server Started - Phase 2!');
  console.log('================================');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(
    `📊 Claims Streams: ${claimsData.reviewclaimsCountMap?.length || 0}`
  );
  console.log(
    `🔒 Halted Claims: ${Object.values(haltedClaimsData.queues).reduce((sum, queue) => sum + queue.length, 0)}`
  );
  console.log(`📋 Queues: ${Object.keys(haltedClaimsData.queues).length}`);
  console.log('\nEndpoints:');
  console.log(`  GET  /health`);
  console.log(`  GET  /api/claims`);
  console.log(`  GET  /api/claims/search?claimId=XXX`);
  console.log(`  GET  /api/claims/:claimId`);
  console.log(
    `  GET  /api/claims/queue/next?claimStream=XXX&category=XXX&claimType=XXX`
  );
  console.log(`  GET  /api/members/search?insuredId=XXX&network=YYY`);
  console.log(`  GET  /api/employer-groups/search?insuredId=XXX&network=YYY`);
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
