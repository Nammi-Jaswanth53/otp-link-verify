import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    if (!TWILIO_API_KEY) throw new Error('TWILIO_API_KEY is not configured');
    if (!TWILIO_FROM_NUMBER) throw new Error('TWILIO_FROM_NUMBER is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone_number || '').trim();
    const accountNumber = String(body.account_number || '').trim();
    if (!/^\+\d{8,15}$/.test(phone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone. Use E.164 format like +911234567890' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return new Response(JSON.stringify({ error: 'Invalid account number. Must be 9 to 18 digits.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: linked, error: linkErr } = await admin
      .from('bank_accounts')
      .select('id')
      .eq('account_number', accountNumber)
      .eq('phone_number', phone)
      .maybeSingle();
    if (linkErr) throw new Error('Lookup failed: ' + linkErr.message);
    if (!linked) {
      return new Response(JSON.stringify({ error: 'This phone number is not linked to the provided account number.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: insErr } = await admin.from('otp_codes').insert({
      user_id: userId, phone_number: phone, code_hash: codeHash, expires_at: expiresAt,
    });
    if (insErr) throw new Error('Failed to store OTP: ' + insErr.message);

    const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM_NUMBER,
        Body: `Your PeerATM verification code is ${code}. Valid for 5 minutes.`,
      }),
    });
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error('Twilio error', twilioData);
      throw new Error(`Twilio failed [${twilioRes.status}]: ${twilioData?.message || JSON.stringify(twilioData)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
