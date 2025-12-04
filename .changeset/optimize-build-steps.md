---
"@perstack/tui": patch
---

Optimize buildSteps for large event counts using incremental updates

Instead of rebuilding the entire step map on every event addition, the step
store now caches the map and only processes new events. Full rebuild only
occurs when events are truncated (MAX_EVENTS exceeded) or historical events
are loaded.
