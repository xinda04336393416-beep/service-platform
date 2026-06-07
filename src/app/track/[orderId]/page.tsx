'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type EventData = {
  event_type:  string
  created_at:  string
  eta_minutes: number | null
  worker_name: string | null
}

type TrackData = {
  customer_name:  string
  machine_model:  string
  current_status: string
  events:         EventData[]
}

/* ── 当前状态标签 ── */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CREATED:     { label: '待派单', color: 'bg-yellow-100 text-yellow-800' },
  ASSIGNED:    { label: '已派单', color: 'bg-blue-100   text-blue-800'  },
  DEPARTED:    { label: '服务中', color: 'bg-orange-100 text-orange-800'},
  TRANSFERRED: { label: '已转派', color: 'bg-purple-100 text-purple-800'},
  COMPLETED:   { label: '已完成', color: 'bg-green-100  text-green-800' },
}

/* ── 时间线固定步骤 ── */
const STEPS = [
  { type: 'ORDER_CREATED', label: '已报修',    baseDesc: '您的报修已成功登记' },
  { type: 'ASSIGNED',      label: '已派单',    baseDesc: null               },
  { type: 'DEPARTED',      label: '师傅已出发', baseDesc: '师傅正在前往您的位置' },
  { type: 'COMPLETED',     label: '维修完成',   baseDesc: '感谢您的使用，维修已完成' },
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TrackPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [data, setData]     = useState<TrackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    fetch(`/service/api/track/${orderId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('网络错误，请刷新重试'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">加载中…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-3xl mb-3">😕</p>
          <p className="text-gray-800 font-semibold">未找到该工单</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const eventMap = new Map(data.events.map(e => [e.event_type, e]))
  const st = STATUS_MAP[data.current_status] ?? { label: data.current_status, color: 'bg-gray-100 text-gray-700' }
  const isDone = data.current_status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── 顶部信息卡 ── */}
      <div className={`px-5 pt-10 pb-6 text-white ${isDone ? 'bg-green-600' : 'bg-blue-600'}`}>
        <p className="text-blue-100 text-xs mb-1 opacity-80">维修进度查询</p>
        <h1 className="text-xl font-bold">{data.customer_name}</h1>
        <p className="text-blue-100 text-sm mt-0.5">{data.machine_model}</p>
        <div className="mt-3">
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* ── 时间线 ── */}
      <div className="px-5 pt-6 pb-10 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
          {STEPS.map((step, idx) => {
            const event     = eventMap.get(step.type)
            const completed = !!event
            const isLast    = idx === STEPS.length - 1

            /* 动态描述 */
            let desc = step.baseDesc ?? ''
            let extra: string | null = null
            if (step.type === 'ASSIGNED' && event) {
              desc  = event.worker_name ? `${event.worker_name} 将为您服务` : '师傅已安排'
              extra = event.eta_minutes ? `预计 ${event.eta_minutes} 分钟后到达` : null
            }

            return (
              <div key={step.type} className="flex gap-4">
                {/* 圆点 + 竖线 */}
                <div className="flex flex-col items-center">
                  <div className={[
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    completed
                      ? step.type === 'COMPLETED'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'bg-gray-100 border-2 border-dashed border-gray-300',
                  ].join(' ')}>
                    {completed ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 flex-1 mt-1 mb-1 ${completed ? 'bg-blue-200' : 'bg-gray-100'}`} />
                  )}
                </div>

                {/* 内容 */}
                <div className={`pb-5 ${isLast ? '' : ''}`}>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className={`font-semibold text-sm ${completed ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {event && (
                      <span className="text-xs text-gray-400">{formatTime(event.created_at)}</span>
                    )}
                  </div>

                  {completed ? (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs text-gray-500">{desc}</p>
                      {extra && (
                        <p className="text-xs font-medium text-blue-600">{extra}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 mt-0.5">等待中</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">如有疑问请联系客服</p>
      </div>
    </div>
  )
}
