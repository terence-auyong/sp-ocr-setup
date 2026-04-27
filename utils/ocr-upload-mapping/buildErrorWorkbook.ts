import ExcelJS from 'exceljs';
import { RowError } from '@/types/ocrMappingUpload';
/**
 * Builds an ExcelJS workbook buffer with error highlights applied.
 * Extracted so both "download" and "send via email" flows share the same logic.
 */
export async function buildErrorWorkbook(
    originalFile: File,
    rowErrorMap: Record<number, RowError[]>,
): Promise<ArrayBuffer> {
    const arrayBuffer = await originalFile.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const ws = workbook.getWorksheet('OCR Mapping');
    if (!ws) throw new Error('Sheet "OCR Mapping" not found in file.');

    // --- 1. BUILD COLUMN MAP ---
    const columnMapping: Record<string, number> = {};
    const totalCols = ws.actualColumnCount;
    for (let col = 1; col <= totalCols; col++) {
        const r1val = ws.getRow(1).getCell(col).value?.toString().trim().toLowerCase();
        if (r1val) columnMapping[r1val] = col;

        const r4val = ws.getRow(4).getCell(col).value?.toString().trim().toLowerCase();
        if (r4val) columnMapping[r4val] = col;
    }

    const moduleSubHeaders = ['inventory', 'near expiry', 'osa', 'share of shelf'];
    const moduleColStart = columnMapping['module code'];
    if (moduleColStart) {
        moduleSubHeaders.forEach((name, i) => {
            if (!columnMapping[name]) columnMapping[name] = moduleColStart + i;
        });
    }

    // --- 2. RESET ALL DATA ROWS ---
    ws.eachRow((row, rowNum) => {
        if (rowNum < 5) return;
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: 'pattern', pattern: 'none' };
            cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
            cell.border = {};
        });
    });

    // --- 3. COLLECT CELLS NEEDING HIGHLIGHT ---
    const highlightCells = new Map<string, true>();
    const errorMessages = new Map<number, string>();

    Object.entries(rowErrorMap).forEach(([rowNumStr, errorList]) => {
        const rowIdx = parseInt(rowNumStr);
        errorMessages.set(rowIdx, errorList.map((e) => e.message).join('\n'));

        errorList.forEach(({ column }) => {
            const targetIdx = columnMapping[column.toLowerCase().trim()];
            if (targetIdx > 0) highlightCells.set(`${rowIdx}-${targetIdx}`, true);
        });
    });

    // --- 4. PREPARE ERROR COLUMN ---
    let lastColNumber = -1;

    ws.columns.forEach((_, colIdx) => {
        for (let i = 1; i <= 4; i++) {
            const cellValue = ws
                .getCell(i, colIdx + 1)
                .value?.toString()
                .trim()
                .toUpperCase();
            if (cellValue === 'ERROR MESSAGE') {
                lastColNumber = colIdx + 1;
                break;
            }
        }
    });

    if (lastColNumber === -1) lastColNumber = ws.actualColumnCount + 1;

    const errorColumn = ws.getColumn(lastColNumber);
    errorColumn.width = 60;
    errorColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber > 4) {
            cell.value = null;
            cell.fill = { type: 'pattern', pattern: 'none' };
            cell.border = {};
        }
    });

    const headerCell = ws.getCell(1, lastColNumber);
    try {
        if (!headerCell.isMerged) ws.mergeCells(1, lastColNumber, 4, lastColNumber);
    } catch (_) { /* already merged */ }

    headerCell.style = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
        font: { name: 'Calibri', size: 12, bold: true, italic: true, color: { argb: 'FFFFFFFF' } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
        },
    };
    headerCell.value = 'ERROR MESSAGE';

    // --- 5. APPLY ERROR HIGHLIGHTS ---
    errorMessages.forEach((message, rowIdx) => {
        const row = ws.getRow(rowIdx);
        row.height = 15;

        const summaryCell = row.getCell(lastColNumber);
        summaryCell.style = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
            font: { name: 'Calibri', color: { argb: '#000000' }, bold: false, size: 11 },
            alignment: { wrapText: true, vertical: 'top', horizontal: 'left' },
        };
        summaryCell.value = message;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (highlightCells.has(`${rowIdx}-${colNumber}`)) {
                cell.style = {
                    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } },
                    font: { color: { argb: '#000000' }, bold: false },
                    border: {
                        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    },
                };
            }
        });
    });

    return workbook.xlsx.writeBuffer();
}