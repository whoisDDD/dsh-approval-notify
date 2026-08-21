# Changelog

All notable changes to this project are documented here.

## Unreleased

### Added

- Native browser notifications for DSH attention states, with Windows system notification support when the browser has permission.
- Stacked right-bottom toast fallback when native notifications are unavailable or fail.
- Reminder coverage for `approval`, `question`, `plan-review`, and `completed` session states.
- Distinct completed titles for top-level sessions (`已完成`) and subagents (`子代理已完成`).
- Browser integration tests covering native notification delivery, toast fallback, stacked toasts, and deduplication.
- Core notification behavior tests.

### Changed

- Expanded the package from approval-only reminders to broader session attention reminders.
- Updated README documentation in English and Chinese.

### Notes

- The plugin remains browser-only; the host half intentionally does nothing.
- There is no settings UI yet.
