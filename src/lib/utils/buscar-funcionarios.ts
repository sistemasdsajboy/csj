export type OpcionFuncionario = { label: string; value: string; detalle?: string };

export type FuncionarioParaBuscar = { id: string; nombre: string; documento: string };

/** Sin tildes, sin Ñ y en minúsculas: buscar "pena" encuentra "PEÑA". */
export const normalizarBusqueda = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

/**
 * Cuando un funcionario sirve **encargado** en otro despacho, la oficina le crea
 * un registro aparte con su cédula más un dígito, para calificar esa gestión por
 * separado. Es una convención deliberada: los dos registros son correctos y no
 * se fusionan (ver H-18).
 *
 * Aquí solo se reconoce el patrón para poder decirlo en pantalla.
 */
export const esDocumentoDeEncargo = (documento: string, otro: string) => documento.length === otro.length + 1 && documento.startsWith(otro);

/**
 * Prepara las opciones del buscador.
 *
 * Dos funcionarios pueden llamarse igual —normalmente el titular y su propio
 * registro de encargo— y en pantalla se ven idénticos. Al elegir el que no era,
 * el periodo que se busca "no aparece", aunque los datos estén cargados.
 *
 * Pasó de verdad con GEOVANNY ANDRES PINEDA LEGUÍZAMO: su registro de titular
 * tiene 2023, 2024 y 2025; el de encargo solo 2024. Buscándolo por nombre no
 * había forma de saber cuál se estaba abriendo.
 *
 * Por eso el documento se muestra **solo cuando el nombre se repite**: ahí es
 * cuando hace falta, y en el resto de los casos ensuciaría la lista.
 */
export const etiquetarFuncionarios = (funcionarios: FuncionarioParaBuscar[]): OpcionFuncionario[] => {
	const porNombre = new Map<string, FuncionarioParaBuscar[]>();
	for (const f of funcionarios) {
		const k = normalizarBusqueda(f.nombre);
		if (!porNombre.has(k)) porNombre.set(k, []);
		porNombre.get(k)!.push(f);
	}

	return funcionarios.map((f) => {
		const homonimos = porNombre.get(normalizarBusqueda(f.nombre)) ?? [];
		if (homonimos.length < 2) return { label: f.nombre, value: f.id };

		const esEncargo = homonimos.some((otro) => otro.id !== f.id && esDocumentoDeEncargo(f.documento, otro.documento));
		return {
			label: f.nombre,
			value: f.id,
			detalle: esEncargo ? `Encargo · documento ${f.documento}` : `Documento ${f.documento}`,
		};
	});
};

/**
 * Filtra la lista de funcionarios por lo que se escribe en el buscador.
 *
 * Cada palabra escrita tiene que aparecer en el nombre o en el detalle, en
 * cualquier orden: así "ortega wilson" encuentra a WILSON URIEL ORTEGA PEÑA, y
 * escribir un documento encuentra a quien lo tiene. Sin texto, devuelve la
 * lista completa.
 *
 * Vive aquí y no dentro del componente para poder probarla. La versión anterior
 * delegaba el filtrado en un componente de terceros y llegó a producción sin
 * encontrar coincidencias.
 */
export const filtrarFuncionarios = (funcionarios: OpcionFuncionario[], texto: string): OpcionFuncionario[] => {
	const palabras = normalizarBusqueda(texto).split(/\s+/).filter(Boolean);
	if (!palabras.length) return funcionarios;
	return funcionarios.filter((f) => {
		const dondeBuscar = normalizarBusqueda(`${f.label} ${f.detalle ?? ''}`);
		return palabras.every((p) => dondeBuscar.includes(p));
	});
};
