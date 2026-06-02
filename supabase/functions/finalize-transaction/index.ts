import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const type = String(body.type || '');
    const amount = Number(body.amount);
    const partnerName = String(body.partner_name || '').trim().slice(0, 120);
    const referenceId = body.reference_id ? String(body.reference_id).trim().slice(0, 80) : null;

    if (type !== 'deposit' && type !== 'withdrawal') {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!partnerName) {
      return new Response(JSON.stringify({ error: 'Missing partner_name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (profileErr || !profile) throw new Error('Profile not found');

    const current = Number(profile.balance);
    const delta = type === 'deposit' ? amount : -amount;
    const newBalance = current + delta;
    if (newBalance < 0) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updErr } = await admin
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);
    if (updErr) throw new Error('Failed to update balance: ' + updErr.message);

    const { data: tx, error: insErr } = await admin
      .from('transactions')
      .insert({
        user_id: userId,
        partner_name: partnerName,
        type,
        amount,
        reference_id: referenceId,
        status: 'completed',
      })
      .select('id')
      .single();
    if (insErr) throw new Error('Failed to record transaction: ' + insErr.message);

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      transaction_id: tx.id,
    }), {
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
