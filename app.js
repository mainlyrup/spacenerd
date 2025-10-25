// SoL: posts, likes & comments (localStorage), safe rendering, hash linking.
// No dependencies. Written like we care.

const YEAR_EL = document.getElementById('year');
if (YEAR_EL) YEAR_EL.textContent = new Date().getFullYear();

// ---- Data model ----
// Add or edit posts here. id must be unique and stable.
const POSTS = [
  {
    id: 'sol-042',
    title: 'Designing Medical Systems When Earth Is 20 Minutes Away',
    date: '2025-10-24',
    tags: ['Space Medicine', 'Autonomy'],
    excerpt: 'Alarm strategy and human-automation teaming for deep-space care.',
    url: '#', // replace with full post later
  },
  {
    id: 'sol-037',
    title: 'Habitat Layouts That Reduce Cognitive Load',
    date: '2025-10-12',
    tags: ['Human Factors'],
    excerpt: 'Calm interfaces and predictable affordances when heart rates spike.',
    url: '#',
  },
];

// ---- Persistence ----
const STORAGE_KEY = 'sol_state_v1';
/** @type {{[postId: string]: {liked: boolean, likes: number, comments: string[]}}} */
const state = load();

function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function save(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* ignore quota errors */ }
}

// initialize state for missing posts
for (const p of POSTS){
  if (!state[p.id]) state[p.id] = { liked: false, likes: 0, comments: [] };
}
save();

// ---- Utilities ----
/** safer text node (avoid innerHTML XSS) */
function el(tag, opts = {}, ...children){
  const n = document.createElement(tag);
  if (opts.class) n.className = opts.class;
  if (opts.attrs){
    for (const [k,v] of Object.entries(opts.attrs)) n.setAttribute(k, v);
  }
  for (const c of children){
    if (c == null) continue;
    if (typeof c === 'string') n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  }
  return n;
}
function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

// ---- Render SoL ----
const grid = document.querySelector('[data-sol-grid]');
if (grid){
  for (const p of POSTS){
    grid.appendChild(renderPost(p));
  }
  // if URL hash matches a post id, scroll into view
  if (location.hash){
    const id = location.hash.slice(1);
    const target = document.querySelector(`[data-post="${CSS.escape(id)}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderPost(post){
  const s = state[post.id];

  const title = el('h3', { class: 'post__title', attrs: { id: post.id } }, post.title);
  const date = el('div', { class: 'post__date' }, `${fmtDate(post.date)} · ${post.tags.map(t => '#'+t).join(' ')}`);
  const excerpt = el('p', { class: 'post__excerpt' }, post.excerpt);

  // Actions: like + count + read link
  const likeBtn = el('button', { class: 'like', attrs: { type:'button', 'aria-pressed': String(!!s.liked) } }, s.liked ? '♥ Liked' : '♡ Like');
  if (s.liked) likeBtn.classList.add('like--on');
  const likeCount = el('span', { class: 'like__count' }, likeLabel(s.likes));

  likeBtn.addEventListener('click', () => {
    if (s.liked){ s.liked = false; s.likes = Math.max(0, s.likes - 1); }
    else { s.liked = true; s.likes += 1; }
    likeBtn.textContent = s.liked ? '♥ Liked' : '♡ Like';
    likeBtn.classList.toggle('like--on', s.liked);
    likeBtn.setAttribute('aria-pressed', String(!!s.liked));
    likeCount.textContent = likeLabel(s.likes);
    save();
  });

  const readLink = el('a', { class:'link', attrs:{ href: post.url || '#', target: '_blank', rel: 'noopener' }}, 'Read post');

  const actions = el('div', { class: 'actions' }, likeBtn, likeCount, readLink);

  // Comments
  const commentsWrap = el('div', { class: 'comments' });
  const commentsTitle = el('div', { class: 'like__count' }, 'Comments');
  const commentList = el('div', { attrs: { 'data-list': '' }});
  renderComments(commentList, s.comments);

  const input = el('input', { class:'comment-input', attrs: { type:'text', name:'comment', placeholder:'Add a comment…', maxlength:'500', 'aria-label': 'Add a comment' }});
  const submit = el('button', { class:'comment-submit', attrs: { type:'submit' }}, 'Post');
  const form = el('form', { class:'comment-form', attrs: { 'data-form': '' }}, input, submit);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;
    s.comments.push(text);
    input.value = '';
    renderComments(commentList, s.comments);
    save();
  });

  commentsWrap.append(commentsTitle, commentList, form);

  const article = el('article', { class:'post', attrs:{ 'data-post': post.id }}, title, date, excerpt, actions, commentsWrap);
  return article;
}

function renderComments(container, comments){
  container.innerHTML = '';
  for (const c of comments){
    container.appendChild(el('div', { class:'comment' }, c));
  }
}

function likeLabel(n){
  return `${n} ${n === 1 ? 'like' : 'likes'}`;
}

// progressive enhancement for smooth scrolling (native CSS helps most browsers)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el){
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }
});
