# Current Product Map

Last updated: 2026-06-05

## Product Shape

ClassNote AI has moved from the original 5-tab classroom note app shape into an Agent-first learning workspace.

The current product loop is:

Agent task entry -> learning material capture -> AI summary / concept extraction / review task generation -> knowledge base storage -> Agent-guided follow-up.

All capabilities are still local frontend mock. There is no real backend, real AI, real recording, real file parsing, or real photo recognition in the current implementation.

## Current Main Source

The active source tree is:

- `src/App.vue`
- `src/main.ts`
- `src/pages.json`
- `src/pages/**`
- `src/components/**`
- `src/stores/**`
- `src/locales/**`
- `src/styles/**`
- `src/types/**`

Root-level duplicate source files have been moved to `legacy/root-source-snapshot/`.

## Current Tab Structure

The active `src/pages.json` tab bar has three tabs:

- `pages/agent/index`: Agent home and task router
- `pages/knowledge/index`: Knowledge base
- `pages/profile/index`: Profile and settings entry

Older Home and Courses pages still exist as routed pages, but they are no longer the primary tab structure.

## Main Pages

### Agent

- `src/pages/agent/index.vue`
- Role: current first screen and main task entry.
- Provides quick actions for recording, summary, material upload, photo Q&A, and review.
- Also hosts the mock chat flow and action buttons that navigate to feature pages.

### Recording

- `src/pages/record/live.vue`
- Role: mock realtime lecture transcription.
- Supports timer, transcript reveal, waveform, timeline marks, pause/resume, save-only, and generate-summary flow.

- `src/pages/record/summary.vue`
- Role: AI summary workspace.
- Contains 7 tabs: overview, transcript, timeline, structured summary, exam focus, terms, review.
- This is one of the most complete and highest-priority refinement targets.

### Knowledge Base

- `src/pages/knowledge/index.vue`
- Role: knowledge base landing page.
- Shows course learning spaces, progress, pending review items, and concept-map entry.

- `src/pages/knowledge/course.vue`
- Role: course-level knowledge space.
- Shows lesson packages, concepts, and review items.

- `src/pages/concept-map/index.vue`
- Role: mock concept relationship map.
- Currently static/mock, but part of the Agent + knowledge base product story.

### Study Tools

- `src/pages/review/index.vue`
- Role: mock daily review plan.

- `src/pages/photo-qa/index.vue`
- Role: mock photo question answering and mistake-bank capture.

- `src/pages/materials/upload.vue`
- Role: mock upload flow for notes, mistakes, and PDFs.

### Profile And Settings

- `src/pages/profile/index.vue`
- Role: user profile, learning archive entry, recording preferences, device status, settings entry.

- `src/pages/profile/learning-profile.vue`
- Role: personalized learning archive and preference setup.

- `src/pages/settings/index.vue`
- Role: centralized settings page.

### Legacy / Secondary Pages Still In Src

- `src/pages/home/index.vue`
- `src/pages/courses/index.vue`
- `src/pages/courses/detail.vue`

These are still routable and may support earlier product flows, but they are not part of the current tab-first experience.

## Mock Data Model

The current demo data centers on a Biology 101 scenario:

- `src/stores/useCourseStore.ts`: courses, recordings, AI notes, mistakes, review tasks
- `src/stores/useRecordStore.ts`: recording state, transcript segments, timeline marks, summary workspace data
- `src/stores/useUserStore.ts`: student profile, AI preferences, learning profile
- `src/stores/useDeviceStore.ts`: mock device connection and battery state
- `src/stores/useAgentStore.ts`: mock agent messages and navigation actions

## Refinement Priorities

1. Fix visible mojibake / broken Chinese text and emoji artifacts.
2. Move hardcoded visible strings into i18n where practical.
3. Refine the Agent-first navigation model and decide whether Home/Courses remain secondary routes.
4. Refine the three main tabs: Agent, Knowledge, Profile.
5. Polish the recording-to-summary flow.
6. Split oversized pages after visual/content direction stabilizes, especially `record/summary.vue`, `record/live.vue`, `profile/index.vue`, and course pages.
7. Decide whether unused custom tab bar experiments should be kept, wired in, or removed.

## Archived Assets

Phase screenshots have been moved to:

- `docs/screenshots/phase3/`

Phase test reports have been moved to:

- `docs/test-reports/`
