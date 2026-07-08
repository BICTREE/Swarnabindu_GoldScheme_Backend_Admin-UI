import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/Button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center items-center p-4">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-950/20 mx-auto mb-2">
          <ShieldAlert className="w-7 h-7 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold font-display text-obsidian-50 tracking-tight">
          Sufficient Privilege Required
        </h1>
        <p className="text-sm text-obsidian-200 leading-relaxed">
          Access Denied. Your active role does not possess the permissions required to view or execute operations at this administrative level.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="secondary">Back to Overview</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
