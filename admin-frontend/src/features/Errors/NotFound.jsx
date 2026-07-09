import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-4">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-gold-glow mx-auto mb-2">
          <AlertCircle className="w-7 h-7 text-gold" />
        </div>
        <h1 className="text-3xl font-bold font-display text-obsidian-50 tracking-tight">
          Route Not Found (404)
        </h1>
        <p className="text-sm text-obsidian-200 leading-relaxed">
          The administrative path you are attempting to access does not exist or has been archived.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
