// LandingPage.tsx - Clean, minimal 3-way access landing page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight, BookOpen, Smartphone, WifiOff, Download, Check,
  Globe, ChevronDown, Sparkles, GraduationCap, CheckCircle, X
} from 'lucide-react';

const BRAND = '#2563eb';

const accessCards = [
  {
    icon: Globe,
    title: 'Browser',
    desc: 'Instant access. Open it in any browser — on your phone, tablet, or computer. No download or install needed.',
    points: ['No install required', 'Works on any device', 'Always up to date'],
    cta: 'Try Now',
    action: 'start',
  },
  {
    icon: Smartphone,
    title: 'APK',
    desc: 'Install the full Android app for a faster, more native experience. Log in and study on the go.',
    points: ['Native mobile app', 'Fast & responsive', 'Seamless with internet'],
    cta: 'Get APK',
    action: 'register',
  },
  {
    icon: WifiOff,
    title: 'Offline',
    desc: 'No internet? No problem. Download the app and content once, then study 100% offline — anywhere, anytime.',
    points: ['Works fully offline', '~300–500 MB once', 'Updated via new releases'],
    cta: 'Download Free',
    action: 'register',
  },
];

const freeFeatures = [
  'Full subject notes — fully accessible',
  'Basic quizzes per section',
  'Progress tracking',
  'Core app engine',
  'Works 100% offline',
];

const premiumFeatures = [
  'Everything in Free',
  'Advanced practice exams',
  'Full ESLCE past papers & modules',
  'Performance analytics & reports',
  'Exam & ESLCE content delivered after purchase',
];

