import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { DataIntakeRequest } from '../../lib/data-intake';
import { homeGuidance } from '../../content/home-guidance';
import { GoogleSheetsStep } from './GoogleSheetsStep';
import { DatabaseStep } from './DatabaseStep';
import { ApiStep } from './ApiStep';
import { WarehouseStep } from './WarehouseStep';
import type { SourceInspectionResult } from '../../lib/source-preflight';
interface DataIntakeDrawerProps {
  request: DataIntakeRequest | null;
  onClose: () => void;
  onSourceInspected?: (result: SourceInspectionResult) => void;
}

export function DataIntakeDrawer({ request, onClose, onSourceInspected }: DataIntakeDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && request) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [request, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (request) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [request]);

  if (!request) return null;

  const panelKey = request.sourceType as keyof typeof homeGuidance.connectionPanel;
  const config = homeGuidance.connectionPanel[panelKey] as any;

  if (request.sourceType !== 'local_file' && !config) return null;

  const renderStep = () => {
    switch (request.sourceType) {
      case 'local_file':
        // local_file is handled inline on Home.tsx, should not be routed here.
        return null;
      case 'google_sheets':
      case 'm365_excel':
      case 'csv_url':
      case 'excel_url':
        return (
          <GoogleSheetsStep
            config={config}
            onClose={onClose}
            initialUrl={request.initialUrl}
            onSourceInspected={onSourceInspected}
          />
        );
      case 'database':
      case 'postgresql':
      case 'mysql':
      case 'mariadb':
      case 'mongodb_atlas':
      case 'sqlite':
        return <DatabaseStep config={config} onClose={onClose} onSourceInspected={onSourceInspected} />;
      case 'api':
        return <ApiStep config={config} onClose={onClose} />;
      case 'data_warehouse':
        return <WarehouseStep config={config} onClose={onClose} />;
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            Intake step not configured for {request.sourceType}
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-start">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sliding Drawer */}
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full bg-white shadow-2xl rounded-b-3xl border-b border-gray-200"
          style={{ maxHeight: '70vh' }}
        >
          {/* Drawer Header */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="w-full max-w-[960px] mx-auto px-6 overflow-y-auto max-h-[70vh]">
            {renderStep()}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
