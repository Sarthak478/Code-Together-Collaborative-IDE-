# CodeTogether: Real-time Collaborative IDE & Compiler 🚀

CodeTogether is a premium, state-of-the-art collaborative development environment designed for modern engineering teams. It brings the power of a full IDE and a high-performance compiler into a unified, real-time shared workspace.

## ✨ Core Features

### 1. 👥 Real-time Collaboration
- **Seamless Synchronization**: Powered by **Yjs** and **CRDTs** for conflict-free editing.
- **Dynamic Presence**: View active collaborators with real-time cursor tracking and custom profile themes.
- **Shared Workspace**: Every file, folder, and code change is instantly reflected across all connected clients.

### 2. ⚡ Integrated Multi-Language Compiler
- **Instant Execution**: Run code directly within the IDE using our high-performance backend.
- **Multi-File Support**: Compile and run complex projects with multiple interconnected files.
- **Real-time Terminal**: Interactive terminal output for immediate debugging and feedback.

### 3. 🐙 GitHub Source Control (V2)
- **Zero-Config Integration**: Connect your repositories instantly using GitHub Personal Access Tokens (PAT).
- **Automated Repository Fetching**: No more copy-pasting URLs. Select your repository from a generated list of your GitHub projects.
- **Complete Git Workflow**: Stage changes, commit with custom messages, and push/pull directly from the IDE sidebar.
- **Branch Management**: Create, rename, and switch branches seamlessly within the Source Control panel.

## 🛠️ Setup & Usage

### Local Development
1. **Clone the project**:
   ```bash
   git clone https://github.com/Sarthak478/Code-Together-Collaborative-IDE-.git
   cd Code-Together-Collaborative-IDE-
   ```
2. **Install Dependencies**:
   ```bash
   # Root
   npm install
   # Client
   cd client && npm install
   # Server
   cd ../server && npm install
   ```
3. **Run the Application**:
   ```bash
   # Start Server
   cd server && npm run dev
   # Start Client
   cd client && npm run dev
   ```

### Connecting to GitHub via the Platform
1. Go to **Settings** in the CodeTogether IDE.
2. Enter your **GitHub Personal Access Token (PAT)**.
3. Open the **Source Control** panel in the sidebar.
4. Click **Initialize Repository** and then **Connect Repository**.
5. Select your repository from the fetched list and start pushing!

## 🛡️ Zero-Data Sanctuary
CodeTogether is built on privacy. All collaborative sessions are ephemeral; once a session ends, data is cleared according to our "Zero-Data Sanctuary" policy, ensuring your source code remains yours and yours alone.

---
*Built with ❤️ for the future of collaborative engineering.*
