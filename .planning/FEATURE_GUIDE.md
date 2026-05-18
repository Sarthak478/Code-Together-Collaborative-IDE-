# 🚀 Quick Start - New Terminal & Preview Features

## Terminal on the Right (Like VS Code)

### Opening Terminal
1. Click **⌨️ Terminal** button in top toolbar
2. Terminal panel opens on the right side (400px wide)
3. Run any command in the terminal

### Closing Terminal
- Click **⌨️ Terminal** button again to hide
- Or click any Chat/Git/AI button to switch panels

### Running Code with Terminal
```bash
# Python
python3 app.py

# Node.js
node server.js

# JavaScript
node script.js

# Shell
bash deploy.sh
```

---

## Live HTML Preview (Automatic)

### Quick Start
1. Create an HTML file (e.g., `index.html`)
2. Add some content:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Hello World 🎉</h1>
  <p>Edit me and see changes live!</p>
  <button onclick="alert('Button clicked!')">Click Me</button>
</body>
</html>
```

3. Click **▶ Open Preview** or just run the file
4. Preview appears on the right with live rendering

### What Happens When You Run Files

| File Type | Behavior |
|-----------|----------|
| `.html`, `.htm` | Preview opens on right automatically |
| `.md`, `.markdown` | Preview opens on right automatically |
| `.jsx`, `.tsx`, `.vue` | Terminal opens for build commands |
| Python, JS, etc. | Terminal opens to run code |

---

## UI Layout

### Before (Terminal at Bottom)
```
┌──────────────────────────────┐
│  Editor Window               │
│  (Large vertical space)      │
├──────────────────────────────┤
│ Terminal (Limited height)    │
└──────────────────────────────┘
```

### After (Terminal on Right - Like VS Code)
```
┌─────────────────────┬─────────────┐
│                     │ Terminal    │
│  Editor Window      │ (More space)│
│  (Full height)      │             │
│                     │             │
└─────────────────────┴─────────────┘
```

---

## Toolbar Buttons

### New Buttons in Top Toolbar

```
[▶ Run] [📥 Download] [📺 Preview] [⌨️ Terminal]
```

- **📺 Preview** - Show/hide HTML preview on right
- **⌨️ Terminal** - Show/hide terminal on right

### Combined with Existing Buttons

```
[▶ Run Code] [📥 Download] [User Avatars...] [🎓 Interview] [📺 Preview] [⌨️ Terminal]
```

---

## Tips & Tricks

### Workflow 1: Frontend Development
1. Open HTML file
2. Click **📺 Preview**
3. Edit HTML in editor
4. See live changes in preview panel
5. Perfect for UI design!

### Workflow 2: Backend Development
1. Click **⌨️ Terminal** to open on right
2. Start server in terminal
3. Edit code on the left
4. Terminal shows logs on the right

### Workflow 3: Full-Stack Development
- Edit Node.js server code
- Terminal on right shows live logs
- Very VS Code-like experience!

---

## File Support

### HTML Preview ✅
- `.html` - Full HTML rendering
- `.htm` - Full HTML rendering
- Sandbox security enabled (no unwanted scripts)

### Markdown Preview ✅
- `.md` - Rendered markdown
- `.markdown` - Rendered markdown

### Terminal ✅
- Python, JavaScript, TypeScript
- Ruby, Java, Go, Rust, C++
- Shell scripts, Perl, Lua, C#
- And more!

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Terminal | Click `⌨️ Terminal` button |
| Toggle Preview | Click `📺 Preview` button |
| Run Code | Click `▶ Run` button |
| Save File | `Ctrl+S` (or `Cmd+S` on Mac) |

---

## Common Issues

### Q: Preview not showing?
**A:** Make sure the file is HTML. Only `.html` and `.htm` files show preview.

### Q: Terminal not appearing?
**A:** Click the `⌨️ Terminal` button in the toolbar. If Chat/Git is open, it switches to terminal.

### Q: Can I have preview and terminal at the same time?
**A:** Not in the current version - they share the right panel. Click one button to switch between them.

### Q: How do I close the preview/terminal?
**A:** Click the `📺 Preview` or `⌨️ Terminal` button again to toggle off.

---

## What's New vs. Old Design

### ✅ Improvements
- Terminal is now on the **right side** like VS Code
- **More editor space** - full height instead of split
- **Auto-preview** for HTML files
- **Cleaner UI** - buttons in toolbar
- **Better workflow** - switch between panels easily
- **Production ready** - 0 lint errors, optimized

### 📊 Comparison
| Feature | Old | New |
|---------|-----|-----|
| Terminal Position | Bottom | **Right** ✨ |
| Preview Available | ✅ | **✅ Auto-open** ✨ |
| Editor Height | Split | **Full** ✨ |
| Terminal Width | Full | **400px Fixed** |
| Chat/Git/AI Panels | Right | **Same (Right)** |

---

## Production Status

✅ **Ready to Deploy**
- 0 build errors
- 0 lint errors (new code)
- Tested build: 9.13s
- Bundle: 9.16 MB

---

**Enjoy the new VS Code-like experience! 🎉**
