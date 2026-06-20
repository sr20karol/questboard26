import * as mock from '../data/mock.js';

// ── Konfiguracja ──────────────────────────────────────────────
export const USE_MOCK = false; // ustaw na false, aby korzystać z prawdziwego API
const API_BASE = 'https://app-poligon-native-prodsr20.azurewebsites.net'; // zmień na adres swojego API

// ── Token JWT ─────────────────────────────────────────────────
export function getToken() {
    return localStorage.getItem('token');
}
export function setToken(token) {
    localStorage.setItem('token', token);
}
export function clearToken() {
    localStorage.removeItem('token');
}
export function isLoggedIn() {
    return !!getToken();
}

// ── Fetch helper ──────────────────────────────────────────────
async function apiFetch(method, url, body) {
    if (USE_MOCK) return getMock(method, url, body);
    const res = await fetch(API_BASE + url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw {
            status: res.status,
            message: err.message ?? `HTTP ${res.status}`,
        };
    }
    if (res.status === 204) return null;
    return res.json();
}

// ── Mock router ───────────────────────────────────────────────
// URL może zawierać query string: /quests?difficulty=Hard&status=Open
function getMock(method, url) {
    const [path, qs] = url.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs ?? ''));

    // GET /quests
    if (path === '/quests') {
        let list = mock.QUESTS.filter((q) => q.status === 'Open');
        if (params.difficulty)
            list = list.filter((q) => q.diff === params.difficulty);
        if (params.regionId)
            list = list.filter((q) => q.regionId === parseInt(params.regionId));
        if (params.minLevel)
            list = list.filter((q) => q.minLvl <= parseInt(params.minLevel));
        return list;
    }

    // GET /quests/review
    if (path === '/quests/review')
        return mock.QUESTS.filter((q) => q.status === 'InReview');

    // GET /quests/:id
    if (path.match(/^\/quests\/\d+$/)) {
        const id = parseInt(path.split('/')[2]);
        return mock.QUESTS.find((q) => q.id === id) ?? null;
    }

    // GET /heroes
    if (path === '/heroes') return [...mock.HEROES];
    if (path === '/heroes/ranking')
        return [...mock.HEROES].sort(
            (a, b) => b.gold - a.gold || b.completed - a.completed,
        );
    if (path === '/heroes/me')
        return mock.HEROES.find((h) => h.id === mock.CURRENT_HERO_ID);

    // GET /heroes/:id
    if (path.match(/^\/heroes\/\d+$/)) {
        const id = parseInt(path.split('/')[2]);
        return mock.HEROES.find((h) => h.id === id) ?? null;
    }

    // GET /items
    if (path === '/items') {
        let list = [...mock.ITEMS];
        if (params.type) list = list.filter((i) => i.type === params.type);
        return list;
    }

    // GET /regions
    if (path === '/regions') return [...mock.REGIONS];
    if (path === '/events') return [...mock.EVENTS];

    // GET /regions/:id/events
    if (path.match(/^\/regions\/\d+\/events$/)) {
        const id = parseInt(path.split('/')[2]);
        return mock.EVENTS.filter((e) => e.regionId === id);
    }

    return null;
}

// ── Publiczne metody API ───────────────────────────────────────
export const api = {
    login: (username, password) =>
        apiFetch('POST', '/auth/login', { username, password }),
    // Questy — filtry przekazywane jako query params (obsługuje mock i backend)
    getQuests: (filters = {}) => {
        const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        ).toString();
        return apiFetch('GET', '/quests' + (qs ? '?' + qs : ''));
        ``;
    },
    getQuest: (id) => apiFetch('GET', `/quests/${id}`),
    joinQuest: (id) => apiFetch('POST', `/quests/${id}/join`),
    startQuest: (id) => apiFetch('POST', `/quests/${id}/start`),
    leaveQuest: (id) => apiFetch('DELETE', `/quests/${id}/leave`),
    completeQuest: (id, report) =>
        apiFetch('POST', `/quests/${id}/complete`, { report }),
    reviewQuest: (id, approve, reason) =>
        apiFetch('PUT', `/quests/${id}/review`, { approve, reason }),
    getReviewQueue: () => apiFetch('GET', '/quests/review'),

    // Bohaterowie
    getHeroes: () => apiFetch('GET', '/heroes'),
    getHero: (id) => apiFetch('GET', `/heroes/${id}`),
    getMe: () => apiFetch('GET', '/heroes/me'),
    getMyQuests: () => apiFetch('GET', '/heroes/me/quests'),
    getRanking: () => apiFetch('GET', '/heroes/ranking'),

    // Itemy — opcjonalne filtrowanie po typie
    getItems: (type) => {
        const qs = type ? '?type=' + type : '';
        return apiFetch('GET', '/items' + qs);
    },
    buyItem: (itemId) => apiFetch('POST', `/heroes/me/items/${itemId}`),

    // Regiony i wydarzenia
    getRegions: () => apiFetch('GET', '/regions'),
    getEvents: (regionId) => apiFetch('GET', `/regions/${regionId}/events`),
    getAllEvents: () => apiFetch('GET', '/events'),
};
