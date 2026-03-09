import { useState, useEffect } from 'react';
import {
  Code2,
  Terminal,
  Zap,
  Cpu,
  Target,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Copy,
  Github,
  Award,
  Clock,
  Database,
  Brain,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 🔑 GEMINI API KEY **/
const API_KEY = "AIzaSyBBlkQ8nkC_PUWWn-NOMtr1XkNdrY5yCcY";

/** UTILS **/
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** TYPES **/
interface AnalysisResult {
  title: string;
  score: number;
  time_complexity: string;
  space_complexity: string;
  strategy: string;
  strategy_confidence: number;
  correctness_score: number;
  efficiency_score: number;
  readability_score: number;
  edge_cases: string[];
  optimizations: string[];
  strengths: string[];
  badges: string[];
  verdict: string;
  converted_python: string;
}

/** CONSTANTS **/
const LANGUAGES = ['C++', 'Python', 'Java', 'JavaScript', 'Go', 'Rust'];
const BADGE_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  'Complexity King': { emoji: '👑', label: 'Complexity King', color: 'from-amber-400 to-yellow-600' },
  'Edge Case Ninja': { emoji: '🥷', label: 'Edge Case Ninja', color: 'from-slate-500 to-slate-800' },
  'Clean Coder': { emoji: '✨', label: 'Clean Coder', color: 'from-blue-400 to-cyan-400' },
  'Space Saver': { emoji: '💾', label: 'Space Saver', color: 'from-purple-400 to-indigo-600' },
  'Speed Demon': { emoji: '⚡', label: 'Speed Demon', color: 'from-yellow-400 to-orange-500' },
  'Algorithm Master': { emoji: '🧠', label: 'Algorithm Master', color: 'from-emerald-400 to-teal-600' },
  'Greedy Genius': { emoji: '🎯', label: 'Greedy Genius', color: 'from-red-400 to-rose-600' },
  'DP Wizard': { emoji: '🪄', label: 'DP Wizard', color: 'from-fuchsia-400 to-purple-600' },
  'Graph Explorer': { emoji: '🗺️', label: 'Graph Explorer', color: 'from-cyan-400 to-blue-600' },
  'Binary Search Pro': { emoji: '🔍', label: 'Binary Search Pro', color: 'from-indigo-400 to-violet-600' },
};

/** COMPONENTS **/

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getGrade = (s: number) => {
    if (s >= 95) return { l: 'S', c: 'text-amber-400' };
    if (s >= 85) return { l: 'A', c: 'text-emerald-400' };
    if (s >= 70) return { l: 'B', c: 'text-blue-400' };
    if (s >= 50) return { l: 'C', c: 'text-yellow-400' };
    if (s >= 30) return { l: 'D', c: 'text-orange-400' };
    return { l: 'F', c: 'text-red-400' };
  };

  const grade = getGrade(score);

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64" cy="64" r={radius}
          className="stroke-slate-800"
          strokeWidth="8"
          fill="transparent"
        />
        <motion.circle
          cx="64" cy="64" r={radius}
          className={cn("transition-all duration-1000", grade.c.replace('text', 'stroke'))}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-4xl font-black", grade.c)}>{grade.l}</span>
        <span className="text-xs text-slate-500 font-medium">{score}%</span>
      </div>
    </div>
  );
};

const BadgePill = ({ id }: { id: string }) => {
  const badge = BADGE_MAP[id] || { emoji: '🎁', label: id, color: 'from-slate-400 to-slate-600' };
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg",
        "bg-gradient-to-br transition-transform hover:scale-105",
        badge.color
      )}
    >
      <span>{badge.emoji}</span>
      <span>{badge.label}</span>
    </motion.div>
  );
};

const ComplexityCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: any, color: string }) => (
  <div className="glass-card p-4 flex items-center gap-4">
    <div className={cn("p-2.5 rounded-xl bg-opacity-20", color)}>
      <Icon className={cn("w-5 h-5", color.replace('bg-', 'text-'))} />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</p>
      <p className="text-lg font-mono font-bold text-slate-200">{value}</p>
    </div>
  </div>
);

/** MAIN APP **/

