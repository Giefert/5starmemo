# Repository agent instructions

## Repository context and safety

After reading `WORKLOG.md`, read `CLAUDE.md` for the repository's product,
architecture, production, security, cost, and development constraints. Read
`DESIGN.md` and the relevant tracked subsystem documentation before changing a
user-facing workflow. Local ignored handoff files are historical evidence, not
durable or automatically current project truth; reconcile them with tracked
code, commits, and user steering before relying on them.

Treat existing uncommitted changes as user-owned unless `WORKLOG.md` explicitly
says otherwise. Do not overwrite, revert, reformat, or absorb them into another
workstream without reconciling ownership first.

Do not copy credentials, tokens, private keys, personal data, or other secrets
into `WORKLOG.md`, linked evidence created for it, delegated reports, or
token-bearing URLs. Name the access prerequisite without reproducing the
sensitive value. If this workflow creates an accidental exposure, redact it
from the continuity artifacts rather than preserving it as history, tell the
user, and follow the repository's authorized revocation or rotation process.

## Work log provides long-horizon continuity

At the start of each material turn, before planning, recommending, delegating,
or editing, read `WORKLOG.md`. A material turn is one that may change product
state, accepted direction, ownership, status, blockers, or durable project
knowledge. You do not need to reread it before every action in one coherent
turn, but reread it before integration or synchronization when parallel work
may have changed it.

Compaction, chat history, delegated-agent summaries, and parallel sessions are
not reliable enough to preserve long-horizon project coherence by themselves.

`WORKLOG.md` exists as the durable shared reference for:

- where the project has been;
- where it is now;
- where it is going;
- which goals remain unmet;
- which workstreams are active;
- why important decisions were made.

Use it to understand the project as a whole rather than reconstructing state
from recent chat fragments, isolated commits, old plans, or one agent's local
context.

## Coordinate work-log writes

`WORKLOG.md` has one coordinator at a time. The primary agent owns log edits
unless another owner is recorded explicitly. Delegated and read-only lanes
report state to that coordinator and do not edit the log unless assigned that
specific scope.

Before changing the log, reread it and compare it with observed repository,
session, branch, worktree, and dirty-path state. If reality conflicts with the
log, preserve the work and reconcile the discrepancy; never infer abandonment
from age or inactivity alone.

Do not assign overlapping write scopes to parallel lanes unless the overlap is
explicitly serialized. Before taking over a lane, verify its session, branch,
worktree, and dirty paths. A lane may be marked orphaned and reassigned only
after its owner or session is genuinely unavailable; inactivity by itself does
not release ownership.

## Interpret new steering carefully

New user steering is supplemental by default. It may enrich requirements,
correct one part of the implementation, add a work item, or explicitly replace
existing direction.

Preservation and execution priority are separate. Address the user's current
request and explicit priority promptly while keeping unaffected lanes visible.
Do not infer cancellation or permanent deprioritization merely because a new
message discusses something else.

Interpret steering using these rules:

1. Explicit cancellation or replacement language such as "stop," "shelf,"
   "replace," "do this instead," or "don't continue that" changes the affected
   workstream.
2. A direct correction overrides only the conflicting decision. Preserve all
   unaffected goals and active work.
3. Supplemental requirements are folded into the relevant active workstream or
   backlog without implicitly replacing it.
4. New parallel work is tracked alongside existing work unless the user
   explicitly changes priority.
5. If the meaning is genuinely ambiguous and would materially change or discard
   work, preserve the current work and ask rather than assuming cancellation.

When steering changes project state, update `WORKLOG.md` before proceeding so
other agents inherit the reconciled direction rather than only the newest
message. A non-coordinator should report the change to the coordinator instead
of racing a parallel log edit.

## Maintain a clear project narrative

`WORKLOG.md` should make three things immediately understandable.

### Where we were

Retain compact checkpoints for meaningful integrated work, consequential
decisions, and failed approaches that should not be repeated.

A checkpoint should normally contain:

- the outcome;
- the relevant commit;
- a link to durable documentation or review evidence;
- any important limitation or reason the work was rejected.

Do not preserve routine command history or every completed subtask.
Do not describe work as accepted merely because it exists in a dirty worktree
or delegated report. Mark it as pending review until it has been integrated or
the user has explicitly accepted a durable artifact.

