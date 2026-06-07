'use client'

import { useEffect, useState, useCallback } from 'react'

type Order = {
  id: string
  customer_name: string
  customer_phone: string
  service_location_text: string
  machine_model: string
  fault_description: string
  current_status: string
  created_at: string
  workers: { name: string } | null
}

type Worker = {
  id: string
  name: string
  phone: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CREATED:     { label: '待派单', color: 'bg-yellow-100 text-yellow-800' },
  ASSIGNED:    { label: '已派单', color: 'bg-blue-100   text-blue-800'   },
  DEPARTED:    { label: '出发中', color: 'bg-orange-100 text-orange-800' },
  TRANSFERRED: { label: '已转派', color: 'bg-purple-100 text-purple-800' },
  COMPLETED:   { label: '已完成', color: 'bg-green-100  text-green-800'  },
}

const EMPTY_FORM = {
  customer_name: '',
  customer_phone: '',
  service_location_text: '',
  machine_model: '',
  fault_description: '',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // 派单面板
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [eta, setEta] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  // 派单成功弹窗
  type ModalData = { orderId: string; customerName: string; workerName: string; workerToken: string }
  const [modal, setModal] = useState<ModalData | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedWorker, setCopiedWorker] = useState(false)

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/service/api/orders')
    if (res.ok) setOrders(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    fetch('/service/api/workers').then(r => r.json()).then(setWorkers)
  }, [fetchOrders])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setSuccessMsg(null)

    const res = await fetch('/service/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setFormError(data.error ?? '提交失败，请重试')
    } else {
      setForm(EMPTY_FORM)
      setSuccessMsg('工单创建成功')
      await fetchOrders()
      setTimeout(() => setSuccessMsg(null), 3000)
    }
    setSubmitting(false)
  }

  function openPanel(order: Order) {
    setSelectedOrder(order)
    setSelectedWorkerId('')
    setEta('')
    setAssignError(null)
  }

  async function handleAssign() {
    if (!selectedOrder || !selectedWorkerId) return
    setAssigning(true)
    setAssignError(null)

    const res = await fetch(`/service/api/orders/${selectedOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign',
        worker_id: selectedWorkerId,
        eta_minutes: eta ? parseInt(eta) : null,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setAssignError(data.error ?? '派单失败，请重试')
    } else {
      const data = await res.json()
      const workerName = workers.find(w => w.id === selectedWorkerId)?.name ?? ''
      setModal({ orderId: selectedOrder.id, customerName: selectedOrder.customer_name, workerName, workerToken: data.worker_token })
      setSelectedOrder(null)
      await fetchOrders()
    }
    setAssigning(false)
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      return true
    }
  }

  async function copyLink(url: string) {
    await copyText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formField = (
    key: keyof typeof EMPTY_FORM,
    label: string,
    type: 'input' | 'textarea' = 'input',
    inputType = 'text',
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      {type === 'textarea' ? (
        <textarea
          required rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          required type={inputType}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">调度派单系统</h1>
          <p className="text-xs text-gray-500 mt-0.5">内部调度员专用</p>
        </div>
        <span className="text-xs text-gray-400">共 {orders.length} 条工单</span>
      </header>

      {/* ── Main ── */}
      <div className="flex flex-1 gap-5 p-5 overflow-hidden">

        {/* ── 左：创建表单 ── */}
        <aside className="w-72 shrink-0 bg-white rounded-xl shadow-sm p-5 self-start">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block" />
            创建新工单
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {formField('customer_name',         '客户姓名')}
            {formField('customer_phone',        '联系电话', 'input', 'tel')}
            {formField('service_location_text', '服务地址')}
            {formField('machine_model',         '机器型号')}
            {formField('fault_description',     '故障描述', 'textarea')}
            {formError  && <p className="text-xs text-red-600   bg-red-50   rounded p-2">{formError}</p>}
            {successMsg && <p className="text-xs text-green-700 bg-green-50 rounded p-2">{successMsg}</p>}
            <button
              type="submit" disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white text-sm font-medium py-2 rounded-md transition-colors"
            >
              {submitting ? '提交中…' : '创建工单'}
            </button>
          </form>
        </aside>

        {/* ── 中：工单列表 ── */}
        <section className="flex-1 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" />
              工单列表
              {!loading && <span className="text-gray-400 font-normal text-xs ml-1">（点击待派单行可派单）</span>}
            </h2>
            <button
              onClick={fetchOrders}
              className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:border-blue-400 transition-colors"
            >
              刷新
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中…</div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">暂无工单，请从左侧创建</div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    {['状态','客户','电话','地址','机型','负责师傅','创建时间'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const st = STATUS_MAP[order.current_status] ?? { label: order.current_status, color: 'bg-gray-100 text-gray-700' }
                    const isCreated  = order.current_status === 'CREATED'
                    const isSelected = selectedOrder?.id === order.id
                    return (
                      <tr
                        key={order.id}
                        onClick={() => isCreated && openPanel(order)}
                        className={[
                          'border-b border-gray-50 transition-colors',
                          isCreated  ? 'cursor-pointer hover:bg-yellow-50' : 'cursor-default',
                          isSelected ? 'bg-yellow-50 outline outline-1 outline-yellow-300' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{order.customer_name}</td>
                        <td className="px-4 py-3 text-gray-600">{order.customer_phone}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate" title={order.service_location_text}>
                          {order.service_location_text}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{order.machine_model}</td>
                        <td className="px-4 py-3 text-gray-600">{order.workers?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatTime(order.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 右：派单面板 ── */}
        {selectedOrder && (
          <aside className="w-80 shrink-0 bg-white rounded-xl shadow-sm p-5 self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-yellow-500 rounded-full inline-block" />
                派单
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-lg leading-none transition-colors"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            {/* 工单信息 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2 text-sm">
              <div className="flex gap-1.5">
                <span className="text-gray-400 shrink-0">客户</span>
                <span className="text-gray-900 font-medium">{selectedOrder.customer_name}</span>
                <span className="text-gray-400 ml-auto">{selectedOrder.customer_phone}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-gray-400 shrink-0">地址</span>
                <span className="text-gray-700 break-all">{selectedOrder.service_location_text}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="text-gray-400 shrink-0">故障</span>
                <span className="text-gray-700 break-all">{selectedOrder.fault_description}</span>
              </div>
            </div>

            {/* 选择师傅 */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">选择师傅 *</label>
              <select
                value={selectedWorkerId}
                onChange={e => setSelectedWorkerId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">— 请选择 —</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}（{w.phone}）</option>
                ))}
              </select>
            </div>

            {/* 预计到达 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预计到达时间
                <span className="text-gray-400 font-normal ml-1">（分钟，选填）</span>
              </label>
              <input
                type="number" min={1} placeholder="例如：30"
                value={eta}
                onChange={e => setEta(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            {assignError && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3">{assignError}</p>
            )}

            <button
              onClick={handleAssign}
              disabled={assigning || !selectedWorkerId}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white text-sm font-medium py-2 rounded-md transition-colors"
            >
              {assigning ? '派单中…' : '确认派单'}
            </button>
          </aside>
        )}

      </div>

      {/* ── 派单成功弹窗 ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</div>
              <h3 className="text-lg font-bold text-gray-900">派单成功</h3>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">客户</span>
                <span className="font-medium text-gray-900">{modal.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">师傅</span>
                <span className="font-medium text-gray-900">{modal.workerName}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-400 mb-1.5">客户查看链接</p>
              <p className="text-xs text-blue-600 break-all font-mono leading-relaxed">
                {typeof window !== 'undefined' ? `${window.location.origin}/track/${modal.orderId}` : ''}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="text-xs text-gray-400 mb-1">师傅小程序路径</p>
              <p className="text-xs text-gray-700 font-mono mb-2">pages/worker/index</p>
              <p className="text-xs text-gray-400 mb-1">启动参数（发企业微信卡片用）</p>
              <p className="text-xs text-orange-600 break-all font-mono leading-relaxed mb-2">
                orderId={modal.orderId}&amp;token={modal.workerToken}
              </p>
              <button
                onClick={async () => {
                  await copyText(`orderId=${modal.orderId}&token=${modal.workerToken}`)
                  setCopiedWorker(true)
                  setTimeout(() => setCopiedWorker(false), 2000)
                }}
                className={[
                  'w-full text-xs font-medium py-1.5 rounded-lg transition-colors',
                  copiedWorker
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-500 hover:bg-orange-600 text-white',
                ].join(' ')}
              >
                {copiedWorker ? '已复制 ✓' : '复制师傅参数'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => copyLink(`${window.location.origin}/track/${modal.orderId}`)}
                className={[
                  'flex-1 text-sm font-medium py-2.5 rounded-xl transition-colors',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white',
                ].join(' ')}
              >
                {copied ? '已复制 ✓' : '复制客户链接'}
              </button>
              <button
                onClick={() => { setModal(null); setCopied(false); setCopiedWorker(false) }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
