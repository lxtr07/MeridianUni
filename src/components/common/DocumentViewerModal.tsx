import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  Printer,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  Calendar,
  HardDrive,
  Eye,
  FileCheck2,
  ExternalLink,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { ApplicationDocument } from '../../types';
import {
  generateSampleDocumentPdfBlob,
  generateSampleStudentIdImageDataUrl,
} from '../../lib/sampleDocumentGenerator';

interface DocumentViewerModalProps {
  document: ApplicationDocument | null;
  studentName?: string;
  studentNumber?: string;
  onClose: () => void;
}

/**
 * Converts a Base64 data: URL to a binary Blob object URL.
 * Microsoft Edge and Chromium-based browsers strictly block `data:` URLs inside `<iframe>` tags
 * (resulting in "This page has been blocked by Microsoft Edge").
 * Creating a same-origin Blob URL avoids this browser security block.
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch (err) {
    console.error('Error converting data URL to Blob:', err);
    return null;
  }
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  studentName,
  studentNumber,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [activePdfView, setActivePdfView] = useState<'embed' | 'info'>('embed');

  const isImage =
    Boolean(document?.file_type?.startsWith('image/')) ||
    Boolean(document?.name && /\.(png|jpe?g|webp|gif|svg)$/i.test(document.name)) ||
    Boolean(document?.data_url?.startsWith('data:image/'));

  const isPdf =
    document?.file_type === 'application/pdf' ||
    Boolean(document?.name && /\.pdf$/i.test(document.name)) ||
    Boolean(document?.data_url?.startsWith('data:application/pdf'));

  useEffect(() => {
    if (!document) {
      setBlobUrl(null);
      setGeneratedImageUrl(null);
      return;
    }

    if (document.data_url) {
      if (document.data_url.startsWith('data:')) {
        const blob = dataUrlToBlob(document.data_url);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          return () => {
            URL.revokeObjectURL(url);
          };
        }
      } else if (document.data_url.startsWith('blob:') || document.data_url.startsWith('http')) {
        setBlobUrl(document.data_url);
      }
    } else {
      // Document has no data_url (pre-seeded initial sample records)
      if (isPdf) {
        try {
          const pdfBlob = generateSampleDocumentPdfBlob(document, studentName, studentNumber);
          const url = URL.createObjectURL(pdfBlob);
          setBlobUrl(url);
          return () => {
            URL.revokeObjectURL(url);
          };
        } catch (err) {
          console.error('Failed to generate sample PDF:', err);
        }
      } else if (isImage) {
        try {
          const sampleImg = generateSampleStudentIdImageDataUrl(studentName, studentNumber);
          setGeneratedImageUrl(sampleImg);
        } catch (err) {
          console.error('Failed to generate sample image:', err);
        }
      }
    }
  }, [document, studentName, studentNumber, isPdf, isImage]);

  // Keyboard accessibility: Escape key closes viewer modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!document) return null;

  const handleDownload = () => {
    if (blobUrl) {
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = document.name || 'document.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } else if (document.data_url && document.data_url.startsWith('data:')) {
      const link = window.document.createElement('a');
      link.href = document.data_url;
      link.download = document.name || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } else {
      const content = `MERIDIAN UNIVERSITY DOCUMENT ARCHIVE\nDocument: ${document.name}\nType: ${document.type.toUpperCase()}\nSize: ${document.size}\nUploaded: ${document.uploaded_at}\nApplicant: ${studentName || 'Applicant'} (${studentNumber || 'N/A'})\nStatus: Uploaded File`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name.endsWith('.txt') ? document.name : `${document.name}.txt`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'com':
        return { label: 'Certificate of Matriculation', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' };
      case 'itr':
        return { label: 'Income Tax Return / Indigency', color: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' };
      case 'id':
        return { label: 'Official Student ID', color: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' };
      default:
        return { label: 'Supporting Document', color: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' };
    }
  };

  const badge = getDocTypeBadge(document.type);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{document.size}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                  {document.name}
                </h3>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              {blobUrl && (
                <a
                  href={blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-white/20"
                  title="Open in new tab / window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Viewer Toolbar */}
          {isImage && (
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Image Controls:</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 hover:bg-white rounded border border-slate-300 text-slate-700 transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 hover:bg-white rounded border border-slate-300 text-slate-700 transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-white rounded border border-slate-300 text-slate-700 transition cursor-pointer"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="px-2 py-1 text-[11px] font-bold hover:bg-white rounded border border-slate-300 text-slate-600 transition cursor-pointer"
                >
                  Reset ({Math.round(zoomLevel * 100)}%)
                </button>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Uploaded: {document.uploaded_at}</span>
              </div>
            </div>
          )}

          {isPdf && (
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700">View Mode:</span>
                <button
                  type="button"
                  onClick={() => setActivePdfView('embed')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    activePdfView === 'embed'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setActivePdfView('info')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    activePdfView === 'info'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Details & Authenticity
                </button>
              </div>

              <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                {blobUrl && (
                  <a
                    href={blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Browser Reader</span>
                  </a>
                )}
                <span>Uploaded: {document.uploaded_at}</span>
              </div>
            </div>
          )}

          {/* Main Viewer Body */}
          <div className="flex-1 overflow-auto bg-slate-900/90 p-3 sm:p-6 flex items-center justify-center min-h-[380px] max-h-[65vh]">
            {isImage && (document.data_url || blobUrl || generatedImageUrl) ? (
              <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
                <img
                  src={blobUrl || document.data_url || generatedImageUrl || ''}
                  alt={document.name}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : isPdf && activePdfView === 'embed' && (blobUrl || document.data_url) ? (
              /* Safe PDF Object embedding using Blob URL with instant fallback if browser/Edge restricts plugins */
              <div className="w-full h-[58vh] bg-slate-800 rounded-xl overflow-hidden shadow-xl relative flex flex-col">
                <object
                  data={blobUrl || document.data_url}
                  type="application/pdf"
                  className="w-full h-full rounded-xl bg-white"
                >
                  {/* Graceful Fallback if Microsoft Edge or the preview sandbox prevents inline PDF rendering */}
                  <div className="w-full h-full bg-white p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 rounded-xl">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{document.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md">
                        Microsoft Edge or your browser security policy restricts embedded PDF plugin rendering inside framed sandboxes.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center pt-2">
                      {blobUrl && (
                        <a
                          href={blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Open PDF in Full Tab</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF File</span>
                      </button>
                    </div>
                  </div>
                </object>
              </div>
            ) : (
              /* Verified Document File View / Metadata Audit */
              <div className="bg-white w-full max-w-xl p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 text-slate-800 space-y-5">
                {/* Header */}
                <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 font-bold text-sm">
                      SF
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 tracking-tight">
                        Meridian University Vault Archive
                      </h4>
                      <p className="text-[10px] text-slate-500 font-sans uppercase">
                        Application Attachment
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-bold">
                      ATTACHMENT FILE
                    </span>
                  </div>
                </div>

                {/* File Details */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">File Name</span>
                    <span className="font-bold text-slate-900 break-all">{document.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                    <span className="font-bold text-slate-900 uppercase">{document.type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">File Size</span>
                    <span className="font-medium text-slate-800">{document.size}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Submission Date</span>
                    <span className="font-medium text-slate-800">{document.uploaded_at}</span>
                  </div>
                  {studentName && (
                    <div className="col-span-2 pt-1 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Applicant</span>
                      <span className="font-bold text-slate-900">
                        {studentName} {studentNumber ? `(${studentNumber})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Document Information Notice */}
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">Attachment Information</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      This file is archived in the Meridian University Scholarship Management Database under application reference records for evaluator review.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  {blobUrl && (
                    <a
                      href={blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in Browser Reader</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original File</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Meridian University Secured Vault • Document Sandbox</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-bold text-slate-700 hover:text-black px-4 py-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
