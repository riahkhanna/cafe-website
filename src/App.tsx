import * as React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Menu as MenuIcon, X, Coffee, Trash2, Plus, Minus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User as UserType, MenuItem, OrderItem, Order } from './types';
import { db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'system-server-side-managed', // In this specific setup, server handles most writes
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-chaos-paper p-4">
          <div className="max-w-md w-full border-4 border-chaos-black p-8 bg-white space-y-6 text-center">
            <div className="inline-block bg-red-100 p-4 rounded-full border-2 border-red-500">
              <AlertTriangle className="text-red-500 w-12 h-12" />
            </div>
            <h2 className="font-display text-4xl uppercase tracking-tighter">System Chaos</h2>
            <p className="font-medium opacity-60">Something went wrong. The chaos is real.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-chaos-black text-white py-4 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all"
            >
              Reload System
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- Components ---

const Navbar = ({ user, cartCount, onLogout }: { user: UserType | null, cartCount: number, onLogout: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass border-b-2 border-chaos-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-chaos-black p-2 chaos-skew group-hover:bg-chaos-green transition-colors">
              <Coffee className="text-chaos-green group-hover:text-chaos-black w-6 h-6" />
            </div>
            <span className="font-display text-3xl tracking-tighter uppercase leading-none">Cafe <span className="text-stroke">&</span> Chaos</span>
          </Link>

          <div className="hidden md:flex items-center space-x-10">
            <Link to="/menu" className="font-bold hover:text-chaos-green transition-colors uppercase text-xs tracking-[0.2em]">Menu</Link>
            <Link to="/contact" className="font-bold hover:text-chaos-green transition-colors uppercase text-xs tracking-[0.2em]">Contact</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-1 font-bold text-red-600 hover:text-red-700 uppercase text-xs tracking-[0.2em]">
                <ShieldCheck size={14} /> Admin
              </Link>
            )}
            <Link to="/cart" className="relative p-2 hover:bg-chaos-black hover:text-white transition-all rounded-full border border-transparent">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-chaos-green text-chaos-black text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-chaos-black">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase opacity-40">Member</span>
                  <span className="text-xs font-bold uppercase">{user.name}</span>
                </div>
                <button onClick={onLogout} className="p-2 hover:bg-chaos-black hover:text-white transition-all rounded-full">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-chaos-black text-white px-8 py-3 rounded-none font-black uppercase text-xs tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black chaos-skew">
                Join Us
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative p-2">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-chaos-green text-chaos-black text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-chaos-black">
                  {cartCount}
                </span>
              )}
            </Link>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X size={28} /> : <MenuIcon size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-50 bg-chaos-black text-white p-8 flex flex-col justify-center space-y-8"
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2">
              <X size={40} />
            </button>
            <Link to="/menu" onClick={() => setIsOpen(false)} className="font-display text-7xl uppercase tracking-tighter hover:text-chaos-green transition-colors">Menu</Link>
            <Link to="/contact" onClick={() => setIsOpen(false)} className="font-display text-7xl uppercase tracking-tighter hover:text-chaos-green transition-colors">Contact</Link>
            {user?.role === 'admin' && <Link to="/admin" onClick={() => setIsOpen(false)} className="font-display text-7xl uppercase tracking-tighter text-red-600">Admin</Link>}
            {user ? (
              <button onClick={() => { onLogout(); setIsOpen(false); }} className="font-display text-7xl uppercase tracking-tighter text-red-500 text-left">Logout</button>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="font-display text-7xl uppercase tracking-tighter hover:text-chaos-green transition-colors">Login</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Pages ---

const Home = () => (
  <div className="space-y-0 overflow-hidden">
    {/* Hero Section - Editorial Style */}
    <section className="relative min-h-screen flex flex-col justify-center bg-chaos-black text-white px-4 md:px-20 pt-20">
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <img 
          src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070&auto=format&fit=crop" 
          alt="Coffee Chaos" 
          className="w-full h-full object-cover grayscale" 
          referrerPolicy="no-referrer" 
        />
      </div>
      
      <div className="relative z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <span className="w-12 h-px bg-chaos-green"></span>
          <span className="font-bold uppercase text-xs tracking-[0.5em] text-chaos-green">EST. 2026</span>
        </motion.div>
        
        <div className="space-y-0">
          <motion.h1 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[15vw] md:text-[12vw] leading-[0.85] uppercase tracking-tighter"
          >
            Brewing <br />
            <span className="text-stroke">Anarchy</span>
          </motion.h1>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-md pt-8 space-y-8"
        >
          <p className="text-lg font-medium opacity-70 leading-relaxed border-l-4 border-chaos-green pl-6 italic font-serif">
            "The best ideas come from chaos. The best chaos comes from our coffee."
          </p>
          <div className="flex gap-4">
            <Link to="/menu" className="bg-chaos-green text-chaos-black px-12 py-5 font-black uppercase tracking-widest hover:bg-white transition-all chaos-skew">
              Explore Menu
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Vertical Rail Text */}
      <div className="absolute right-10 bottom-20 hidden lg:block">
        <div className="flex flex-col items-center gap-8">
          <span className="[writing-mode:vertical-rl] rotate-180 font-bold uppercase text-[10px] tracking-[0.5em] opacity-40">Scroll for more chaos</span>
          <div className="w-px h-32 bg-white/20"></div>
        </div>
      </div>
    </section>

    {/* Marquee Section */}
    <div className="bg-chaos-green py-6 border-y-4 border-chaos-black overflow-hidden whitespace-nowrap">
      <div className="animate-marquee flex gap-12 items-center">
        {[...Array(10)].map((_, i) => (
          <span key={i} className="font-display text-5xl uppercase tracking-tighter flex items-center gap-12">
            <span>Freshly Roasted</span>
            <Coffee className="w-8 h-8" />
            <span>Pure Chaos</span>
            <Coffee className="w-8 h-8" />
            <span>Direct Trade</span>
            <Coffee className="w-8 h-8" />
          </span>
        ))}
      </div>
    </div>

    {/* Featured Section - Brutalist Grid */}
    <section className="py-32 px-4 md:px-20 grid lg:grid-cols-2 gap-20 items-center">
      <div className="space-y-12">
        <div className="space-y-4">
          <h2 className="font-display text-8xl uppercase tracking-tighter leading-none">
            Not Your <br />
            <span className="text-stroke">Average</span> <br />
            Brew
          </h2>
          <p className="max-w-md font-medium text-lg opacity-60">
            We don't just serve coffee. We serve a movement. Every bean is selected for its rebellious character and roasted to perfection in our underground lab.
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div className="border-2 border-chaos-black p-8 space-y-4 bg-white chaos-skew hover:bg-chaos-green transition-colors group">
            <span className="font-display text-4xl">01</span>
            <h4 className="font-black uppercase tracking-tight">Bold Roasts</h4>
            <p className="text-xs font-bold opacity-60 group-hover:opacity-100">Intense flavors that wake up your soul.</p>
          </div>
          <div className="border-2 border-chaos-black p-8 space-y-4 bg-white -skew-x-6 hover:bg-chaos-green transition-colors group">
            <span className="font-display text-4xl">02</span>
            <h4 className="font-black uppercase tracking-tight">Artisan Eats</h4>
            <p className="text-xs font-bold opacity-60 group-hover:opacity-100">Food that defies the status quo.</p>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="aspect-[4/5] border-4 border-chaos-black overflow-hidden chaos-skew">
          <img 
            src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=2070&auto=format&fit=crop" 
            alt="Barista" 
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute -bottom-10 -left-10 bg-chaos-green border-4 border-chaos-black p-10 hidden md:block">
          <span className="font-display text-6xl leading-none uppercase tracking-tighter">100% <br /> Raw</span>
        </div>
      </div>
    </section>
  </div>
);

const MenuPage = ({ onAddToCart }: { onAddToCart: (item: MenuItem) => void }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }, []);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filteredItems = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen space-y-4">
      <div className="w-20 h-20 border-8 border-chaos-black border-t-chaos-green rounded-full animate-spin"></div>
      <span className="font-display text-4xl uppercase tracking-tighter animate-pulse">Loading Chaos...</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 space-y-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-2">
          <span className="font-bold uppercase text-[10px] tracking-[0.5em] text-chaos-green bg-chaos-black px-2 py-1">Selection</span>
          <h2 className="font-display text-9xl uppercase tracking-tighter leading-none">The <br /><span className="text-stroke">Menu</span></h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-8 py-3 font-black uppercase text-[10px] tracking-widest border-2 border-chaos-black transition-all chaos-skew",
                activeCategory === cat ? "bg-chaos-black text-white" : "bg-white text-chaos-black hover:bg-chaos-green"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filteredItems.map(item => (
          <motion.div 
            layout
            key={item.id} 
            className="group relative"
          >
            <div className="border-2 border-chaos-black bg-white overflow-hidden transition-all duration-500 group-hover:-translate-y-4 group-hover:translate-x-4">
              <div className="h-80 overflow-hidden border-b-2 border-chaos-black relative">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute top-4 right-4 bg-chaos-green border-2 border-chaos-black px-4 py-2 font-display text-2xl">
                  ${item.price.toFixed(2)}
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.category}</span>
                  <h3 className="font-display text-4xl uppercase tracking-tighter leading-none">{item.name}</h3>
                  <p className="text-sm font-medium opacity-60 leading-relaxed font-serif italic">{item.description}</p>
                </div>
                <button 
                  onClick={() => onAddToCart(item)}
                  className="w-full bg-chaos-black text-white py-4 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black"
                >
                  Add to Cart
                </button>
              </div>
            </div>
            {/* Shadow Box */}
            <div className="absolute inset-0 border-2 border-chaos-black bg-chaos-green -z-10 translate-y-0 translate-x-0 group-hover:translate-y-0 group-hover:translate-x-0 transition-all"></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CartPage = ({ cart, onUpdateQty, onRemove }: { cart: OrderItem[], onUpdateQty: (id: string, delta: number) => void, onRemove: (id: string) => void }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center space-y-8">
        <h2 className="font-display text-8xl uppercase tracking-tighter leading-none">Your cart is <br /><span className="text-stroke">Empty</span></h2>
        <p className="text-xl font-medium opacity-60 font-serif italic">"The chaos is missing. Go fill it up."</p>
        <Link to="/menu" className="inline-block bg-chaos-black text-white px-12 py-5 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all chaos-skew">
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 grid lg:grid-cols-3 gap-20">
      <div className="lg:col-span-2 space-y-12">
        <h2 className="font-display text-8xl uppercase tracking-tighter leading-none">Your <br /><span className="text-stroke">Order</span></h2>
        <div className="space-y-6">
          {cart.map(item => (
            <div key={item.id} className="border-2 border-chaos-black p-6 flex gap-8 bg-white chaos-skew group hover:bg-chaos-green transition-colors">
              <div className="w-32 h-32 border-2 border-chaos-black overflow-hidden -skew-x-6">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.category}</span>
                    <h3 className="font-display text-3xl uppercase tracking-tighter leading-none">{item.name}</h3>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-700 p-2 border-2 border-transparent hover:border-chaos-black transition-all">
                    <Trash2 size={24} />
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex items-center border-2 border-chaos-black bg-white">
                    <button onClick={() => onUpdateQty(item.id, -1)} className="p-3 hover:bg-chaos-black hover:text-white transition-colors"><Minus size={18} /></button>
                    <span className="px-6 font-black text-lg">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.id, 1)} className="p-3 hover:bg-chaos-black hover:text-white transition-colors"><Plus size={18} /></button>
                  </div>
                  <span className="font-display text-3xl">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <div className="border-4 border-chaos-black p-10 bg-white space-y-8 sticky top-32 chaos-skew shadow-[20px_20px_0px_0px_rgba(0,255,0,1)]">
          <h3 className="font-display text-4xl uppercase tracking-tighter border-b-4 border-chaos-black pb-6">Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between font-black uppercase text-xs tracking-widest opacity-40">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black uppercase text-xs tracking-widest opacity-40">
              <span>Chaos Tax (8%)</span>
              <span>${(total * 0.08).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display text-4xl uppercase pt-8 border-t-4 border-chaos-black">
              <span>Total</span>
              <span>${(total * 1.08).toFixed(2)}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="w-full bg-chaos-green text-chaos-black py-6 font-black uppercase tracking-widest hover:bg-chaos-black hover:text-white transition-all border-2 border-chaos-black"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = ({ cart, user, onClearCart }: { cart: OrderItem[], user: UserType | null, onClearCart: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.08;

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          items: cart,
          totalAmount: total
        })
      });
      if (!res.ok) throw new Error("Order failed");
      onClearCart();
      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center space-y-12">
        <div className="inline-block bg-chaos-green p-10 chaos-skew border-4 border-chaos-black mb-4">
          <ShieldCheck size={80} className="text-chaos-black" />
        </div>
        <h2 className="font-display text-9xl uppercase tracking-tighter leading-none">Order <br /><span className="text-stroke">Received</span></h2>
        <p className="text-xl font-medium opacity-60 font-serif italic max-w-md mx-auto">"Your chaos is being prepared in our secret lab. Stay alert."</p>
        <Link to="/" className="inline-block bg-chaos-black text-white px-16 py-6 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all chaos-skew">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 space-y-16">
      <h2 className="font-display text-9xl uppercase tracking-tighter leading-none">Check<span className="text-stroke">out</span></h2>
      <div className="border-4 border-chaos-black p-12 bg-white space-y-12 shadow-[30px_30px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-8">
          <h3 className="font-display text-4xl uppercase tracking-tighter border-b-2 border-chaos-black pb-4">Shipping Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Full Name</label>
              <input type="text" placeholder="Full Name" className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors" defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Email</label>
              <input type="email" placeholder="Email" className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors" defaultValue={user?.email} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Address</label>
              <input type="text" placeholder="Address" className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="font-display text-4xl uppercase tracking-tighter border-b-2 border-chaos-black pb-4">Payment</h3>
          <div className="border-2 border-chaos-black p-6 bg-chaos-paper font-bold uppercase text-[10px] tracking-widest opacity-60 italic">
            Payment processing is currently in "Chaos Mode" (Demo). No real cards accepted.
          </div>
        </div>
        <div className="pt-12 border-t-4 border-chaos-black flex flex-col md:flex-row justify-between items-center gap-8">
          <span className="font-display text-6xl uppercase tracking-tighter">Total: ${total.toFixed(2)}</span>
          <button 
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full md:w-auto bg-chaos-black text-white px-20 py-6 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AuthPage = ({ type, onAuth }: { type: 'login' | 'signup', onAuth: (user: UserType, token: string) => void }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-32 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="font-display text-9xl uppercase tracking-tighter leading-none">{type}</h2>
        <p className="font-bold uppercase text-[10px] tracking-[0.5em] opacity-40">Join the movement</p>
      </div>
      <form onSubmit={handleSubmit} className="border-4 border-chaos-black p-12 bg-white space-y-8 shadow-[20px_20px_0px_0px_rgba(0,255,0,1)]">
        {error && <div className="bg-red-100 border-2 border-red-500 p-4 text-red-600 font-black text-[10px] uppercase tracking-widest">{error}</div>}
        {type === 'signup' && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Name</label>
            <input 
              type="text" required 
              className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Email</label>
          <input 
            type="email" required 
            className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors"
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Password</label>
          <input 
            type="password" required 
            className="w-full border-2 border-chaos-black p-4 font-bold uppercase text-xs focus:bg-chaos-green outline-none transition-colors"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>
        <button 
          type="submit" disabled={loading}
          className="w-full bg-chaos-black text-white py-6 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black disabled:opacity-50"
        >
          {loading ? 'Wait...' : type}
        </button>
        <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-40">
          {type === 'login' ? "Don't have an account?" : "Already have an account?"} 
          <Link to={type === 'login' ? '/signup' : '/login'} className="text-chaos-black underline ml-2 hover:text-chaos-green transition-colors">
            {type === 'login' ? 'Sign up' : 'Login'}
          </Link>
        </p>
      </form>
    </div>
  );
};

const ContactPage = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center space-y-8">
      <h2 className="text-6xl font-black uppercase tracking-tighter">Message Received</h2>
      <p className="text-xl font-medium opacity-60">We'll get back to you amidst the chaos.</p>
      <Link to="/" className="inline-block bg-black text-white px-10 py-4 font-black uppercase tracking-widest hover:bg-[#00FF00] hover:text-black transition-all">Back Home</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-12">
      <h2 className="text-6xl font-black uppercase tracking-tighter">Contact Us</h2>
      <form onSubmit={handleSubmit} className="border-2 border-black p-8 bg-white space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest">Name</label>
          <input name="name" type="text" required className="w-full border-2 border-black p-3 font-bold uppercase text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest">Email</label>
          <input name="email" type="email" required className="w-full border-2 border-black p-3 font-bold uppercase text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest">Message</label>
          <textarea name="message" required rows={5} className="w-full border-2 border-black p-3 font-bold uppercase text-xs"></textarea>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 font-black uppercase tracking-widest hover:bg-[#00FF00] hover:text-black transition-all border-2 border-black">
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

const AdminDashboard = ({ user }: { user: UserType | null }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const fetchMenu = () => fetch('/api/menu').then(res => res.json()).then(setMenu);
  const fetchOrders = () => fetch('/api/orders', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  }).then(res => res.json()).then(setOrders);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
  }, []);

  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const payload = { ...data, price: parseFloat(data.price as string) };

    const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
    const method = editingItem ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to save");
      setIsModalOpen(false);
      setEditingItem(null);
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this chaos?")) return;
    try {
      await fetch(`/api/menu/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8">
        <h2 className="font-display text-8xl uppercase tracking-tighter leading-none">Admin <br /><span className="text-stroke">Control</span></h2>
        <div className="flex border-2 border-chaos-black chaos-skew overflow-hidden">
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn("px-8 py-3 font-black uppercase text-xs tracking-widest transition-all", activeTab === 'orders' ? "bg-chaos-black text-white" : "bg-white hover:bg-chaos-green")}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn("px-8 py-3 font-black uppercase text-xs tracking-widest transition-all", activeTab === 'menu' ? "bg-chaos-black text-white" : "bg-white hover:bg-chaos-green")}
          >
            Menu
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="border-2 border-chaos-black overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-chaos-black text-white uppercase text-[10px] tracking-widest">
                <th className="p-6">ID</th>
                <th className="p-6">User</th>
                <th className="p-6">Items</th>
                <th className="p-6">Total</th>
                <th className="p-6">Status</th>
                <th className="p-6">Date</th>
              </tr>
            </thead>
            <tbody className="font-bold text-xs uppercase">
              {orders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                <tr key={order.id} className="border-b-2 border-chaos-black hover:bg-chaos-paper transition-colors">
                  <td className="p-6 font-mono opacity-40">{order.id.slice(-8)}</td>
                  <td className="p-6">{order.userId}</td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      {order.items.map((item, i) => (
                        <span key={i} className="text-[10px]">{item.quantity}x {item.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-6 font-black">${order.totalAmount.toFixed(2)}</td>
                  <td className="p-6">
                    <span className="bg-chaos-green text-chaos-black px-3 py-1 border border-chaos-black text-[10px]">{order.status}</span>
                  </td>
                  <td className="p-6 opacity-40">{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {menu.map(item => (
            <div key={item.id} className="border-2 border-chaos-black p-8 bg-white space-y-6 relative group">
              <div className="flex justify-between items-start">
                <h3 className="font-display text-3xl uppercase tracking-tighter leading-none">{item.name}</h3>
                <span className="font-black text-xl">${item.price.toFixed(2)}</span>
              </div>
              <div className="h-32 overflow-hidden border-2 border-chaos-black">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
              </div>
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">{item.category}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                  className="flex-grow bg-chaos-black text-white py-3 font-black uppercase text-[10px] tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 text-white p-3 border-2 border-chaos-black hover:bg-red-600 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="border-4 border-dashed border-chaos-black p-12 flex flex-col items-center justify-center gap-6 hover:bg-chaos-green transition-all group bg-white/50"
          >
            <Plus size={64} className="group-hover:scale-125 transition-transform" />
            <span className="font-display text-3xl uppercase tracking-tighter">Add New Chaos</span>
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-chaos-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-chaos-paper border-4 border-chaos-black p-8 space-y-8"
            >
              <h3 className="font-display text-5xl uppercase tracking-tighter">{editingItem ? 'Edit' : 'Add'} Item</h3>
              <form onSubmit={handleSaveItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest">Name</label>
                    <input name="name" required defaultValue={editingItem?.name} className="w-full border-2 border-chaos-black p-3 font-bold uppercase text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest">Price</label>
                    <input name="price" type="number" step="0.01" required defaultValue={editingItem?.price} className="w-full border-2 border-chaos-black p-3 font-bold uppercase text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest">Category</label>
                  <input name="category" required defaultValue={editingItem?.category} className="w-full border-2 border-chaos-black p-3 font-bold uppercase text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest">Image URL</label>
                  <input name="image" required defaultValue={editingItem?.image} className="w-full border-2 border-chaos-black p-3 font-bold uppercase text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest">Description</label>
                  <textarea name="description" required rows={3} defaultValue={editingItem?.description} className="w-full border-2 border-chaos-black p-3 font-bold uppercase text-xs" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-grow border-2 border-chaos-black py-4 font-black uppercase tracking-widest hover:bg-red-500 transition-all">Cancel</button>
                  <button type="submit" className="flex-grow bg-chaos-black text-white py-4 font-black uppercase tracking-widest hover:bg-chaos-green hover:text-chaos-black transition-all border-2 border-chaos-black">Save Chaos</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const handleAuth = (user: UserType, token: string) => {
    setUser(user);
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-chaos-paper text-chaos-black font-sans selection:bg-chaos-green selection:text-chaos-black relative">
          {/* Grain Overlay */}
          <div className="fixed inset-0 bg-grain z-[9999] pointer-events-none"></div>
          
          <Navbar user={user} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} onLogout={handleLogout} />
          
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/menu" element={<MenuPage onAddToCart={addToCart} />} />
              <Route path="/cart" element={<CartPage cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart} />} />
              <Route path="/checkout" element={<CheckoutPage cart={cart} user={user} onClearCart={clearCart} />} />
              <Route path="/login" element={<AuthPage type="login" onAuth={handleAuth} />} />
              <Route path="/signup" element={<AuthPage type="signup" onAuth={handleAuth} />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<AdminDashboard user={user} />} />
            </Routes>
          </main>

          <footer className="bg-chaos-black text-white py-24 border-t-8 border-chaos-green">
            <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-20">
              <div className="space-y-8 col-span-2">
                <div className="flex items-center gap-2">
                  <div className="bg-chaos-green p-2 chaos-skew">
                    <Coffee className="text-chaos-black w-8 h-8" />
                  </div>
                  <span className="font-display text-5xl tracking-tighter uppercase leading-none">Cafe <span className="text-stroke">&</span> Chaos</span>
                </div>
                <p className="text-lg font-medium opacity-60 leading-relaxed max-w-sm font-serif italic">
                  "We don't just brew coffee. We brew a revolution. Join us in the pursuit of the perfect cup and the perfect chaos."
                </p>
              </div>
              <div className="space-y-6">
                <h4 className="font-display text-2xl uppercase tracking-tighter">Navigation</h4>
                <ul className="space-y-3 text-xs font-black uppercase tracking-widest opacity-60">
                  <li><Link to="/menu" className="hover:text-chaos-green transition-colors">The Menu</Link></li>
                  <li><Link to="/contact" className="hover:text-chaos-green transition-colors">Contact Us</Link></li>
                  <li><Link to="/cart" className="hover:text-chaos-green transition-colors">Your Cart</Link></li>
                  <li><Link to="/login" className="hover:text-chaos-green transition-colors">Join the Chaos</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="font-display text-2xl uppercase tracking-tighter">Chaos Hours</h4>
                <ul className="space-y-3 text-xs font-black uppercase tracking-widest opacity-60">
                  <li className="flex justify-between"><span>Mon - Fri</span> <span>07:00 - 22:00</span></li>
                  <li className="flex justify-between"><span>Sat - Sun</span> <span>08:00 - 00:00</span></li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 mt-24 pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
                © 2026 Cafe & Chaos. All Rights Reserved.
              </p>
              <div className="flex gap-8 opacity-30">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Instagram</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Twitter</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">TikTok</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
