<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git Command Restrictions
The agent must never execute any Git operations (`git add`, `git commit`, `git push`, etc.) directly on behalf of the user. Instead, the agent should list the proposed changes and guide the user to execute these Git commands manually.
