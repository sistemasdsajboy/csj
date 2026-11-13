"""
Arma la plantilla del formato de calificación integral a partir del formato
oficial vacío ("Formato Calificación Integral de Servicios - Jueces.docx").

Pone las marcas que llena docxtemplater ({apellidos}, {calidad}...) en las
celdas del formato y le aplica los mismos ajustes del formato que usa el
despacho: sin las filas de provisionalidad cuando no hay, sin la nota ni las
páginas del instructivo, la resolución solo si la calificación es
insatisfactoria y, al final, las iniciales y la fecha de la sesión.

Uso (desde la raíz del proyecto, con python-docx instalado):
    python scripts/plantilla-formato-integral.py "<formato oficial vacío>.docx"
Escribe src/lib/server/formato-integral/plantilla.docx y plantilla.ts (la misma
plantilla en base64, que es la que usa el servidor).
"""
import copy
import sys

import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SALIDA = 'src/lib/server/formato-integral/plantilla.docx'
SALIDA_TS = 'src/lib/server/formato-integral/plantilla.ts'


def celda(tabla, fila, indice):
    """La celda en la posición `indice` de la fila, contando celdas combinadas como en python-docx."""
    return tabla.rows[fila].cells[indice]


def formato_de(parrafo):
    """Las propiedades de letra del primer run, o las de la marca de párrafo si no hay runs."""
    r = parrafo._p.find(qn('w:r'))
    if r is not None and r.find(qn('w:rPr')) is not None:
        return copy.deepcopy(r.find(qn('w:rPr')))
    ppr = parrafo._p.find(qn('w:pPr'))
    if ppr is not None and ppr.find(qn('w:rPr')) is not None:
        return copy.deepcopy(ppr.find(qn('w:rPr')))
    return None


def escribir(parrafo, texto, negrita=None):
    """Reemplaza el texto del párrafo por uno solo, conservando el formato de letra."""
    rpr = formato_de(parrafo)
    for r in list(parrafo._p.findall(qn('w:r'))):
        parrafo._p.remove(r)
    run = parrafo.add_run(texto)
    if rpr is not None:
        run._r.insert(0, rpr)
    if negrita is not None:
        run.bold = negrita
    return run


def poner(tabla, fila, indice, texto):
    escribir(celda(tabla, fila, indice).paragraphs[0], texto)


def quitar_filas(tabla, indices):
    for i in sorted(indices, reverse=True):
        tr = tabla.rows[i]._tr
        tr.getparent().remove(tr)


def parrafo_tras(elemento, texto, rpr=None, negrita=None, justificado=False):
    """Inserta un párrafo nuevo después de `elemento` (párrafo o tabla)."""
    p = OxmlElement('w:p')
    elemento.addnext(p)
    if justificado:
        ppr = OxmlElement('w:pPr')
        jc = OxmlElement('w:jc')
        jc.set(qn('w:val'), 'both')
        ppr.append(jc)
        p.append(ppr)
    r = OxmlElement('w:r')
    if rpr is not None:
        r.append(copy.deepcopy(rpr))
    rp = r.find(qn('w:rPr'))
    if negrita is False and rp is not None:
        # La celda de la motivación viene en negrilla; el texto del párrafo no.
        for b in rp.findall(qn('w:b')) + rp.findall(qn('w:bCs')):
            rp.remove(b)
    if negrita:
        if rp is None:
            rp = OxmlElement('w:rPr')
            r.insert(0, rp)
        rp.append(OxmlElement('w:b'))
    t = OxmlElement('w:t')
    t.text = texto
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    r.append(t)
    p.append(r)
    return p


