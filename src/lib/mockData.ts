import type { Equipment, Category, Location, DashboardData } from './types'

export const mockCategories: Category[] = [
  { id: 1, name: 'Computadores', description: 'Desktops e workstations', color: '#6366f1', icon: 'Monitor', equipment_count: 14, created_at: '2024-01-10T10:00:00Z' },
  { id: 2, name: 'Notebooks', description: 'Laptops e ultrabooks', color: '#8b5cf6', icon: 'Laptop', equipment_count: 22, created_at: '2024-01-10T10:00:00Z' },
  { id: 3, name: 'Monitores', description: 'Monitores e displays', color: '#06b6d4', icon: 'Tv', equipment_count: 31, created_at: '2024-01-10T10:00:00Z' },
  { id: 4, name: 'Impressoras', description: 'Impressoras e scanners', color: '#f59e0b', icon: 'Printer', equipment_count: 8, created_at: '2024-01-10T10:00:00Z' },
  { id: 5, name: 'Redes', description: 'Switches, roteadores e APs', color: '#10b981', icon: 'Wifi', equipment_count: 11, created_at: '2024-01-10T10:00:00Z' },
  { id: 6, name: 'Periféricos', description: 'Teclados, mouses e headsets', color: '#ef4444', icon: 'Mouse', equipment_count: 47, created_at: '2024-01-10T10:00:00Z' },
  { id: 7, name: 'Servidores', description: 'Servidores e storages', color: '#f97316', icon: 'Server', equipment_count: 5, created_at: '2024-01-10T10:00:00Z' },
  { id: 8, name: 'Telefonia', description: 'Telefones IP e ramais', color: '#84cc16', icon: 'Phone', equipment_count: 18, created_at: '2024-01-10T10:00:00Z' },
]

export const mockLocations: Location[] = [
  { id: 1, name: 'Almoxarifado', description: 'Estoque principal de TI', equipment_count: 12, created_at: '2024-01-10T10:00:00Z' },
  { id: 2, name: 'TI', description: 'Sala da equipe de TI', equipment_count: 18, created_at: '2024-01-10T10:00:00Z' },
  { id: 3, name: 'Administrativo', description: 'Setor administrativo', equipment_count: 25, created_at: '2024-01-10T10:00:00Z' },
  { id: 4, name: 'Financeiro', description: 'Setor financeiro', equipment_count: 14, created_at: '2024-01-10T10:00:00Z' },
  { id: 5, name: 'Diretoria', description: 'Salas da diretoria', equipment_count: 9, created_at: '2024-01-10T10:00:00Z' },
  { id: 6, name: 'Recepção', description: 'Recepção e entrada', equipment_count: 4, created_at: '2024-01-10T10:00:00Z' },
  { id: 7, name: 'RH', description: 'Recursos Humanos', equipment_count: 11, created_at: '2024-01-10T10:00:00Z' },
  { id: 8, name: 'Comercial', description: 'Setor comercial', equipment_count: 20, created_at: '2024-01-10T10:00:00Z' },
]

