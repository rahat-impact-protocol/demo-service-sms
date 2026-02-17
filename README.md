# Demo SMS Service

The **Demo SMS Service** is a reference implementation built to demonstrate secure, payment-gated communication between services using the Impact Protocol architecture.

This service simulates an SMS provider and is used to test:

- Encrypted inter-service communication
- Blockchain-based payment enforcement
- Hub-based service registration and routing

---

## Overview

The Demo SMS Service:

- Receives **encrypted requests** from other services
- Decrypts both **payload** and **payment information**
- Verifies blockchain payment before execution
- Sends SMS messages (demo logic)

This service is intended for **testing and demonstration purposes only**.

---

## Architecture & Request Flow

### 1️⃣ Encrypted Communication

- The requesting service encrypts:
  - The request payload
  - The payment object

- Encryption is done using the **public key of the Demo SMS Service**
- The service decrypts the request upon receipt

### 2️⃣ Interceptor

An interceptor:

- Intercepts incoming controller requests
- Decrypts:
  - Payload
  - Payment data

- Passes decrypted data to the controller layer

### 3️⃣ Payment Enforcement

Payment verification is handled using a custom decorator:

### `@DecryptPayment`

This decorator:

- Decrypts the required payment amount
- Sends a blockchain transaction
- Verifies the token transfer
- Allows execution **only if payment is successful**

If payment verification fails, the request is rejected.

---

# Local Setup

Follow these steps to run the service locally:

```bash
# Clone the repository
git clone <repo-url>

# Move into the project directory
cd <project-folder>

# Copy environment variables
cp .env.example .env

# Install dependencies
pnpm install

# Run Prisma migration
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
pnpm start:dev
```

---

# Registering the Service in Impact Protocol Hub

Before registering this service, ensure the **Impact Protocol Hub** is running.

👉 Run the Hub first and follow its README instructions.

Once the hub is running, register this service with the following payload:

```json
{
  "id": "sms-service-001",
  "baseUrl": "http://localhost:{port}",
  "publicKey": "your_public_key",
  "capabilities": [
    {
      "name": "send-sms",
      "method": "POST",
      "path": "/sms/send",
      "inputSchema": {
        "type": "object",
        "properties": {
          "to": { "type": "string", "description": "Recipient phone number" },
          "message": { "type": "string", "description": "SMS message content" },
          "from": {
            "type": "string",
            "description": "Sender phone number or identifier"
          }
        },
        "required": ["to", "message"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "messageId": { "type": "string" },
          "status": { "type": "string", "enum": ["sent", "queued", "failed"] },
          "timestamp": { "type": "string", "format": "date-time" }
        }
      },
      "executionMode": "SYNC",
      "timeoutMs": 5000,
      "retryable": true
    },
    {
      "name": "view-sms-log",
      "method": "GET",
      "path": "/sms/log",
      "inputSchema": {
        "type": "object",
        "properties": {
          "limit": { "type": "number", "default": 50 },
          "offset": { "type": "number", "default": 0 }
        }
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "logs": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "messageId": { "type": "string" },
                "to": { "type": "string" },
                "from": { "type": "string" },
                "message": { "type": "string" },
                "status": { "type": "string" },
                "timestamp": { "type": "string", "format": "date-time" }
              }
            }
          },
          "total": { "type": "number" }
        }
      },
      "executionMode": "ASYNC",
      "retryable": false
    }
  ]
}
```

Replace:

- `{port}` with your running service port
- `your_public_key` with the service’s actual public key

---

# Health Verification

After registration:

1. Check the **Hub database**
2. Confirm the service status is marked as **healthy**
3. Ensure the Hub health monitoring detects the service as active

If the service is unhealthy:

- Verify the base URL
- Ensure the server is running
- Confirm correct port configuration

---

# Capabilities Summary

| Capability   | Method | Path      |
| ------------ | ------ | --------- |
| send-sms     | POST   | /sms/send |
| view-sms-log | GET    | /sms/log  |

---

# Purpose

This service validates:

- Encrypted service-to-service communication
- Blockchain payment verification
- Decorator-based payment enforcement
- Hub-based service registration
- Health monitoring integration