def main(origen):
    d = docx.Document(origen)
    t_info, t_periodo, t_calif, t_motiv, t_firma, t_notif = d.tables[:6]

    # 0. Marca de borrador al principio, solo mientras la calificación está en revisión.
    #    Las marcas de bloque van solas en su párrafo: sin borrador no queda ni la línea.
    abre = OxmlElement('w:p')
    d.element.body[0].addprevious(abre)
    aviso = parrafo_tras(abre, '{#borrador}')
    aviso = parrafo_tras(aviso, 'BORRADOR – CALIFICACIÓN EN REVISIÓN, SIN APROBAR', negrita=True)
    run = aviso.find(qn('w:r'))
    rpr = run.find(qn('w:rPr'))
    color = OxmlElement('w:color')
    color.set(qn('w:val'), 'C00000')
    rpr.append(color)
    jc_ppr = OxmlElement('w:pPr')
    jc = OxmlElement('w:jc')
    jc.set(qn('w:val'), 'center')
    jc_ppr.append(jc)
    aviso.insert(0, jc_ppr)
    parrafo_tras(aviso, '{/borrador}')
    abre.getparent().remove(abre)

    # 1. Información del evaluado.
    poner(t_info, 2, 4, '{apellidos}')
    poner(t_info, 2, 11, '{nombres}')
    poner(t_info, 3, 4, '{cedula}')
    poner(t_info, 4, 4, '{cargo}')
    poner(t_info, 4, 11, '{municipio}')
    poner(t_info, 4, 15, '{distrito}')
    # Una sola fila de provisionalidad que se repite por cada cargo; sin cargos desaparece.
    poner(t_info, 6, 4, '{#provisionalidad}{cargo}')
    poner(t_info, 6, 11, '{municipio}')
    poner(t_info, 6, 15, '{distrito}{/provisionalidad}')
    quitar_filas(t_info, [7])

    # 2. Período y fecha de la calificación (fecha de la sala).
    for indice, marca in [(4, 'desdeDia'), (6, 'desdeMes'), (8, 'desdeAnio'), (15, 'hastaDia'), (17, 'hastaMes'), (19, 'hastaAnio')]:
        poner(t_periodo, 2, indice, '{' + marca + '}')
    for indice, marca in [(11, 'salaDia'), (13, 'salaMes'), (15, 'salaAnio')]:
        poner(t_periodo, 5, indice, '{' + marca + '}')

    # 3. Calificación integral de servicios.
    poner(t_calif, 2, 15, '{calidad}')
    poner(t_calif, 2, 33, '{organizacion}')
    poner(t_calif, 5, 15, '{eficiencia}')
    poner(t_calif, 5, 33, '{publicaciones}')
    poner(t_calif, 7, 18, '{integral}')
    poner(t_calif, 7, 31, '{xExcelente}')
    poner(t_calif, 8, 31, '{xBuena}')
    poner(t_calif, 9, 31, '{xInsatisfactoria}')

    # 4. Motivación: una sección por factor, con su título y sus párrafos. La motivación
    #    libre (despacho 1) no tiene título: el párrafo del título desaparece.
    c = celda(t_motiv, 2, 1)
    base = c.paragraphs[0]
    rpr = formato_de(base)
    escribir(base, '{#secciones}')
    ultimo = base._p
    for texto, negrita, just in [('{#titulo}', None, False), ('{titulo}', True, False), ('{/titulo}', None, False), ('{#parrafos}', None, False), ('{.}', False, True), ('{/parrafos}', None, False), ('{/secciones}', None, False)]:
        ultimo = parrafo_tras(ultimo, texto, rpr, negrita, just)
    # Se quitan las filas vacías de escritura a mano: queda una de separación.
    quitar_filas(t_motiv, range(4, 20))
    # La fila de la motivación viene marcada para no partirse entre páginas: con un
    # texto largo, Word la pasaba entera a la hoja siguiente y dejaba la primera en blanco.
    trpr = t_motiv.rows[2]._tr.find(qn('w:trPr'))
    if trpr is not None:
        for cs in trpr.findall(qn('w:cantSplit')):
            trpr.remove(cs)

    # La resolución (título y recuadro, las dos últimas filas) solo si es insatisfactoria.
    # Las marcas quedan en filas distintas, así que docxtemplater pone o quita las filas
    # completas: sin resolución no queda ni el título ni el recuadro de alto fijo.
    titulo = celda(t_motiv, len(t_motiv.rows) - 2, 0).paragraphs[0]._p
    marca = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = '{#insatisfactoria}'
    marca.append(t)
    ppr = titulo.find(qn('w:pPr'))
    (ppr.addnext if ppr is not None else lambda e: titulo.insert(0, e))(marca)
    # La tabla anidada es el último contenido de la celda: el cierre va en un párrafo después.
    res = celda(t_motiv, len(t_motiv.rows) - 1, 0)
    hijos = [h for h in res._tc if h.tag in (qn('w:p'), qn('w:tbl'))]
    parrafo_tras(hijos[-1], '{/insatisfactoria}')

    # 5. Calificador.
    escribir(celda(t_firma, 2, 2).paragraphs[0], 'CONSEJO SECCIONAL DE LA JUDICATURA BOYACÁ – CASANARE')
    escribir(celda(t_firma, 2, 2).paragraphs[1], '{ponente}')
    escribir(celda(t_firma, 3, 2).paragraphs[0], '{firmaPresidente}')

    # 6. Notificación: nombre, cédula, consejo, mes de la sesión y fecha en que se profirió
    # el acto, que es la de la sala (la misma "fecha de la calificación" del recuadro de arriba).
    n = celda(t_notif, 1, 0)
    escribir(
        n.paragraphs[1],
        'En ___________________________ a los  _______________  (____)  días del mes de {notifMes} de dos mil '
        '{notifAnioLetras} ({notifAnio}), se notifica personalmente {alDoctor} {nombreCompleto}, {identificado} con la '
        'cédula de ciudadanía No. {cedula} de ______________________, el presente acto administrativo proferido por el '
        'Consejo Seccional de la Judicatura de Boyacá y Casanare, el día {proferidoDia} ({proferidoDiaNum}) del mes de '
        '{proferidoMes} ({proferidoMesNum}) de dos mil {proferidoAnio} ({proferidoAnioNum}).',
    )
    texto = n.paragraphs[3].text.replace('al interesado (a)', '{alInteresado}').replace('al notificado (a)', '{alNotificado}')
    escribir(n.paragraphs[3], texto)
    # La línea de firma de quien se notifica, con el género del funcionario.
    for fila in t_notif.rows:
        for c in fila.cells:
            for par in c.paragraphs:
                if par.text.strip() == 'El notificado (a),':
                    escribir(par, '{firmaNotificado},')

    # 7. Fuera de las tablas: sin la nota ni el instructivo; al final, iniciales y sesión.
    cuerpo = d.element.body
    elementos = list(cuerpo.iterchildren())
    i_firma = elementos.index(t_firma._tbl)
    i_notif = elementos.index(t_notif._tbl)
    for el in elementos[i_firma + 2 : i_notif - 1]:  # la nota y los párrafos vacíos que la siguen
        cuerpo.remove(el)
    elementos = list(cuerpo.iterchildren())
    i_notif = elementos.index(t_notif._tbl)
    sect = cuerpo.find(qn('w:sectPr'))
    for el in elementos[i_notif + 1 :]:
        if el is not sect:
            cuerpo.remove(el)
    ancla = parrafo_tras(t_notif._tbl, '')
    ancla = parrafo_tras(ancla, '')
    parrafo_tras(ancla, '{iniciales} Aprobada en Sesión del {salaLarga}.', formato_de(celda(t_notif, 1, 0).paragraphs[1]))

    d.save(SALIDA)
    # El servidor la lee como texto dentro del código: en Vercel no hay archivos sueltos que leer.
    import base64

    with open(SALIDA, 'rb') as f:
        contenido = base64.b64encode(f.read()).decode('ascii')
    with open(SALIDA_TS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generado por scripts/plantilla-formato-integral.py a partir de plantilla.docx. No editar a mano.\n')
        f.write(f"export const PLANTILLA_BASE64 =\n\t'{contenido}';\n")
    print('plantilla escrita en', SALIDA, 'y', SALIDA_TS)


if __name__ == '__main__':
    main(sys.argv[1])
