/**
 * Token Disbursement Action Configuration
 * 
 * This package exports action names and endpoints for the token disbursement service.
 * Install this package in your application to use these constants and avoid hardcoding paths.
 */

export const ACTIONS = {
  SENDSMS: {
    name: 'sendsms',
    path: '/send',
    method: 'POST',
    // processor: 'token_disbursement',
    description: 'SMS service for single sms',
  },

  BULKSMS:{
    name:'bulksms',
    path:'/bulk',
    method: 'POST',
    description:'SMS service for bulk sms'
  }
} as const;

/**
 * Action type for TypeScript support
 */
export type ActionName = typeof ACTIONS[keyof typeof ACTIONS]['name'];

/**
 * Get all available actions
 * @returns Array of action configurations for hub registration
 */
export function getAvailableActions() {
  return Object.values(ACTIONS).map((action) => ({
    name: action.name,
    path: action.path,
    method: action.method,
    // processor: action.processor,
    description: action.description,
  }));
}

/**
 * Get action config by name
 * @param actionName - The action name to lookup
 * @returns Action configuration or undefined
 * 
 * @example
 * const action = getActionByName('disbursement');
 * if (action) {
 *   console.log(action.path); // '/token'
 * }
 */
export function getActionByName(actionName: string) {
  return Object.values(ACTIONS).find((action) => action.name === actionName);
}

/**
 * Get action config by path
 * @param actionPath - The API path to lookup
 * @returns Action configuration or undefined
 * 
 * @example
 * const action = getActionByPath('/token');
 * if (action) {
 *   console.log(action.name); // 'disbursement'
 * }
 */
export function getActionByPath(actionPath: string) {
  return Object.values(ACTIONS).find((action) => action.path === actionPath);
}

/**
 * Get action constant by key
 * @param key - The ACTIONS object key (e.g., 'DISBURSEMENT')
 * @returns Action configuration or undefined
 * 
 * @example
 * const disbursement = getAction('DISBURSEMENT');
 * console.log(disbursement.path); // '/token'
 */
export function getAction(key: keyof typeof ACTIONS) {
  return ACTIONS[key];
}
