'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { xdbClient } from '@/lib/xdbClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { Plus, Trash2, ChevronRight, Database, AlertCircle, Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadDatabases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadDatabases = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError('');
      const result = await xdbClient.listDatabases(token);
      
      // Extract database names - handle both array of strings and array of objects
      let dbNames: string[] = [];
      if (Array.isArray(result.databases)) {
        dbNames = result.databases.map(db => {
          if (typeof db === 'string') return db;
          if (typeof db === 'object' && db !== null) {
            return (db as unknown as Record<string, unknown>).name as string;
          }
          return String(db);
        });
      }
      setDatabases(dbNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDatabase = async () => {
    if (!token || !newDbName.trim()) return;

    try {
      setCreating(true);
      setError('');
      await xdbClient.createDatabase(token, newDbName.trim());
      setNewDbName('');
      setShowCreateModal(false);
      await loadDatabases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create database');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDatabase = async (dbName: string) => {
    if (!token) return;

    try {
      setError('');
      await xdbClient.deleteDatabase(token, dbName);
      setDeleteConfirm(null);
      await loadDatabases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete database');
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-gray-900">Databases</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:-translate-y-0.5 text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>New Database</span>
              </button>
            </div>
            <p className="text-gray-600">Manage and organize your databases</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in">
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
              <p className="text-gray-600 font-medium">Loading databases...</p>
            </div>
          ) : databases.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No databases yet</p>
              <p className="text-gray-500 text-sm mb-6">Create your first database to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-200 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Create Database</span>
              </button>
            </div>
          ) : (
            /* Database Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {databases.map((db) => (
                <div
                  key={db}
                  className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition duration-200 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg group-hover:from-blue-200 transition">
                        <Database className="w-6 h-6 text-blue-600" />
                      </div>
                      {deleteConfirm === db ? (
                        <div className="flex items-center space-x-1 text-xs">
                          <button
                            onClick={() => handleDeleteDatabase(db)}
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
                          onClick={() => setDeleteConfirm(db)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{db}</h3>
                    <p className="text-sm text-gray-500 mb-4">Click to manage tables and data</p>
                    <button
                      onClick={() => router.push(`/database/${db}`)}
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

        {/* Create Database Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Database</h3>
              <input
                type="text"
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                placeholder="Database name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-6 transition"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateDatabase();
                }}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateDatabase}
                  disabled={!newDbName.trim() || creating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg disabled:opacity-50 text-white py-3 rounded-lg transition font-medium"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewDbName('');
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
