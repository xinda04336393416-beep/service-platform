'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

type Order = {
  id: string
  customer_name: string
  customer_phone: string
  service_location_text: string
  machine_model: string
  fault_description: string
  current_status: string
  current_worker_id: string | null
  created_at: string
  workers: { name: string; phone: string } | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CREATED:     { label: '待派单', color: 'bg-yellow-100 text-yellow-800' },
  ASSIGNED:    { label: '已派单', color: 'bg-blue-100   text-blue-800'   },
  DEPARTED:    { label: '出发中', color: 'bg-orange-100 text-orange-800' },
  TRANSFERRED: { label: '已转派', color: 'bg-purple-100 text-purple-800' },
  COMPLETED:   { label: '已完成', color: 'bg-green-100  text-green-800'  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSR(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 break-all">{value}</span>
    </div>
  )
}

export default function WorkerPage() {
  const { orderId } = useParams<{ orderId: string }>()

  const [order, setOrder]           = useState<Order | null>(null)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [acting, setActing]         = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [done, setDone]             = useState(false)

  // 语音
  const [voiceText, setVoiceText]   = useState('')
  const [recording, setRecording]   = useState(false)
  const [srUnsupported, setSrUnsupported] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (!orderId) return
    fetch(`/service/api/orders/${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setFetchError(data.error)
        else setOrder(data)
      })
      .catch(() => setFetchError('网络错误，请刷新重试'))
      .finally(() => setLoading(false))
  }, [orderId])

  async function patch(body: Record<string, unknown>) {
    if (!order) return false
    setActing(true)
    setActionError(null)
    const res = await fetch(`/service/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, worker_id: order.current_worker_id }),
    })
    setActing(false)
    if (!res.ok) {
      const data = await res.json()
      setActionError(data.error ?? '操作失败，请重试')
      return false
    }
    return true
  }

  async function handleDepart() {
    const ok = await patch({ action: 'depart' })
    if (ok) setOrder(o => o ? { ...o, current_status: 'DEPARTED' } : o)
  }

  async function handleComplete() {
    recognitionRef.current?.stop()
    const ok = await patch({ action: 'complete', note: voiceText.trim() || null })
    if (ok) setDone(true)
  }

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop()
      return
    }
    const SR = getSR()
    if (!SR) { setSrUnsupported(true); return }

    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.interimResults = true
    rec.continuous = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('')
      setVoiceText(text)
    }
    rec.onend  = () => setRecording(false)
    rec.onerror = () => setRecording(false)

    recognitionRef.current = rec
    rec.start()
    setRecording(true)
  }

  /* ── 加载 / 错误 / 完成态 ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">加载中…</p>
      </div>
    )
  }

  if (fetchError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-gray-700 font-medium">工单不存在</p>
          <p className="text-gray-400 text-sm mt-1">{fetchError}</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <p className="text-xl font-bold text-gray-900 mb-1">工单已完成</p>
          <p className="text-gray-500 text-sm">客户：{order.customer_name}</p>
        </div>
      </div>
    )
  }

  const st = STATUS_MAP[order.current_status] ?? { label: order.current_status, color: 'bg-gray-100 text-gray-700' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 顶栏 ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">工单详情</p>
          <h1 className="text-base font-bold text-gray-900 mt-0.5">{order.customer_name} · {order.machine_model}</h1>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
      </header>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── 工单信息 ── */}
        <div className="bg-white rounded-xl shadow-sm px-4">
          <InfoRow label="客户姓名" value={order.customer_name} />
          <InfoRow label="联系电话" value={order.customer_phone} />
          <InfoRow label="服务地址" value={order.service_location_text} />
          <InfoRow label="机器型号" value={order.machine_model} />
          <InfoRow label="故障描述" value={order.fault_description} />
        </div>

        {/* ── 操作区 ── */}
        {order.current_status === 'ASSIGNED' && (
          <div className="space-y-3">
            <button
              onClick={handleDepart}
              disabled={acting}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50
                         text-white font-semibold text-base py-4 rounded-xl transition-colors shadow-sm"
            >
              {acting ? '处理中…' : '🚗  点击出发'}
            </button>
          </div>
        )}

        {order.current_status === 'DEPARTED' && (
          <div className="space-y-3">
            {/* 语音录入 */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">语音工作记录</p>
                {recording && (
                  <span className="flex items-center gap-1.5 text-xs text-red-500">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    录音中
                  </span>
                )}
              </div>

              {srUnsupported ? (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  您的浏览器不支持语音识别，请直接在下方输入文字
                </p>
              ) : (
                <button
                  onClick={toggleRecording}
                  className={[
                    'w-full py-3 rounded-xl font-medium text-sm transition-colors',
                    recording
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {recording ? '⏹  停止录音' : '🎙  开始录音'}
                </button>
              )}

              <textarea
                rows={4}
                placeholder="语音识别结果将显示在这里，也可直接输入…"
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>

            {/* 完成按钮 */}
            <button
              onClick={handleComplete}
              disabled={acting}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50
                         text-white font-semibold text-base py-4 rounded-xl transition-colors shadow-sm"
            >
              {acting ? '提交中…' : '✓  完成工单'}
            </button>
          </div>
        )}

        {/* 其他状态提示 */}
        {order.current_status !== 'ASSIGNED' && order.current_status !== 'DEPARTED' && (
          <div className="bg-white rounded-xl shadow-sm px-4 py-5 text-center">
            <p className="text-gray-500 text-sm">该工单当前状态为「{st.label}」，无可用操作</p>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
