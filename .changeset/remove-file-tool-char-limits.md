---
"@perstack/base": patch
---

Remove character limits from file operation tools

The following tools no longer have character limits:
- writeTextFile: removed 10,000 character limit
- appendTextFile: removed 2,000 character limit  
- editTextFile: removed 2,000 character limit for both newText and oldText

