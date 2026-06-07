import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params

  const [orderRes, eventsRes] = await Promise.all([
    supabaseAdmin
      .from('service_orders')
      .select('customer_name, machine_model, current_status')
      .eq('id', orderId)
      .single(),

    supabaseAdmin
      .from('service_events')
      .select('event_type, created_at, eta_minutes, workers(name)')
      .eq('order_id', orderId)
      .neq('event_type', 'VOICE_NOTE')   // 不向客户暴露语音内容
      .order('created_at', { ascending: true }),
  ])

  if (orderRes.error) {
    const status = orderRes.error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: orderRes.error.message }, { status })
  }

  const events = (eventsRes.data ?? []).map(e => ({
    event_type:  e.event_type,
    created_at:  e.created_at,
    eta_minutes: e.eta_minutes ?? null,
    worker_name: (e.workers as unknown as { name: string } | null)?.name ?? null,
    // 不返回 worker phone、note 等内部字段
  }))

  return NextResponse.json({ ...orderRes.data, events })
}
