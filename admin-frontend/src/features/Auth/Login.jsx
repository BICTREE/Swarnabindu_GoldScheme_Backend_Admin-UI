import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.success) {
      toast('Welcome back! Admin session established successfully.', 'success');
      navigate(from, { replace: true });
    } else {
      toast(result.message || 'Invalid administrator credentials.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-4">
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gold/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-gold-glow mb-4">
            <Shield className="w-7 h-7 text-gold" />
          </div>
          <h1 className="text-2xl font-bold font-display text-obsidian-50 tracking-tight">
            Swarna Bindu
          </h1>
          <p className="text-sm text-obsidian-200 mt-1">
            Administrative Management Vault
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-premium border-obsidian-800/80 fade-in" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@swarnabindu.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Secret Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-3"
            >
              Sign In to Vault
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
