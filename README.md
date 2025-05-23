````markdown
# AWS Task Manager

A serverless task management system built with React, AWS Cognito, API Gateway, Lambda, DynamoDB, S3, and optional MySQL integration. Allows users to authenticate, create/update/delete tasks, and upload/download attachments.

---

## 📋 Features

- **User Authentication & Authorization**  
  - Sign in / Sign out via Amazon Cognito Hosted UI (OAuth 2.0 authorization code grant)  
  - Token management with AWS Amplify  

- **Task CRUD API**  
  - Exposed through Amazon API Gateway  
  - Backed by AWS Lambda functions  

- **Data Storage**  
  - **DynamoDB** “Tasks” table (fields: `task_id`, `title`, `description`, `status`, `due_date`, `assigned_to`)  
  - **S3** bucket for file attachments (pre-signed URL uploads & downloads)  
  - **Optional** MySQL sync via Lambda  

- **Client App**  
  - React SPA using AWS Amplify for auth and API calls  
  - Task listing, creation, updates, deletion, and attachment management UI  

---

## 🏗 Architecture Diagram

![Architecture Diagram](./architecture-diagram.png)

> **Sections:**  
> 1. **Client:** React App ↔ Cognito ↔ API Gateway  
> 2. **API:** Gateway → Lambda (CRUD, Attachments, MySQL Sync)  
> 3. **Data:** DynamoDB, S3, (MySQL)  

---

## 🚀 Setup Guide

### 1. Prerequisites

- AWS account & Admin-level IAM user/role  
- AWS CLI v2 installed & configured (`aws configure`)  
- Node.js ≥ 16 & npm/yarn  

### 2. Configure Cognito

1. Create a **User Pool** (email as username).  
2. Create an **App Client** (no secret) with:  
   - Authorization code grant  
   - Scopes: `openid`,`email`,`profile`  
   - Callback URL: your React app URL  
3. Note your User Pool ID, App Client ID, and domain.

### 3. Provision Data Stores

- **DynamoDB**: Create `Tasks` table (PK: `task_id` String).  
- **S3**: Create an attachments bucket; enable CORS for your client domain.

### 4. Deploy Lambda Functions

- **TaskHandler** (CRUD)  
  - Env var `TASKS_TABLE` → Tasks table name  
  - IAM role with DynamoDB access  
- **AttachmentHandler** (pre-signed URLs)  
  - Env var `ATTACHMENTS_BUCKET` → S3 bucket name  
  - IAM role with S3 Put/Get  
- **MySQLSync** (optional)  
  - Env vars for RDS endpoint & credentials  
  - IAM role / VPC access as required  

### 5. Configure API Gateway

1. Create REST API “TaskAPI”.  
2. Define routes:
   - `GET    /tasks`
   - `POST   /tasks`
   - `PATCH  /tasks/{id}`
   - `DELETE /tasks/{id}`
   - `POST   /tasks/{id}/attachment`
   - `GET    /tasks/{id}/attachments`
3. Integrate each route with its Lambda.  
4. Attach a Cognito Authorizer to secure all routes.

### 6. Frontend Deployment

1. Update your React app’s `aws-exports.js` with Cognito & API details.  
2. Build & deploy to S3 + CloudFront (or your hosting choice):
   ```bash
   npm run build
   aws s3 sync build/ s3://your-frontend-bucket --acl public-read
````

---

## 📖 User Manual

1. **Sign In**
   Click **Sign In** → Cognito Hosted UI → Authenticate → return to app.

2. **View Profile**
   Click the 👤 icon to toggle profile card (shows Email, Name & Sign Out).

3. **Manage Tasks**

   * **List**: All tasks appear as cards.
   * **Create**: Click **+ Create Task**, fill form, click **Create**.
   * **Edit**: Expand a card, click **Edit**, modify & **Save**.
   * **Delete**: Expand a card, click **Delete**, confirm.

4. **Attachments**

   * Expand a task card.
   * **Upload**: Choose file → **Upload**.
   * **Download**: Click **Download** on any existing attachment.

5. **Sign Out**
   From the profile card, click **Sign Out**.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch:

   ```bash
   git checkout -b feature/YourFeature
   ```
3. Commit your changes & push:

   ```bash
   git push origin feature/YourFeature
   ```
4. Open a Pull Request.

---

## 📄 License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.

```
```
