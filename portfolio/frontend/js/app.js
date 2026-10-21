// Projects: loaded from the backend (GET /api/projects)
const cards = document.getElementById('cards');

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

function renderProject(p) {
  const a = el('a', 'card');
  a.href = /^https?:\/\//.test(p.link) ? p.link : '#contact';
  if (a.href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  const shot = el('div', 'shot ' + (['a', 'b', 'c'].includes(p.tone) ? p.tone : 'a'));
  const phone = el('div', 'phone');
  for (let i = 0; i < 4; i++) phone.appendChild(el('i'));
  shot.appendChild(phone);
  const meta = el('div', 'meta');
  meta.append(el('h4', '', p.title), el('p', '', p.meta));
  a.append(shot, meta);
  return a;
}

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error(res.status);
    const list = await res.json();
    cards.replaceChildren(...(list.length ? list.map(renderProject) : [el('p', 'empty', 'No projects yet.')]));
  } catch {
    cards.replaceChildren(el('p', 'empty', 'Could not load projects. Make sure the server is running.'));
  }
}

// Contact form: POST /api/contact
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name.trim() || !/^\S+@\S+\.\S+$/.test(data.email) || !data.message.trim()) {
    statusEl.textContent = 'Please enter your name, a valid email, and a message.';
    return;
  }
  const btn = form.querySelector('button');
  btn.disabled = true;
  statusEl.textContent = 'Sending…';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || 'Something went wrong.');
    form.reset();
    statusEl.textContent = 'Message sent. I’ll reply by email soon.';
  } catch (err) {
    statusEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

loadProjects();