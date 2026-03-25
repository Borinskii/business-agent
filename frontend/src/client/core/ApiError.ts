/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

import type { ApiRequestOptions } from './ApiRequestOptions';
import type { ApiResult } from './ApiResult';

export class ApiError extends Error {
	public readonly url: string;
	public readonly status: number;
	public readonly statusText: string;
	public readonly body: unknown;
	public readonly request: ApiRequestOptions;

	constructor(request: ApiRequestOptions, response: ApiResult, message: string) {
		super(message);

		this.name = 'ApiError';
		this.url = response.url;
		this.status = response.status;
		this.statusText = response.statusText;
		this.body = response.body;
		this.request = request;
	}
}