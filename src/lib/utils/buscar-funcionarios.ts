export type OpcionFuncionario = { label: string; value: string };

/** Sin tildes, sin Ñ y en minúsculas: buscar "pena" encuentra "PEÑA". */
export const normalizarBusqueda = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();

/**
 * Filtra la lista de funcionarios por lo que se escribe en el buscador.
 *
 * Cada palabra escrita tiene que aparecer en el nombre, en cualquier orden: así
 * "ortega wilson" encuentra a WILSON URIEL ORTEGA PEÑA. Sin texto, devuelve la
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
		const nombre = normalizarBusqueda(f.label);
		return palabras.every((p) => nombre.includes(p));
	});
};
