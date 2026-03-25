/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

export type ApiRequestOptions<T = unknown> = {
	readonly body?: any;
	readonly cookies?: Record<string, unknown>;
	readonly errors?: Record<number | string, string>;
	readonly formData?: Record<string, unknown> | any[] | Blob | File;
	readonly headers?: Record<string, unknown>;
	readonly mediaType?: string;
	readonly method:
		| 'DELETE'
		| 'GET'
		| 'HEAD'
		| 'OPTIONS'
		| 'PATCH'
		| 'POST'
		| 'PUT';
	readonly path?: Record<string, unknown>;
	readonly query?: Record<string, unknown>;
	readonly responseHeader?: string;
	readonly responseTransformer?: (data: unknown) => Promise<T>;
	readonly url: string;
};