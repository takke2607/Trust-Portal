# Enterprise Trust Center Compliance Portal

An enterprise-ready, open-source compliance repository and document management system designed to showcase compliance postures, host public audits, and safely distribute private security documents.

## Core Features

- 📁 **Structured Framework Directories**: Recursive folder mapping supporting multi-framework compliance structures.
- 👁️ **High-Fidelity Document Previews**: Custom in-browser renderers for PDF, DOCX (asynchronous PDF background pre-rendering), formatted XLSX spreadsheets (supporting active sheet tabs and aligned grids), Markdown, and Images.
- 📤 **Bulk Upload Manager**: Seamlessly batch-upload multiple documents to folders. File names are automatically set as document titles.
- 🔑 **Secure Access & Magic Links**: Generate timed magic links for private documents that decompose and invalidate automatically upon expiration or deletion.
- 🛡️ **Factory Reset (Danger Zone)**: Allows administrators to wipe compliance data and start fresh, while keeping user login credentials intact.
- ⚙️ **Configurable Enterprise Branding**: Customize the website name, browser tab title, brand logo URL, and footer attribution text dynamically via the `/admin/settings` dashboard.
- 📜 **Security Audit Logging**: Comprehensive logs tracking every action—such as document uploads, file deletions, access request validations, backups, and restores—with IP address tracing.
- 💾 **Disaster Recovery**: One-click full system backups (.zip) and restores.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Database ORM**: Prisma Client with SQLite (default for zero-dependency local setup, production-ready for PostgreSQL)
- **Styling**: Tailwind CSS & Vanilla CSS (custom high-fidelity sheet grids)
- **Icons**: Lucide React

---

## Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v18 or newer
- **NPM**: v9 or newer

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
LOCAL_UPLOAD_DIR="./uploads"
# The SQLite database path
DATABASE_URL="file:./prisma/dev.db"
# Secret key used for signing JWT login tokens
JWT_SECRET="YOUR_SUPER_SECRET_STRING_JWT_ACC" (This can be anything you want)
```

### 4. Database Initialization
Synchronize the SQLite database schema and compile the Prisma Client:
```bash
# Push schema structure to SQLite
node node_modules/prisma/build/index.js db push

# Generate client models
node node_modules/prisma/build/index.js generate

# Seed default administrator credentials
node node_modules/prisma/build/index.js db seed
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the public portal.

---

## Administrator Portal Credentials

To access the backend manager at `/admin` (or `/login`), use the default administrator credentials created by the database seed:

- **Email**: `admin@trustcenter.local`
- **Password**: `Admin@123`

*Note: For security, immediately change these credentials or create a new user inside the User Management tab after initial login.*

---

## Usage Guide & Workflow

Here is how to set up, populate, and operate your Trust Center Portal:

### 1. Configure Portal Branding
1. Log in to the administrator panel at `/admin` using the default credentials.
2. Navigate to the **Settings** page.
3. Update your **Website Name**, **Browser Tab Title**, **Portal Icon / Logo URL**, and **Footer Attribution Text**.
4. Click **Save Config**; branding changes instantly propagate across all public and admin routes without requiring server restarts.

### 2. Design the Directory Structure
1. Navigate to **Project Management** in the admin sidebar.
2. Click **Create Project** to define your primary compliance frameworks (e.g., *SOC 2 Compliance*, *ISO 27001:2022*, *GDPR Readiness*).
3. Open any project and click **Add Folder** to create directory structures (e.g., *Policies*, *System Descriptions*, *Audit Reports*). You can create recursive nested subfolders as needed.

### 3. Upload Compliance Documents
1. Go to the **Documents** section in the admin panel.
2. Click **Upload Document**.
3. Select the target **Project** and **Folder**.
4. You can upload files in two ways:
   - **Single Upload**: Select one file, write a custom title, and add optional descriptions/tags.
   - **Bulk Upload**: Select multiple files simultaneously. The portal will automatically parse their filenames to set document titles.
5. **Auto-Rendering**: 
   - Files like `.pdf`, `.xlsx`, `.md`, and `.png` are instantly viewable in-browser.
   - `.docx` files will automatically trigger an **asynchronous background converter** that prepares a high-fidelity PDF preview file. Active conversion is tracked directly in the document list.

### 4. Manage Public vs. Private Access
* **Public Documents**: Toggle the **Public Approved** option on a document. Public files are immediately viewable by anyone visiting the public portal at `/trust-center`.
* **Private/Secure Documents**: Leave the document private. Public visitors will see a **Request Access** button instead of a preview link.

### 5. Review Requests & Magic Links
1. When a client or auditor visits a private document, they must enter their email and a business justification to request access.
2. Navigate to **Access Requests** in the administrator dashboard to view incoming requests.
3. Review details and select **Approve**. Set an access expiration window (e.g., 24 hours, 7 days).
4. The dashboard generates a secure, timed **Magic Link** containing token parameters. Copy and share this URL with the requester.
5. **Access Revocation**: To manually revoke access before the timer expires, simply click the **Trash** icon next to the request on `/admin/requests` to delete it. The magic link will instantly decompose and invalidate.

### 6. Disaster Recovery & Maintenance
* **Backups**: Visit `/admin/backup` to download a full system `.zip` snapshot containing the SQLite database and all uploaded files. You can restore your portal to a previous state at any time by uploading a valid backup zip.
* **Factory Reset**: If you need to repurpose the portal or start fresh, use the **Factory Reset** utility under the backup page. This deletes all folders, files, audit logs, and compliance records, while keeping your admin user accounts intact.

---

## Deployment & Production Build

To compile an optimized production build:
```bash
npm run build
npm start
```
By default, the `.gitignore` configuration is pre-configured to ensure SQLite database instances (`prisma/dev.db`), uploads (`/uploads`), backups (`/backups`), and local environment configurations are never committed to public repositories.

---

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.
