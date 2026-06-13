import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Supabase Storage bucket name — create this bucket in Supabase Dashboard before deploying
const BUCKET = 'voice-notes'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file     = formData.get('file')      as File   | null
  const orderId  = formData.get('orderId')   as string | null
  const token    = formData.get('worker_token') as string | null
  const duration = Number(formData.get('duration') || 0)

  if (!file || !orderId || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // 校验 token（与 location 接口逻辑一致）
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

  // 上传到 Supabase Storage
  const ext      = file.name?.split('.').pop() || 'mp3'
  const path     = `${orderId}/${Date.now()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || 'audio/mpeg', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  const voiceUrl = urlData.publicUrl

  // 写 service_events
  const { error: eventError } = await supabaseAdmin
    .from('service_events')
    .insert({
      order_id:   orderId,
      event_type: 'VOICE_NOTE',
      voice_url:  voiceUrl,
      note:       duration ? `语音备注 ${duration} 秒` : null,
    })

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, url: voiceUrl })
}
