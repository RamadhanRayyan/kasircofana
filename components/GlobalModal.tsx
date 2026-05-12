
import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface GlobalModalProps {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const GlobalModal: React.FC<GlobalModalProps> = ({ 
  isOpen, 
  type, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Batal'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-amber-100">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ${
            type === 'alert' ? 'bg-amber-50 text-amber-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {type === 'alert' ? <AlertCircle size={32} /> : <AlertCircle size={32} />}
          </div>
          
          <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{title}</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{message}</p>
        </div>
        
        <div className="p-6 bg-amber-50 flex gap-3">
          {type === 'confirm' && (
            <button 
              onClick={onCancel}
              className="flex-1 py-4 bg-white text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-slate-200 hover:bg-stone-100 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`flex-1 py-4 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
              type === 'alert' ? 'bg-amber-600 shadow-amber-100 hover:bg-amber-700' : 'bg-amber-600 shadow-amber-100 hover:bg-amber-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalModal;
