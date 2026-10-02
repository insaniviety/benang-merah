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
- Generate timeline suggestions through a server-only Lovable AI Gateway helper, while drafts remain client-side until the writer saves them locally; this keeps credentials private and prevents silent timeline changes.
- Store manuscript genres as an array and share one form between create and edit; this keeps genre choices consistent across both workflows.
- Keep working character and relation edits in shared client state, and publish only explicit per-story Thread Canvas snapshots to the Inspector; this prevents unsaved map changes from becoming plot-hole references.
