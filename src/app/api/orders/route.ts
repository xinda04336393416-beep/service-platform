import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('service_orders')
    .select('*, workers(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { customer_name, customer_phone, service_location_text, machine_model, fault_description } =
    await req.json()

  const { data: order, error: orderError } = await supabaseAdmin
    .from('service_orders')
    .insert({ customer_name, customer_phone, service_location_text, machine_model, fault_description })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const { error: eventError } = await supabaseAdmin
    .from('service_events')
    .insert({ order_id: order.id, event_type: 'ORDER_CREATED' })

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

  return NextResponse.json(order, { status: 201 })
}
