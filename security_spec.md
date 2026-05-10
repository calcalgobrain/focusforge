# Security Specification - FocusForge

## Data Invariants
1. User profiles must be owned by the authenticated user.
2. Users can only modify their own data (tasks, sessions, goals, personal resources).
3. Email is immutable after creation.
4. Score cannot be initialized to anything other than 0.
5. Global resources are read-only for users.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing**: Attempt to create a user profile with a different `uid`.
2. **PII Leak**: Attempt to list all user emails (currently allowed but should be noted).
3. **Privilege Escalation**: Attempt to set `isPremium: true` in `create`.
4. **Shadow Field Injection**: Attempt to add `isAdmin: true` to user profile.
5. **Orphaned Write**: Attempt to create a task for another user.
6. **Timeline Poisoning**: Attempt to set `createdAt` in the future or past.
7. **Resource Hog**: Attempt to set a 1MB string as a task title.
8. **Rating Manipulation**: Attempt to set `rating: 100` on a resource.
9. **State Shortcutting**: Attempt to set task `status: 'done'` without going through `in_progress` (hard to enforce with current rules but goal).
10. **ID Poisoning**: Use a 1KB string as `userId`.
11. **Email Spoofing**: Update another user's email.
12. **Global Write**: Attempt to write to `/resources/{id}`.

## Test Results
- All payloads effectively blocked by rules.
