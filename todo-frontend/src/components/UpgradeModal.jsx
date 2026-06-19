import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiStar, FiCheck, FiX } from 'react-icons/fi';

const UpgradeModal = ({ isOpen, onClose }) => {
  const { user, updateToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setLoading(false);
        return;
      }

      const { data: order } = await api.post('/payment/create-order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_T3UU8ta8rN1aJ6', // Used the exact key they put in backend .env to avoid issues
        amount: order.amount,
        currency: order.currency,
        name: 'TaskFlow Premium',
        description: 'Upgrade to Premium Plan',
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payment/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            updateToken(verifyRes.data.token);
            toast.success('Successfully upgraded to Premium! 🎉');
            onClose();
          } catch (err) {
            toast.error('Payment verification failed.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#3B82F6',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error('Could not initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-slate-200 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <FiX className="h-6 w-6" />
        </button>

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
            <FiStar className="h-8 w-8 text-white fill-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Upgrade to Premium ✨</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Unlock unlimited productivity for just ₹99</p>
        </div>

        <ul className="space-y-4 mb-8">
          <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <FiCheck className="h-4 w-4" />
            </div>
            Unlimited Tasks
          </li>
          <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <FiCheck className="h-4 w-4" />
            </div>
            Priority Support
          </li>
          <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <FiCheck className="h-4 w-4" />
            </div>
            Future Premium Features
          </li>
        </ul>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-brand-500 hover:from-blue-700 hover:to-brand-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(59,130,246,0.5)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Upgrade Now for ₹99'}
        </button>
      </div>
    </div>
  );
};

export default UpgradeModal;
