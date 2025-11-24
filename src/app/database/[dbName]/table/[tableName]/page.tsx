'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { xdbClient } from '@/lib/xdbClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { ArrowLeft, Plus, Trash2, Key, Edit2, Save, X } from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  defaultValue?: string | number | boolean | null;
}

export default function TablePage() {
  const { dbName, tableName } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertData, setInsertData] = useState<Record<string, unknown>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dbName, tableName]);

  const loadTableData = async () => {
    if (!token || !dbName || !tableName) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Execute SELECT to get data
      const result = await xdbClient.selectAll(token, dbName as string, tableName as string);
      const rowData = result.rows || [];
      setRows(rowData);

      // Infer column information from first row and metadata
      if (rowData.length > 0) {
        const cols: ColumnInfo[] = Object.keys(rowData[0]).map(key => ({
          name: key,
          type: inferType(rowData[0][key]),
          primaryKey: key.toLowerCase() === 'id' || key.toLowerCase().endsWith('_id'),
          notNull: false,
        }));
        setColumns(cols);
      } else {
        // Try to get structure info via PRAGMA or similar
        // For now, we'll just set empty
        setColumns([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  const inferType = (value: unknown): string => {
    if (value === null) return 'TEXT';
    if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'REAL';
    if (typeof value === 'boolean') return 'BOOLEAN';
    return 'TEXT';
  };

  const startEdit = (rowIndex: number, colName: string) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(String(rows[rowIndex][colName] ?? ''));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !token || !dbName || !tableName) return;

    const { rowIndex, colName } = editingCell;
    const row = rows[rowIndex];
    
    try {
      setError('');
      
      // Convert value to appropriate type
      let newValue: unknown = editValue;
      const col = columns.find(c => c.name === colName);
      if (col) {
        if (col.type === 'INTEGER') newValue = parseInt(editValue) || 0;
        else if (col.type === 'REAL') newValue = parseFloat(editValue) || 0.0;
        else if (col.type === 'BOOLEAN') newValue = editValue.toLowerCase() === 'true' || editValue === '1';
        else if (editValue === '') newValue = null;
      }

      // Build WHERE clause from primary key or all columns
      const pkCol = columns.find(c => c.primaryKey);
      const whereClause = pkCol
        ? `${pkCol.name} = ${typeof row[pkCol.name] === 'string' ? `'${row[pkCol.name]}'` : row[pkCol.name]}`
        : Object.entries(row)
            .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
            .join(' AND ');

      await xdbClient.updateRow(
        token,
        dbName as string,
        tableName as string,
        { [colName]: newValue },
        whereClause
      );

      // Update local state
      const newRows = [...rows];
      newRows[rowIndex] = { ...row, [colName]: newValue };
      setRows(newRows);
      
      setEditingCell(null);
      setEditValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cell');
    }
  };

  const handleInsert = async () => {
    if (!token || !dbName || !tableName) return;

    try {
      setError('');
      await xdbClient.insertRow(token, dbName as string, tableName as string, insertData);
      setShowInsertModal(false);
      setInsertData({});
      await loadTableData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert row');
    }
  };

  const handleDelete = async (rowIndex: number) => {
    if (!token || !dbName || !tableName) return;

    const row = rows[rowIndex];
    
    try {
      setError('');
      
      // Build WHERE clause
      const pkCol = columns.find(c => c.primaryKey);
      const whereClause = pkCol
        ? `${pkCol.name} = ${typeof row[pkCol.name] === 'string' ? `'${row[pkCol.name]}'` : row[pkCol.name]}`
        : Object.entries(row)
            .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
            .join(' AND ');

      await xdbClient.deleteRow(token, dbName as string, tableName as string, whereClause);
      setDeleteConfirm(null);
      await loadTableData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row');
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout currentView="databases">
        <div className="max-w-full">
          <div className="mb-6">
            <button
              onClick={() => router.push(`/database/${dbName}`)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tables</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Table: {tableName}</h2>
                <p className="text-gray-600 mt-1">Database: {dbName}</p>
              </div>
              <button
                onClick={() => {
                  const initial: Record<string, unknown> = {};
                  columns.forEach(col => {
                    initial[col.name] = col.defaultValue ?? '';
                  });
                  setInsertData(initial);
                  setShowInsertModal(true);
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Insert Row</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading data...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-600 mb-4">No data in this table</p>
              <button
                onClick={() => {
                  const initial: Record<string, unknown> = {};
                  columns.forEach(col => {
                    initial[col.name] = col.defaultValue ?? '';
                  });
                  setInsertData(initial);
                  setShowInsertModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Insert your first row
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.name} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          {col.primaryKey && <Key className="w-3 h-3 text-yellow-600" />}
                          <span>{col.name}</span>
                        </div>
                        <div className="text-xs text-gray-400 normal-case font-normal mt-1">
                          {col.type}
                          {col.notNull && ' • NOT NULL'}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 transition">
                      {columns.map((col) => (
                        <td key={col.name} className="px-4 py-3">
                          {editingCell?.rowIndex === rowIndex && editingCell?.colName === col.name ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <button
                                onClick={saveEdit}
                                className="text-green-600 hover:text-green-700 p-1"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(rowIndex, col.name)}
                              className="flex items-center space-x-2 text-left w-full group"
                            >
                              <span className="text-sm text-gray-800">
                                {row[col.name] === null ? (
                                  <span className="text-gray-400 italic">NULL</span>
                                ) : (
                                  String(row[col.name])
                                )}
                              </span>
                              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        {deleteConfirm === rowIndex ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleDelete(rowIndex)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(rowIndex)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Insert Row Modal */}
        {showInsertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Insert New Row</h3>
              
              <div className="space-y-3 mb-6">
                {columns.map((col) => (
                  <div key={col.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {col.name}
                      <span className="text-gray-400 ml-2 font-normal">
                        {col.type}
                        {col.primaryKey && ' • PRIMARY KEY'}
                        {col.notNull && ' • NOT NULL'}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={String(insertData[col.name] ?? '')}
                      onChange={(e) => setInsertData({ ...insertData, [col.name]: e.target.value })}
                      placeholder={col.defaultValue !== undefined ? `Default: ${col.defaultValue}` : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleInsert}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
                >
                  Insert
                </button>
                <button
                  onClick={() => {
                    setShowInsertModal(false);
                    setInsertData({});
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-md transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}
