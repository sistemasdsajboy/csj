import { describe, expect, it } from 'vitest';
import { contarDiasHabiles } from '$lib/utils/dates';
import { getDiasFestivosPorTipoDespacho } from './generar-calificacion';
import { db } from '$lib/server/db-client';

const url = process.env.DATABASE_URL ?? '';
const activa = process.env.PRUEBA_INTEGRACION === '1' && /csj-desarrollo|127\.0\.0\.1|ac-wmgm4fk-shard/.test(url);

describe.skipIf(!activa)('dias habiles de los tramos del juzgado partido', () => {
	it('cuenta los dias de cada tramo', { timeout: 300000 }, async () => {
		const d = await db.despacho.findFirst({
			where: { codigo: '151764003001' },
			include: { tipoDespacho: true },
		});
		const noHabiles = getDiasFestivosPorTipoDespacho(d?.tipoDespacho ?? null);

		const tramos: Array<[string, string]> = [
			['2025-01-01', '2025-01-12'],
			['2025-01-13', '2025-03-31'],
			['2025-04-01', '2025-06-30'],
			['2025-07-01', '2025-09-30'],
			['2025-10-01', '2025-12-31'],
			['2025-01-01', '2025-12-31'],
		];
		for (const [a, b] of tramos) {
			const n = contarDiasHabiles(noHabiles, new Date(`${a}T00:00:00Z`), new Date(`${b}T00:00:00Z`));
			console.log(`  ${a}  al  ${b}   dias habiles: ${String(n).padStart(3)}${n === 0 ? '   <<< CERO' : ''}`);
		}
		expect(true).toBe(true);
	});
});
