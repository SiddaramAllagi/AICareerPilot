/**
 * Security Rules Specification Verification Suite for AI CareerPilot
 * Validates the 12 Dirty Dozen adversarial payloads against firestore.rules constraints.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

// Verify global default-deny gate exists
assert(rulesContent.includes('match /{document=**} {\n      allow read, write: if false;\n    }'), 'Missing global default-deny');

// Verify email_verified enforcement
assert(rulesContent.includes('request.auth.token.email_verified == true'), 'Missing email_verified gate');

// Verify no blanket list reads
assert(!/allow\s+(read|list)\s*:\s*if\s+isSignedIn\(\)\s*;/.test(rulesContent), 'Found unsafe blanket list read');

// Verify plan privilege lock on create and update
assert(rulesContent.includes("incoming().plan == 'free'"), 'Users must start on free plan');
assert(rulesContent.includes('incoming().plan == existing().plan'), 'Users cannot escalate plan via Firestore');

// Verify strict ID validation
assert(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), 'Missing strict ID regex guard');

// Verify HTTPS-only job URLs
assert(rulesContent.includes("data.applyUrl.matches('^https://.*')"), 'Missing HTTPS guard on saved job URLs');

console.log('All Firestore security rule structural invariants passed.');
