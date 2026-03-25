/**
 * @copyright 2026 vladnidz <vladyslav.nidzelskyi@edu.rtu.lv> — Phantom Pipeline
 * @license Proprietary. Hackathon submission. All rights reserved.
 * @author vladnidz <vladyslav.nidzelskyi@edu.rtu.lv>
 * @created 2026-03-25
 */

export type ApiResult<TData = any> = {
	readonly body: TData;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
};