
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { state } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-slate-100 flex flex-col items-center justify-center font-inter text-center overflow-hidden">
      <header className="mb-16 relative z-10">
        <h1 className="text-6xl md:text-8xl font-bold tracking-widest mb-4 uppercase text-blue-600 dark:text-blue-400 animate-pulse">
          AURA
        </h1>
        <p className="text-lg md:text-2xl font-light tracking-wider opacity-80 animate-fade-in">
          Your Financial Singularity
        </p>
      </header>

      <main className="relative z-10">
        {!state.user && (
          <div className="mt-8">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-4 border-2 border-blue-600 dark:border-blue-500 rounded-lg text-lg font-medium transition-all duration-300 uppercase hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        )}
        {state.user && (
          <div className="mt-8">
            <Link
              to="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-4 border-2 border-blue-600 dark:border-blue-500 rounded-lg text-lg font-medium transition-all duration-300 uppercase hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        <section className="mt-20 w-full max-w-6xl px-4">
          <h2 className="text-3xl md:text-4xl mb-8 uppercase tracking-wider font-semibold">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 dark:bg-slate-800/70 backdrop-blur-sm p-8 rounded-xl border border-gray-200/20 dark:border-slate-700/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10">
              <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">AI-Powered Insights</h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">Leverage the power of AI to get personalized financial insights and recommendations.</p>
            </div>
            <div className="bg-white/10 dark:bg-slate-800/70 backdrop-blur-sm p-8 rounded-xl border border-gray-200/20 dark:border-slate-700/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10">
              <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Automated Tracking</h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">Automatically track your income and expenses from various sources.</p>
            </div>
            <div className="bg-white/10 dark:bg-slate-800/70 backdrop-blur-sm p-8 rounded-xl border border-gray-200/20 dark:border-slate-700/50 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10">
              <h3 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Goal Setting</h3>
              <p className="text-gray-700 dark:text-slate-300 leading-relaxed">Set and track your financial goals with ease.</p>
            </div>
          </div>
        </section>

        <section className="mt-20 w-full max-w-4xl px-4">
          <h2 className="text-3xl md:text-4xl mb-8 uppercase tracking-wider font-semibold">About Us</h2>
          <p className="text-lg md:text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-slate-300">
            We are a team of passionate developers and financial experts dedicated to helping you achieve financial freedom.
          </p>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
