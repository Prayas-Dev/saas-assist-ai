# SaaS Assist AI Backend Documentation

This document provides a complete overview of the backend architecture for the SaaS Assist AI project.

### Part 1: The Big Picture - A Convex Backend

The entire backend is built using **Convex**, which is a serverless platform that provides a real-time database and server-side functions (written in TypeScript). Think of it as both your database and your API layer rolled into one managed service.

The core architectural pattern is:
*   **Client (The `apps/web` dashboard or `apps/widget`)** calls functions on the backend.
*   **Convex** handles authentication for each call.
*   **Your Code** (in `packages/backend/convex`) runs the requested function.
*   The function reads from or writes to the **Convex Database**.
*   Data is returned to the client in real-time.

### Part 2: The Foundation - The Data Schema

The single most important file for understanding the backend is `packages/backend/convex/schema.ts`. It defines all the "tables" in your database, their fields, and the relationships between them.

Here are the key tables (called "collections" in Convex):

*   `users`: Stores information about individual users. Crucially, it links a `clerkId` to an `orgId`, placing each user within an organization.
*   `organizations`: Represents a customer's account (a "tenant" in the SaaS). This is the top-level object that owns everything else.
*   `subscriptions`: Tracks the billing status of an organization (e.g., "active", "canceled"). It links to an `orgId` and stores the `clerkSubscriptionId`.
*   `widgetSettings`: Contains the customization settings for an organization's voice assistant. This includes `assistantId`, `welcomeMessage`, `voice`, `theme`, etc. It is linked to an `orgId`.
*   `plugins`: Stores configuration for any plugins an organization has enabled.
*   `conversations`: Logs the history of conversations between an end-user and the voice assistant.
*   `contactSessions`: Tracks sessions for end-users interacting with the widget.

**Key takeaway:** The entire system is **multi-tenant**, centered around the `organizations` table. Almost every other piece of data is owned by and associated with an `orgId`.

### Part 3: Auth & Security - Who Can Do What?

Authentication is handled by **Clerk**.

*   **File:** `packages/backend/convex/auth.config.ts`
*   **How it works:** This file tells Convex to use Clerk as the authentication provider. When the frontend makes a request to the backend, it includes a JSON Web Token (JWT) from Clerk. Convex automatically validates this token. If valid, the user's identity (including their `clerkId` and the `orgId` they belong to) is securely available inside your backend functions.

This setup ensures that no function can be run without a valid, authenticated user. The logic inside each function is then responsible for checking if that user has permission to access or modify the requested data (e.g., "Is this user part of the organization whose settings they are trying to change?").

### Part 4: The Brain - Core Business Logic & File Structure

The actual work is done in functions spread across several directories inside `packages/backend/convex`. The logic is split into three distinct layers, which is a standard and robust Convex pattern:

1.  **`public/`**: These are the functions the client-side code (your Next.js dashboard and widget) can directly call. This is your **Public API**.
2.  **`private/`**: These functions can **only** be called by other backend functions (from `public/` or `system/`). This is your **Internal Business Logic**, kept separate and secure from the client. For example, `private/vapi.ts` holds the logic to communicate with the Vapi.ai SDK.
3.  **`system/`**: These are also internal functions, but they are typically reserved for system-level tasks, often triggered by webhooks or other automated processes. For example, `system/subscriptions.ts` updates the database when a billing event is received from Clerk.

### Summary: Core Concepts & Data Flow

You can now answer any question by keeping these core concepts in mind.

#### The Core Concepts

1.  **Technology**: It's a **Convex** backend, which combines serverless functions and a real-time database. It's written in **TypeScript**.
2.  **The "Brain"**: All logic resides in `packages/backend/convex`.
3.  **Data Model (`schema.ts`)**: The database is structured around a multi-tenant concept of **`organizations`**, which own everything else (users, settings, conversations).
4.  **Authentication (`auth.config.ts`)**: **Clerk** is the auth provider. Every request to the backend must have a valid Clerk JWT, which securely identifies the user and their organization.
5.  **Logic Layers**:
    *   **`public/`**: The API layer for the frontend.
    *   **`private/`**: The internal business logic layer (e.g., calling external APIs).
    *   **`system/`**: A special internal layer for automated tasks (e.g., handling webhooks).
6.  **External Communication**:
    *   **Outbound**: `private/vapi.ts` shows how it securely calls external APIs (Vapi.ai) on behalf of a tenant.
    *   **Inbound**: `http.ts` shows how it securely ingests webhooks from external services (Clerk) to synchronize state.

#### A Complete Data Flow Example: Loading the Widget

Let's trace a real-world scenario from start to finish:

1.  **An end-user loads a customer's website.** The `apps/embed` script runs and creates an iframe pointing to your `apps/widget` application. The `organizationId` of the website owner is passed to the widget.
2.  The `apps/widget` frontend needs its settings. It makes a call to the Convex backend, specifically to the `getByOrganizationId` function in **`public/widgetSettings.ts`**.
3.  The request hits the Convex cloud. Convex first uses the rules in **`auth.config.ts`** to validate the request.
4.  The `getByOrganizationId` function executes. It runs a database query against the `widgetSettings` table, filtered by the `organizationId`.
5.  The function finds the correct settings document and returns it as a JSON object to the `apps/widget` client.
6.  The `apps/widget` frontend receives the settings (e.g., `{ voice: "alloy", welcomeMessage: "Hello!" }`) and uses this data to render the voice assistant UI correctly.