export default function App() {
  const [view, setView] = useState<'home' | 'analyzer' | 'results'>('home');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const [formData, setFormData] = useState({
    language: 'C++',
    problem: '',
    code: ''
  });

  const loadingSteps = [
    "Reading your code...",
    "Analyzing complexity...",
    "Detecting strategy...",
    "Hunting edge cases...",
    "Calculating score..."
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);

  const handleAnalyze = async () => {
    if (!formData.code.trim()) return;

    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        You are a master Competitive Programming coach. Analyze the following code.
        Language: ${formData.language}
        Problem Description (Optional): ${formData.problem}
        Code:
        ${formData.code}

        Provide a detailed analysis in JSON format:
        {
          "title": "Short descriptive title of the solution",
          "score": 0-100 (Overall algorithmic quality),
          "time_complexity": "Big O notation",
          "space_complexity": "Big O notation",
          "strategy": "Primary algorithm/approach used",
          "strategy_confidence": 0-100,
          "correctness_score": 0-100,
          "efficiency_score": 0-100,
          "readability_score": 0-100,
          "edge_cases": ["Detailed list of potential edge cases or bugs"],
          "optimizations": ["Actionable tips to improve complexity or performance"],
          "strengths": ["What was done well"],
          "badges": ["Choose up to 4 from: Complexity King, Edge Case Ninja, Clean Coder, Space Saver, Speed Demon, Algorithm Master, Greedy Genius, DP Wizard, Graph Explorer, Binary Search Pro"],
          "verdict": "Short summary/verdict",
          "converted_python": "Full Python translation of the code"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      setResult(parsed);
      setView('results');
    } catch (error: any) {
      console.error(error);
      alert("Analysis failed: " + (error?.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 glass-card mx-4 mt-4 px-6 py-3 flex items-center justify-between border-slate-700/50">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setView('home')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-main flex items-center justify-center">
            <Terminal className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black bg-gradient-main bg-clip-text text-transparent">CP-SCANNER</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('analyzer')}
            className={cn(
              "text-sm font-semibold transition-colors",
              view === 'analyzer' ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
            )}
          >
            Analyzer
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* VIEW: HOME */}
          {view === 'home' && (
            <motion.section
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-20"
            >
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold"
                >
                  <Sparkles className="w-3 h-3" />
                  POWERED BY GEMINI 1.5 FLASH
                </motion.div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
                  MASTER THE <br />
                  <span className="gradient-text animate-gradient">COMPETITIVE CODE</span>
                </h1>
                <p className="max-w-xl mx-auto text-slate-400 text-lg">
                  Level up your problem solving with AI-driven complexity analysis,
                  strategy detection, and edge-case hunting.
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setView('analyzer')}
                    className="btn-primary flex items-center gap-2"
                  >
                    Start Analyzing <ChevronRight className="w-4 h-4" />
                  </button>
                  <a
                    href="https://github.com"
                    target="_blank"
                    className="glass-card px-6 py-3 font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" /> Github
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Cpu, title: "Complexity Analysis", desc: "Get instant Time and Space complexity estimation using Big-O notation." },
                  { icon: Target, title: "Strategy Hunter", desc: "Identify common patterns like DP, Greedy, Slide Window, or Two Pointers." },
                  { icon: ShieldAlert, title: "Edge Case Detection", desc: "Don't get hacked. Find missing corner cases before they fail." },
                  { icon: Brain, title: "Algorithm Score", desc: "Receive a gamified score from 0-100 based on efficiency and logic." },
                  { icon: Award, title: "Earn Badges", desc: "Collect 10+ legendary badges like Speed Demon or DP Wizard." },
                  { icon: Zap, title: "Code Converter", desc: "Instantly translate your complex logic into clean, readable Python." }
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-8 group hover:border-violet-500/50 transition-all duration-500"
                  >
                    <f.icon className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* VIEW: ANALYZER */}
          {view === 'analyzer' && (
            <motion.section
              key="analyzer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 px-6 py-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-violet-500/20 rounded-lg">
                    <Code2 className="text-violet-400 w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Code Submission</h2>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="bg-slate-800 border-none outline-none rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer appearance-none min-w-[120px]"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <textarea
                  placeholder="Problem Statement (Optional)..."
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full glass-card p-4 h-32 outline-none focus:border-violet-500/50 transition-colors resize-none placeholder:text-slate-600 font-medium"
                />
                <textarea
                  placeholder="Paste your code here..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full glass-card p-4 h-80 outline-none focus:border-cyan-500/50 transition-colors bg-black/40 font-mono text-sm leading-relaxed placeholder:text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 px-1">
                <button
                  onClick={() => setFormData({
                    ...formData, code: `// Example: Two Sum
#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> m;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (m.count(complement)) return {m[complement], i};
        m[nums[i]] = i;
    }
    return {};
}`})}
                  className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest px-4"
                >
                  Load Example
                </button>
                <button
                  disabled={loading || !formData.code}
                  onClick={handleAnalyze}
                  className="btn-primary min-w-[200px] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{loadingSteps[loadingStep]}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Analyze Code
                    </>
                  )}
                </button>
              </div>
            </motion.section>
          )}

          {/* VIEW: RESULTS */}
          {view === 'results' && result && (
            <motion.section
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Header Status */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="glass-card p-6 flex flex-col items-center justify-center flex-shrink-0">
                  <ScoreRing score={result.score} />
                  <p className="mt-4 font-black text-slate-400">VERDICT: <span className="text-white">{result.verdict}</span></p>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black gradient-text uppercase tracking-tight">{result.title}</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> Analysis Complete
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Correctness</p>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${result.correctness_score}%` }} className="h-full bg-emerald-500" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Efficiency</p>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${result.efficiency_score}%` }} className="h-full bg-cyan-500" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Readability</p>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${result.readability_score}%` }} className="h-full bg-violet-500" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Strategy Confidence</p>
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${result.strategy_confidence}%` }} className="h-full bg-amber-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {result.badges.map(b => <BadgePill key={b} id={b} />)}
                  </div>
                </div>
              </div>

              {/* Complexity Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ComplexityCard title="Time Complexity" value={result.time_complexity} icon={Clock} color="bg-cyan-500" />
                <ComplexityCard title="Space Complexity" value={result.space_complexity} icon={Database} color="bg-violet-500" />
                <ComplexityCard title="Primary Strategy" value={result.strategy} icon={Brain} color="bg-emerald-500" />
              </div>

              {/* Details Tabs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 space-y-6">
                  <div>
                    <h4 className="flex items-center gap-2 font-black text-xl mb-4">
                      <ShieldAlert className="text-red-400 w-5 h-5" /> Edge Cases & Corner Cases
                    </h4>
                    <ul className="space-y-3">
                      {result.edge_cases.map((e, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400 leading-relaxed">
                          <span className="text-red-500/50 flex-shrink-0">•</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-6 border-t border-slate-800">
                    <h4 className="flex items-center gap-2 font-black text-xl mb-4 text-cyan-400">
                      <Sparkles className="w-5 h-5" /> Optimization Tips
                    </h4>
                    <ul className="space-y-3">
                      {result.optimizations.map((e, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400 leading-relaxed">
                          <CheckCircle2 className="text-cyan-500 w-4 h-4 flex-shrink-0 mt-0.5" /> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="glass-card p-8 bg-violet-900/10 border-violet-500/10">
                    <h4 className="flex items-center gap-2 font-black text-xl mb-4 text-violet-400">
                      <Layers className="w-5 h-5" /> Highlights & Strengths
                    </h4>
                    <ul className="space-y-3">
                      {result.strengths.map((e, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5" /> {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="glass-card p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <h4 className="font-black flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" /> Python Conversion
                      </h4>
                      <button
                        onClick={() => copyCode(result.converted_python)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <pre className="p-4 bg-black/40 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto">
                      {result.converted_python}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={() => setView('analyzer')}
                  className="glass-card px-8 py-3 font-bold hover:bg-slate-800 transition-all active:scale-95"
                >
                  Analyze Another Snippet
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="text-center py-12 text-slate-600 text-[10px] font-black tracking-widest uppercase">
        Built with Google Gemini & Vite • Competitive Programming Analyzer
      </footer>


    </div>
  );
}
