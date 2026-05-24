import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid OTP format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: rows, error } = await admin
      .from('otp_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const otp = rows?.[0];
    if (!otp) {
      return new Response(JSON.stringify({ error: 'No pending OTP. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'OTP expired. Please request a new one.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Please request a new code.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const codeHash = await sha256(code);
    if (codeHash !== otp.code_hash) {
      await admin.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
      return new Response(JSON.stringify({ error: 'Incorrect OTP' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('otp_codes').update({ verified: true }).eq('id', otp.id);

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
