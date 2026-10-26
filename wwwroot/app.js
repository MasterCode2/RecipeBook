'use strict';

// RecipeBook API: this frontend and the ASP.NET Core API run on the same origin.
const state = {
  page: 1,
  pageSize: 9,
  title: '',
  maxCookingTime: '',
  total: 0,
  recipes: [],
  editingId: null,
  deletingId: null,
  sequence: 0
};

const byId = (id) => document.getElementById(id);
const symbol = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function timeLabel(value) {
  const minutes = Number(value) || 0;
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function categoryOf(recipe) {
  const haystack = `${recipe.title ?? ''} ${(recipe.ingredients ?? []).join(' ')}`.toLowerCase();
  const categories = [
    { matches: /пицц|pizza|пепперони/, name: 'Пицца', emoji: '🍕', shade: 'peach' },
    { matches: /салат|зелень|avocado|авокадо/, name: 'Салаты', emoji: '🥗', shade: 'sage' },
    { matches: /суп|борщ|щи|солянк|бульон/, name: 'Супы', emoji: '🍲', shade: 'yellow' },
    { matches: /паста|макарон|спагетти|лапш|пельмен|вареник/, name: 'Паста и тесто', emoji: '🍝', shade: 'peach' },
    { matches: /куриц|курин|индейк|цыплен/, name: 'Птица', emoji: '🍗', shade: 'yellow' },
    { matches: /рыб|лосос|семг|кревет|морепродукт/, name: 'Рыба', emoji: '🐟', shade: 'blue' },
    { matches: /говядин|свинин|стейк|мяс|котлет|шашлык/, name: 'Мясное', emoji: '🍖', shade: 'rose' },
    { matches: /торт|печень|пирог|кекс|брауни|десерт|морожен|блин/, name: 'Десерты', emoji: '🍰', shade: 'lavender' },
    { matches: /яйц|омлет|завтрак|каша|сырник/, name: 'Завтраки', emoji: '🍳', shade: 'yellow' },
    { matches: /рис|плов|греч|круп/, name: 'Гарниры', emoji: '🍚', shade: 'sage' },
    { matches: /картоф|овощ|баклажан|кабач/, name: 'Овощное', emoji: '🥦', shade: 'sage' }
  ];
  return categories.find((category) => category.matches.test(haystack)) ??
    { name: 'Домашнее', emoji: '🍽️', shade: 'lavender' };
}

async function requestJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
  } catch {
    throw new Error('Нет соединения с RecipeBook. Убедись, что приложение запущено через dotnet run.');
  }

  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : null; }
  catch { body = raw; }

  if (!response.ok) {
    let message = typeof body === 'string' ? body : body?.message || body?.title;
    if (!message) message = `Сервер вернул ошибку ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function renderSkeleton() {
  byId('status-region').innerHTML = '';
  byId('recipes-grid').innerHTML = Array.from({ length: 6 }, () =>
    `<div class="skeleton-card"><div class="skeleton-cover"></div><div class="skeleton-content"><div class="skeleton-line medium"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>`
  ).join('');
  byId('pagination').innerHTML = '';
}

function recipeCard(recipe) {
  const category = categoryOf(recipe);
  const ingredientCount = (recipe.ingredients ?? []).length;
  const intro = recipe.notes?.trim() || (recipe.ingredients ?? []).slice(0, 4).join(' · ') || 'Домашний рецепт для твоей коллекции';
  const id = Number(recipe.id);
  return `<article class="recipe-card">
    <div class="recipe-cover cover-${category.shade}"><span class="cover-tag">${escapeHtml(category.name)}</span><span class="food-emoji" aria-hidden="true">${category.emoji}</span></div>
    <div class="recipe-card-body"><h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(intro)}</p>
      <div class="recipe-meta"><span>${symbol('clock')}${timeLabel(recipe.cookingTimeMinutes)}</span><span>${symbol('ingredients')}${ingredientCount} ингредиентов</span></div>
      <div class="card-footer"><button class="card-read" type="button" data-action="open" data-id="${id}">Смотреть рецепт ${symbol('arrow')}</button>
        <div class="card-actions"><button class="icon-button" type="button" data-action="edit" data-id="${id}" aria-label="Редактировать ${escapeHtml(recipe.title)}" title="Редактировать">${symbol('edit')}</button>
          <button class="icon-button" type="button" data-action="delete" data-id="${id}" aria-label="Удалить ${escapeHtml(recipe.title)}" title="Удалить">${symbol('trash')}</button></div>
      </div>
    </div>
  </article>`;
}

function updateFilterUI() {
  const isFiltered = Boolean(state.title || state.maxCookingTime);
  byId('reset-filters').hidden = !isFiltered;
  byId('collection-caption').textContent = isFiltered ? 'Результаты поиска' : 'Все рецепты';
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
  const container = byId('pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const button = (page, label, labelText = null) =>
    `<button class="page-button" type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ''} aria-label="${labelText ?? `Страница ${page}`}">${label}</button>`;
  const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
  const visible = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  let html = `<button class="page-button" data-page="${state.page - 1}" type="button" ${state.page <= 1 ? 'disabled' : ''} aria-label="Предыдущая страница">${symbol('chevron-left')}</button>`;
  let previous = 0;
  for (const page of visible) {
    if (page - previous > 1) html += '<span class="pagination-summary">…</span>';
    html += button(page, page);
    previous = page;
  }
  html += `<button class="page-button" data-page="${state.page + 1}" type="button" ${state.page >= totalPages ? 'disabled' : ''} aria-label="Следующая страница">${symbol('chevron-right')}</button>`;
  container.innerHTML = html;
}

function renderRecipes() {
  byId('result-count').textContent = String(state.total);
  byId('result-label').textContent = state.total === 1 ? 'рецепт найден' : 'рецептов найдено';
  byId('status-region').innerHTML = '';
  const grid = byId('recipes-grid');
  if (state.recipes.length === 0) {
    const filtered = Boolean(state.title || state.maxCookingTime);
    grid.innerHTML = `<div class="empty-state"><div class="empty-illustration">${filtered ? '🔎' : '📖'}</div><h3>${filtered ? 'Ничего не нашлось' : 'Здесь пока пусто'}</h3>
      <p>${filtered ? 'Попробуй другое название или увеличь время приготовления.' : 'Самое время добавить первый любимый рецепт и начать свою коллекцию.'}</p>
      <button class="btn btn-primary" type="button" data-action="${filtered ? 'reset' : 'create'}">${filtered ? 'Сбросить фильтры' : 'Добавить рецепт'} ${symbol(filtered ? 'refresh' : 'plus')}</button></div>`;
  } else {
    grid.innerHTML = state.recipes.map(recipeCard).join('');
  }
  renderPagination();
}

async function loadRecipes() {
  const sequence = ++state.sequence;
  renderSkeleton();
  updateFilterUI();
  const query = new URLSearchParams({ page: String(state.page), pageSize: String(state.pageSize) });
  if (state.title) query.set('title', state.title);
  if (state.maxCookingTime) query.set('maxCookingTime', state.maxCookingTime);
  try {
    const data = await requestJson(`/recipes?${query.toString()}`);
    if (sequence !== state.sequence) return;
    state.total = Number(data.totalCount ?? data.TotalCount ?? 0);
    state.recipes = data.items ?? data.Items ?? [];
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page > totalPages) { state.page = totalPages; return loadRecipes(); }
    renderRecipes();
  } catch (error) {
    if (sequence !== state.sequence) return;
    byId('result-count').textContent = '—';
    byId('status-region').innerHTML = '';
    byId('pagination').innerHTML = '';
    byId('recipes-grid').innerHTML = `<div class="error-state"><div class="empty-illustration">⚠️</div><h3>Не удалось загрузить рецепты</h3><p>${escapeHtml(error.message)}</p><button type="button" class="btn btn-primary" data-action="retry">Повторить ${symbol('refresh')}</button></div>`;
  }
}

let toastTimer;
function toast(message, isError = false) {
  const element = byId('toast');
  clearTimeout(toastTimer);
  element.textContent = message;
  element.classList.toggle('error', isError);
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, 3600);
}

function showDialog(id) {
  const dialog = byId(id);
  if (!dialog.open) dialog.showModal();
}
function closeDialog(id) {
  const dialog = byId(id);
  if (dialog.open) dialog.close();
}
function currentRecipe(id) { return state.recipes.find((recipe) => Number(recipe.id) === Number(id)); }

function openDetail(id) {
  const recipe = currentRecipe(id);
  if (!recipe) { toast('Рецепт не найден на текущей странице', true); return; }
  const category = categoryOf(recipe);
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  byId('detail-content').innerHTML = `<div class="detail-cover cover-${category.shade}"><span aria-hidden="true">${category.emoji}</span></div>
    <div class="detail-content-body"><div class="detail-category">${escapeHtml(category.name)} · твоя коллекция</div><h2 id="detail-title">${escapeHtml(recipe.title)}</h2>
    <div class="detail-metas"><span>${symbol('clock')}${timeLabel(recipe.cookingTimeMinutes)}</span><span>${symbol('ingredients')}${ingredients.length} ингредиентов</span><span>${steps.length} шагов</span></div>
    <h3>Что понадобится</h3><ul class="ingredient-list">${ingredients.map((ingredient) => `<li>${escapeHtml(ingredient)}</li>`).join('')}</ul>
    <h3>Как приготовить</h3><ol class="steps-list">${steps.map((step, index) => `<li><span class="step-num">${index + 1}</span><span>${escapeHtml(step)}</span></li>`).join('')}</ol>
    ${recipe.notes?.trim() ? `<div class="note-box"><strong>✦ Заметка</strong>\n${escapeHtml(recipe.notes)}</div>` : ''}
    <div class="detail-buttons"><button class="btn btn-outline" type="button" data-action="edit" data-id="${Number(recipe.id)}">${symbol('edit')} Редактировать</button>
      <button class="btn btn-ghost" type="button" data-action="delete" data-id="${Number(recipe.id)}">${symbol('trash')} Удалить</button></div></div>`;
  showDialog('detail-modal');
}

function openForm(recipe = null) {
  closeDialog('detail-modal');
  const form = byId('recipe-form');
  form.reset();
  byId('form-error').hidden = true;
  state.editingId = recipe ? Number(recipe.id) : null;
  byId('form-title').textContent = recipe ? 'Редактировать рецепт' : 'Новый рецепт';
  byId('save-recipe').querySelector('span').textContent = recipe ? 'Сохранить изменения' : 'Сохранить рецепт';
  if (recipe) {
    byId('recipe-title').value = recipe.title ?? '';
    byId('recipe-minutes').value = recipe.cookingTimeMinutes ?? '';
    byId('recipe-ingredients').value = (recipe.ingredients ?? []).join('\n');
    byId('recipe-steps').value = (recipe.steps ?? []).join('\n');
    byId('recipe-notes').value = recipe.notes ?? '';
  }
  showDialog('form-modal');
  byId('recipe-title').focus();
}

async function submitRecipe(event) {
  event.preventDefault();
  const title = byId('recipe-title').value.trim();
  const cookingTimeMinutes = Number(byId('recipe-minutes').value);
  const ingredients = byId('recipe-ingredients').value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  const steps = byId('recipe-steps').value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  const notes = byId('recipe-notes').value.trim() || null;
  const error = byId('form-error');
  if (!title || !ingredients.length || !steps.length || !Number.isInteger(cookingTimeMinutes) || cookingTimeMinutes < 1 || cookingTimeMinutes > 1440) {
    error.textContent = 'Укажи название, время от 1 до 1440 минут, хотя бы один ингредиент и один шаг.';
    error.hidden = false;
    return;
  }

  const payload = { title, ingredients, steps, notes, cookingTimeMinutes };
  const editing = state.editingId !== null;
  const button = byId('save-recipe');
  button.disabled = true;
  error.hidden = true;
  try {
    await requestJson(editing ? `/recipes/${state.editingId}` : '/recipes', {
      method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    closeDialog('form-modal');
    if (!editing) {
      state.title = '';
      state.maxCookingTime = '';
      state.page = 1;
      byId('search-input').value = '';
      byId('time-filter').value = '';
    }
    toast(editing ? 'Рецепт обновлён ✓' : 'Новый рецепт сохранён ✓');
    await loadRecipes();
    byId('collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (requestError) {
    error.textContent = requestError.message;
    error.hidden = false;
  } finally { button.disabled = false; }
}

function openDelete(id) {
  const recipe = currentRecipe(id);
  if (!recipe) return;
  state.deletingId = Number(id);
  byId('delete-description').textContent = `«${recipe.title}» исчезнет из твоей коллекции. Это действие нельзя отменить.`;
  byId('delete-error').hidden = true;
  showDialog('delete-modal');
}

async function deleteRecipe() {
  if (state.deletingId === null) return;
  const button = byId('confirm-delete');
  button.disabled = true;
  try {
    await requestJson(`/recipes/${state.deletingId}`, { method: 'DELETE' });
    closeDialog('delete-modal');
    closeDialog('detail-modal');
    state.deletingId = null;
    toast('Рецепт удалён');
    await loadRecipes();
  } catch (error) {
    byId('delete-error').textContent = error.message;
    byId('delete-error').hidden = false;
  } finally { button.disabled = false; }
}

function resetFilters() {
  state.title = '';
  state.maxCookingTime = '';
  state.page = 1;
  byId('search-input').value = '';
  byId('time-filter').value = '';
  loadRecipes();
}

let searchTimer;
byId('search-input').addEventListener('input', (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.title = event.target.value.trim();
    state.page = 1;
    loadRecipes();
  }, 320);
});
byId('time-filter').addEventListener('change', (event) => {
  state.maxCookingTime = event.target.value;
  state.page = 1;
  loadRecipes();
});
byId('reset-filters').addEventListener('click', resetFilters);
for (const id of ['header-create', 'hero-create', 'footer-create']) {
  byId(id).addEventListener('click', () => openForm());
}
byId('recipe-form').addEventListener('submit', submitRecipe);
byId('confirm-delete').addEventListener('click', deleteRecipe);

// Buttons added dynamically are handled through event delegation.
document.addEventListener('click', (event) => {
  const closeButton = event.target.closest('[data-close]');
  if (closeButton) { closeDialog(closeButton.dataset.close); return; }
  const pageButton = event.target.closest('[data-page]');
  if (pageButton && !pageButton.disabled) {
    state.page = Number(pageButton.dataset.page);
    loadRecipes();
    byId('collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const id = Number(actionButton.dataset.id);
  switch (actionButton.dataset.action) {
    case 'create': openForm(); break;
    case 'reset': resetFilters(); break;
    case 'retry': loadRecipes(); break;
    case 'open': openDetail(id); break;
    case 'edit': {
      const recipe = currentRecipe(id);
      if (recipe) openForm(recipe);
      break;
    }
    case 'delete': openDelete(id); break;
  }
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

loadRecipes();
