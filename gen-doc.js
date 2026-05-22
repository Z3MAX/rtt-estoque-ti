const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ExternalHyperlink, LevelFormat,
  TableOfContents, VerticalAlign,
} = require('./node_modules/docx')
const fs = require('fs')

// ─── Colours ──────────────────────────────────────────────────────────────
const RED   = 'E30613'
const DARK  = '1E293B'
const GREY  = '64748B'
const LGREY = 'F1F5F9'
const WHITE = 'FFFFFF'
const BORDER_COLOR = 'E2E8F0'

// ─── Reusable border / cell helpers ───────────────────────────────────────
const b = (color = BORDER_COLOR) => ({ style: BorderStyle.SINGLE, size: 1, color })
const borders = (color = BORDER_COLOR) => ({ top: b(color), bottom: b(color), left: b(color), right: b(color) })
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' })
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() })

function cell(text, { width = 4680, bold = false, shade = null, color = DARK, align = AlignmentType.LEFT, vAlign = VerticalAlign.CENTER, colSpan } = {}) {
  const props = {
    borders: borders(),
    width: { size: width, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    verticalAlign: vAlign,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, font: 'Arial', size: 20, color })],
    })],
  }
  if (shade) props.shading = { fill: shade, type: ShadingType.CLEAR }
  if (colSpan) props.columnSpan = colSpan
  return new TableCell(props)
}

function headerCell(text, width = 4680) {
  return cell(text, { width, bold: true, shade: DARK, color: WHITE })
}

// ─── Paragraph helpers ────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 36, color: RED })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 28, color: DARK })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 24, color: GREY })],
  })
}

function p(runs, spacing = { before: 80, after: 120 }) {
  const children = Array.isArray(runs)
    ? runs.map(r => typeof r === 'string'
        ? new TextRun({ text: r, font: 'Arial', size: 20, color: DARK })
        : new TextRun({ font: 'Arial', size: 20, color: DARK, ...r }))
    : [new TextRun({ text: runs, font: 'Arial', size: 20, color: DARK })]
  return new Paragraph({ spacing, children })
}

function bold(text) { return { text, bold: true } }
function code(text) { return { text, font: 'Courier New', size: 18, color: RED } }

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: DARK })],
  })
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: 'Arial', size: 20, color: DARK })],
  })
}

function divider() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
    children: [],
  })
}

function space(before = 200, after = 0) {
  return new Paragraph({ spacing: { before, after }, children: [] })
}

function infoBox(label, text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1400, 7960],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: borders(RED),
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: 'FFF0F1', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 18, color: RED })],
          })],
        }),
        new TableCell({
          borders: borders(RED),
          width: { size: 7960, type: WidthType.DXA },
          shading: { fill: 'FFF0F1', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 150, right: 150 },
          children: [new Paragraph({
            children: [new TextRun({ text, font: 'Arial', size: 20, color: DARK })],
          })],
        }),
      ],
    })],
  })
}