### Where we are

Track every genuinely active workstream, including:

- objective and current boundary;
- owner;
- current status;
- blockers or unresolved findings;
- run or session ID, when applicable;
- branch and worktree, when applicable;
- durable checkpoint or evidence needed to resume;
- whether the lane is read-only or may edit.

Parallel workstreams must remain visible independently. Do not let the newest
task overwrite unrelated active work.

Chat-only reports and session IDs are temporary coordination aids, not durable
resume evidence. Before closing a lane, summarize the accepted result in the
log or link an exact tracked artifact or commit that survives a clean checkout
of the accepted checkpoint.

### Where we are going

Maintain:

- known unmet product goals;
- ordered near-term work;
- dependencies between workstreams;
- parked decisions that must not be accidentally revived;
- the acceptance bar for the current milestone.

The backlog should be ordered enough that a fresh agent can choose the next
useful task without reconstructing the roadmap.

## Keep the work log compact and useful

`WORKLOG.md` is a curated continuity document, not an append-only transcript.
It should remain scannable, but it does not need to be artificially tiny.

- Remove stale run IDs, completed temporary paths, obsolete worktrees, resolved
  blockers, raw command output, and low-value implementation chronology.
- Collapse completed operational checklists into compact checkpoints.
- Retain enough recent history to explain the current architecture, rejected
  approaches, and remaining goals.
- Keep unresolved failures and rejected approaches with their cause, evidence,
  affected conditions, and reconsideration criteria. An accepted limitation
  should name its rationale and owner. Once resolved, retain only the lesson
  that still prevents repetition.
- Prefer links to subsystem documents, commits, and retained review artifacts
  over copying extensive evidence into the log.
- Move detailed implementation notes and test evidence into the relevant
  `docs/` file.
- Prune when duplication or chronology makes the log harder to navigate, not
  merely because it crosses an arbitrary line count.
- Never delete context that another agent would need to avoid repeating a
  failed approach or misunderstanding the current product direction.

## Delegated and parallel work

Before starting delegated work, record its task name, owner, and scope in
`WORKLOG.md`; add the actual run or session ID when it becomes available.
Where applicable, record:

- tool or agent type;
- run/session ID;
- branch;
- worktree;
- editing ownership;
- expected deliverable;
- integration status.

Delegated results are temporary inputs, not automatically project truth or
durable resume evidence. Review and integrate them, then update the work log
with the actual accepted outcome or an exact durable artifact.

When a delegated lane finishes:

1. Review its work.
2. Integrate or reject it explicitly.
3. Record the accepted outcome or unresolved failure.
4. Remove obsolete run/worktree details.
5. Preserve a compact checkpoint if the result still matters to upcoming work.

## Synchronize at durable transitions

Reconcile `WORKLOG.md` when steering is accepted, ownership or status changes,
a consequential decision or blocker appears, or a milestone completes. Also
reconcile it before ending any material work turn. Pure read-only work that
changes no accepted project state should not churn the log.

Record the current `HEAD`, branch, and dirty-worktree caveat when they matter;
a date alone is not enough to detect a stale log. Confirm that:

- active work is still marked active;
- completed work is not left as in progress;
- newly discovered failures are recorded;
- user steering has been incorporated without erasing unaffected goals;
- delegated sessions and ownership are accurate;
- ordered next work reflects current dependencies;
- stale operational details have been pruned.

The work log should allow another agent to resume correctly even if no useful
chat history survives. Routine pruning belongs at lane closure or milestone
reconciliation, not as ceremony on every turn.

## Product-focused validation

Prefer representative user workflows and visual review over expanding proof
matrices.

Keep tests that guard:

- authoritative application state;
- renderer or subsystem ownership;
- data integrity;
- important end-to-end workflows;
- a known user-facing regression.

Do not add:

- proof-of-proof gates;
- pixel-hash acceptance as a substitute for visual review;
- broad matrices that cannot expose meaningful defects;
- synthetic evidence that claims to validate behavior it does not exercise.

A passing automated check does not override an obviously defective
user-facing result. Record the defect, reopen the workstream, and repair the
underlying implementation.
