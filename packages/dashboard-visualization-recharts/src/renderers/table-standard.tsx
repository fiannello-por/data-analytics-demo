import React from 'react';

import type { TableStandardRendererComponent } from '../types';

export const TableStandardRenderer: TableStandardRendererComponent = ({
  spec,
  rows,
}) => (
  <table
    data-table-standard-root="true"
    style={{
      borderCollapse: 'collapse',
      width: '100%',
    }}
  >
    <thead>
      <tr>
        {spec.visualization.columns.map((column) => (
          <th
            key={column.field}
            scope="col"
            style={{
              borderBottom: '1px solid #d1d5db',
              padding: '0.5rem',
              textAlign: 'left',
            }}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={`${spec.id}-${rowIndex}`}>
          {spec.visualization.columns.map((column) => (
            <td
              key={column.field}
              style={{
                borderBottom: '1px solid #e5e7eb',
                padding: '0.5rem',
              }}
            >
              {String(row[column.field] ?? '—')}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
