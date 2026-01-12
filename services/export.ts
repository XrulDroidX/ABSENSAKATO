
// ⚠️ LEGACY FILE - DO NOT USE
// File ini TIDAK LAGI dipakai
// Semua logic aktif ada di /src/services/export.ts
// Dibiarkan hanya untuk backward reference
// Tanggal: 2024-05-21

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { StorageService } from './storage';

export const ExportService = {
    
    getHeader: (config: any) => {
        return [config.appName, `Generated: ${new Date().toLocaleString()}`];
    },

    toCSV: (data: any[], filename: string) => {
        if (!data.length) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        XLSX.writeFile(workbook, `${filename}.csv`);
    },

    toExcel: (data: any[], filename: string) => {
        if (!data.length) return;
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    },

    toPDF: (headers: string[], data: any[][], title: string) => {
        const doc = new jsPDF();
        const branding = StorageService.getBranding();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(branding.primaryColor);
        doc.text(branding.appName, 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(title, 14, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

        // Table
        (doc as any).autoTable({
            head: [headers],
            body: data,
            startY: 44,
            theme: 'grid',
            headStyles: { fillColor: branding.primaryColor }
        });

        // Footer / Signature
        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.text("Authorized Signature:", 140, finalY + 30);
        doc.line(140, finalY + 45, 190, finalY + 45); // Line

        doc.save(`${title.replace(/\s/g, '_')}.pdf`);
    }
};
