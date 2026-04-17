'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Wifi, WifiOff, ScanLine, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ScanStatus = 'idle' | 'scanning' | 'valid' | 'invalid' | 'loading'

interface ScanResult {
  valid: boolean
  reason?: string
  categorie?: string
  evenement?: string
  ticket_id?: string
}

interface OfflineScan {
  id: string
  payload: string
  timestamp: string
  synced: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const OFFLINE_KEY = 'rca_offline_scans'

function loadOfflineQueue(): OfflineScan[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveOfflineQueue(queue: OfflineScan[]) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue))
}

function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = success ? 880 : 220
    osc.type = success ? 'sine' : 'square'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // AudioContext non disponible (ex: avant interaction utilisateur)
  }
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export default function ScanClient({ controleurNom }: { controleurNom: string }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingRef = useRef(false) // Évite les doubles scans

  const [status, setStatus] = useState<ScanStatus>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineQueue, setOfflineQueue] = useState<OfflineScan[]>([])
  const [syncing, setSyncing] = useState(false)
  const [scanCount, setScanCount] = useState(0)

  // --- Surveillance de la connectivité ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // --- Chargement de la file offline au montage ---
  useEffect(() => {
    setOfflineQueue(loadOfflineQueue().filter((s) => !s.synced))
  }, [])

  // --- Synchronisation automatique quand la connexion revient ---
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineScans()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // --- Initialisation du scanner ---
  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' }, // Caméra arrière du smartphone
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onQrCodeScanned,
        undefined
      )
      .catch((err) => {
        console.error('Erreur caméra:', err)
      })

    return () => {
      scanner.stop().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Traitement d'un QR code scanné ---
  const onQrCodeScanned = useCallback(async (rawText: string) => {
    if (processingRef.current) return
    processingRef.current = true
    setStatus('loading')

    let payload: Record<string, string>
    try {
      payload = JSON.parse(rawText)
    } catch {
      setResult({ valid: false, reason: 'Format QR code non reconnu.' })
      setStatus('invalid')
      playBeep(false)
      scheduleReset()
      processingRef.current = false
      return
    }

    // --- Mode OFFLINE : stockage local ---
    if (!navigator.onLine) {
      const offlineScan: OfflineScan = {
        id: crypto.randomUUID(),
        payload: rawText,
        timestamp: new Date().toISOString(),
        synced: false,
      }
      const queue = loadOfflineQueue()
      queue.push(offlineScan)
      saveOfflineQueue(queue)
      setOfflineQueue(queue.filter((s) => !s.synced))

      // Vérification locale simplifiée (champs présents)
      const looksValid = !!(payload.ticket_id && payload.secret_hash && payload.event_id)
      setResult({
        valid: looksValid,
        reason: looksValid
          ? 'Scan enregistré hors-ligne. Sera validé dès le retour du réseau.'
          : 'QR code invalide.',
        categorie: payload.categorie,
      })
      setStatus(looksValid ? 'valid' : 'invalid')
      playBeep(looksValid)
      setScanCount((c) => c + 1)
      scheduleReset()
      processingRef.current = false
      return
    }

    // --- Mode ONLINE : validation serveur ---
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawText,
      })
      const data: ScanResult = await res.json()
      setResult(data)
      setStatus(data.valid ? 'valid' : 'invalid')
      playBeep(data.valid)
      setScanCount((c) => c + 1)
    } catch {
      setResult({ valid: false, reason: 'Erreur réseau — scan enregistré hors-ligne.' })
      setStatus('invalid')
      playBeep(false)
    }

    scheduleReset()
    processingRef.current = false
  }, [])

  function scheduleReset() {
    setTimeout(() => {
      setStatus('scanning')
      setResult(null)
      processingRef.current = false
    }, 3000)
  }

  // --- Synchronisation de la file offline ---
  async function syncOfflineScans() {
    setSyncing(true)
    const queue = loadOfflineQueue()
    const pending = queue.filter((s) => !s.synced)

    for (const scan of pending) {
      try {
        const res = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: scan.payload,
        })
        if (res.ok) {
          scan.synced = true
        }
      } catch {
        // Laisse en file pour la prochaine tentative
      }
    }

    saveOfflineQueue(queue)
    setOfflineQueue(queue.filter((s) => !s.synced))
    setSyncing(false)
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  const isValid = status === 'valid'
  const isInvalid = status === 'invalid'
  const showOverlay = isValid || isInvalid || status === 'loading'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Contrôleur</p>
          <p className="font-semibold text-sm">{controleurNom}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Badge scans */}
          <div className="bg-gray-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <ScanLine size={13} className="text-gray-400" />
            <span className="text-sm font-mono text-white">{scanCount}</span>
          </div>
          {/* Badge connectivité */}
          <div className={`rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium ${
            isOnline ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {isOnline
              ? <><Wifi size={13} /> En ligne</>
              : <><WifiOff size={13} /> Hors-ligne</>
            }
          </div>
        </div>
      </header>

      {/* Zone caméra */}
      <div className="relative flex-1 flex flex-col">
        {/* Conteneur du scanner */}
        <div id="qr-reader" className="w-full" style={{ minHeight: '300px' }} />

        {/* Viseur */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-white/40 rounded-2xl relative">
            {/* Coins du viseur */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
          </div>
        </div>

        {/* Overlay résultat (VERT / ROUGE) */}
        {showOverlay && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${
            status === 'loading'
              ? 'bg-gray-900/80'
              : isValid
              ? 'bg-green-600/95'
              : 'bg-red-600/95'
          }`}>
            {status === 'loading' ? (
              <RefreshCw size={56} className="text-white animate-spin" />
            ) : isValid ? (
              <>
                <CheckCircle2 size={80} className="text-white mb-4" strokeWidth={1.5} />
                <p className="text-white text-3xl font-bold">VALIDE</p>
                {result?.categorie && (
                  <p className="text-green-100 text-lg mt-2 font-medium">{result.categorie}</p>
                )}
                {result?.evenement && (
                  <p className="text-green-200 text-sm mt-1">{result.evenement}</p>
                )}
                {result?.reason && (
                  <p className="text-green-100 text-xs mt-3 px-6 text-center">{result.reason}</p>
                )}
              </>
            ) : (
              <>
                <XCircle size={80} className="text-white mb-4" strokeWidth={1.5} />
                <p className="text-white text-3xl font-bold">REFUSÉ</p>
                {result?.reason && (
                  <p className="text-red-100 text-base mt-3 px-8 text-center font-medium">
                    {result.reason}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Barre bas — file offline */}
      <div className="bg-gray-800 px-4 py-3">
        {offlineQueue.length > 0 ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Clock size={15} />
              <span>{offlineQueue.length} scan{offlineQueue.length > 1 ? 's' : ''} en attente de sync</span>
            </div>
            {isOnline && (
              <button
                onClick={syncOfflineScans}
                disabled={syncing}
                className="flex items-center gap-1.5 bg-yellow-500 text-yellow-900 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-yellow-400 transition disabled:opacity-60"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sync...' : 'Synchroniser'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-xs text-center">
            Pointez la caméra sur le QR code du billet
          </p>
        )}
      </div>
    </div>
  )
}
