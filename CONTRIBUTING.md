# Contributing to CodeTogether

First off, thank you for considering contributing to **CodeTogether**! 🎉

We appreciate all contributions, whether it's fixing bugs, improving documentation, suggesting new features, or submitting code improvements.

---

# Code of Conduct

By participating in this project, you agree to:

* Be respectful and constructive.
* Welcome contributors of all experience levels.
* Provide helpful feedback during code reviews.
* Keep discussions professional and inclusive.

---

# Before You Start

Before making any changes:

1. Search existing Issues to see if the problem has already been reported.
2. If you're planning a large feature, create an Issue first so we can discuss the implementation.
3. Keep Pull Requests focused on a single feature or bug fix whenever possible.

---

# Getting Started

## 1. Fork the Repository

Click the **Fork** button at the top-right of this repository.

## 2. Clone Your Fork

```bash
git clone https://github.com/sarthak-ameriya/CodeTogether.git
```

Move into the project directory:

```bash
cd CodeTogether
```

---

# Install Dependencies

## Frontend

```bash
cd client
npm install
```

## Backend

```bash
cd ../server
npm install
```

---

# Configure Environment Variables

Create the required `.env` files using the provided examples (if available).

Example:

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
gemini_api_KEY=your_api_key
PORT=5000
```

Never commit:

* `.env`
* API Keys
* Secrets
* Database credentials

---

# Running the Project

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

---

# Creating a Branch

Create a descriptive branch before making changes.

Examples:

```bash
git checkout -b feature/add-dark-mode
```

```bash
git checkout -b fix/login-validation
```

```bash
git checkout -b docs/update-readme
```

---

# Coding Guidelines

Please follow these practices:

* Write clean and readable code.
* Use meaningful variable and function names.
* Keep functions small and modular.
* Remove unused code before submitting.
* Follow the existing project structure.
* Avoid unnecessary dependencies.

---

# Commit Messages

Use clear commit messages.

Examples:

```
feat: add collaborative cursor support

fix: resolve login authentication bug

docs: improve installation guide

refactor: simplify socket connection logic
```

---

# Pull Request Process

Before submitting your Pull Request:

* Ensure the project builds successfully.
* Test your changes locally.
* Update documentation if necessary.
* Make sure there are no unnecessary files included.

When creating the Pull Request:

* Describe what changed.
* Explain why the change was made.
* Reference any related Issues (e.g., `Fixes #12`).
* Include screenshots or recordings for UI changes if applicable.

---

# Reporting Bugs

When reporting a bug, please include:

* Operating System
* Browser (if applicable)
* Steps to reproduce
* Expected behavior
* Actual behavior
* Screenshots (if possible)
* Error logs

---

# Suggesting Features

Feature requests should include:

* Problem statement
* Proposed solution
* Alternative approaches (if any)
* Additional context

---

# Documentation Contributions

Documentation improvements are always welcome.

Examples include:

* Fixing typos
* Improving setup instructions
* Adding architecture diagrams
* Writing tutorials
* Improving API documentation

---

# Areas Where You Can Help

Contributors are encouraged to work on:

* UI/UX improvements
* Performance optimization
* Accessibility enhancements
* Bug fixes
* Documentation
* Testing
* Security improvements
* Code refactoring
* Feature enhancements

---

# Need Help?

If you have questions before contributing, feel free to open an Issue and I'll be happy to help.

---

# Thank You ❤️

Every contribution—big or small—helps make **CodeTogether** better. Thank you for taking the time to contribute!
The project is also deployed with the domain name **code-together.me** do check it out..
