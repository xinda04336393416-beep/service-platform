import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { orderId, token, lat, lng } = await req.json()

  if (!orderId || !token || lat == null || lng == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // 查工单并校验 token
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('service_orders')
    .select('id, worker_token, worker_token_expires_at')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.worker_token !== token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  if (!order.worker_token_expires_at || new Date(order.worker_token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 403 })
  }

  // 更新位置字段
  const { error: updateError } = await supabaseAdmin
    .from('service_orders')
    .update({ last_lat: lat, last_lng: lng, last_location_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 记录心跳事件
  const { error: eventError } = await supabaseAdmin
    .from('service_events')
    .insert({ order_id: orderId, event_type: 'LOCATION_HEARTBEAT', note: `${lat},${lng}` })

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
