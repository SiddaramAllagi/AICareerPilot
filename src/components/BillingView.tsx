import React, { useEffect, useState } from 'react';
import { Check, Info, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiGet, apiPostJson } from '../lib/api';

interface PaymentConfigResp {
  configured: boolean;
  keyId: string | null;
}

interface OrderResp {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface VerifyResp {
  verified: boolean;
  plan: string;
  orderId: string;
  paymentId: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BillingView() {
  const { profile } = useAuth();
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<'pro' | 'premium' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<PaymentConfigResp>('/api/payments/config')
      .then((cfg) => setGatewayConfigured(cfg.configured))
      .catch(() => setGatewayConfigured(false))
      .finally(() => setLoadingConfig(false));
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    if (window.Razorpay) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async (plan: 'pro' | 'premium') => {
    setError(null);
    setStatusMessage(null);
    setProcessingPlan(plan);

    try {
      const order = await apiPostJson<OrderResp>('/api/payments/create-order', { plan });
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Could not load Razorpay Checkout script.');
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'AI CareerPilot',
        description: `${plan === 'pro' ? 'Pro' : 'Premium'} Monthly Subscription`,
        order_id: order.orderId,
        prefill: {
          name: profile?.displayName || '',
          email: profile?.email || '',
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verified = await apiPostJson<VerifyResp>('/api/payments/verify', {
              ...response,
              plan,
            });
            if (verified.verified) {
              setStatusMessage(
                `Payment verified (Receipt ${verified.paymentId}). Your ${plan.toUpperCase()} transaction was cryptographically confirmed on the server.`
              );
            }
          } catch (verifyErr) {
            setError(
              verifyErr instanceof Error ? verifyErr.message : 'Payment signature verification failed.'
            );
          }
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate payment.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '₹0',
      audience: 'Core Career Tools',
      features: [
        'Basic career recommendations',
        'Limited resume analysis (2/month)',
        'Basic learning roadmap',
        'Limited interview questions',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '₹99',
      audience: 'Active Job Seekers',
      features: [
        'Advanced career analysis',
        'More resume analyses (15/month)',
        'Detailed skill gap analysis',
        'Personalized learning roadmaps',
        'More interview practice sessions',
      ],
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '₹199',
      audience: 'Intensive Placement Prep',
      features: [
        'All Pro features included',
        'Advanced AI assistance',
        'Extended interview practice',
        'Detailed career reports',
        'Additional progress analytics',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Subscription &amp; Billing
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Current active plan: <strong className="uppercase">{profile?.plan || 'free'}</strong> · Verified server-side Razorpay billing.
        </p>
      </div>

      {!loadingConfig && !gatewayConfigured && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-sm text-amber-900 dark:text-amber-200">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Razorpay Integration Pending Server Configuration</p>
            <p className="text-xs mt-1 leading-relaxed">
              Live INR checkout requires <code className="font-mono">RAZORPAY_KEY_ID</code> and <code className="font-mono">RAZORPAY_KEY_SECRET</code> configured on the server. AI CareerPilot never simulates fake payments.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {statusMessage && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = (profile?.plan || 'free') === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-6 flex flex-col justify-between bg-white dark:bg-slate-900 ${
                p.id === 'pro'
                  ? 'border-slate-900 dark:border-violet-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.audience}</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{p.name}</h2>
                <p className="mt-3 text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
                  {p.price}
                  <span className="text-sm font-normal text-slate-500">/month</span>
                </p>

                <ul className="mt-6 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <div className="w-full py-2.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Plan
                  </div>
                ) : p.id === 'free' ? (
                  <div className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    Default Tier
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={processingPlan === p.id}
                    onClick={() => void handleUpgrade(p.id)}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {processingPlan === p.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    {gatewayConfigured ? `Upgrade to ${p.name}` : `Configure Razorpay to Upgrade`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
