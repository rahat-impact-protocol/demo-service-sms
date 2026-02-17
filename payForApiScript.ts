import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const makeRequest = async () => {

// Create signer
const signer = privateKeyToAccount("0xcee47a254eda4a1917acae76b4feb9e595709b9f37f2193815da1d17cdf1dc25");

// Create x402 client and register schemes
const client = new x402Client();
registerExactEvmScheme(client, { signer });

// Wrap fetch with payment handling
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

// Make request - payment is handled automatically
const response = await fetchWithPayment("http://localhost:8890/sms/recipients?page=1&skip=10", {
  method: "GET",
});

console.log("Response:", response);

const body = await response.json();
console.log("Response:", body);

// Get payment receipt from response headers
if (response.ok) {
  const httpClient = new x402HTTPClient(client);
  const paymentResponse = httpClient.getPaymentSettleResponse(
    (name) => response.headers.get(name)
  );
  console.log("Payment settled:", paymentResponse);
}
}

makeRequest()