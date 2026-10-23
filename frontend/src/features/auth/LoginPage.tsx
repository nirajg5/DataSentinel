import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useConfig } from '../../context/ConfigContext';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useConfig();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('sentinel_secure_pass_2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back, ${username}!`,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials provided.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoUser: 'admin' | 'dev_alex' | 'sarah_bi') => {
    setUsername(demoUser);
    setPassword('sentinel_secure_pass_2026');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">DataSentinel</h2>
          <p className="text-xs text-slate-400">
            Enterprise Data Reliability, Pipeline Observability &amp; Triage
          </p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          <CardHeader>
            <CardTitle>Sign in to Control Plane</CardTitle>
            <p className="text-xs text-slate-500">Authenticate with POST /auth/login</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username / Handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Platform
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-4 border-t border-slate-100 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Demo Presets:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('dev_alex')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Engineer
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('sarah_bi')}
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Analyst
                </button>
              </div>
            </div>

            <div className="text-center pt-2 text-xs text-slate-500">
              Need a new account?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
