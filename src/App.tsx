import { useState } from 'react';
import { testWebGPU, type WebGpuCheckResult } from './benchmarks/webgpuCheck';
import { runFmaBenchmark, type FmaBenchmarkResult } from './benchmarks/fmaBenchmark';

function App() {
  const [checkResult, setCheckResult] = useState<WebGpuCheckResult | null>(null);
  const [benchResult, setBenchResult] = useState<FmaBenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const check = await testWebGPU();
      setCheckResult(check);
      if (check.supported) {
        const bench = await runFmaBenchmark();
        setBenchResult(bench);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd benchmarku');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h1 className="text-2xl font-bold">WebGPU Benchmark</h1>

        <button
          onClick={handleRun}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium cursor-pointer"
        >
          {loading ? 'Wykonywanie benchmarku...' : 'Uruchom test i benchmark FMA'}
        </button>

        {error && (
          <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        {checkResult && (
          <div className="space-y-2 text-sm bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h2 className="font-semibold text-slate-300">Wykryte GPU</h2>
            {checkResult.supported ? (
              <>
                <p><span className="text-slate-400">Vendor:</span> {checkResult.adapterInfo?.vendor}</p>
                <p><span className="text-slate-400">Architektura:</span> {checkResult.adapterInfo?.architecture}</p>
                <p><span className="text-slate-400">Opis:</span> {checkResult.adapterInfo?.description}</p>
              </>
            ) : (
              <p className="text-red-400">{checkResult.error}</p>
            )}
          </div>
        )}

        {benchResult && (
          <div className="space-y-2 text-sm bg-slate-950 p-4 rounded-lg border border-emerald-800/60">
            <h2 className="font-semibold text-emerald-400">Wynik benchmarku FMA (f32)</h2>
            <p>
              <span className="text-slate-400">Średni czas przebiegu:</span>{' '}
              <span className="font-mono font-bold text-white">{benchResult.avgTimeMs.toFixed(2)} ms</span>
            </p>
            <p>
              <span className="text-slate-400">Łączny czas ({benchResult.runs} przebiegów):</span>{' '}
              <span className="font-mono">{benchResult.totalTimeMs.toFixed(2)} ms</span>
            </p>
            <p>
              <span className="text-slate-400">Wydajność:</span>{' '}
              <span className="font-mono font-bold text-emerald-400">{benchResult.gflops.toFixed(1)} GFLOPS</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;