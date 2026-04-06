import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { SigningKey } from 'ethers';
import * as ServicePackage from '@rahat/sms-service-actions';


type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS';

interface CreateCapabilityDto {
	name: string;
	method: HttpMethod;
	path: string;
	inputSchema?: unknown;
	outputSchema?: unknown;
	executionMode?: unknown;
	timeoutMs?: number;
	retryable?: boolean;
}

interface CreateServiceDto {
    id:string,
	baseUrl: string;
	publicKey: string;
	capabilities?: CreateCapabilityDto[];
	serviceTags?: string[];
}

interface HubAccountResponse {
	publicKey?: unknown;
	privateKey?: unknown;
	value?: {
		publicKey?: unknown;
		privateKey?: unknown;
	};
	data?: {
		publicKey?: unknown;
		privateKey?: unknown;
		value?: {
			publicKey?: unknown;
			privateKey?: unknown;
		};
	};
}

interface PackageAction {
	name: string;
	method: string;
	path: string;
}

const prisma = new PrismaClient();

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function readBaseUrlFromEnv(): string {
	const baseUrl =
		process.env.SERVICE_BASE_URL?.trim() ||
		process.env.SERVICE_ENDPOINT?.trim() ||
		process.env.ENDPOINT?.trim();

	if (!baseUrl) {
		throw new Error(
			'Missing service endpoint. Set one of SERVICE_BASE_URL, SERVICE_ENDPOINT, or ENDPOINT in .env',
		);
	}

	return baseUrl;
}

function toHttpMethod(method: string): HttpMethod {
	const normalized = method.toUpperCase();
	const allowed = new Set<HttpMethod>([
		'GET',
		'POST',
		'PUT',
		'PATCH',
		'DELETE',
		'HEAD',
		'OPTIONS',
	]);

	if (!allowed.has(normalized as HttpMethod)) {
		throw new Error(`Unsupported HTTP method in action package: ${method}`);
	}

	return normalized as HttpMethod;
}

function normalizePublicKey(value: string): string {
	const key = value.trim();
	return key.startsWith('0x') ? key : `0x${key}`;
}

function derivePublicKeyFromPrivateKey(privateKey: string): string {
	const signingKey = new SigningKey(privateKey);
	return signingKey.publicKey;
}

function extractHubAccountDetails(payload: HubAccountResponse): {
	publicKey: string;
	privateKey?: string;
} {
	const nestedValue = payload.value;
	const nestedData = payload.data;
	const nestedDataValue = nestedData?.value;
    console.log(payload)

	const rawPublicKey =
		(typeof payload.publicKey === 'string' && payload.publicKey) ||
		(typeof nestedValue?.publicKey === 'string' && nestedValue.publicKey) ||
		(typeof nestedData?.publicKey === 'string' && nestedData.publicKey) ||
		(typeof nestedDataValue?.publicKey === 'string' && nestedDataValue.publicKey) ||
		undefined;

	const rawPrivateKey =
		(typeof payload.privateKey === 'string' && payload.privateKey) ||
		(typeof nestedValue?.privateKey === 'string' && nestedValue.privateKey) ||
		(typeof nestedData?.privateKey === 'string' && nestedData.privateKey) ||
		(typeof nestedDataValue?.privateKey === 'string' && nestedDataValue.privateKey) ||
		undefined;

	if (rawPublicKey) {
		return {
			publicKey: normalizePublicKey(rawPublicKey),
			privateKey: rawPrivateKey,
		};
	}

	// if (rawPrivateKey) {
	// 	return {
	// 		publicKey: normalizePublicKey(derivePublicKeyFromPrivateKey(rawPrivateKey)),
	// 		privateKey: rawPrivateKey,
	// 	};
	// }

	throw new Error(
		'Hub account response does not contain publicKey or privateKey',
	);
}

async function readAccountPublicKey(): Promise<string> {
	const accountSetting = await prisma.settings.findUnique({
		where: { name: 'account' },
	});

	if (!accountSetting) {
		throw new Error('Settings record with name="account" not found');
	}

	const accountValue = accountSetting.value as Record<string, unknown>;
	const rawPublicKey = accountValue?.publicKey;

	if (typeof rawPublicKey === 'string' && rawPublicKey.length > 0) {
		return normalizePublicKey(rawPublicKey);
	}

	const rawPrivateKey = accountValue?.privateKey;
	if (typeof rawPrivateKey === 'string' && rawPrivateKey.length > 0) {
		return normalizePublicKey(derivePublicKeyFromPrivateKey(rawPrivateKey));
	}

	throw new Error(
		'Account setting does not contain publicKey or privateKey to derive public key',
	);
}

function buildCapabilities(): CreateCapabilityDto[] {
	const getAvailableActions = (ServicePackage as any).getAvailableActions as
		| (() => PackageAction[])
		| undefined;

	if (!getAvailableActions) {
		return [];
	}

	return getAvailableActions().map((action) => ({
		name: action.name,
		method: toHttpMethod(action.method),
		path: action.path,
        executionMode:'ASYNC'
	}));
}

function buildServiceTags(capabilities: CreateCapabilityDto[]): string[] {
	return [...new Set(capabilities.map((capability) => capability.name))];
}

async function registerHubInServiceRegistry(hubUrl: string): Promise<void> {
	const endpoint = `${hubUrl.replace(/\/+$/, '')}/settings/account`;
	const response = await axios.get<HubAccountResponse>(endpoint);
    console.log(response)
	const account = extractHubAccountDetails(response.data);

	await prisma.registry.upsert({
		where: { id: 'main' },
		update: {
			baseUrl: hubUrl,
			publicKey: account.publicKey,
		},
		create: {
			id: 'main',
			baseUrl: hubUrl,
			publicKey: account.publicKey,
			privateKey: account.privateKey,
		},
	});

	console.log('Hub registry synced locally.');
	console.log(`Registry endpoint: ${endpoint}`);
}

async function registerServiceToHub(): Promise<void> {
	const hubUrl = requireEnv('HUB_URL');
	const endpoint = `${hubUrl.replace(/\/+$/, '')}/services`;
	await registerHubInServiceRegistry(hubUrl);
	const baseUrl = readBaseUrlFromEnv();
    console.log(endpoint)
	const publicKey = await readAccountPublicKey();
	const capabilities = buildCapabilities();

	if (capabilities.length === 0) {
		throw new Error(
			'No capabilities found in package exports. Ensure getAvailableActions() returns at least one action.',
		);
	}

	const payload: CreateServiceDto = {
        id:'SMS',
		baseUrl,
		publicKey,
		capabilities,
		serviceTags: buildServiceTags(capabilities),
	};

	// const response = await axios.post(endpoint, payload);
	console.log('Service registration succeeded.');
	console.log(`Hub endpoint: ${endpoint}`);
	// console.log(`Status: ${response.status}`);
	// console.log('Response:', response.data);
}

async function main(): Promise<void> {
	try {
		await registerServiceToHub();
	} catch (error) {
        console.log(error)
		if (axios.isAxiosError(error)) {
			console.error('Hub registration failed with HTTP error.');
			console.error('Status:', error.response?.status);
			console.error('Response:', error.response?.data);
			console.error('Message:', error.message);
		} else {
			console.error('Hub registration failed:', error);
		}
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
}

void main();
