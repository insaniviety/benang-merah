<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep chapter management on `/chapters` and per-story event timelines on `/timeline`; they are distinct writing workflows.
- Store manuscript genres as an array and share one form between create and edit; this keeps genre choices consistent across both workflows.
- Keep working character and relation edits in shared client state, and publish only explicit per-story Thread Canvas snapshots to the Inspector; this prevents unsaved map changes from becoming plot-hole references.
- Persist each writer workspace as one validated account-ID-keyed IndexedDB record and restore backups through the same schema; this keeps collections isolated and imports consistent.
- Send only selected-story data to Gemini after per-request consent, through a bounded server function with server-held credentials; never persist or log manuscript payloads on the server.

- Keep recovery autosave separate from explicit editor confirmation, persist unconfirmed manuscript IDs, and guard switches centrally until explicitly saved; declining a save must retain drafts.
- Merge timeline AI proposals by stable event IDs with the latest local draft; preserve writer-owned fields and concurrent edits/deletions while adding new events, so updates cannot replace manual work.
- Generate the offline app shell with vite-plugin-pwa and register only through the guarded PWA wrapper; this prevents stale app caches in editor previews and leaves messaging workers untouched.
- Resolve PWA virtual modules in every build environment while emitting PWA assets only in the client build; this keeps server bundling valid without registering a worker during server rendering.
- Keep localized installation copy separate from manuscript data and render the installation control in the shared sidebar; this makes device installation available across writing workflows without altering local persistence.
- Prerender only the visitor-independent root shell and finalize offline generation after Start's prerender pass; this supplies an offline fallback while keeping navigations network-first and server/AI requests uncached.
- Centralize empty-workspace creation, one-time legacy preset cleanup, and cascading manuscript deletion in workspace lifecycle helpers; this avoids orphaned references while preserving unrelated local work.
- AccountGate restores a remembered session only when the writer opted into "stay signed in" on that device, re-locks after idle with password re-verification, and remounts StoreProvider by account ID; this keeps collections private between accounts and at unattended desks.
- Store writer display names in owner-readable Cloud profiles created by a signup trigger, never trust backup identity as authentication; this separates account identity from local manuscripts.
- Allow one-time legacy local collection adoption only by explicit confirmation using an atomic IndexedDB ownership claim; this preserves existing work without sharing it between accounts.
- Require an existing manuscript for character creation and canvas saving, validate workspace writes, and repair only legacy empty-story-ID records on local reads; this prevents orphaned data from blocking workspace restoration without discarding unrelated work.
- Sync opted-in manuscripts as one owner-only per-story bundle row, merged by story updatedAt so a newer local copy is never overwritten; notes and unselected manuscripts never leave the device.
- Sync Plot Hole results to the cloud only when the writer picks the account-sync option, storing findings plus a hashed fingerprint (never manuscript text); switching away deletes cloud copies.
