'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { xdbClient, QueryResult } from '@/lib/xdbClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { Play, Database } from 'lucide-react';

export default function QueryPage() {
  const { token } = useAuth();
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  useEffect(() => {
    loadDatabases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadDatabases = async () => {
    if (!token) return;
    
    try {
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
      if (dbNames.length > 0 && !selectedDb) {
        setSelectedDb(dbNames[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    }
  };

  const handleExecute = async () => {
    if (!token || !selectedDb || !query.trim()) return;

    try {
      setExecuting(true);
      setError('');
      setResult(null);
      
      const startTime = Date.now();
      const queryResult = await xdbClient.executeQuery(token, selectedDb, query.trim());
      const endTime = Date.now();
      
      setResult(queryResult);
      setExecutionTime(endTime - startTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
      setResult(null);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleExecute();
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout currentView="query">
        <div className="max-w-7xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">SQL Query Editor</h2>
            
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Database:</label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleExecute}
                disabled={!selectedDb || !query.trim() || executing}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition"
              >
                <Play className="w-4 h-4" />
                <span>{executing ? 'Executing...' : 'Execute (Ctrl+Enter)'}</span>
              </button>
            </div>
          </div>

          {/* Query Editor */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Query</h3>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your SQL query here...&#10;&#10;Examples:&#10;SELECT * FROM users;&#10;INSERT INTO users (name, email) VALUES ('John', 'john@example.com');&#10;UPDATE users SET name = 'Jane' WHERE id = 1;&#10;DELETE FROM users WHERE id = 1;"
              className="w-full h-64 px-4 py-3 font-mono text-sm focus:outline-none resize-none"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            />
          </div>

          {/* Results Panel */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Results</h3>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  {executionTime !== null && (
                    <span>Execution time: {executionTime}ms</span>
                  )}
                  {result.rows && (
                    <span>{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</span>
                  )}
                  {result.rowsAffected !== undefined && (
                    <span>{result.rowsAffected} row{result.rowsAffected !== 1 ? 's' : ''} affected</span>
                  )}
                  {result.insertId !== undefined && (
                    <span>Insert ID: {result.insertId}</span>
                  )}
                </div>
              </div>
              
              {result.rows && result.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        {Object.keys(result.rows[0]).map((col) => (
                          <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {result.rows.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="px-4 py-2 text-sm text-gray-800">
                              {value === null ? (
                                <span className="text-gray-400 italic">NULL</span>
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : result.rows && result.rows.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No rows returned
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-green-700">
                  Query executed successfully
                </div>
              )}
            </div>
          )}

          {/* Query Examples */}
          {!result && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Quick Reference</h3>
              <div className="text-sm text-blue-700 space-y-1 font-mono">
                <p>• SELECT * FROM table_name;</p>
                <p>• SELECT * FROM table_name WHERE column = &apos;value&apos;;</p>
                <p>• INSERT INTO table_name (col1, col2) VALUES (&apos;val1&apos;, &apos;val2&apos;);</p>
                <p>• UPDATE table_name SET column = &apos;value&apos; WHERE id = 1;</p>
                <p>• DELETE FROM table_name WHERE id = 1;</p>
                <p>• CREATE TABLE table_name (id INTEGER PRIMARY KEY, name TEXT);</p>
                <p>• DROP TABLE table_name;</p>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
