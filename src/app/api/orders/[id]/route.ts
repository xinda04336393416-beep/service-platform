import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('service_orders')
    .select('*, workers(name, phone)')
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { action = 'assign' } = body

  if (action === 'assign') {
    const { worker_id, eta_minutes } = body

    const { error: e1 } = await supabaseAdmin
      .from('service_orders')
      .update({ current_worker_id: worker_id, current_status: 'ASSIGNED' })
      .eq('id', id)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const { error: e2 } = await supabaseAdmin
      .from('service_events')
      .insert({ order_id: id, worker_id, eta_minutes: eta_minutes ?? null, event_type: 'ASSIGNED' })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  if (action === 'depart') {
    const { worker_id } = body

    const { error: e1 } = await supabaseAdmin
      .from('service_orders')
      .update({ current_status: 'DEPARTED' })
      .eq('id', id)
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

    const { error: e2 } = await supabaseAdmin
      .from('service_events')
      .insert({ order_id: id, worker_id: worker_id ?? null, event_type: 'DEPARTED' })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  if (action === 'complete') {
    const { worker_id, note } = body

    // 有语音文字则先记录 VOICE_NOTE
    if (note) {
      const { error: e1 } = await supabaseAdmin
        .from('service_events')
        .insert({ order_id: id, worker_id: worker_id ?? null, event_type: 'VOICE_NOTE', note })
      if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    }

    const { error: e2 } = await supabaseAdmin
      .from('service_events')
      .insert({ order_id: id, worker_id: worker_id ?? null, event_type: 'COMPLETED' })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    const { error: e3 } = await supabaseAdmin
      .from('service_orders')
      .update({ current_status: 'COMPLETED' })
      .eq('id', id)
    if (e3) return NextResponse.json({ error: e3.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
