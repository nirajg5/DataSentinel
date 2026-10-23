import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { useConfig } from '../../context/ConfigContext';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useConfig();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('data_engineer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        full_name: fullName.trim(),
        password,
        role,
      });
      addToast({
        type: 'success',
        title: 'Account Registered',
        message: 'Your DataSentinel account has been created.',
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">DataSentinel</h2>
          <p className="text-xs text-slate-400">
            Create an enterprise engineer or analyst account
          </p>
        </div>

        <Card className="shadow-2xl border-slate-800">
          <CardHeader>
            <CardTitle>Register Platform Account</CardTitle>
            <p className="text-xs text-slate-500">Submits to POST /auth/register</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jordan V. Smith"
                required
              />

              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jsmith_de"
                required
              />

              <Input
                label="Corporate Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan@company.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Select
                label="Assigned Engineering Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="data_engineer">Data Engineer (Pipelines &amp; ETL)</option>
                <option value="analyst">Analyst (Metrics &amp; RAG)</option>
                <option value="admin">Administrator (Full Access)</option>
              </Select>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Account
                </Button>
              </div>
            </form>

            <div className="text-center pt-2 text-xs text-slate-500">
              Already have credentials?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
