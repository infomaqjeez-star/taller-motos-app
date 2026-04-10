"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Loader } from "lucide-react";

export default function AudioDebugPanel() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const testAudioFile = async (mode: string) => {
    setLoading(true);
    const path = `/sounds/alerta-${mode}.mp3`;
    
    try {
      // Test 1: Fetch the file
      const response = await fetch(path);
      const status = response.status;
      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");
      const blob = await response.blob();
      const size = blob.size;

      // Test 2: Try to create and play audio
      const audio = new Audio(path);
      const canPlayType = audio.canPlayType("audio/mpeg");

      setResults((prev) => ({
        ...prev,
        [mode]: {
          path,
          fetchStatus: status,
          contentType,
          contentLength,
          blobSize: size,
          canPlayType,
          success: status === 200 && size > 0,
        },
      }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [mode]: {
          path,
          error: String(error),
          success: false,
        },
      }));
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm max-h-96 overflow-y-auto">
      <h3 className="text-white font-bold mb-3 text-sm">🔧 Audio Debug</h3>
      
      <div className="space-y-2 mb-4">
        {["discreto", "taller", "urgente"].map((mode) => (
          <button
            key={mode}
            onClick={() => testAudioFile(mode)}
            disabled={loading}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50"
          >
            Test: {mode}
          </button>
        ))}
      </div>

      <div className="space-y-3 text-xs">
        {Object.entries(results).map(([mode, data]: any) => (
          <div key={mode} className="bg-gray-800 p-2 rounded border border-gray-700">
            <p className="font-bold text-green-400">
              {data.success ? "✅" : "❌"} {mode.toUpperCase()}
            </p>
            <div className="text-gray-400 mt-1 space-y-0.5">
              <p>Path: {data.path}</p>
              {data.fetchStatus && (
                <>
                  <p>HTTP Status: {data.fetchStatus}</p>
                  <p>Content-Type: {data.contentType}</p>
                  <p>Blob Size: {data.blobSize} bytes</p>
                  <p>Can Play: {data.canPlayType}</p>
                </>
              )}
              {data.error && <p className="text-red-400">Error: {data.error}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
