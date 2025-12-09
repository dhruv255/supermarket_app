import React, { useState } from 'react';
import { Store, User, Mail, Lock, ArrowRight, Loader2, Sparkles, ShoppingBasket } from 'lucide-react';
import { AuthService } from '../services/auth';

interface AuthProps {
    onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [storeName, setStoreName] = useState('');
    const [ownerName, setOwnerName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await AuthService.login(email, password);
                onLoginSuccess();
            } else {
                if (!storeName || !ownerName) throw new Error("Please fill all fields");
                await AuthService.signup(email, password, storeName, ownerName);
                // Auto login after signup
                await AuthService.login(email, password);
                onLoginSuccess();
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-surface dark:bg-darkSurface p-4 relative overflow-hidden">
            {/* Abstract Background Shapes */}
            <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-blue-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-purple-500/10 rounded-full blur-[80px]" />

            <div className="w-full max-w-md bg-white dark:bg-darkCard rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 relative z-10 transition-all duration-300">
                {/* Header */}
                <div className="bg-gradient-to-br from-primary to-blue-700 p-8 text-center text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-inner border border-white/30">
                            <ShoppingBasket size={40} className="text-white drop-shadow-md" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Kirana Credits</h1>
                        <p className="text-blue-100 text-sm mt-1 font-medium">Smart Credit Management</p>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-4 left-4 w-2 h-2 bg-white/30 rounded-full" />
                    <div className="absolute bottom-8 right-8 w-4 h-4 bg-white/20 rounded-full" />
                </div>

                {/* Form Section */}
                <div className="p-8">
                    <div className="flex gap-4 mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button 
                            onClick={() => { setIsLogin(true); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white dark:bg-darkCard text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Login
                        </button>
                        <button 
                            onClick={() => { setIsLogin(false); setError(''); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white dark:bg-darkCard text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="relative">
                                    <Store className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Store Name" 
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        value={storeName}
                                        onChange={e => setStoreName(e.target.value)}
                                        required={!isLogin}
                                    />
                                </div>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Owner Name" 
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        value={ownerName}
                                        onChange={e => setOwnerName(e.target.value)}
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                placeholder="Password" 
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primaryHover text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    {isLogin ? 'Login Securely' : 'Create Account'} <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        {isLogin ? "Your data is synced safely." : "Join thousands of store owners today."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;