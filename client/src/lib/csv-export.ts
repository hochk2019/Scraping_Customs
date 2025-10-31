export interface CSVExportOptions {
  filename?: string;
  headers: string[];
  rows: (string | number)[][];
}

export function exportToCSV(options: CSVExportOptions) {
  const { filename = 'export.csv', headers, rows } = options;

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          return str.includes(',') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
