import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { CreditCard, QrCode, CheckCircle2, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  reg_no: string;
  name: string;
  batch_name: string;
  payment_frequency: 'Monthly' | 'Quarterly';
}

interface FormData {
  batch_name: string;
  reg_no: string;
  period: string;
  txn_id: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function App() {
  const [batches, setBatches] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batchFees, setBatchFees] = useState<Record<string, number>>({});
  
  const [formData, setFormData] = useState<FormData>({
    batch_name: '',
    reg_no: '',
    period: '',
    txn_id: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1: Initial Load
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batchesSnapshot = await getDocs(collection(db, 'batches'));
        const fetchedBatches: string[] = [];
        const fetchedBatchFees: Record<string, number> = {};
        
        batchesSnapshot.forEach((doc) => {
          const data = doc.data();
          // Assuming the batch document has a 'name' and 'base_fee' field
          // If the document ID is the batch name, we can use doc.id
          const batchName = data.name || doc.id;
          const baseFee = data.base_fee || data.fee || 0;
          
          fetchedBatches.push(batchName);
          fetchedBatchFees[batchName] = Number(baseFee);
        });

        setBatches(fetchedBatches);
        setBatchFees(fetchedBatchFees);
        setError(null);
      } catch (err) {
        console.error("Error fetching batches:", err);
        setError("Failed to connect to the database. Please check your Firebase configuration.");
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // Step 2: Fetch Students when batch changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!formData.batch_name) {
        setStudents([]);
        return;
      }

      try {
        const q = query(collection(db, 'students'), where('batch_name', '==', formData.batch_name));
        const querySnapshot = await getDocs(q);
        const fetchedStudents: Student[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedStudents.push({
            id: doc.id,
            reg_no: data.reg_no,
            name: data.name,
            batch_name: data.batch_name,
            payment_frequency: data.payment_frequency || 'Monthly'
          });
        });

        setStudents(fetchedStudents);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to fetch students for the selected batch.");
      }
    };

    fetchStudents();
    
    // Reset student-dependent fields when batch changes
    setFormData(prev => ({ ...prev, reg_no: '', period: '' }));
  }, [formData.batch_name]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.reg_no === formData.reg_no);
  }, [students, formData.reg_no]);

  const calculatedAmount = useMemo(() => {
    if (!formData.batch_name || !selectedStudent) return 0;
    
    const baseFee = batchFees[formData.batch_name] || 0;
    const multiplier = selectedStudent.payment_frequency === 'Quarterly' ? 3 : 1;
    
    return baseFee * multiplier;
  }, [formData.batch_name, selectedStudent, batchFees]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.batch_name || !formData.reg_no || !formData.period || !formData.txn_id) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!selectedStudent) {
      setError("Invalid student selected.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'payments'), {
        reg_no: formData.reg_no,
        student_name: selectedStudent.name,
        batch_name: formData.batch_name,
        payment_frequency: selectedStudent.payment_frequency,
        period_paid: formData.period,
        amount_paid: calculatedAmount,
        transaction_id: formData.txn_id,
        payment_date: new Date().toISOString()
      });

      setSuccess(true);
      setFormData({
        batch_name: '',
        reg_no: '',
        period: '',
        txn_id: ''
      });
      alert("Payment Submitted Successfully!");
    } catch (err) {
      console.error("Error submitting payment:", err);
      setError("Failed to submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Loading ADC Fees Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-8 text-center">
          <div className="mx-auto bg-white/20 h-16 w-16 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ADC Fees Portal</h1>
          <p className="text-blue-100 mt-2 text-sm">Secure online fee payment</p>
        </div>

        <div className="px-6 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Payment submitted successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Batch Selection */}
            <div>
              <label htmlFor="batch_name" className="block text-sm font-medium text-gray-700 mb-1">
                Select Batch
              </label>
              <select
                id="batch_name"
                name="batch_name"
                value={formData.batch_name}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                required
              >
                <option value="">-- Select a Batch --</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Student Selection */}
            <div>
              <label htmlFor="reg_no" className="block text-sm font-medium text-gray-700 mb-1">
                Select Student
              </label>
              <select
                id="reg_no"
                name="reg_no"
                value={formData.reg_no}
                onChange={handleInputChange}
                disabled={!formData.batch_name || students.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                required
              >
                <option value="">-- Select your child --</option>
                {students.map(student => (
                  <option key={student.reg_no} value={student.reg_no}>
                    {student.name} ({student.reg_no})
                  </option>
                ))}
              </select>
              {formData.batch_name && students.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No students found in this batch.</p>
              )}
            </div>

            {/* Period Selection */}
            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Period
              </label>
              <select
                id="period"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                disabled={!selectedStudent}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                required
              >
                <option value="">-- Select Period --</option>
                {selectedStudent?.payment_frequency === 'Quarterly' 
                  ? QUARTERS.map(q => <option key={q} value={q}>{q}</option>)
                  : MONTHS.map(m => <option key={m} value={m}>{m}</option>)
                }
              </select>
            </div>

            {/* Amount Due Display */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center my-6">
              <p className="text-sm font-medium text-blue-800 mb-1 uppercase tracking-wider">Amount Due</p>
              <p className="text-4xl font-bold text-blue-900">
                ₹{calculatedAmount.toLocaleString('en-IN')}
              </p>
              {selectedStudent && (
                <p className="text-xs text-blue-600 mt-2">
                  Based on {selectedStudent.payment_frequency} frequency
                </p>
              )}
            </div>

            {/* QR Code Placeholder */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50">
              <QrCode className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-500 tracking-widest text-center">
                [ ADC BANK QR CODE WILL GO HERE ]
              </p>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Scan to pay via any UPI app
              </p>
            </div>

            {/* Transaction ID Input */}
            <div>
              <label htmlFor="txn_id" className="block text-sm font-medium text-gray-700 mb-1">
                UPI Transaction ID
              </label>
              <input
                type="text"
                id="txn_id"
                name="txn_id"
                value={formData.txn_id}
                onChange={handleInputChange}
                placeholder="e.g. 123456789012"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !calculatedAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex justify-center items-center"
            >
              {submitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                'Submit Payment Details'
              )}
            </button>
          </form>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-8 text-center max-w-xs">
        By submitting this form, you confirm that the payment has been successfully completed via UPI.
      </p>
    </div>
  );
}
