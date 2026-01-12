
import React, { useRef, useState, useEffect } from 'react';

interface Column {
  header: string;
  accessor: (row: any, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface VirtualTableProps {
  data: any[];
  columns: Column[];
  rowHeight: number;
  height: number;
}

export const VirtualTable: React.FC<VirtualTableProps> = ({ data, columns, rowHeight, height }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = data.length * rowHeight;
  const startIndex = Math.floor(scrollTop / rowHeight);
  const visibleCount = Math.ceil(height / rowHeight);
  const endIndex = Math.min(data.length, startIndex + visibleCount + 2); // Buffer +2

  const visibleData = data.slice(startIndex, endIndex);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div 
      ref={scrollRef} 
      onScroll={onScroll} 
      style={{ height, overflowY: 'auto', position: 'relative' }} 
      className="border border-slate-200 rounded-lg custom-scrollbar"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        
        {/* Sticky Header inside absolute works poorly, so we render header outside or fixed. 
            For simplicity, we render header above rows but absolute positioned for 'virtual' effect */}
        
        <div 
          style={{ 
            position: 'absolute', 
            top: startIndex * rowHeight, 
            left: 0, 
            right: 0 
          }}
        >
          <table className="w-full text-left text-sm table-fixed">
            {startIndex === 0 && (
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className={`px-6 py-3 ${col.width || 'w-auto'} text-${col.align || 'left'}`}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleData.map((row, idx) => {
                 const actualIndex = startIndex + idx;
                 return (
                    <tr key={actualIndex} style={{ height: rowHeight }} className="hover:bg-slate-50">
                        {columns.map((col, cIdx) => (
                            <td key={cIdx} className={`px-6 py-2 truncate text-${col.align || 'left'}`}>
                                {col.accessor(row, actualIndex)}
                            </td>
                        ))}
                    </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
