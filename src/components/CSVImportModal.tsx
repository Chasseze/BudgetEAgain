import React, { useState, useCallback, useMemo } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { parseCSV, toDateInputValue } from '../utils/helpers';

interface ImportedRow {
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
}

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: ImportedRow[]) => Promise<{ imported: number; skipped: number }>;
  darkMode: boolean;
  expenseCategories: string[];
  incomeCategories: string[];
}

type ColumnKey = 'date' | 'type' | 'amount' | 'category' | 'description' | 'ignore';

const COLUMN_OPTIONS: { value: ColumnKey; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'type', label: 'Type (income/expense)' },
  { value: 'amount', label: 'Amount' },
  { value: 'category', label: 'Category' },
  { value: 'description', label: 'Description' },
  { value: 'ignore', label: '— Ignore —' },
];

const REQUIRED: ColumnKey[] = ['date', 'amount'];

const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  darkMode,
  expenseCategories,
  incomeCategories,
}) => {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const bgModal = darkMode ? 'bg-gray-800' : 'bg-white';
  const bgCard = darkMode ? 'bg-gray-700' : 'bg-gray-50';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-500';
  const borderColor = darkMode ? 'border-gray-600' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900';

  const allCategories = useMemo(
    () => [...expenseCategories, ...incomeCategories],
    [expenseCategories, incomeCategories],
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please upload a .csv file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''));
        if (rows.length < 2) {
          setError('CSV must have at least a header row and one data row.');
          return;
        }
        const [head, ...data] = rows;
        setHeaders(head);
        setRawRows(data);
        // Auto-detect mapping
        const autoMap: ColumnKey[] = head.map((h) => {
          const lower = h.toLowerCase().trim();
          if (lower.includes('date')) return 'date';
          if (lower.includes('amount') || lower.includes('value') || lower.includes('sum')) return 'amount';
          if (lower.includes('type') || lower.includes('kind')) return 'type';
          if (lower.includes('category') || lower.includes('cat')) return 'category';
          if (lower.includes('description') || lower.includes('desc') || lower.includes('note') || lower.includes('memo')) return 'description';
          return 'ignore';
        });
        setMapping(autoMap);
        setError(null);
        setStep('map');
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const parsedRows = useMemo((): ImportedRow[] => {
    const dateIdx = mapping.indexOf('date');
    const amountIdx = mapping.indexOf('amount');
    const typeIdx = mapping.indexOf('type');
    const catIdx = mapping.indexOf('category');
    const descIdx = mapping.indexOf('description');

    if (dateIdx === -1 || amountIdx === -1) return [];

    return rawRows
      .map((row) => {
        const rawDate = row[dateIdx]?.trim() || '';
        const rawAmount = row[amountIdx]?.trim() || '0';
        const rawType = (row[typeIdx]?.trim() || 'expense').toLowerCase();
        const rawCat = row[catIdx]?.trim() || 'Other';
        const rawDesc = row[descIdx]?.trim() || '';

        // Normalise date
        let date = rawDate;
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          date = toDateInputValue(d);
        }

        // Normalise amount
        const amount = parseFloat(rawAmount.replace(/[^0-9.-]/g, ''));

        // Normalise type
        const type: 'income' | 'expense' =
          rawType === 'income' || rawType === 'in' || rawType === 'credit' ? 'income' : 'expense';

        // Normalise category
        const matchedCat =
          allCategories.find((c) => c.toLowerCase() === rawCat.toLowerCase()) ||
          (type === 'income' ? incomeCategories[0] || 'Other' : expenseCategories[0] || 'Other');

        return { date, type, amount: isNaN(amount) ? 0 : Math.abs(amount), category: matchedCat, description: rawDesc };
      })
      .filter((r) => r.date && r.amount > 0);
  }, [rawRows, mapping, allCategories, expenseCategories, incomeCategories]);

  const mappingValid = REQUIRED.every((r) => mapping.includes(r));

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const result = await onImport(parsedRows);
      setImportedCount(result.imported);
      setSkippedCount(result.skipped);
      setStep('done');
    } catch (err) {
      setError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setRawRows([]);
    setHeaders([]);
    setMapping([]);
    setError(null);
    setImporting(false);
    setSkippedCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className={`${bgModal} rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-5 border-b ${borderColor} flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h2 className={`text-lg font-bold ${textPrimary}`}>Import CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className={`flex border-b ${borderColor} flex-shrink-0`}>
          {(['upload', 'map', 'preview'] as const).map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
                step === s || step === 'done'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : s === 'map' && step === 'preview'
                    ? `${textSecondary}`
                    : textSecondary
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {/* Error */}
          {error && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'} border ${darkMode ? 'border-red-700' : 'border-red-200'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/10'
                  : darkMode
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${textSecondary}`} />
              <p className={`font-medium mb-1 ${textPrimary}`}>Drag & drop your CSV file here</p>
              <p className={`text-sm mb-4 ${textSecondary}`}>or click below to browse</p>
              <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Browse file
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
              <p className={`text-xs mt-4 ${textSecondary}`}>
                Expected columns: Date, Amount, Type (income/expense), Category, Description
              </p>
            </div>
          )}

          {/* Step: Map */}
          {step === 'map' && (
            <div>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Map each column from your CSV to the correct field. Required: Date, Amount.
              </p>
              <div className="space-y-2">
                {headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`flex-1 text-sm font-medium truncate ${textPrimary}`}>
                      {header || `Column ${i + 1}`}
                    </span>
                    <div className="relative">
                      <select
                        value={mapping[i] || 'ignore'}
                        onChange={(e) => {
                          const m = [...mapping];
                          m[i] = e.target.value as ColumnKey;
                          setMapping(m);
                        }}
                        className={`pl-3 pr-8 py-2 rounded-lg border text-sm appearance-none ${inputBg}`}
                      >
                        {COLUMN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary} pointer-events-none`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview first row */}
              {rawRows[0] && (
                <div className={`mt-4 p-3 rounded-xl ${bgCard} text-xs`}>
                  <p className={`font-medium mb-1 ${textSecondary}`}>First row preview:</p>
                  <div className="flex flex-wrap gap-2">
                    {rawRows[0].map((cell, i) => (
                      <span key={i} className={`px-2 py-1 rounded-md ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} ${textPrimary}`}>
                        {cell || '—'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setStep('upload')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Back
                </button>
                <button
                  onClick={() => { if (mappingValid) setStep('preview'); else setError('Please map at least Date and Amount columns.'); }}
                  disabled={!mappingValid}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Preview ({rawRows.length} rows)
                </button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div>
              <p className={`text-sm ${textSecondary} mb-3`}>
                {parsedRows.length} of {rawRows.length} rows ready to import.
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      {['Date', 'Type', 'Amount', 'Category', 'Description'].map((h) => (
                        <th key={h} className={`px-3 py-2 text-left font-semibold ${textSecondary}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={`border-t ${borderColor} ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                        <td className={`px-3 py-2 ${textPrimary}`}>{row.date}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${row.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className={`px-3 py-2 ${textPrimary}`}>{row.amount.toFixed(2)}</td>
                        <td className={`px-3 py-2 ${textPrimary}`}>{row.category}</td>
                        <td className={`px-3 py-2 max-w-[120px] truncate ${textSecondary}`}>{row.description || '—'}</td>
                      </tr>
                    ))}
                    {parsedRows.length > 8 && (
                      <tr className={`border-t ${borderColor}`}>
                        <td colSpan={5} className={`px-3 py-2 text-center ${textSecondary}`}>
                          +{parsedRows.length - 8} more rows…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setStep('map')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || parsedRows.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing…
                    </>
                  ) : (
                    `Import ${parsedRows.length} transactions`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>Import complete!</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Successfully imported <strong>{importedCount}</strong> transaction{importedCount !== 1 ? 's' : ''}{skippedCount ? <> and skipped {skippedCount} duplicate{skippedCount !== 1 ? 's' : ''}</> : null}.
              </p>
              <button
                onClick={handleClose}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
