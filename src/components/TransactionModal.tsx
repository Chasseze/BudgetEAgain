import React, { useState, useEffect } from 'react';
import { X, Camera, Upload, RefreshCw, Loader2 } from 'lucide-react';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  category: string;
  description: string;
  date: string;
  receipt: string | null;
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => void;
  initialData?: TransactionFormData;
  isEditing?: boolean;
  darkMode: boolean;
  userId?: string;
  expenseCategories?: string[];
  incomeCategories?: string[];
}

const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Other',
];

const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Other'];

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  darkMode,
  userId,
  expenseCategories = DEFAULT_EXPENSE_CATEGORIES,
  incomeCategories = DEFAULT_INCOME_CATEGORIES,
}) => {
  const defaultFormData: TransactionFormData = {
    type: 'expense',
    amount: '',
    category: 'Food & Dining',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt: null,
    isRecurring: false,
    recurringFrequency: 'monthly',
  };

  const [formData, setFormData] = useState<TransactionFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || defaultFormData);
      setErrors({});
      setReceiptPreview(initialData?.receipt || null);
    }
  }, [isOpen, initialData]);

  // Update category when type changes
  useEffect(() => {
    const categories = formData.type === 'expense' ? expenseCategories : incomeCategories;
    if (!categories.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [formData.type, expenseCategories, incomeCategories]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, receipt: 'File size must be less than 5MB' }));
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, receipt: 'Please upload an image file' }));
      return;
    }

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Firebase Storage if userId is available and storage is configured
    if (userId && storage) {
      setIsUploadingReceipt(true);
      try {
        const timestamp = Date.now();
        const fileName = `receipts/${userId}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        setFormData(prev => ({ ...prev, receipt: downloadURL }));
        setErrors(prev => ({ ...prev, receipt: '' }));
      } catch (error) {
        console.error('Error uploading receipt:', error);
        setErrors(prev => ({ ...prev, receipt: 'Failed to upload receipt. Please try again.' }));
        setReceiptPreview(null);
      } finally {
        setIsUploadingReceipt(false);
      }
    } else {
      // Fallback to base64 if no userId (shouldn't happen in production)
      setFormData(prev => ({ ...prev, receipt: reader.result as string }));
    }
  };

  const removeReceipt = () => {
    setFormData(prev => ({ ...prev, receipt: null }));
    setReceiptPreview(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  const categories = formData.type === 'expense' ? expenseCategories : incomeCategories;

  // Styling classes
  const bgCard = darkMode ? 'bg-gray-800' : 'bg-white';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-gray-600';
  const inputBg = darkMode
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500';
  const labelClass = `block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className={`${bgCard} rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl md:text-2xl font-bold ${textPrimary}`}>
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Transaction Type */}
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.type === 'expense'
                    ? 'bg-red-500 text-white shadow-lg'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.type === 'income'
                    ? 'bg-green-500 text-white shadow-lg'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className={labelClass}>
              Amount
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary}`}>
                $
              </span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg} ${
                  errors.amount ? 'border-red-500' : ''
                }`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg}`}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What was this for?"
              maxLength={100}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg} ${
                errors.description ? 'border-red-500' : ''
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg} ${
                errors.date ? 'border-red-500' : ''
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Recurring Transaction */}
          <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <RefreshCw className={`w-5 h-5 ${textSecondary}`} />
              <div>
                <p className={`font-medium ${textPrimary}`}>Recurring</p>
                <p className={`text-sm ${textSecondary}`}>Repeats automatically</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={handleInputChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Recurring Frequency */}
          {formData.isRecurring && (
            <div>
              <label htmlFor="recurringFrequency" className={labelClass}>
                Frequency
              </label>
              <select
                id="recurringFrequency"
                name="recurringFrequency"
                value={formData.recurringFrequency}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${inputBg}`}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          {/* Receipt Upload */}
          <div>
            <label className={labelClass}>Receipt (Optional)</label>
            {receiptPreview || formData.receipt ? (
              <div className="relative">
                {isUploadingReceipt && (
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  </div>
                )}
                <img
                  src={receiptPreview || formData.receipt || ''}
                  alt="Receipt preview"
                  className="w-full h-40 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removeReceipt}
                  disabled={isUploadingReceipt}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
                  aria-label="Remove receipt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <label
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                    darkMode
                      ? 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900/70'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span className="font-medium">Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <label
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                    darkMode
                      ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900/70'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            {errors.receipt && (
              <p className="mt-1 text-sm text-red-500">{errors.receipt}</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className={`p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              {isEditing ? 'Update' : 'Add Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