// ─── Document ─────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '○', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: RED },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: GREY },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════════════════
    // CAPA
    // ═══════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        space(2000),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'REMA TIP TOP', bold: true, font: 'Arial', size: 48, color: RED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
          children: [new TextRun({ text: 'Controle de Estoque TI', font: 'Arial', size: 28, color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: {
            top: { style: BorderStyle.SINGLE, size: 6, color: RED },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: RED },
          },
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ text: 'DOCUMENTAÇÃO DO SISTEMA', bold: true, font: 'Arial', size: 36, color: DARK })],
        }),
        space(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: 'Sistema RTT — Gestão de Ativos de TI', font: 'Arial', size: 24, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: 'Versão 1.0.0', font: 'Arial', size: 22, color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: '2025', font: 'Arial', size: 22, color: GREY })],
        }),
        space(2000),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'www.rttshop.com.br', font: 'Arial', size: 20, color: GREY })],
        }),
      ],
    },

    // ═══════════════════════════════════════════════════════════
    // SUMÁRIO + CONTEÚDO PRINCIPAL
    // ═══════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1260, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({ text: 'Rema Tip Top  |  Documentação do Sistema RTT', font: 'Arial', size: 18, color: GREY }),
              new TextRun({ text: '  v1.0.0', font: 'Arial', size: 18, color: GREY }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
            spacing: { before: 120, after: 0 },
            children: [
              new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: GREY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: GREY }),
              new TextRun({ text: ' de ', font: 'Arial', size: 18, color: GREY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: GREY }),
            ],
          })],
        }),
      },
      children: [
        // ─── Sumário ───────────────────────────────────────────
        h1('Sumário'),
        new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 1. Visão Geral ────────────────────────────────────
        h1('1. Visão Geral do Sistema'),
        p('O sistema RTT é uma plataforma web de gestão de ativos de TI desenvolvida exclusivamente para a Rema Tip Top. Permite controlar todo o inventário de equipamentos tecnológicos da empresa — de computadores e notebooks a impressoras e periféricos — em um único lugar, com acesso via navegador, sem necessidade de instalação.'),
        space(),

        h2('1.1 Objetivo'),
        p('Centralizar o controle de todos os equipamentos de TI da organização, possibilitando:'),
        bullet('Registro completo de cada ativo (marca, modelo, serial, patrimônio)'),
        bullet('Rastreamento de localização e responsável por cada equipamento'),
        bullet('Visualização em tempo real do status do inventário'),
        bullet('Histórico de movimentações e alterações de status'),
        bullet('Importação e exportação em massa via planilha Excel'),
        space(),

        h2('1.2 Tecnologia'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell('Componente', 3120), headerCell('Tecnologia utilizada', 6240)] }),
            new TableRow({ children: [cell('Frontend', { width: 3120, shade: LGREY }), cell('React 18 + TypeScript + Tailwind CSS', { width: 6240 })] }),
            new TableRow({ children: [cell('Backend', { width: 3120, shade: LGREY }), cell('Netlify Functions (Node.js serverless)', { width: 6240 })] }),
            new TableRow({ children: [cell('Banco de dados', { width: 3120, shade: LGREY }), cell('PostgreSQL via Neon DB (nuvem)', { width: 6240 })] }),
            new TableRow({ children: [cell('Hospedagem', { width: 3120, shade: LGREY }), cell('Netlify (CDN global)', { width: 6240 })] }),
            new TableRow({ children: [cell('Autenticação', { width: 3120, shade: LGREY }), cell('JWT (JSON Web Tokens) — sessão de 8 horas', { width: 6240 })] }),
            new TableRow({ children: [cell('E-mail', { width: 3120, shade: LGREY }), cell('Gmail SMTP via Nodemailer', { width: 6240 })] }),
          ],
        }),
        space(200),

        h2('1.3 Acesso ao Sistema'),
        p(['URL de acesso: ', { text: 'https://rttestoque.netlify.app', color: RED, bold: true }]),
        p('O sistema é totalmente acessível via navegador web (Chrome, Edge, Firefox, Safari) em computadores, tablets e celulares. Não é necessário instalar nenhum aplicativo.'),
        space(),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 2. Módulos ────────────────────────────────────────
        h1('2. Módulos do Sistema'),

        h2('2.1 Dashboard'),
        p('Tela inicial exibida após o login. Apresenta uma visão consolidada e em tempo real de todo o inventário.'),
        space(60),

        h3('Informações exibidas:'),
        bullet('Total de equipamentos cadastrados'),
        bullet('Quantidade por status: Disponível, Em Uso, Manutenção, Inativo'),
        bullet('Gráfico de distribuição por categoria'),
        bullet('Últimos 5 equipamentos cadastrados'),
        bullet('Últimas 8 movimentações registradas no sistema'),
        space(),

        h2('2.2 Equipamentos'),
        p('Módulo principal do sistema. Lista todos os ativos de TI cadastrados com filtros e ferramentas de gestão.'),
        space(60),

        h3('Funcionalidades:'),
        bullet('Listagem completa com colunas: Nome, Categoria, Serial/Patrimônio, Responsável, Local, Status'),
        bullet('Busca por nome, marca, modelo, número de série ou patrimônio'),
        bullet('Filtro por status (Disponível, Em Uso, Manutenção, Inativo)'),
        bullet('Filtro por categoria'),
        bullet('Cadastro de novo equipamento (botão "Novo equipamento")'),
        bullet('Edição de qualquer campo do equipamento'),
        bullet('Exclusão de equipamentos'),
        bullet('Importação em massa via arquivo Excel (.xlsx)'),
        bullet('Exportação da lista atual (com filtros aplicados) para Excel'),
        space(60),

        h3('Campos de cada equipamento:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 2200, 4360],
          rows: [
            new TableRow({ children: [headerCell('Campo', 2800), headerCell('Obrigatório', 2200), headerCell('Descrição', 4360)] }),
            new TableRow({ children: [cell('Nome', { width: 2800, shade: LGREY }), cell('Sim', { width: 2200 }), cell('Nome do equipamento', { width: 4360 })] }),
            new TableRow({ children: [cell('Categoria', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Tipo do equipamento (Notebook, Monitor, etc.)', { width: 4360 })] }),
            new TableRow({ children: [cell('Marca', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Fabricante (Dell, HP, Lenovo, etc.)', { width: 4360 })] }),
            new TableRow({ children: [cell('Modelo', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Modelo específico do equipamento', { width: 4360 })] }),
            new TableRow({ children: [cell('Número de série', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Serial number fornecido pelo fabricante', { width: 4360 })] }),
            new TableRow({ children: [cell('Patrimônio', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Código de patrimônio interno da empresa', { width: 4360 })] }),
            new TableRow({ children: [cell('Status', { width: 2800, shade: LGREY }), cell('Sim', { width: 2200 }), cell('Disponível / Em Uso / Manutenção / Inativo', { width: 4360 })] }),
            new TableRow({ children: [cell('Local', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Onde o equipamento está fisicamente', { width: 4360 })] }),
            new TableRow({ children: [cell('Responsável', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Nome do usuário que está usando o equipamento', { width: 4360 })] }),
            new TableRow({ children: [cell('Data de compra', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Data de aquisição do equipamento', { width: 4360 })] }),
            new TableRow({ children: [cell('Valor (R$)', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Custo de aquisição', { width: 4360 })] }),
            new TableRow({ children: [cell('Observações', { width: 2800, shade: LGREY }), cell('Não', { width: 2200 }), cell('Notas adicionais sobre o equipamento', { width: 4360 })] }),
          ],
        }),
        space(200),

        h3('Status disponíveis:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell('Status', 2340), headerCell('Descrição', 7020)] }),
            new TableRow({ children: [cell('Disponível', { width: 2340, shade: 'ECFDF5', color: '065F46' }), cell('Equipamento disponível para uso, em estoque ou aguardando atribuição', { width: 7020 })] }),
            new TableRow({ children: [cell('Em Uso', { width: 2340, shade: 'EFF6FF', color: '1E40AF' }), cell('Equipamento em uso por um colaborador ou setor', { width: 7020 })] }),
            new TableRow({ children: [cell('Manutenção', { width: 2340, shade: 'FFFBEB', color: '92400E' }), cell('Equipamento em reparo, aguardando peças ou em assistência técnica', { width: 7020 })] }),
            new TableRow({ children: [cell('Inativo', { width: 2340, shade: LGREY, color: GREY }), cell('Equipamento fora de uso, obsoleto ou descartado', { width: 7020 })] }),
          ],
        }),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        h2('2.3 Categorias'),
        p('Gerenciamento dos tipos de equipamento. Cada categoria possui nome, descrição, cor e ícone personalizados que aparecem em toda a interface do sistema.'),
        space(60),

        h3('Funcionalidades:'),
        bullet('Listar todas as categorias cadastradas com contagem de equipamentos'),
        bullet('Criar nova categoria com nome, descrição, cor e ícone'),
        bullet('Editar categoria existente'),
        bullet('Excluir categoria (somente se não houver equipamentos vinculados)'),
        space(60),

        h3('Categorias padrão do sistema:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell('Categoria', 3120), headerCell('Descrição', 6240)] }),
            new TableRow({ children: [cell('Computadores', { width: 3120, shade: LGREY }), cell('Desktops, workstations e servidores', { width: 6240 })] }),
            new TableRow({ children: [cell('Notebooks', { width: 3120, shade: LGREY }), cell('Laptops e ultrabooks', { width: 6240 })] }),
            new TableRow({ children: [cell('Monitores', { width: 3120, shade: LGREY }), cell('Monitores e displays', { width: 6240 })] }),
            new TableRow({ children: [cell('Impressoras', { width: 3120, shade: LGREY }), cell('Impressoras e scanners', { width: 6240 })] }),
            new TableRow({ children: [cell('Redes', { width: 3120, shade: LGREY }), cell('Switches, roteadores e access points', { width: 6240 })] }),
            new TableRow({ children: [cell('Periféricos', { width: 3120, shade: LGREY }), cell('Teclados, mouses e headsets', { width: 6240 })] }),
            new TableRow({ children: [cell('Servidores', { width: 3120, shade: LGREY }), cell('Servidores e storages', { width: 6240 })] }),
            new TableRow({ children: [cell('Telefonia', { width: 3120, shade: LGREY }), cell('Telefones IP e ramais', { width: 6240 })] }),
          ],
        }),
        space(200),

        h2('2.4 Locais'),
        p('Controla os locais físicos onde os equipamentos estão alocados dentro da empresa.'),
        space(60),

        h3('Funcionalidades:'),
        bullet('Listar todos os locais com contagem de equipamentos em cada um'),
        bullet('Clicar em um local exibe todos os equipamentos alocados nele (drill-down)'),
        bullet('Criar, editar e excluir locais'),
        bullet('Exclusão bloqueada se houver equipamentos vinculados'),
        space(60),

        h3('Drill-down de equipamentos por local:'),
        p('Ao clicar em qualquer card de local, um painel lateral exibe a lista completa de equipamentos naquele local, mostrando: nome, categoria, responsável e status de cada item. Útil para auditorias rápidas ou levantamento físico.'),
        space(60),

        h3('Locais padrão do sistema:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell('Local', 3120), headerCell('Descrição', 6240)] }),
            new TableRow({ children: [cell('Almoxarifado', { width: 3120, shade: LGREY }), cell('Estoque principal de TI', { width: 6240 })] }),
            new TableRow({ children: [cell('TI', { width: 3120, shade: LGREY }), cell('Sala da equipe de TI', { width: 6240 })] }),
            new TableRow({ children: [cell('Administrativo', { width: 3120, shade: LGREY }), cell('Setor administrativo', { width: 6240 })] }),
            new TableRow({ children: [cell('Financeiro', { width: 3120, shade: LGREY }), cell('Setor financeiro', { width: 6240 })] }),
            new TableRow({ children: [cell('Diretoria', { width: 3120, shade: LGREY }), cell('Salas da diretoria', { width: 6240 })] }),
            new TableRow({ children: [cell('Recepção', { width: 3120, shade: LGREY }), cell('Recepção e entrada', { width: 6240 })] }),
            new TableRow({ children: [cell('RH', { width: 3120, shade: LGREY }), cell('Recursos Humanos', { width: 6240 })] }),
            new TableRow({ children: [cell('Comercial', { width: 3120, shade: LGREY }), cell('Setor comercial', { width: 6240 })] }),
          ],
        }),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        h2('2.5 Usuários'),
        p('Módulo exclusivo para administradores. Permite gerenciar todos os usuários que têm acesso ao sistema.'),
        space(60),

        h3('Funcionalidades:'),
        bullet('Listar todos os usuários com nome, e-mail, papel e status (ativo/inativo)'),
        bullet('Criar novo usuário — envia automaticamente um e-mail de convite com link para definir a senha'),
        bullet('Editar dados do usuário (nome, e-mail, papel, senha)'),
        bullet('Ativar ou desativar usuário (desativação não exclui os dados)'),
        space(60),

        h3('Papéis disponíveis:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell('Papel', 3120), headerCell('Permissões', 6240)] }),
            new TableRow({
              children: [
                cell('Administrador de TI', { width: 3120, shade: 'FFF0F1', color: RED }),
                cell('Acesso total: gerencia usuários, categorias, locais, equipamentos e visualiza dashboard', { width: 6240 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Técnico de TI', { width: 3120, shade: LGREY }),
                cell('Acesso a equipamentos e dashboard; não pode gerenciar usuários, categorias ou locais', { width: 6240 }),
              ],
            }),
          ],
        }),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 3. Autenticação ───────────────────────────────────
        h1('3. Autenticação e Acesso'),

        h2('3.1 Login'),
        numbered('Acesse a URL do sistema no navegador'),
        numbered('Informe o e-mail e a senha cadastrados'),
        numbered('Clique em "Entrar"'),
        numbered('O sistema redireciona para o Dashboard'),
        space(120),
        p(['A sessão é válida por ', bold('8 horas'), '. Após esse período, o usuário é redirecionado automaticamente para a tela de login.']),
        space(),

        h2('3.2 Primeiro Acesso — Novo Usuário'),
        p('Quando um administrador cadastra um novo usuário, o sistema envia automaticamente um e-mail de convite com um link personalizado. O processo é:'),
        space(60),
        numbered('Administrador cria o usuário na aba "Usuários"'),
        numbered('O sistema envia um e-mail de convite com link válido por 7 dias'),
        numbered('O usuário clica no link e é direcionado para a tela de definição de senha'),
        numbered('O usuário define sua senha pessoal (mínimo 8 caracteres)'),
        numbered('A partir daí, o usuário faz login normalmente'),
        space(),
        infoBox('ATENÇÃO', 'O e-mail de convite nunca contém a senha. O sistema envia apenas um link seguro para o usuário definir a própria senha.'),
        space(200),

        h2('3.3 Recuperação de Senha'),
        p('Caso o usuário esqueça a senha:'),
        space(60),
        numbered('Na tela de login, clique em "Esqueceu a senha?"'),
        numbered('Informe o e-mail cadastrado e clique em "Enviar link de redefinição"'),
        numbered('Verifique o e-mail (incluindo pasta de spam)'),
        numbered('Clique no link recebido — válido por 1 hora'),
        numbered('Defina uma nova senha (mínimo 8 caracteres)'),
        numbered('Faça login com a nova senha'),
        space(),
        infoBox('SEGURANÇA', 'Por segurança, o sistema sempre retorna a mensagem "Se este e-mail estiver cadastrado, você receberá as instruções em breve" — mesmo que o e-mail não exista no sistema, para evitar que terceiros descubram quais e-mails estão cadastrados.'),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 4. Importação/Exportação ──────────────────────────
        h1('4. Importação e Exportação de Dados'),

        h2('4.1 Importação via Excel'),
        p('Permite cadastrar centenas de equipamentos de uma só vez a partir de uma planilha Excel (.xlsx ou .xls).'),
        space(60),

        h3('Como importar:'),
        numbered('Na aba "Equipamentos", clique em "Importar Excel"'),
        numbered('Arraste o arquivo ou clique para selecioná-lo'),
        numbered('O sistema exibe uma prévia dos dados detectados'),
        numbered('Revise as informações e clique em "Importar"'),
        numbered('Acompanhe o progresso da importação'),
        numbered('Ao final, o sistema exibe o relatório: itens criados, falhas e erros detalhados'),
        space(60),

        h3('Colunas reconhecidas automaticamente:'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 6240],
          rows: [
            new TableRow({ children: [headerCell('Coluna na planilha', 3120), headerCell('Campo no sistema', 6240)] }),
            new TableRow({ children: [cell('Nome / Equipamento / Descrição', { width: 3120, shade: LGREY }), cell('Nome do equipamento', { width: 6240 })] }),
            new TableRow({ children: [cell('Marca / Fabricante', { width: 3120, shade: LGREY }), cell('Marca', { width: 6240 })] }),
            new TableRow({ children: [cell('Modelo', { width: 3120, shade: LGREY }), cell('Modelo', { width: 6240 })] }),
            new TableRow({ children: [cell('Serial / Nº de Série', { width: 3120, shade: LGREY }), cell('Número de série', { width: 6240 })] }),
            new TableRow({ children: [cell('Patrimônio / Tag', { width: 3120, shade: LGREY }), cell('Código de patrimônio', { width: 6240 })] }),
            new TableRow({ children: [cell('Status', { width: 3120, shade: LGREY }), cell('Status (disponivel, em_uso, manutencao, inativo)', { width: 6240 })] }),
            new TableRow({ children: [cell('Local / Localização / Setor', { width: 3120, shade: LGREY }), cell('Local (criado automaticamente se não existir)', { width: 6240 })] }),
            new TableRow({ children: [cell('Responsável / Usuário', { width: 3120, shade: LGREY }), cell('Responsável pelo equipamento', { width: 6240 })] }),
            new TableRow({ children: [cell('Data de Compra / Aquisição', { width: 3120, shade: LGREY }), cell('Data de aquisição', { width: 6240 })] }),
            new TableRow({ children: [cell('Valor / Preço / Custo', { width: 3120, shade: LGREY }), cell('Valor de compra', { width: 6240 })] }),
            new TableRow({ children: [cell('Observações / Notas', { width: 3120, shade: LGREY }), cell('Observações adicionais', { width: 6240 })] }),
          ],
        }),
        space(120),
        infoBox('LIMITE', 'Máximo de 500 equipamentos por importação. Para volumes maiores, divida em múltiplos arquivos.'),
        space(200),

        h2('4.2 Exportação para Excel'),
        p('Exporta a lista de equipamentos visível na tela (com todos os filtros aplicados) para um arquivo Excel.'),
        space(60),

        h3('Como exportar:'),
        numbered('Aplique os filtros desejados (status, categoria, busca por texto)'),
        numbered('Clique no botão "Exportar Excel"'),
        numbered('O arquivo é gerado e baixado automaticamente'),
        space(60),

        h3('Colunas exportadas:'),
        p('Nome, Marca, Modelo, Categoria, Status, Local, Responsável, Nº de Série, Patrimônio, Data de Compra, Valor (R$), Observações'),
        p(['O arquivo é nomeado automaticamente como ', { text: 'equipamentos_rtt_AAAA-MM-DD.xlsx', font: 'Courier New', size: 18, color: RED }, ' com a data do dia.']),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 5. Segurança ──────────────────────────────────────
        h1('5. Segurança'),

        h2('5.1 Autenticação por Token (JWT)'),
        p('Todas as requisições ao servidor exigem um token JWT válido, gerado no momento do login. O token expira em 8 horas e é renovado a cada novo login. Se o token expirar, o usuário é redirecionado automaticamente para o login.'),
        space(),

        h2('5.2 Criptografia de Senhas'),
        p(['As senhas são armazenadas no banco de dados criptografadas com o algoritmo ', bold('bcrypt'), ' (12 rounds de salt), que é o padrão da indústria para armazenamento seguro de senhas. É computacionalmente inviável reverter o hash para obter a senha original.']),
        space(),

        h2('5.3 Controle de Acesso por Papel (RBAC)'),
        p('O sistema implementa controle de acesso baseado em papéis no backend. Mesmo que um usuário tente acessar uma funcionalidade restrita via ferramentas externas, o servidor recusa a requisição com erro 403 (Acesso negado).'),
        space(),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 2340, 2340],
          rows: [
            new TableRow({ children: [headerCell('Ação', 4680), headerCell('Administrador', 2340), headerCell('Técnico de TI', 2340)] }),
            new TableRow({ children: [cell('Visualizar Dashboard', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Sim', { width: 2340 })] }),
            new TableRow({ children: [cell('Ver e editar Equipamentos', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Sim', { width: 2340 })] }),
            new TableRow({ children: [cell('Importar/Exportar Excel', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Sim', { width: 2340 })] }),
            new TableRow({ children: [cell('Gerenciar Categorias', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Não', { width: 2340, color: RED })] }),
            new TableRow({ children: [cell('Gerenciar Locais', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Não', { width: 2340, color: RED })] }),
            new TableRow({ children: [cell('Gerenciar Usuários', { width: 4680, shade: LGREY }), cell('Sim', { width: 2340 }), cell('Não', { width: 2340, color: RED })] }),
          ],
        }),
        space(200),

        h2('5.4 Proteção contra Ataques Comuns'),
        bullet(['Brute-force: delay de 400ms em tentativas de login inválidas'].join('')),
        bullet('Enumeração de usuários: respostas genéricas no "Esqueci minha senha"'),
        bullet('Injeção SQL: todas as queries usam parâmetros preparados (Neon tagged templates)'),
        bullet('XSS: React escapa automaticamente todo conteúdo renderizado; e-mails usam função de escape HTML'),
        bullet('Clickjacking: header X-Frame-Options: DENY em todas as respostas'),
        bullet('CORS: restrito ao domínio de produção (SITE_URL)'),
        bullet('HSTS: Strict-Transport-Security ativo (conexões sempre via HTTPS)'),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 6. Guia de Administrador ──────────────────────────
        h1('6. Guia do Administrador'),

        h2('6.1 Criando um Novo Usuário'),
        numbered('Acesse a aba "Usuários" no menu lateral'),
        numbered('Clique em "Novo usuário"'),
        numbered('Preencha: nome completo, e-mail e papel (Administrador ou Técnico)'),
        numbered('Clique em "Criar"'),
        numbered('O sistema envia automaticamente um e-mail de convite para o usuário definir a senha'),
        space(120),
        infoBox('NOTA', 'O usuário receberá o e-mail em até 2 minutos. Caso não receba, verifique a pasta de spam ou edite o usuário para reenviar o convite.'),
        space(200),

        h2('6.2 Desativando um Usuário'),
        p('A desativação de um usuário não exclui seus dados — apenas bloqueia o acesso ao sistema. Para desativar:'),
        numbered('Acesse "Usuários"'),
        numbered('Localize o usuário na lista'),
        numbered('Clique no ícone de edição'),
        numbered('Desmarque a opção "Ativo" e salve'),
        space(),

        h2('6.3 Redefinindo a Senha de um Usuário'),
        p('O próprio usuário pode redefinir a senha pelo fluxo "Esqueci minha senha". Caso o administrador precise forçar uma redefinição:'),
        numbered('Edite o usuário na aba "Usuários"'),
        numbered('Defina uma nova senha temporária de pelo menos 8 caracteres'),
        numbered('Salve — o usuário poderá usar a nova senha imediatamente'),
        space(),

        h2('6.4 Gerenciando Categorias e Locais'),
        p('Apenas administradores podem criar, editar ou excluir categorias e locais. Uma categoria ou local só pode ser excluído se não houver equipamentos vinculados a ele.'),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 7. Infraestrutura ─────────────────────────────────
        h1('7. Infraestrutura e Configuração'),

        h2('7.1 Variáveis de Ambiente (Netlify)'),
        p('O sistema utiliza as seguintes variáveis de ambiente configuradas no painel do Netlify:'),
        space(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 2000, 4240],
          rows: [
            new TableRow({ children: [headerCell('Variável', 3120), headerCell('Obrigatória', 2000), headerCell('Descrição', 4240)] }),
            new TableRow({ children: [cell('DATABASE_URL', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('String de conexão ao banco PostgreSQL (Neon DB)', { width: 4240 })] }),
            new TableRow({ children: [cell('JWT_SECRET', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('Chave secreta para assinar tokens de sessão (mín. 32 chars)', { width: 4240 })] }),
            new TableRow({ children: [cell('SETUP_SECRET', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('Segredo para proteger os endpoints de configuração do banco', { width: 4240 })] }),
            new TableRow({ children: [cell('GMAIL_USER', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('Endereço Gmail usado para envio de e-mails', { width: 4240 })] }),
            new TableRow({ children: [cell('GMAIL_APP_PASSWORD', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('Senha de aplicativo do Gmail (não é a senha da conta)', { width: 4240 })] }),
            new TableRow({ children: [cell('SITE_URL', { width: 3120, shade: LGREY }), cell('Sim', { width: 2000 }), cell('URL pública do sistema (definida automaticamente pelo Netlify)', { width: 4240 })] }),
          ],
        }),
        space(200),

        h2('7.2 Banco de Dados'),
        p('O banco de dados PostgreSQL está hospedado no Neon DB (nuvem). As tabelas principais são:'),
        space(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 7020],
          rows: [
            new TableRow({ children: [headerCell('Tabela', 2340), headerCell('Conteúdo', 7020)] }),
            new TableRow({ children: [cell('users', { width: 2340, shade: LGREY }), cell('Usuários do sistema (id, nome, e-mail, hash da senha, papel, ativo)', { width: 7020 })] }),
            new TableRow({ children: [cell('equipment', { width: 2340, shade: LGREY }), cell('Todos os equipamentos cadastrados e seus atributos', { width: 7020 })] }),
            new TableRow({ children: [cell('categories', { width: 2340, shade: LGREY }), cell('Categorias de equipamentos (nome, cor, ícone)', { width: 7020 })] }),
            new TableRow({ children: [cell('locations', { width: 2340, shade: LGREY }), cell('Locais físicos da empresa', { width: 7020 })] }),
            new TableRow({ children: [cell('movements', { width: 2340, shade: LGREY }), cell('Histórico de movimentações e alterações de status dos equipamentos', { width: 7020 })] }),
            new TableRow({ children: [cell('password_reset_tokens', { width: 2340, shade: LGREY }), cell('Tokens temporários para redefinição de senha e convites', { width: 7020 })] }),
          ],
        }),
        space(200),

        h2('7.3 Deploy e Atualizações'),
        p(['O código-fonte está hospedado no GitHub (', { text: 'github.com/Z3MAX/rtt-estoque-ti', color: RED }, '). Qualquer push para a branch ', bold('master'), ' dispara automaticamente um novo deploy no Netlify, que geralmente leva entre 1 e 3 minutos para ser concluído.']),
        space(120),
        infoBox('DEPLOY', 'Durante o deploy, o sistema continua disponível. A nova versão é publicada atomicamente — sem downtime.'),
        space(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 8. Resolução de Problemas ─────────────────────────
        h1('8. Resolução de Problemas'),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3800, 5560],
          rows: [
            new TableRow({ children: [headerCell('Problema', 3800), headerCell('Solução', 5560)] }),
            new TableRow({
              children: [
                cell('Não consigo fazer login', { width: 3800, shade: LGREY }),
                cell('Verifique e-mail e senha. Use "Esqueci minha senha" para redefinir. Se o usuário estiver desativado, contate o administrador.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('E-mail de convite não chegou', { width: 3800, shade: LGREY }),
                cell('Verifique a pasta de spam. O envio pode levar até 2 minutos. Se o problema persistir, o administrador pode editar o usuário e redefinir uma senha manualmente.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Link de redefinição de senha expirado', { width: 3800, shade: LGREY }),
                cell('Links de recuperação expiram em 1 hora. Acesse novamente "Esqueci minha senha" para gerar um novo link.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Erro ao importar Excel', { width: 3800, shade: LGREY }),
                cell('Verifique se o arquivo é .xlsx ou .xls. O limite é de 500 itens por arquivo. Confira se as colunas têm os nomes reconhecidos pelo sistema.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Não consigo excluir uma categoria ou local', { width: 3800, shade: LGREY }),
                cell('Categorias e locais só podem ser excluídos se não houver equipamentos vinculados. Reatribua os equipamentos antes de excluir.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Sistema lento ou inacessível', { width: 3800, shade: LGREY }),
                cell('A primeira requisição após inatividade pode levar alguns segundos (cold start do Netlify). Se o problema persistir, verifique o painel do Netlify para status de deploy.', { width: 5560 }),
              ],
            }),
            new TableRow({
              children: [
                cell('Sessão expirou durante o uso', { width: 3800, shade: LGREY }),
                cell('A sessão é válida por 8 horas. Após esse período, basta fazer login novamente. Os dados não são perdidos.', { width: 5560 }),
              ],
            }),
          ],
        }),
        space(400),
        divider(),
        space(200),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'Rema Tip Top — Controle de Estoque TI', bold: true, font: 'Arial', size: 22, color: DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: 'Versão 1.0.0  |  2025', font: 'Arial', size: 18, color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'www.rttshop.com.br', font: 'Arial', size: 18, color: GREY })],
        }),
      ],
    },
  ],
})

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('C:/Users/Alexandre Amorim/Downloads/RTT_Documentacao_Sistema.docx', buffer)
  console.log('Documento gerado com sucesso!')
}).catch(console.error)
