import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { TaskBoard } from './components/TaskBoard';
import { Dashboard } from './components/Dashboard';
import { MaintenancePlan } from './components/MaintenancePlan';
import { ConfigRequired } from './components/ConfigRequired';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);
  const [view, setView] = useState<'board' | 'dashboard' | 'maintenance'>('dashboard');

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key || url.includes('placeholder')) {
      setConfigMissing(true);
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Supabase session error:', error);
        supabase.auth.signOut();
        setUser(null);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Supabase session fatal error:', err);
      supabase.auth.signOut();
      setUser(null);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (configMissing) {
    return <ConfigRequired />;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {user ? (
        view === 'board' ? (
          <TaskBoard user={user} onGoToDashboard={() => setView('dashboard')} />
        ) : view === 'maintenance' ? (
          <MaintenancePlan user={user} onBack={() => setView('dashboard')} />
        ) : (
          <Dashboard onBack={() => setView('board')} onViewMaintenance={() => setView('maintenance')} user={user} />
        )
      ) : (
        <Auth />
      )}
    </div>
  );
}