const faqs = [
  {
    q: 'How much storage does offline mode need?',
    a: 'Downloading the offline version takes about 300–500 MB, which includes the app and all your grade\u2019s notes and basic quizzes. After that, everything works without an internet connection and uses only that space on your device.',
  },
  {
    q: 'Will I lose my progress if I study offline?',
    a: 'No. Your progress, scores, and notes are stored locally on your device. When you are back online, your results sync with your account so you can see them on any device and in your report card.',
  },
  {
    q: 'How do I get updates?',
    a: 'The browser and APK versions update automatically when you connect to the internet. For the offline version, new content and features are delivered through periodic app updates that you download from the website.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Your account is protected with secure sign-in, and your study data stays on your device in offline mode. Premium exam and ESLCE content is delivered separately after purchase, so the free app contains only your notes and quizzes.',
  },
  {
    q: 'Can I switch between browser, APK, and offline?',
    a: 'Yes. You can study in the browser or the APK whenever you have internet, and use the offline app when you do not. Your progress is kept in sync so you never lose your place between modes.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isPremium = user?.subscriptionStatus === 'Premium';

  const handleAction = (action: string) => {
    if (action === 'start') {
      navigate(user ? '/dashboard' : '/register');
    } else if (action === 'register') {
      navigate(user && !isPremium ? '/payment' : user ? '/dashboard' : '/register');
    }
  };

  const handleUpgrade = () => {
    if (isPremium) {
      navigate('/dashboard');
      return;
    }
    if (user) {
      navigate('/payment');
    } else {
      navigate('/register');
    }
  };

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 antialiased">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <img src="/Menen Student assist Logo.png" alt="Menen logo" className="h-9 w-9 object-contain rounded-lg" />
              <span className="text-lg font-bold tracking-tight">Menen OSHS</span>
            </button>
            <div className="hidden md:flex items-center gap-7 text-sm">
              <button onClick={() => navigate('/about')} className="text-gray-600 hover:text-gray-900 transition-colors">About</button>
              <a href="#plans" className="text-gray-600 hover:text-gray-900 transition-colors">Premium</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                    Log in
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-shadow hover:shadow-md"
                    style={{ backgroundColor: BRAND }}
                  >
                    Sign up free
                  </button>
                </>
              )}
            </div>
            <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6 text-gray-700" /> : <><span className="sr-only">Menu</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></>}
            </button>
          </div>
          {isMenuOpen && (
            <div className="md:hidden pb-4 space-y-3 text-sm">
              <button onClick={() => navigate('/about')} className="block text-gray-700 hover:text-gray-900">About</button>
              <a href="#plans" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 hover:text-gray-900">Premium</a>
              <a href="#faq" onClick={() => setIsMenuOpen(false)} className="block text-gray-700 hover:text-gray-900">FAQ</a>
              <hr className="border-gray-100" />
              {user ? (
                <button onClick={() => navigate('/dashboard')} className="w-full text-left font-semibold text-gray-700">Dashboard</button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="block text-gray-700">Log in</button>
                  <button onClick={() => navigate('/register')} className="w-full py-2.5 text-white rounded-lg font-semibold" style={{ backgroundColor: BRAND }}>Sign up free</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-6"
          style={{ backgroundColor: '#EEF2FF', color: BRAND }}>
          <Sparkles className="h-4 w-4" />
          Ethiopian high school study companion
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-5">
          Your Study Companion.<br />
          <span style={{ color: BRAND }}>Anywhere. Even Offline.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed mb-9">
          Access notes and quizzes on any device — in the browser, through the mobile app, or completely offline when you have no connection at all.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="px-8 py-3.5 text-white font-semibold rounded-xl inline-flex items-center gap-2 transition-shadow hover:shadow-lg w-full sm:w-auto justify-center"
            style={{ backgroundColor: BRAND }}
          >
            Start Free <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => { document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="px-8 py-3.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-400 transition-colors w-full sm:w-auto"
          >
            See how you can access
          </button>
        </div>
      </section>

      {/* ── 3-Way Access Cards ── */}
      <section id="access" className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Choose How You Access</h2>
        <p className="text-gray-500 text-center mb-12">Pick whichever suits you — you can use more than one and your progress stays in sync.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {accessCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: '#EEF2FF' }}>
                <card.icon className="h-6 w-6" style={{ color: BRAND }} />
              </div>
              <h3 className="text-lg font-bold mb-2">{card.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{card.desc}</p>
              <ul className="space-y-2 mb-7">
                {card.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BRAND }} />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleAction(card.action)}
                className="w-full py-3 rounded-xl font-semibold text-white transition-shadow hover:shadow-md"
                style={{ backgroundColor: BRAND }}
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free vs Premium ── */}
      <section id="plans" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">What&rsquo;s Included</h2>
          <p className="text-gray-500 text-center mb-12">Start free. Upgrade when you&rsquo;re ready for full exam preparation.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm">
              <div className="text-sm font-bold tracking-wide mb-2 text-gray-500">FREE</div>
              <h3 className="text-2xl font-bold mb-1">Basic Study</h3>
              <p className="text-gray-500 text-sm mb-6">Everything you need to start learning, with no cost.</p>
              <ul className="space-y-3 mb-8">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-5 mb-6">
                <span className="text-2xl font-bold">Free</span>
                <span className="text-gray-500 text-sm ml-2">forever</span>
              </div>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/register')}
                className="w-full py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Start Free
              </button>
            </div>
            {/* Premium */}
            <div className="rounded-2xl bg-white border-2 p-8 shadow-sm relative" style={{ borderColor: BRAND }}>
              <div className="absolute -top-3 right-6 text-white text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: BRAND }}>
                RECOMMENDED
              </div>
              <div className="text-sm font-bold tracking-wide mb-2" style={{ color: BRAND }}>PREMIUM</div>
              <h3 className="text-2xl font-bold mb-1">Full Exam Preparation</h3>
              <p className="text-gray-500 text-sm mb-6">Advanced practice exams and full ESLCE modules.</p>
              <ul className="space-y-3 mb-8">
                {premiumFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: BRAND }} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-5 mb-6">
                <span className="text-2xl font-bold">1,550 ETB</span>
                <span className="text-gray-500 text-sm ml-2">/ year</span>
                <p className="text-xs text-gray-400 mt-1">One-time yearly payment gives you lifetime access to Premium content.</p>
              </div>
              <button
                onClick={handleUpgrade}
                className="w-full py-3 rounded-xl font-semibold text-white hover:shadow-md transition-shadow"
                style={{ backgroundColor: BRAND }}
              >
                {isPremium ? (<>You&rsquo;re Premium <Check className="h-4 w-4 ml-1 inline" /></>)
                  : user ? 'Upgrade to Premium' : 'Get Premium'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why offline ── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Study where the internet can&rsquo;t reach</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Many students study in places with little or no connection. That&rsquo;s why the offline version is built around your needs — download once and everything works without a signal.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Download, text: 'Notes and basic quizzes available offline for free.' },
                { icon: GraduationCap, text: 'Exam & ESLCE modules unlock after purchase and download.' },
                { icon: BookOpen, text: 'New content comes through app updates, never silently.' },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-gray-700">
                  <item.icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: BRAND }} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <h3 className="font-bold mb-4">How offline premium works</h3>
            <ol className="space-y-4 text-sm text-gray-700">
              <li className="flex gap-3"><span className="font-bold" style={{ color: BRAND }}>1</span> Download the free offline app with notes and quizzes.</li>
              <li className="flex gap-3"><span className="font-bold" style={{ color: BRAND }}>2</span> Tap Upgrade and complete your purchase (needs internet).</li>
              <li className="flex gap-3"><span className="font-bold" style={{ color: BRAND }}>3</span> Premium exam &amp; ESLCE content is downloaded to your device.</li>
              <li className="flex gap-3"><span className="font-bold" style={{ color: BRAND }}>4</span> A secure license keeps it unlocked, even offline.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 sm:px-8 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold hover:bg-gray-50 transition-colors"
              >
                <span>{f.q}</span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 text-center bg-gray-50">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to get started?</h2>
        <p className="text-gray-600 mb-8">Create your free account and start studying today.</p>
        <button
          onClick={() => navigate(user ? '/dashboard' : '/register')}
          className="px-8 py-3.5 text-white font-semibold rounded-xl transition-shadow hover:shadow-lg"
          style={{ backgroundColor: BRAND }}
        >
          {user ? 'Go to Dashboard' : 'Start Free'}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <img src="/Menen Student assist Logo.png" alt="Menen" className="h-8 w-8 object-contain rounded-lg" />
                <span className="text-white font-bold">Menen OSHS</span>
              </div>
              <p className="text-sm leading-relaxed">Ethiopian high school study companion — in the browser, on Android, or fully offline.</p>
            </div>
            <div className="text-sm space-y-2">
              <h4 className="text-white font-semibold mb-2">Product</h4>
              <button onClick={() => handleAction('start')} className="block hover:text-white">Browser</button>
              <button onClick={() => handleAction('register')} className="block hover:text-white">Android App</button>
              <button onClick={() => handleAction('register')} className="block hover:text-white">Offline</button>
            </div>
            <div className="text-sm space-y-2">
              <h4 className="text-white font-semibold mb-2">Resources</h4>
              <button onClick={() => navigate('/about')} className="block hover:text-white">About</button>
              <a href="#plans" className="block hover:text-white">Premium</a>
              <a href="#faq" className="block hover:text-white">FAQ</a>
            </div>
            <div className="text-sm space-y-2">
              <h4 className="text-white font-semibold mb-2">Account</h4>
              {user ? (
                <button onClick={() => navigate('/dashboard')} className="block hover:text-white">Dashboard</button>
              ) : (
                <>
                  <button onClick={() => navigate('/login')} className="block hover:text-white">Log in</button>
                  <button onClick={() => navigate('/register')} className="block hover:text-white">Sign up</button>
                </>
              )}
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            &copy; {new Date().getFullYear()} Menen OSHS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
