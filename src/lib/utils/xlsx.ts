import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

type XlsxData = { name: string; data: string[][]; options: {} }[];

export const exportToSpreadsheet = (xlsxData: XlsxData, fileName: string) => {
	const FILE_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
	const FILE_EXTENSION = '.xlsx';

	const workSheets = xlsxData.reduce((ws, d) => ({ ...ws, [d.name]: XLSX.utils.aoa_to_sheet(d.data) }), {});
	const workBook = { Sheets: workSheets, SheetNames: xlsxData.map((d) => d.name) };
	const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'array' });
	const fileData = new Blob([excelBuffer], { type: FILE_TYPE });
	FileSaver.saveAs(fileData, `${fileName}${FILE_EXTENSION}`);
};
