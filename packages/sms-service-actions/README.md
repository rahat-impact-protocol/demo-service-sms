# @rahat/token-disbursement-actions

Shared action configuration package for the Rahat Token Disbursement service. This package provides action names, endpoints, and helper functions for consuming applications that need to call the token disbursement service.

## Installation

```bash
npm install @rahat/token-disbursement-actions
# or
pnpm add @rahat/token-disbursement-actions
# or
yarn add @rahat/token-disbursement-actions
```

For local development/monorepo:

```bash
pnpm add @rahat/token-disbursement-actions@file:./packages/token-disbursement-actions
```

## Usage

### Import Actions

```typescript
import { ACTIONS, getActionByName, getActionByPath } from '@rahat/token-disbursement-actions';

// Access action directly
const disbursementAction = ACTIONS.DISBURSEMENT;
console.log(disbursementAction.path); // '/token'
console.log(disbursementAction.method); // 'POST'

// Or use helper functions
const action = getActionByName('disbursement');
console.log(action?.path); // '/token'
```

### Build HTTP Requests

```typescript
import { ACTIONS } from '@rahat/token-disbursement-actions';

const disbursement = ACTIONS.DISBURSEMENT;

// Make request to token disbursement service
const response = await fetch(`https://token-service.example.com${disbursement.path}`, {
  method: disbursement.method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    senderId: 'my-service',
    serviceId: 'token-disbursement',
    callbackUrl: 'https://my-service.example.com/callback',
    message: '0x...encrypted_payload'
  })
});
```

### Type Safety

```typescript
import { ActionName } from '@rahat/token-disbursement-actions';

function handleAction(actionName: ActionName) {
  // TypeScript ensures actionName is a valid action
  console.log(`Handling action: ${actionName}`);
}

handleAction('disbursement'); // ✓ Valid
// handleAction('invalid'); // ✗ TypeScript error
```

## Available Actions

### Disbursement

- **Name**: `disbursement`
- **Path**: `/token`
- **Method**: `POST`
- **Processor**: `token_disbursement`
- **Description**: Token disbursement action via smart contract

#### Request Format

```json
{
  "senderId": "service-a",
  "serviceId": "token-disbursement",
  "callbackUrl": "https://example.com/callback",
  "message": "0x...encrypted_payload"
}
```

#### Response

```json
{
  "status": "queued"
}
```

## API

### Constants

#### `ACTIONS`

Object containing all available actions as constants.

```typescript
ACTIONS.DISBURSEMENT // { name: 'disbursement', path: '/token', ... }
```

### Functions

#### `getAvailableActions()`

Returns an array of all available actions.

```typescript
const actions = getAvailableActions();
// Returns: [{ name: 'disbursement', path: '/token', ... }]
```

#### `getActionByName(actionName: string)`

Look up an action by its name.

```typescript
const action = getActionByName('disbursement');
// Returns: { name: 'disbursement', path: '/token', ... }
```

#### `getActionByPath(actionPath: string)`

Look up an action by its API path.

```typescript
const action = getActionByPath('/token');
// Returns: { name: 'disbursement', path: '/token', ... }
```

#### `getAction(key: keyof typeof ACTIONS)`

Get an action directly by its key in the ACTIONS object.

```typescript
const action = getAction('DISBURSEMENT');
// Returns: { name: 'disbursement', path: '/token', ... }
```

## Types

### `ActionName`

Union type of all valid action names. Useful for function parameters and type guards.

```typescript
type ActionName = 'disbursement';
```

## Contributing

When adding new actions to the token disbursement service:

1. Add the action entry to `ACTIONS` in `src/actions.ts`
2. Build the package: `npm run build`
3. Publish to npm registry
4. Update dependent applications to use the new version

## License

MIT
