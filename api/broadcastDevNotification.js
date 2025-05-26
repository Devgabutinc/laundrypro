const { google } = require('googleapis');
const fetch = require('node-fetch');

module.exports = async(req, res) => {
    // Tambahkan CORS headers SELALU di awal
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { notif_id } = req.body;

        // Ambil notifikasi dari Supabase
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const notifRes = await fetch(
            `${SUPABASE_URL}/rest/v1/developer_notifications?id=eq.${notif_id}&select=title,message`, {
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                },
            }
        );
        const notifData = await notifRes.json();
        if (!notifData || notifData.length === 0) {
            return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
        }
        const notif = notifData[0];

        // Ambil semua fcm_token dari Supabase, filter pakai target_user_ids jika ada
        let usersQuery = `${SUPABASE_URL}/rest/v1/profiles?select=fcm_token&id=not.is.null&fcm_token=not.is.null`;
        if (notif.target_user_ids && notif.target_user_ids.length > 0) {
            // Filter pakai id in (array)
            const ids = notif.target_user_ids.map(id => `"${id}"`).join(',');
            usersQuery += `&id=in.(${ids})`;
        }
        const usersRes = await fetch(usersQuery, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        });
        const users = await usersRes.json();
        const tokens = users.map((u) => u.fcm_token).filter(Boolean);

        // Google Auth
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        const accessToken = await auth.getAccessToken();

        // Kirim FCM HTTP v1
        const fcmPayload = {
            message: {
                notification: {
                    title: notif.title,
                    body: notif.message,
                },
                data: {
                    type: 'developer_notification',
                    notif_id,
                },
            },
        };

        let success = 0;
        let fail = 0;
        for (const token of tokens) {
            fcmPayload.message.token = token;
            const fcmRes = await fetch(
                `https://fcm.googleapis.com/v1/projects/laundrypro-dc029/messages:send`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fcmPayload),
                }
            );
            if (fcmRes.ok) success++;
            else fail++;
        }

        res.json({ sent: success, failed: fail });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};