export const mockEquipment: Equipment[] = [
  { id: 1, name: 'Notebook Dell Latitude 5520', category_id: 2, category_name: 'Notebooks', category_color: '#8b5cf6', category_icon: 'Laptop', brand: 'Dell', model: 'Latitude 5520', serial_number: 'DL5520-001', asset_tag: 'PAT-0001', status: 'em_uso', location_id: 3, location_name: 'Administrativo', assigned_to: 'Ana Paula Ferreira', purchase_date: '2023-03-15', purchase_price: 4800, notes: '', created_at: '2023-03-15T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 2, name: 'Desktop HP EliteDesk 800', category_id: 1, category_name: 'Computadores', category_color: '#6366f1', category_icon: 'Monitor', brand: 'HP', model: 'EliteDesk 800 G6', serial_number: 'HP800G6-002', asset_tag: 'PAT-0002', status: 'disponivel', location_id: 1, location_name: 'Almoxarifado', assigned_to: '', purchase_date: '2023-05-20', purchase_price: 3200, notes: '', created_at: '2023-05-20T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 3, name: 'Monitor LG 27" 4K', category_id: 3, category_name: 'Monitores', category_color: '#06b6d4', category_icon: 'Tv', brand: 'LG', model: '27UL500-W', serial_number: 'LG27-003', asset_tag: 'PAT-0003', status: 'em_uso', location_id: 5, location_name: 'Diretoria', assigned_to: 'Carlos Mendes', purchase_date: '2023-06-01', purchase_price: 2100, notes: '', created_at: '2023-06-01T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 4, name: 'Switch Cisco Catalyst 2960', category_id: 5, category_name: 'Redes', category_color: '#10b981', category_icon: 'Wifi', brand: 'Cisco', model: 'Catalyst 2960-X', serial_number: 'CSC2960-004', asset_tag: 'PAT-0004', status: 'em_uso', location_id: 2, location_name: 'TI', assigned_to: 'Equipe TI', purchase_date: '2022-11-10', purchase_price: 8500, notes: 'Switch core da rede', created_at: '2022-11-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 5, name: 'Impressora HP LaserJet Pro', category_id: 4, category_name: 'Impressoras', category_color: '#f59e0b', category_icon: 'Printer', brand: 'HP', model: 'LaserJet Pro M404n', serial_number: 'HP404-005', asset_tag: 'PAT-0005', status: 'manutencao', location_id: 3, location_name: 'Administrativo', assigned_to: '', purchase_date: '2022-08-15', purchase_price: 1800, notes: 'Aguardando peça de reposição', created_at: '2022-08-15T10:00:00Z', updated_at: '2024-03-05T10:00:00Z' },
  { id: 6, name: 'Notebook Lenovo ThinkPad X1', category_id: 2, category_name: 'Notebooks', category_color: '#8b5cf6', category_icon: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1 Carbon', serial_number: 'LNV-X1-006', asset_tag: 'PAT-0006', status: 'em_uso', location_id: 4, location_name: 'Financeiro', assigned_to: 'Roberto Silva', purchase_date: '2023-09-10', purchase_price: 6500, notes: '', created_at: '2023-09-10T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 7, name: 'Servidor Dell PowerEdge R740', category_id: 7, category_name: 'Servidores', category_color: '#f97316', category_icon: 'Server', brand: 'Dell', model: 'PowerEdge R740', serial_number: 'DLPE-R740-007', asset_tag: 'PAT-0007', status: 'em_uso', location_id: 2, location_name: 'TI', assigned_to: 'Equipe TI', purchase_date: '2022-01-20', purchase_price: 32000, notes: 'Servidor principal de aplicações', created_at: '2022-01-20T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 8, name: 'Desktop Lenovo ThinkCentre M90', category_id: 1, category_name: 'Computadores', category_color: '#6366f1', category_icon: 'Monitor', brand: 'Lenovo', model: 'ThinkCentre M90n', serial_number: 'LNV-M90-008', asset_tag: 'PAT-0008', status: 'inativo', location_id: 1, location_name: 'Almoxarifado', assigned_to: '', purchase_date: '2019-05-10', purchase_price: 2800, notes: 'Equipamento obsoleto para descarte', created_at: '2019-05-10T10:00:00Z', updated_at: '2024-02-15T10:00:00Z' },
  { id: 9, name: 'Access Point Ubiquiti UniFi', category_id: 5, category_name: 'Redes', category_color: '#10b981', category_icon: 'Wifi', brand: 'Ubiquiti', model: 'UniFi AP AC Pro', serial_number: 'UBT-UAP-009', asset_tag: 'PAT-0009', status: 'em_uso', location_id: 3, location_name: 'Administrativo', assigned_to: 'Equipe TI', purchase_date: '2023-02-28', purchase_price: 950, notes: '', created_at: '2023-02-28T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 10, name: 'Telefone IP Grandstream', category_id: 8, category_name: 'Telefonia', category_color: '#84cc16', category_icon: 'Phone', brand: 'Grandstream', model: 'GXP1630', serial_number: 'GST-010', asset_tag: 'PAT-0010', status: 'disponivel', location_id: 1, location_name: 'Almoxarifado', assigned_to: '', purchase_date: '2023-07-12', purchase_price: 280, notes: '', created_at: '2023-07-12T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 11, name: 'Monitor Samsung 24" Full HD', category_id: 3, category_name: 'Monitores', category_color: '#06b6d4', category_icon: 'Tv', brand: 'Samsung', model: 'F24T650FYN', serial_number: 'SMG24-011', asset_tag: 'PAT-0011', status: 'disponivel', location_id: 1, location_name: 'Almoxarifado', assigned_to: '', purchase_date: '2023-11-05', purchase_price: 820, notes: '', created_at: '2023-11-05T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
  { id: 12, name: 'Notebook Apple MacBook Pro 14"', category_id: 2, category_name: 'Notebooks', category_color: '#8b5cf6', category_icon: 'Laptop', brand: 'Apple', model: 'MacBook Pro M3', serial_number: 'APL-MBP14-012', asset_tag: 'PAT-0012', status: 'em_uso', location_id: 5, location_name: 'Diretoria', assigned_to: 'Fernanda Costa', purchase_date: '2024-01-08', purchase_price: 14900, notes: '', created_at: '2024-01-08T10:00:00Z', updated_at: '2024-01-10T10:00:00Z' },
]

export const mockDashboard: DashboardData = {
  total: 156,
  disponivel: 42,
  em_uso: 98,
  manutencao: 7,
  inativo: 9,
  byCategory: [
    { name: 'Periféricos', color: '#ef4444', icon: 'Mouse', count: 47 },
    { name: 'Monitores', color: '#06b6d4', icon: 'Tv', count: 31 },
    { name: 'Notebooks', color: '#8b5cf6', icon: 'Laptop', count: 22 },
    { name: 'Telefonia', color: '#84cc16', icon: 'Phone', count: 18 },
    { name: 'Computadores', color: '#6366f1', icon: 'Monitor', count: 14 },
    { name: 'Redes', color: '#10b981', icon: 'Wifi', count: 11 },
  ],
  recent: mockEquipment.slice(0, 5),
  recentMovements: [
    { id: 1, equipment_id: 12, equipment_name: 'Notebook Apple MacBook Pro 14"', type: 'cadastro', description: 'Equipamento cadastrado', performed_by: 'sistema', created_at: '2024-01-08T10:00:00Z' },
    { id: 2, equipment_id: 5, equipment_name: 'Impressora HP LaserJet Pro', type: 'status', description: 'Status alterado para: manutencao', performed_by: 'usuário', created_at: '2024-03-05T09:30:00Z' },
    { id: 3, equipment_id: 8, equipment_name: 'Desktop Lenovo ThinkCentre M90', type: 'status', description: 'Status alterado para: inativo', performed_by: 'usuário', created_at: '2024-02-15T14:20:00Z' },
    { id: 4, equipment_id: 6, equipment_name: 'Notebook Lenovo ThinkPad X1', type: 'cadastro', description: 'Equipamento cadastrado', performed_by: 'sistema', created_at: '2023-09-10T10:00:00Z' },
    { id: 5, equipment_id: 7, equipment_name: 'Servidor Dell PowerEdge R740', type: 'status', description: 'Status alterado para: em_uso', performed_by: 'usuário', created_at: '2022-01-20T10:00:00Z' },
  ],
  byLocation: [
    { name: 'Administrativo', count: 25 },
    { name: 'Comercial',      count: 20 },
    { name: 'TI',             count: 18 },
    { name: 'Telefonia',      count: 18 },
    { name: 'Financeiro',     count: 14 },
  ],
  totalValue: 78650,
  valuedCount: 12,
  monthlyGrowth: [
    { month: 'Nov/24', count: 8 },
    { month: 'Dez/24', count: 5 },
    { month: 'Jan/25', count: 12 },
    { month: 'Fev/25', count: 7 },
    { month: 'Mar/25', count: 15 },
    { month: 'Abr/25', count: 9 },
  ],
}
