// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleAuth } from "npm:google-auth-library@8.7.0"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Handler CORS untuk preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  console.log("Start function");

  try {
    const { notif_id } = await req.json()
    console.log("notif_id:", notif_id);

    // Ambil notifikasi dari Supabase
    const supabaseUrl = Deno.env.get("SB_URL")!
    const supabaseKey = Deno.env.get("SB_SERVICE_ROLE_KEY")!
    const notifRes = await fetch(
      `${supabaseUrl}/rest/v1/developer_notifications?id=eq.${notif_id}&select=title,message`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const notifData = await notifRes.json()
    console.log("Ambil notifikasi dari Supabase");
    console.log("notifData:", notifData);
    if (!notifData || notifData.length === 0) {
      return new Response("Notifikasi tidak ditemukan", { status: 404 })
    }
    const notif = notifData[0]

    // Ambil semua fcm_token dari Supabase
    const usersRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=fcm_token&id=not.is.null&fcm_token=not.is.null`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )
    const users = await usersRes.json()
    const tokens = users.map((u: any) => u.fcm_token).filter(Boolean)
    console.log("Ambil FCM token dari Supabase");
    console.log("tokens:", tokens);

    // Google Auth
    const auth = new GoogleAuth({
      credentials: JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!),
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    })
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()
    console.log("Google Auth start");
    console.log("accessToken:", accessToken);

    // Kirim FCM HTTP v1
    const fcmPayload = {
      message: {
        notification: {
          title: notif.title,
          body: notif.message,
        },
        data: {
          type: "developer_notification",
          notif_id,
        },
      },
    }

    let success = 0
    let fail = 0
    console.log("Mulai kirim FCM ke", tokens.length, "token");
    for (const token of tokens) {
      fcmPayload.message.token = token
      const fcmRes = await fetch(
        "https://fcm.googleapis.com/v1/projects/laundrypro-dc029/messages:send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        }
      )
      if (fcmRes.ok) success++
      else fail++
    }
    console.log("Sukses:", success, "Gagal:", fail);

    return new Response(JSON.stringify({ sent: success, failed: fail }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (err) {
    console.log("ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/broadcast_dev_notification' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
