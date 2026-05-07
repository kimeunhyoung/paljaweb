import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://sghsryumnrnftyjoqmwf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6S3W_oWrzG-Nv8wLK98gmg_q_KcB2I1';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const navInner = document.querySelector('.nav-inner');
      if (navInner && !document.getElementById('user-badge')) {
        const el = document.createElement('div');
        el.id = 'user-badge';
        el.style.marginLeft = '16px';
        el.innerHTML = `
          <span style="margin-right:12px;">${session.user.email || session.user.user_metadata?.full_name || session.user.id}</span>
          <button id="logoutBtn" class="btn-nav-ghost">로그아웃</button>
        `;
        navInner.appendChild(el);
        document.getElementById('logoutBtn').addEventListener('click', async () => {
          await supabase.auth.signOut();
          window.location.href = '/';
        });
      }
    }
  } catch (err) {
    console.error('auth-check error', err);
  }
}

window.addEventListener('DOMContentLoaded', init);

