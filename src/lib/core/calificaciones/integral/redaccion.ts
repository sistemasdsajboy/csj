import type { Genero } from '@prisma/client';

/**
 * Piezas de redacción del formato de calificación integral: cifras con coma
 * decimal, números en letras y palabras que cambian con el género.
 */

/** 704.605 → "704,61". Con `decimales = 0`, 714 → "714". */
export const cifra = (n: number, decimales = 2) => n.toFixed(decimales).replace('.', ',');

/** Cifras de procesos o días: enteras sin decimales, fraccionarias con dos. */
export const cantidad = (n: number) => (Number.isInteger(n) ? String(n) : cifra(n));

const UNIDADES = [
	'cero',
	'uno',
	'dos',
	'tres',
	'cuatro',
	'cinco',
	'seis',
	'siete',
	'ocho',
	'nueve',
	'diez',
	'once',
	'doce',
	'trece',
	'catorce',
	'quince',
	'dieciséis',
	'diecisiete',
	'dieciocho',
	'diecinueve',
	'veinte',
	'veintiuno',
	'veintidós',
	'veintitrés',
	'veinticuatro',
	'veinticinco',
	'veintiséis',
	'veintisiete',
	'veintiocho',
	'veintinueve',
];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = [
	'',
	'ciento',
	'doscientos',
	'trescientos',
	'cuatrocientos',
	'quinientos',
	'seiscientos',
	'setecientos',
	'ochocientos',
	'novecientos',
];

const menorQueMil = (n: number): string => {
	if (n < 30) return UNIDADES[n];
	if (n < 100) return DECENAS[Math.floor(n / 10)] + (n % 10 ? ' y ' + UNIDADES[n % 10] : '');
	if (n === 100) return 'cien';
	return CENTENAS[Math.floor(n / 100)] + (n % 100 ? ' ' + menorQueMil(n % 100) : '');
};

/** 13 → "trece", 2026 → "dos mil veintiséis". Enteros de 0 a 999.999. */
export function enLetras(n: number): string {
	if (!Number.isInteger(n) || n < 0 || n > 999_999) throw new Error(`No se sabe escribir en letras: ${n}`);
	if (n < 1000) return menorQueMil(n);
	const miles = Math.floor(n / 1000);
	const resto = n % 1000;
	const prefijo =
		miles === 1
			? 'mil'
			: menorQueMil(miles)
					.replace(/veintiuno$/, 'veintiún')
					.replace(/uno$/, 'un') + ' mil';
	return prefijo + (resto ? ' ' + menorQueMil(resto) : '');
}

/** 13 → "trece (13)", como se escribe en los actos. */
export const letrasYCifra = (n: number) => `${enLetras(n)} (${n})`;
/** Delante de un sustantivo masculino ("día", "días"): "un (1) día", "veintiún (21) días". */
export const letrasYCifraDelante = (n: number) =>
	`${enLetras(n)
		.replace(/veintiuno$/, 'veintiún')
		.replace(/uno$/, 'un')} (${n})`;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Las fechas se guardan a medianoche UTC; se leen en UTC para no correr el día. */
export const fechaLarga = (d: Date) => `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
export const fechaCorta = (d: Date) =>
	`${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
export const nombreMes = (d: Date) => MESES[d.getUTCMonth()];

const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'con', 'para', 'en', 'a']);

/** "JUZGADO 001 ADMINISTRATIVO DE SOGAMOSO" → "Juzgado 001 Administrativo de Sogamoso". */
export const comoTitulo = (texto: string) =>
	texto
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((p, i) => (i > 0 && CONECTORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
		.join(' ');

const ORDINALES = ['', 'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];

/**
 * El nombre del despacho como se escribe en los actos (como en ARGUMENTOS):
 * "JUZGADO 001 CIVIL MUNICIPAL DE TUNJA" → "Juzgado Primero Civil Municipal
 * de Tunja". Del 11 en adelante, el número en letras: "Juzgado Once Administrativo...".
 */
export const nombreDespacho = (nombre: string) =>
	comoTitulo(nombre).replace(/^Juzgado 0*(\d+)(?= )/, (todo, n: string) => {
		const k = Number(n);
		if (!k) return todo;
		const palabra = k <= 10 ? ORDINALES[k] : enLetras(k);
		return `Juzgado ${palabra.charAt(0).toUpperCase()}${palabra.slice(1)}`;
	});

export type Palabras = {
	el: string;
	del: string;
	al: string;
	funcionario: string;
	Funcionario: string;
	senor: string;
	doctor: string;
	identificado: string;
	invitado: string;
	interesado: string;
	notificado: string;
};

const FEMENINO: Palabras = {
	el: 'la',
	del: 'de la',
	al: 'a la',
	funcionario: 'funcionaria',
	Funcionario: 'Funcionaria',
	senor: 'señora',
	doctor: 'doctora',
	identificado: 'identificada',
	invitado: 'invitada',
	interesado: 'interesada',
	notificado: 'notificada',
};

const MASCULINO: Palabras = {
	el: 'el',
	del: 'del',
	al: 'al',
	funcionario: 'funcionario',
	Funcionario: 'Funcionario',
	senor: 'señor',
	doctor: 'doctor',
	identificado: 'identificado',
	invitado: 'invitado',
	interesado: 'interesado',
	notificado: 'notificado',
};

// Sin género registrado se usa la forma doble del formato oficial: "doctor (a)".
const SIN_GENERO: Palabras = {
	el: 'el (la)',
	del: 'del (de la)',
	al: 'al (a la)',
	funcionario: 'funcionario (a)',
	Funcionario: 'Funcionario (a)',
	senor: 'señor (a)',
	doctor: 'doctor (a)',
	identificado: 'identificado (a)',
	invitado: 'invitado (a)',
	interesado: 'interesado (a)',
	notificado: 'notificado (a)',
};

export const palabras = (genero: Genero | null | undefined): Palabras =>
	genero === 'femenino' ? FEMENINO : genero === 'masculino' ? MASCULINO : SIN_GENERO;
