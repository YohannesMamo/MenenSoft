import React, { useEffect, useState } from 'react';
import { getStableDeviceCode } from './device';
import {
  isPremium,
  getLicenseInfo,
  activateWithCode,
  removeLicense,
  currentDeviceCode
} from './licensing';
import { LICENSE_PRODUCT_PLAN, premiumFeatures } from './licenseKeys';
import { BUILD_HAS_ESLCE } from './buildFlags';
import {
  ShieldCheck,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  RefreshCcw,
  Crown
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onLicenseChanged: () => void;
}

export const ActivationScreen: React.FC<Props> = ({ onClose, onLicenseChanged }) => {
  const [deviceCode, setDeviceCode] = useState<string | null>(currentDeviceCode());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const premium = isPremium();
  const license = getLicenseInfo();
  // Grade 9/10/11 APKs carry no ESLCE content, so the copy must not promise it.
  const hasEslce = BUILD_HAS_ESLCE;

  useEffect(() => {
    let cancelled = false;
    getStableDeviceCode().then(c => {
      if (!cancelled) setDeviceCode(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!deviceCode) return;
    try {
      await navigator.clipboard.writeText(deviceCode);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = deviceCode;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleActivate = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      await activateWithCode(code);
      setSuccess(true);
      setCode('');
      onLicenseChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed. Please check the code and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    await removeLicense();
    setConfirmRemove(false);
    onLicenseChanged();
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Activate</h2>
            <p className="text-xs text-slate-400">Offline license for {LICENSE_PRODUCT_PLAN.productLabel}</p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {premium ? (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl">
          <Crown className="w-8 h-8 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-emerald-300">Premium License Active</h3>
            <p className="text-xs text-slate-300">
              {license?.customer} • {LICENSE_PRODUCT_PLAN.productLabel}
            </p>
            <p className="text-[11px] text-slate-500">
              Issued {license?.issued_at ? new Date(license.issued_at * 1000).toLocaleDateString() : ''} for device{' '}
              <span className="font-mono text-emerald-400">{license?.device_code}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            {hasEslce ? (
              <>
                You are on the <span className="text-white font-semibold">free plan</span> — 5 ESLCE practice runs per day,
                past papers only. Activate to unlock the full national exam bank and the predicted 2026 papers.
              </>
            ) : (
              <>
                You are on the <span className="text-white font-semibold">free plan</span> — 5 timed exam runs per day,
                past papers only. Activate to unlock the full exam bank and unlimited practice.
              </>
            )}
          </div>
        </div>
      )}

      {/* Steps + Device Code */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" /> 1 · Your Device Code
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every device has a unique code. Send this code (with your deposit receipt) to the school administrator to
          receive your activation code.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 bg-slate-900 border border-slate-700 rounded-xl text-center">
            <span className="font-mono text-sm font-bold text-amber-300 tracking-wider break-all select-all">
              {deviceCode || '…'}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="Copy device code"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Payment info */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">2 · Payment</h3>
        <div className="text-xs text-slate-300 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Product</span>
            <span className="text-white font-semibold">{LICENSE_PRODUCT_PLAN.productLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Price</span>
            <span className="text-amber-300 font-bold">{LICENSE_PRODUCT_PLAN.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Bank</span>
            <span>{LICENSE_PRODUCT_PLAN.payment.bank}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Account name</span>
            <span>{LICENSE_PRODUCT_PLAN.payment.accountName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Account number</span>
            <span className="font-mono text-emerald-300">{LICENSE_PRODUCT_PLAN.payment.accountNumber}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">{LICENSE_PRODUCT_PLAN.contactNote}</p>
        </div>
      </div>

      {/* Enter code */}
      <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> 3 · Enter Activation Code
        </h3>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Paste the activation code you received here…"
          rows={4}
          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-none"
        />
        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>Unlocked! The full exam bank and predicted papers are now available.</span>
          </div>
        )}
        <button
          onClick={handleActivate}
          disabled={busy || !code.trim()}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>{busy ? 'Verifying offline…' : 'Activate'}</span>
        </button>
      </div>

      {/* Premium plan explainer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">What premium includes</p>
        <ul className="space-y-1.5">
          {premiumFeatures(hasEslce).map(f => (
            <li key={f} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Premium actions */}
      {premium && (
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmRemove(true)}
            className="flex-1 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Remove license
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            Continue using the app
          </button>
        </div>
      )}

      {/* Remove confirmation */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Remove license?</h3>
                <p className="text-xs text-slate-400">The app returns to the free plan immediately.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRemove(false)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};