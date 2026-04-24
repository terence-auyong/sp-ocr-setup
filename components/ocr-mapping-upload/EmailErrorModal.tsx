'use client';

import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { LuCircleCheckBig } from "react-icons/lu";

interface EmailErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (email: string) => Promise<void>;
}

const EmailErrorModal = ({ isOpen, onClose, onSend }: EmailErrorModalProps) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    if (!isOpen) return null;

    const validateEmail = (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handleSubmit = async () => {
        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setError(null);
        setSending(true);

        try {
            await onSend(email);
            setSent(true);
        } catch (err) {
            setError((err as Error).message ?? 'Failed to send. Please try again.');
            setSending(false); 
        }
    };

    const handleClose = () => {
        setEmail('');
        setError(null);
        setSent(false);
        setSending(false);
        onClose();
    };

    return (
        <>
            {/* ─── FULL SCREEN LOADING OVERLAY ─── */}
            {sending && !sent && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white font-bold text-lg tracking-wide">Sending Report...</span>
                    </div>
                </div>
            )}

            {/* ─── FULL SCREEN SUCCESS OVERLAY ─── */}
            {sent && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] animate-in fade-in duration-300">
                    <div className="bg-white rounded-sm p-4 shadow-2xl flex flex-col items-center gap-4 w-80 mx-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <LuCircleCheckBig size={40} className="text-green-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-900">Executed Successfully!</h3>
                            <p className="text-sm text-gray-500 mt-2">
                                The report has been sent to <br/>
                                <span className="font-semibold text-gray-800">{email}</span>
                            </p>
                        </div>
                        <button 
                            className="mt-2 w-full py-2 bg-blue-300 hover:bg-blue-400 text-white rounded-sm font-bold transition-colors shadow-md"
                            onClick={handleClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MAIN MODAL ─── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <div className="relative w-full max-w-sm mx-4 bg-white rounded-sm shadow-xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <h2 className="font-bold text-sm text-gray-800">Send Error Report</h2>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-6 space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="error-email" className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Recipient Email
                            </label>
                            <input
                                id="error-email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="name@company.com"
                                className={`w-full text-sm px-4 py-3 rounded-lg border outline-none transition-all
                                    ${error 
                                        ? 'border-red-300 bg-red-50 focus:border-red-400' 
                                        : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'
                                    }`}
                            />
                            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={handleClose}
                                className="text-sm px-4 py-2 text-gray-500 font-semibold hover:text-gray-700 transition-colors bg-gray-200 rounded-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!email}
                                className="flex items-center gap-2 text-sm px-4 py-2 rounded-sm font-bold text-white bg-blue-300 hover:bg-blue-400 transition-all shadow-sm"
                            >
                                <Send size={14} />
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EmailErrorModal;