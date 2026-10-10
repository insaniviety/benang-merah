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
- Persist the full writer workspace as one validated IndexedDB record and restore backups through the same schema; this keeps manuscripts private and imports consistent.
- Send only selected-story data to Gemini after per-request consent, through a bounded server function with server-held credentials; never persist or log manuscript payloads on the server.

- Keep recovery autosave separate from explicit editor confirmation, persist unconfirmed manuscript IDs, and guard switches centrally until explicitly saved; declining a save must retain drafts.
- Merge timeline AI proposals by stable event IDs with the latest local draft; preserve writer-owned fields and concurrent edits/deletions while adding new events, so updates cannot replace manual work.
