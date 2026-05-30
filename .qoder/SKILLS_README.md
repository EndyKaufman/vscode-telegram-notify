# .qoder Directory - AI Assistant Skills & Knowledge

This directory contains skill files that help AI assistants (like Qoder) understand and work with this codebase more efficiently.

## 📚 Skill Files

### 1. project-knowledge.skill.md
**Purpose:** Complete project overview and technical details  
**Contains:**
- Architecture overview (13 source files)
- Configuration schema (13 settings)
- All 28 commands
- Development workflows
- Key patterns and data flows
- File structure map
- Common tasks guide

**Use when:** 
- Starting work on the project
- Need to understand overall architecture
- Looking for specific functionality
- Learning the codebase

---

### 2. quick-reference.skill.md  
**Purpose:** Quick lookup for common tasks and patterns  
**Contains:**
- Build commands
- Code snippets
- Common patterns
- How to add features
- Key exports
- Debug checklist

**Use when:**
- Need quick code examples
- Adding new features
- Forgot command syntax
- Want copy-paste snippets

---

### 3. troubleshooting.skill.md
**Purpose:** Solve common problems and follow best practices  
**Contains:**
- 6 common issues with solutions
- Best practices (8 categories)
- Performance tips
- Security checklist
- Debug procedures
- Useful resources

**Use when:**
- Something isn't working
- Getting errors
- Want to follow best practices
- Need debugging help

---

### 4. architecture-patterns.skill.md
**Purpose:** Understand design decisions and architectural patterns  
**Contains:**
- 5 key architectural decisions
- 5 design patterns used
- Data flow diagrams
- Performance optimizations
- Security design
- Code organization principles
- Future improvements

**Use when:**
- Making architectural changes
- Adding major features
- Understanding design rationale
- Reviewing code quality

---

## 🎯 How AI Uses These Skills

### When You Ask: "How does X work?"
AI reads: `project-knowledge.skill.md`
- Finds relevant module
- Explains architecture
- Shows data flow

### When You Ask: "How do I add X?"
AI reads: `quick-reference.skill.md`
- Provides code snippets
- Shows file locations
- Gives step-by-step guide

### When You Ask: "Why is X broken?"
AI reads: `troubleshooting.skill.md`
- Checks known issues
- Suggests solutions
- Provides debug steps

### When You Ask: "Should I change X?"
AI reads: `architecture-patterns.skill.md`
- Explains design decisions
- Shows trade-offs
- Recommends best approach

---

## 📖 For Developers

### Reading Skills

These files are also useful for human developers:

```bash
# Quick overview
cat .qoder/project-knowledge.skill.md | head -100

# Find a pattern
grep -A 10 "Forward Notification" .qoder/quick-reference.skill.md

# Debug an issue
grep -A 20 "Issue 3:" .qoder/troubleshooting.skill.md
```

### Updating Skills

When making significant changes:

1. **New module added**
   - Update `project-knowledge.skill.md`
   - Add to architecture section
   - Update file structure map

2. **New pattern discovered**
   - Add to `architecture-patterns.skill.md`
   - Explain rationale
   - Show examples

3. **New bug found & fixed**
   - Add to `troubleshooting.skill.md`
   - Document symptoms
   - Provide solution

4. **New common task**
   - Add to `quick-reference.skill.md`
   - Include code snippet
   - Show steps

---

## 🔍 Skill Coverage Matrix

| Topic | project-knowledge | quick-reference | troubleshooting | architecture |
|-------|------------------|-----------------|-----------------|--------------|
| File locations | ✅ | ✅ | - | - |
| Code snippets | - | ✅ | - | ✅ |
| Architecture | ✅ | - | - | ✅ |
| Commands | ✅ | ✅ | - | - |
| Config schema | ✅ | ✅ | ✅ | - |
| Build process | ✅ | ✅ | - | - |
| Debug help | - | ✅ | ✅ | - |
| Best practices | - | - | ✅ | ✅ |
| Design patterns | - | - | - | ✅ |
| Common issues | - | - | ✅ | - |
| Performance | - | - | ✅ | ✅ |
| Security | - | - | ✅ | ✅ |

---

## 📊 Statistics

- **Total skill files:** 4
- **Total lines:** ~1,483
- **Total words:** ~12,500
- **Coverage:** Architecture, code, debug, patterns, practices

---

## 🚀 Quick Start

**For AI:** Read files in this order for best understanding:
1. `project-knowledge.skill.md` (understand structure)
2. `architecture-patterns.skill.md` (understand design)
3. `quick-reference.skill.md` (learn patterns)
4. `troubleshooting.skill.md` (avoid pitfalls)

**For Humans:** Read based on need:
- **New to project?** → project-knowledge
- **Coding?** → quick-reference
- **Debugging?** → troubleshooting
- **Designing?** → architecture-patterns

---

## 💡 Tips

1. **Keep skills updated** - Outdated skills are worse than no skills
2. **Be specific** - Include exact file paths and line numbers
3. **Show examples** - Code snippets are more helpful than descriptions
4. **Document why** - Not just what, but why decisions were made
5. **Cross-reference** - Link between skills when relevant

---

## 📝 History

- **Created:** 2026-05-29
- **Version:** 0.1.5
- **Last Updated:** 2026-05-29
- **Trigger:** User requested comprehensive project analysis for AI efficiency
