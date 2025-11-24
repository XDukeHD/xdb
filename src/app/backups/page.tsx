'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { xdbClient } from '@/lib/xdbClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { ArrowLeft, Download, Plus, AlertCircle, Loader, Check, X, HardDrive } from 'lucide-react';

export default function BackupsPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorationReport, setRestorationReport] = useState<{
    status: 'success' | 'partial' | 'failed';
    message: string;
    restoredCount: number;
    failedCount: number;
    totalCount: number;
    failures: Array<{ filename: string; reason: string }>;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // In a real app, we'd load the list of backups
    // For now, this is a skeleton that will work once we add backup listing to the API
  }, [token]);

  const handleCreateBackup = async () => {
    if (!token) return;

    try {
      setCreating(true);
      setError('');
      setSuccess('');

      const result = await xdbClient.createBackup(token);

      setSuccess(`Backup created successfully! Backup ID: ${result.backupId}`);
      console.log('Backup details:', result);
      
      // Copy password to clipboard
      navigator.clipboard.writeText(result.password);
      setSuccess(`Backup created! Password copied to clipboard. ID: ${result.backupId}`);

      // In a real app, you might want to add this to the local backups list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!token || !restoreFile) {
      setError('Please select a backup file');
      return;
    }

    try {
      setRestoring(true);
      setError('');
      setSuccess('');

      const result = await xdbClient.restoreBackup(token, restoreFile);

      setRestorationReport(result);
      setSuccess(`Restoration ${result.status}! ${result.restoredCount}/${result.totalCount} databases restored.`);
      setShowRestoreModal(false);
      setRestoreFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const handleExportSystemCore = async () => {
    if (!token) return;

    try {
      const blob = await xdbClient.exportSystemCore(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system.xdbCore_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('System core exported successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export system core');
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
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Backup & Restore</h2>
                <p className="text-gray-600 mt-2">Manage database backups and restore points</p>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={creating}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg disabled:opacity-50 text-white px-6 py-3 rounded-lg transition duration-200 font-medium"
              >
                {creating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-900 font-medium">Success</p>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Main Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Restore Backup */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-blue-300 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Restore Backup</h3>
                  <p className="text-gray-600 text-sm mt-1">Restore databases from a backup ZIP file</p>
                </div>
                <Download className="w-8 h-8 text-blue-500" />
              </div>
              <button
                onClick={() => setShowRestoreModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                Select Backup File
              </button>
            </div>

            {/* Export System Core */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:border-purple-300 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Export System Core</h3>
                  <p className="text-gray-600 text-sm mt-1">Download encrypted system database for manual migration</p>
                </div>
                <HardDrive className="w-8 h-8 text-purple-500" />
              </div>
              <button
                onClick={handleExportSystemCore}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                Export Core
              </button>
            </div>
          </div>

          {/* Restoration Report */}
          {restorationReport && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restoration Report</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-gray-600">Status</span>
                  <div className="flex items-center space-x-2">
                    {restorationReport.status === 'success' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                    <span className="font-medium text-gray-900 capitalize">{restorationReport.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pb-4 border-b">
                  <span className="text-gray-600">Restored Databases</span>
                  <span className="font-medium text-gray-900">
                    {restorationReport.restoredCount} / {restorationReport.totalCount}
                  </span>
                </div>
                {restorationReport.failures.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Failed Items</h4>
                    <div className="space-y-2">
                      {restorationReport.failures.map((failure, idx) => (
                        <div key={idx} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          <strong>{failure.filename}:</strong> {failure.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Restore Modal */}
          {showRestoreModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Restore Backup</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup File</label>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowRestoreModal(false);
                        setRestoreFile(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRestoreBackup}
                      disabled={restoring || !restoreFile}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                    >
                      {restoring ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">💡 About Backups</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Backups include all databases and are stored as ZIP files</li>
              <li>• Passwords are 32 characters long and copied to clipboard after creation</li>
              <li>• Checksums are automatically verified during restoration</li>
              <li>• Encryption keys are embedded in each backup for recovery</li>
              <li>• Restoration supports partial recovery (corrupted files are skipped)</li>
            </ul>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
