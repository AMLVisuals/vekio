// =============================================================================
// Edge Function : delete-account
// =============================================================================
// Supprime definitivement le compte de l'utilisateur authentifie.
// La suppression de auth.users declenche les ON DELETE CASCADE sur toutes
// les tables (profiles, journal, menus, poids_historique, hydratation,
// objectifs_macros, aliments_favoris) — RGPD complet.
//
// Necessite la cle SUPABASE_SERVICE_ROLE_KEY (deja injectee par Supabase
// dans les Edge Functions, pas besoin de la configurer manuellement).
//
// Deploiement :
//   supabase functions deploy delete-account --no-verify-jwt
//
// (--no-verify-jwt car on gere la verification nous-memes via le header
// Authorization, ce qui permet de retourner des messages d'erreur clairs.)

// @ts-ignore — import Deno specifique aux Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore — Deno global
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore — Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore — Deno global
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore — Deno global
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Identifie l'utilisateur via son JWT (client utilisateur)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Supprime via le client admin — declenche les ON DELETE CASCADE sur
    // toutes les tables qui referencent auth.users(id).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, deletedUserId: user.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
