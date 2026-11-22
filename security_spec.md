# AI CareerPilot — Firestore Security Specification

## 1. Data Invariants
1. Every document in `/users/{userId}` belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`, and `incoming().userId == userId`.
2. Users cannot self-assign paid subscription tiers (`plan: 'pro'` or `plan: 'premium'`) on profile creation or profile update; client-created profiles must begin with `plan == 'free'`, and profile updates cannot alter `plan`, `userId`, or `createdAt`.
3. Every record in `/careerAnalyses`, `/resumeAnalyses`, `/skillGapReports`, `/learningRoadmaps`, `/interviewSessions`, `/savedJobs`, and `/activities` must carry `userId == request.auth.uid`, an `id` matching the document ID path variable (`^[a-zA-Z0-9_\-]+$`, max 128 chars), and server-enforced `createdAt == request.time`.
4. All `allow list` rules explicitly filter on `resource.data.userId == request.auth.uid` so unauthenticated or cross-tenant queries are always rejected at the rule layer.
5. Every string field enforces `.size()` upper bounds, and every array enforces `.size() <= MAX` plus element type validation.
6. All `allow update` blocks enforce `isValid[Entity](incoming())`, preserve immutable `userId` and `createdAt`, enforce `updatedAt == request.time`, and restrict mutations via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated read of `/users/user_123`**: `auth == null` -> DENIED by `isOwner()`.
2. **Cross-tenant PII read of `/users/victim_uid` by `attacker_uid`**: `auth.uid != victim_uid` -> DENIED.
3. **Unverified email write to `/users/attacker_uid`**: `auth.token.email_verified == false` -> DENIED by `isVerifiedUser()`.
4. **Self-assigned paid plan on profile creation**: `plan: "pro"` on `/users/{uid}` create -> DENIED (`incoming().plan == 'free'`).
5. **Shadow field injection on profile update**: `{ displayName: "Test", isAdmin: true, updatedAt: serverTimestamp() }` -> DENIED by `hasOnly(...)` and `isValidUserProfile()`.
6. **Privilege escalation on profile update**: `{ plan: "premium", updatedAt: serverTimestamp() }` -> DENIED because `plan` is excluded from allowed profile update keys.
7. **Identity spoofing on `/resumeAnalyses/{id}` create**: `{ userId: "someone_else", ... }` -> DENIED (`incoming().userId == request.auth.uid`).
8. **Path ID poisoning**: `/savedJobs/../../../etc/passwd` or 1.5KB document ID -> DENIED by `isValidId()`.
9. **Client-forged timestamp**: `/activities/{id}` create with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> DENIED.
10. **Unbounded array Denial-of-Wallet**: `/users/{uid}` with `skills` array of 200 items -> DENIED (`skills.size() <= 40`).
11. **Oversized string Denial-of-Wallet**: `/careerAnalyses/{id}` with 50KB `explanation` -> DENIED (`explanation.size() <= 4000`).
12. **Blanket list query scraping `/resumeAnalyses`**: `getDocs(collection(db, 'resumeAnalyses'))` without `where('userId', '==', uid)` -> DENIED by `resource.data.userId == request.auth.uid`.
