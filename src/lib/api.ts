/* eslint-disable @typescript-eslint/no-explicit-any */
import { mockCategories, mockDashboard, mockEquipment, mockLocations } from './mockData'
import type { Category, Equipment, Location } from './types'

const BASE = '/.netlify/functions'
const MOCK = import.meta.env.VITE_MOCK === 'true'

let _eq = [...mockEquipment]
let _cats = [...mockCategories]
let _locs = [...mockLocations]
let _nextId = 100

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na requisição')
  return data
}

function delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms))
}

function filterEquipment(params?: { search?: string; status?: string; category?: number }): Equipment[] {
  let list = _eq
  if (params?.search) {
    const s = params.search.toLowerCase()
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(s) ||
        (e.brand ?? '').toLowerCase().includes(s) ||
        (e.model ?? '').toLowerCase().includes(s) ||
        (e.serial_number ?? '').toLowerCase().includes(s) ||
        (e.asset_tag ?? '').toLowerCase().includes(s) ||
        (e.assigned_to ?? '').toLowerCase().includes(s),
    )
  }
  if (params?.status) list = list.filter((e) => e.status === params.status)
  if (params?.category) list = list.filter((e) => e.category_id === params.category)
  return list
}

export const api = {
  setup: async () => {
    if (MOCK) { await delay(500); return { success: true } }
    return request(`${BASE}/setup`, { method: 'POST' })
  },

  dashboard: async () => {
    if (MOCK) { await delay(400); return { ...mockDashboard } }
    return request(`${BASE}/dashboard`)
  },

  equipment: {
    list: async (params?: { search?: string; status?: string; category?: number; location?: number }) => {
      if (MOCK) { await delay(300); return filterEquipment(params) }
      const qs = new URLSearchParams()
      if (params?.search)   qs.set('search', params.search)
      if (params?.status)   qs.set('status', params.status)
      if (params?.category) qs.set('category', String(params.category))
      if (params?.location) qs.set('location', String(params.location))
      return request(`${BASE}/equipment${qs.toString() ? '?' + qs.toString() : ''}`)
    },
    get: async (id: number) => {
      if (MOCK) { await delay(200); return _eq.find((e) => e.id === id) }
      return request(`${BASE}/equipment?id=${id}`)
    },
    create: async (data: any) => {
      if (MOCK) {
        await delay(400)
        const cat = _cats.find((c) => c.id === data.category_id)
        const loc = _locs.find((l) => l.id === data.location_id)
        const newEq: Equipment = {
          id: _nextId++,
          name: data.name ?? '',
          category_id: data.category_id ?? undefined,
          category_name: cat?.name,
          category_color: cat?.color,
          category_icon: cat?.icon,
          brand: data.brand ?? undefined,
          model: data.model ?? undefined,
          serial_number: data.serial_number ?? undefined,
          asset_tag: data.asset_tag ?? undefined,
          status: data.status ?? 'disponivel',
          location_id: data.location_id ?? undefined,
          location_name: loc?.name,
          assigned_to: data.assigned_to ?? undefined,
          purchase_date: data.purchase_date ?? undefined,
          purchase_price: data.purchase_price ?? undefined,
          notes: data.notes ?? undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        _eq = [newEq, ..._eq]
        return newEq
      }
      return request(`${BASE}/equipment`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) {
        await delay(400)
        const cat = data.category_id ? _cats.find((c: Category) => c.id === data.category_id) : undefined
        const loc = data.location_id ? _locs.find((l: Location) => l.id === data.location_id) : undefined
        _eq = _eq.map((e) =>
          e.id === id
            ? {
                ...e,
                ...data,
                category_name: cat?.name ?? e.category_name,
                category_color: cat?.color ?? e.category_color,
                location_name: loc?.name ?? e.location_name,
                updated_at: new Date().toISOString(),
              }
            : e,
        )
        return _eq.find((e) => e.id === id)
      }
      return request(`${BASE}/equipment?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) { await delay(300); _eq = _eq.filter((e) => e.id !== id); return { success: true } }
      return request(`${BASE}/equipment?id=${id}`, { method: 'DELETE' })
    },
  },

  categories: {
    list: async () => {
      if (MOCK) { await delay(200); return [..._cats] }
      return request(`${BASE}/categories`)
    },
    create: async (data: any) => {
      if (MOCK) {
        await delay(400)
        const newCat: Category = {
          id: _nextId++,
          name: data.name ?? '',
          description: data.description,
          color: data.color ?? '#6366f1',
          icon: data.icon ?? 'Monitor',
          equipment_count: 0,
          created_at: new Date().toISOString(),
        }
        _cats = [..._cats, newCat]
        return newCat
      }
      return request(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) {
        await delay(400)
        _cats = _cats.map((c) => (c.id === id ? { ...c, ...data } : c))
        return _cats.find((c) => c.id === id)
      }
      return request(`${BASE}/categories?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) {
        await delay(300)
        if (_eq.some((e) => e.category_id === id)) throw new Error('Categoria possui equipamentos vinculados')
        _cats = _cats.filter((c) => c.id !== id)
        return { success: true }
      }
      return request(`${BASE}/categories?id=${id}`, { method: 'DELETE' })
    },
  },

  users: {
    list: async () => {
      if (MOCK) {
        await delay(200)
        return [
          { id: 1, name: 'Alexandre Amorim', email: 'alexandre.amorim@rttshop.com.br', role: 'Administrador de TI', active: true, created_at: new Date().toISOString() },
          { id: 2, name: 'Administrador',    email: 'admin@rtt.com',                   role: 'Administrador de TI', active: true, created_at: new Date().toISOString() },
          { id: 3, name: 'Equipe TI',        email: 'ti@rtt.com',                      role: 'Técnico de TI',       active: true, created_at: new Date().toISOString() },
        ]
      }
      return request(`${BASE}/users`)
    },
    create: async (data: any) => {
      if (MOCK) { await delay(400); return { id: _nextId++, ...data, active: true, created_at: new Date().toISOString() } }
      return request(`${BASE}/users`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) { await delay(400); return { id, ...data } }
      return request(`${BASE}/users?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    deactivate: async (id: number) => {
      if (MOCK) { await delay(300); return { success: true } }
      return request(`${BASE}/users?id=${id}`, { method: 'DELETE' })
    },
  },

  locations: {
    list: async () => {
      if (MOCK) { await delay(200); return [..._locs] }
      return request(`${BASE}/locations`)
    },
    create: async (data: any) => {
      if (MOCK) {
        await delay(400)
        const newLoc: Location = {
          id: _nextId++,
          name: data.name ?? '',
          description: data.description,
          equipment_count: 0,
          created_at: new Date().toISOString(),
        }
        _locs = [..._locs, newLoc]
        return newLoc
      }
      return request(`${BASE}/locations`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any) => {
      if (MOCK) {
        await delay(400)
        _locs = _locs.map((l) => (l.id === id ? { ...l, ...data } : l))
        return _locs.find((l) => l.id === id)
      }
      return request(`${BASE}/locations?id=${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    delete: async (id: number) => {
      if (MOCK) {
        await delay(300)
        if (_eq.some((e) => e.location_id === id)) throw new Error('Local possui equipamentos vinculados')
        _locs = _locs.filter((l) => l.id !== id)
        return { success: true }
      }
      return request(`${BASE}/locations?id=${id}`, { method: 'DELETE' })
    },
  },
}
