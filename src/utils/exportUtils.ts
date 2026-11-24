import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export JSON array to CSV
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export JSON array to Excel (.xlsx)
export function exportToExcel(filename: string, sheetName: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export formatted table to PDF
export function exportToPDF(
  title: string,
  filename: string,
  headers: string[],
  dataRows: (string | number)[][]
) {
  const doc = new jsPDF();

  // Document Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Navy
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 28);

  autoTable(doc, {
    head: [headers],
    body: dataRows,
    startY: 34,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Primary Blue #2563EB
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Surface subtle #F8FAFC
    },
  });

  doc.save(`${filename}.pdf`);
}
