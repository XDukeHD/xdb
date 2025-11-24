'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { xdbClient } from '@/lib/xdbClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { Plus, Trash2, ChevronRight, Table as TableIcon, ArrowLeft, AlertCircle, Loader } from 'lucide-react';

export default function DatabasePage() {
  const { dbName } = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Create table form state
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Array<{
    name: string;
    type: string;
    primaryKey: boolean;
    notNull: boolean;
    defaultValue: string;
  }>>([{ name: '', type: 'TEXT', primaryKey: false, notNull: false, defaultValue: '' }]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dbName]);

  const loadTables = async () => {
    if (!token || !dbName) return;
    
    try {
      setLoading(true);
      setError('');
      const result = await xdbClient.getDatabaseInfo(token, dbName as string);
      setTables(result.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'TEXT', primaryKey: false, notNull: false, defaultValue: '' }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: string, value: unknown) => {
    const newColumns = [...columns];
    (newColumns[index] as Record<string, unknown>)[field] = value;
    setColumns(newColumns);
  };

  const handleCreateTable = async () => {
    if (!token || !dbName || !tableName.trim() || columns.length === 0) return;

    try {
      setCreating(true);
      setError('');

      // Build CREATE TABLE SQL
      const columnDefs = columns
        .filter(col => col.name.trim())
        .map(col => {
          let def = `${col.name} ${col.type}`;
          if (col.primaryKey) def += ' PRIMARY KEY';
          if (col.notNull && !col.primaryKey) def += ' NOT NULL';
          if (col.defaultValue.trim()) {
            if (col.type === 'TEXT') {
              def += ` DEFAULT '${col.defaultValue.replace(/'/g, "''")}'`;
            } else {
              def += ` DEFAULT ${col.defaultValue}`;
            }
          }
          return def;
        })
        .join(', ');

      const sql = `CREATE TABLE ${tableName} (${columnDefs})`;
      await xdbClient.createTable(token, dbName as string, tableName, sql);
      
      setShowCreateModal(false);
      setTableName('');
      setColumns([{ name: '', type: 'TEXT', primaryKey: false, notNull: false, defaultValue: '' }]);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTable = async (tableName: string) => {
    if (!token || !dbName) return;

    try {
      setError('');
      await xdbClient.dropTable(token, dbName as string, tableName);
      setDeleteConfirm(null);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete table');
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div>
          {/* Breadcrumb and Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Databases</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Database: <span className="text-blue-600">{dbName}</span></h2>
                <p className="text-gray-600 mt-2">Manage tables and schema</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>New Table</span>
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
              <Loader className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Loading tables...</p>
            </div>
          ) : tables.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <TableIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No tables yet</p>
              <p className="text-gray-500 text-sm mb-6">Create your first table to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Create Table</span>
              </button>
            </div>
          ) : (
            /* Tables Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => (
                <div
                  key={table}
                  className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition duration-200 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg group-hover:from-purple-200 transition">
                        <TableIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      {deleteConfirm === table ? (
                        <div className="flex items-center space-x-1 text-xs">
                          <button
                            onClick={() => handleDeleteTable(table)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(table)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{table}</h3>
                    <p className="text-sm text-gray-500 mb-4">Click to view and edit data</p>
                    <button
                      onClick={() => router.push(`/database/${dbName}/table/${table}`)}
                      className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg transition duration-200 font-medium"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Table Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full m-auto p-8 animate-in fade-in zoom-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Table</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Table Name</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="users"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Columns</label>
                  <button
                    onClick={addColumn}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Column
                  </button>
                </div>
                
                <div className="space-y-3">
                  {columns.map((col, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        placeholder="column_name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(index, 'type', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="TEXT">TEXT</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="REAL">REAL</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                        <option value="BLOB">BLOB</option>
                      </select>
                      <label className="flex items-center space-x-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={col.primaryKey}
                          onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                          className="rounded"
                        />
                        <span>PK</span>
                      </label>
                      <label className="flex items-center space-x-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={col.notNull}
                          onChange={(e) => updateColumn(index, 'notNull', e.target.checked)}
                          className="rounded"
                        />
                        <span>NN</span>
                      </label>
                      {columns.length > 1 && (
                        <button
                          onClick={() => removeColumn(index)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateTable}
                  disabled={!tableName.trim() || creating || columns.every(c => !c.name.trim())}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg disabled:opacity-50 text-white py-3 rounded-lg transition font-medium"
                >
                  {creating ? 'Creating...' : 'Create Table'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setTableName('');
                    setColumns([{ name: '', type: 'TEXT', primaryKey: false, notNull: false, defaultValue: '' }]);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg transition font-medium"
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
