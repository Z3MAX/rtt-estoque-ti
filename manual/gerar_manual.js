const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, ExternalHyperlink,
  PageBreak,
} = require('docx')
const fs = require('fs')

// ─── Colors ───────────────────────────────────────────────────────────────────
const RED    = 'C0392B'
const DARK   = '2C3E50'
const GRAY   = '7F8C8D'
const LGRAY  = 'ECF0F1'
const WHITE  = 'FFFFFF'
const AMBER  = 'F39C12'
const GREEN  = '27AE60'
const BLUE   = '2980B9'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const border = (color = 'DDDDDD') => ({ style: BorderStyle.SINGLE, size: 4, color })
const noBorder = () => ({ style: BorderStyle.NONE, size: 0, color: 'FFFFFF' })
const allBorders = (color) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) })
const noBorders = () => ({ top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() })

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, color: RED, font: 'Arial' })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: DARK, font: 'Arial' })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: BLUE, font: 'Arial' })],
  })
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: DARK, ...opts })],
  })
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: DARK, bold })],
  })
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: 'numbers', level: 0 },
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: 'Arial', color: DARK })],
  })
}

function spacer(lines = 1) {
  return new Paragraph({ children: [new TextRun('')], spacing: { after: lines * 160 } })
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD', space: 1 } },
    children: [new TextRun('')],
  })
}

function infoBox(title, lines, bgColor = 'EBF5FB', accentColor = BLUE) {
  const cellBorders = allBorders(accentColor)
  const rows = []

  // Title row
  rows.push(new TableRow({
    children: [new TableCell({
      borders: { top: border(accentColor), left: border(accentColor), right: border(accentColor), bottom: noBorder() },
      shading: { fill: accentColor, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      width: { size: 9360, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, color: WHITE, font: 'Arial' })] })],
    })],
  }))

  // Content rows
  lines.forEach((line, i) => {
    rows.push(new TableRow({
      children: [new TableCell({
        borders: {
          top: noBorder(),
          left: border(accentColor),
          right: border(accentColor),
          bottom: i === lines.length - 1 ? border(accentColor) : noBorder(),
        },
        shading: { fill: bgColor, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 160, right: 160 },
        width: { size: 9360, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: line, size: 22, font: 'Arial', color: DARK })] })],
      })],
    }))
  })

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows,
  })
}

function stepTable(steps) {
  const rows = steps.map(({ num, title, desc }) =>
    new TableRow({
      children: [
        // Number
        new TableCell({
          borders: allBorders('E8E8E8'),
          shading: { fill: RED, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          width: { size: 800, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(num), bold: true, size: 28, color: WHITE, font: 'Arial' })],
          })],
        }),
        // Content
        new TableCell({
          borders: allBorders('E8E8E8'),
          shading: { fill: 'FAFAFA', type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 160 },
          width: { size: 8560, type: WidthType.DXA },
          children: [
            new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, size: 24, font: 'Arial', color: DARK })] }),
            new Paragraph({ children: [new TextRun({ text: desc, size: 22, font: 'Arial', color: GRAY })] }),
          ],
        }),
      ],
    })
  )

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [800, 8560],
    rows,
  })
}

function roleTable(roles) {
  const headerRow = new TableRow({
    children: [
      ['Perfil', 2880], ['O que pode fazer', 6480],
    ].map(([text, w]) => new TableCell({
      borders: allBorders(RED),
      shading: { fill: RED, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      width: { size: w, type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 22, color: WHITE, font: 'Arial' })] })],
    })),
  })

  const dataRows = roles.map(([role, perms], i) => new TableRow({
    children: [
      new TableCell({
        borders: allBorders('E0E0E0'),
        shading: { fill: i % 2 === 0 ? 'FDF2F2' : WHITE, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        width: { size: 2880, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: role, bold: true, size: 22, font: 'Arial', color: RED })] })],
      }),
      new TableCell({
        borders: allBorders('E0E0E0'),
        shading: { fill: i % 2 === 0 ? 'FDF2F2' : WHITE, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        width: { size: 6480, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: perms, size: 22, font: 'Arial', color: DARK })] })],
      }),
    ],
  }))

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2880, 6480],
    rows: [headerRow, ...dataRows],
  })
}

// ─── Cover Page ───────────────────────────────────────────────────────────────
function coverPage() {
  return [
    spacer(4),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: 'REMA TIP TOP', bold: true, size: 72, color: RED, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'Avaliação de Talentos', size: 40, color: DARK, font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 1 },
      },
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: 'Manual de Utilização do Sistema', bold: true, size: 52, color: DARK, font: 'Arial' })],
    }),
    spacer(3),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Versão 2.0  ·  Junho de 2026', size: 22, color: GRAY, font: 'Arial', italics: true })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
}

// ─── Document content ─────────────────────────────────────────────────────────
const children = [
  ...coverPage(),

  // ── 1. Introdução ────────────────────────────────────────────────────────
  h1('1. Introdução'),
  p('O sistema RTT Talentos é a plataforma de avaliação de desempenho e potencial da Rema Tip Top. Ele permite que gestores avaliem seus colaboradores semestralmente utilizando a metodologia 9-Box, e que o time de RH revise, calibre e consolide os resultados de forma estruturada.'),
  spacer(),
  infoBox('Acesso ao sistema', [
    'URL: https://rtt-talento.netlify.app',
    'Navegadores recomendados: Google Chrome, Microsoft Edge (versão recente)',
    'O sistema funciona em desktop e tablet',
  ], 'EBF5FB', BLUE),
  spacer(),

  // ── 2. Perfis de Acesso ──────────────────────────────────────────────────
  h1('2. Perfis de Acesso'),
  p('O sistema possui três níveis de acesso. Cada perfil tem permissões específicas:'),
  spacer(),
  roleTable([
    ['Administrador Master',   'Acesso total: gerencia usuários, ciclos, avaliações, auditoria e pode excluir ciclos'],
    ['Administrador de RH',    'Abre/encerra ciclos, calibra avaliações, visualiza todos os resultados'],
    ['Gestor',                 'Avalia colaboradores do seu time durante ciclos abertos'],
  ]),
  spacer(),

  // ── 3. Primeiro Acesso ───────────────────────────────────────────────────
  h1('3. Primeiro Acesso'),
  h2('3.1 Convite por e-mail'),
  p('Todo usuário é cadastrado pelo administrador e recebe um e-mail de convite para criar sua senha. O fluxo é:'),
  spacer(),
  stepTable([
    { num: 1, title: 'Receber o e-mail de convite', desc: 'Um e-mail é enviado ao endereço cadastrado com um link de acesso único e temporário.' },
    { num: 2, title: 'Clicar no link do convite', desc: 'O link redireciona para a tela de criação de senha. O link expira após o primeiro uso.' },
    { num: 3, title: 'Criar a senha', desc: 'Defina uma senha segura (mínimo 8 caracteres). Após confirmar, o acesso é liberado automaticamente.' },
    { num: 4, title: 'Entrar no sistema', desc: 'Use o e-mail e a senha criada para fazer login na plataforma.' },
  ]),
  spacer(),
  infoBox('Esqueci minha senha', [
    'Na tela de login, clique em "Esqueci minha senha".',
    'Informe o e-mail cadastrado e um link de redefinição será enviado.',
    'O link é válido por 1 hora.',
  ], 'FEF9E7', AMBER),
  spacer(),

  // ── 4. Navegação Geral ───────────────────────────────────────────────────
  h1('4. Navegação Geral'),
  p('Após o login, o menu lateral esquerdo exibe as abas disponíveis conforme o perfil do usuário:'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2500, 1800, 5060],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 2500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Aba', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Disponível para', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 5060, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Função', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
      ]}),
      ...([
        ['Dashboard',         'Todos',        'Visão geral com indicadores e atividades recentes'],
        ['Colaboradores',     'Todos',        'Cadastro e perfil de cada colaborador'],
        ['Departamentos',     'Todos',        'Agrupamento de colaboradores por área'],
        ['Realizar Avaliação','Todos',        'Lista de colaboradores pendentes de avaliação no ciclo ativo'],
        ['Avaliações',        'Admin / RH',   'Histórico completo de avaliações e calibrações'],
        ['Ciclo de Avaliação','Admin / RH',   'Abertura, acompanhamento e encerramento de ciclos'],
        ['Usuários',          'Admin / RH',   'Gerenciamento de contas e permissões'],
        ['Auditoria',         'Master',       'Log completo de todas as ações no sistema'],
      ].map(([aba, disp, func], i) => new TableRow({ children: [
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: aba, bold: true, size: 22, font: 'Arial', color: DARK })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 1800, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: disp, size: 20, font: 'Arial', color: GRAY })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 5060, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: func, size: 22, font: 'Arial', color: DARK })] })] }),
      ]}))),
    ],
  }),
  spacer(),

  // ── 5. Ciclo de Avaliação (RH) ───────────────────────────────────────────
  new Paragraph({ children: [new PageBreak()] }),
  h1('5. Ciclo de Avaliação (exclusivo RH / Admin)'),
  p('O ciclo de avaliação controla o período em que os gestores podem enviar avaliações. Sem um ciclo aberto, nenhuma avaliação pode ser realizada.'),
  spacer(),

  h2('5.1 Abrir um novo ciclo'),
  stepTable([
    { num: 1, title: 'Acessar "Ciclo de Avaliação"', desc: 'Clique na aba no menu lateral esquerdo.' },
    { num: 2, title: 'Clicar em "Abrir novo ciclo"', desc: 'O botão aparece quando não há nenhum ciclo aberto.' },
    { num: 3, title: 'Definir o período de referência', desc: 'Selecione o semestre correspondente (ex: 1º Sem / 2026).' },
    { num: 4, title: 'Definir o prazo', desc: 'Escolha a data limite para os gestores enviarem suas avaliações.' },
    { num: 5, title: 'Confirmar', desc: 'Clique em "Abrir ciclo". O ciclo é ativado imediatamente e os gestores são liberados para avaliar.' },
  ]),
  spacer(),

  h2('5.2 Acompanhar o ciclo'),
  p('Enquanto o ciclo estiver aberto, o card exibe em tempo real:'),
  bullet('Total de avaliações enviadas pelos gestores'),
  bullet('Quantidade aguardando calibração do RH'),
  bullet('Progresso de cada gestor: avaliações enviadas vs. total de colaboradores do time'),
  spacer(),

  h2('5.3 Encerrar o ciclo'),
  p('Ao encerrar o ciclo, os gestores perdem acesso para enviar novas avaliações. Para encerrar, clique no botão "Encerrar" no card do ciclo aberto e confirme a ação.'),
  spacer(),
  infoBox('Atenção', [
    'Só é possível ter um ciclo aberto por vez.',
    'Encerrar um ciclo não exclui as avaliações já enviadas.',
    'Apenas o Administrador Master pode excluir um ciclo permanentemente.',
  ], 'FEF9E7', AMBER),
  spacer(),

  // ── 6. Realizar Avaliação (Gestor) ───────────────────────────────────────
  new Paragraph({ children: [new PageBreak()] }),
  h1('6. Realizar Avaliação (Gestor)'),
  p('Os gestores só conseguem avaliar colaboradores durante um ciclo aberto. Fora desse período, a aba "Realizar Avaliação" exibe uma mensagem informando que nenhum ciclo está ativo.'),
  spacer(),

  h2('6.1 Selecionar um colaborador para avaliar'),
  stepTable([
    { num: 1, title: 'Acessar "Realizar Avaliação"', desc: 'A tela exibe todos os colaboradores do seu time que ainda não foram avaliados no ciclo atual.' },
    { num: 2, title: 'Localizar o colaborador', desc: 'Use a busca por nome, cargo ou área. Clique no grupo do gestor para expandir a lista.' },
    { num: 3, title: 'Clicar em "Avaliar agora"', desc: 'O botão abre a tela de avaliação completa para aquele colaborador.' },
  ]),
  spacer(),

  h2('6.2 Preencher a avaliação'),
  p('A avaliação é dividida em três eixos:'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 2500, 4660],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Eixo', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 2500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Competências', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 4660, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Descrição', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
      ]}),
      ...([
        ['Eixo X — Desempenho',  '5 (4 para líderes)',   'Qualidade de entregas, prazos, autonomia, impacto e evolução'],
        ['Eixo Y — Potencial',   '5',                    'Foco no cliente, resultado, empreendedorismo, resiliência e performance'],
        ['Liderança',            '3 (somente líderes)',  'Liderando o Negócio, Pessoas e a Si Mesmo'],
      ].map(([eixo, qtd, desc], i) => new TableRow({ children: [
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: eixo, bold: true, size: 22, font: 'Arial', color: DARK })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: qtd, size: 22, font: 'Arial', color: GRAY })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 4660, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: desc, size: 22, font: 'Arial', color: DARK })] })] }),
      ]})))
    ],
  }),
  spacer(),
  p('Para cada competência, atribua uma nota de 1 a 5:'),
  bullet('1 — Muito baixo'),
  bullet('2 — Abaixo'),
  bullet('3 — Adequado'),
  bullet('4 — Acima'),
  bullet('5 — Referência'),
  spacer(),
  infoBox('Atenção: justificativa obrigatória', [
    'Notas 1 (Muito baixo) e 5 (Referência) exigem preenchimento do campo de observação.',
    'O botão "Ver resultado consolidado" ficará bloqueado até que todos os campos obrigatórios sejam preenchidos.',
  ], 'FEF9E7', AMBER),
  spacer(),

  h2('6.3 Visualizar e salvar o resultado'),
  stepTable([
    { num: 1, title: 'Clicar em "Ver resultado consolidado"', desc: 'Após avaliar todas as competências, o sistema calcula automaticamente os scores de Desempenho e Potencial e posiciona o colaborador na Matriz 9-Box.' },
    { num: 2, title: 'Revisar o resultado', desc: 'Verifique o quadrante gerado, as notas por competência e as barras comparativas.' },
    { num: 3, title: 'Salvar a avaliação', desc: 'Clique em "Salvar avaliação". A avaliação é enviada com status "Aguardando calibração" para revisão do RH.' },
  ]),
  spacer(),

  // ── 7. Calibração (RH) ───────────────────────────────────────────────────
  new Paragraph({ children: [new PageBreak()] }),
  h1('7. Calibração de Avaliações (RH / Admin)'),
  p('Toda avaliação enviada por um gestor fica com status "Aguardando calibração". O RH deve revisar, ajustar se necessário e concluir a calibração antes que a avaliação seja marcada como concluída.'),
  spacer(),

  h2('7.1 Identificar avaliações pendentes'),
  p('Na aba "Avaliações", avaliações com status "Ag. calibração" são exibidas em destaque com um badge âmbar. O contador de pendentes aparece no subtítulo da página.'),
  spacer(),

  h2('7.2 Realizar a calibração'),
  stepTable([
    { num: 1, title: 'Localizar a avaliação', desc: 'Na aba "Avaliações", filtre por status "Ag. calibração" ou clique direto no botão "Calibrar" na linha da avaliação.' },
    { num: 2, title: 'Abrir a tela de calibração', desc: 'O botão "Calibrar" (ou "Realizar calibração" no detalhe) abre uma tela completa com todas as competências pré-preenchidas.' },
    { num: 3, title: 'Revisar e ajustar notas', desc: 'O RH pode alterar qualquer nota (1-5) e observação. Os scores de Desempenho, Potencial e o Quadrante atualizam automaticamente enquanto edita.' },
    { num: 4, title: 'Verificar justificativas', desc: 'Notas 1 e 5 exigem justificativa obrigatória. O botão "Concluir calibração" ficará bloqueado até que estejam preenchidas.' },
    { num: 5, title: 'Concluir a calibração', desc: 'Clique em "Concluir calibração". O sistema salva os dados atualizados e marca a avaliação como "Concluída".' },
  ]),
  spacer(),
  infoBox('Resultado da calibração', [
    'Após a conclusão, os scores e o quadrante 9-Box são atualizados com os valores calibrados pelo RH.',
    'A avaliação passa a exibir o badge verde "Calibração concluída".',
    'O colaborador pode ser exportado para Excel com os dados calibrados.',
  ], 'EAFAF1', GREEN),
  spacer(),

  // ── 8. Gerenciamento de Usuários ─────────────────────────────────────────
  new Paragraph({ children: [new PageBreak()] }),
  h1('8. Gerenciamento de Usuários (Admin)'),
  spacer(),

  h2('8.1 Criar um novo usuário'),
  stepTable([
    { num: 1, title: 'Acessar "Usuários"', desc: 'Clique na aba no menu lateral.' },
    { num: 2, title: 'Clicar em "+ Novo Usuário"', desc: 'O formulário de cadastro é aberto.' },
    { num: 3, title: 'Preencher os dados', desc: 'Nome completo, e-mail, perfil de acesso e área/departamento.' },
    { num: 4, title: 'Salvar', desc: 'Um e-mail de convite é enviado automaticamente ao novo usuário para ele definir a própria senha.' },
  ]),
  spacer(),

  h2('8.2 Importar gestores em lote'),
  p('Para cadastrar múltiplos gestores de uma vez, utilize o botão "Importar Gestores":'),
  bullet('Prepare um arquivo Excel (.xlsx) com colunas: Nome, E-mail, Área'),
  bullet('Clique em "Importar Gestores" e selecione o arquivo'),
  bullet('O sistema cria as contas e exibe as senhas temporárias geradas (exibidas apenas uma vez)'),
  bullet('Cada gestor receberá um e-mail de convite para definir a sua senha definitiva'),
  spacer(),

  h2('8.3 Gerenciar usuários existentes'),
  p('Na listagem de usuários é possível:'),
  bullet('Reenviar convite — para usuários com convite pendente'),
  bullet('Editar — alterar nome, e-mail, perfil e área'),
  bullet('Desativar — remove o acesso sem excluir o histórico de avaliações'),
  spacer(),

  // ── 9. Colaboradores ─────────────────────────────────────────────────────
  h1('9. Colaboradores'),
  p('O cadastro de colaboradores é a base do sistema. Cada gestor avalia os colaboradores vinculados à sua área.'),
  spacer(),

  h2('9.1 Cadastrar colaborador'),
  stepTable([
    { num: 1, title: 'Acessar "Colaboradores"', desc: 'Clique na aba no menu lateral.' },
    { num: 2, title: 'Clicar em "+ Novo Colaborador"', desc: 'O formulário é aberto.' },
    { num: 3, title: 'Preencher os dados', desc: 'Nome, cargo, nível (Júnior, Pleno, Sênior etc.), área e gestor responsável.' },
    { num: 4, title: 'Salvar', desc: 'O colaborador aparece na aba "Realizar Avaliação" do gestor no próximo ciclo.' },
  ]),
  spacer(),
  infoBox('Níveis de cargo e competências de liderança', [
    'Colaboradores com nível Sênior, Supervisor, Especialista, Coordenador, Gerente ou Diretor',
    'recebem automaticamente as 3 competências de Liderança na avaliação.',
    'Os demais níveis são avaliados apenas por Desempenho e Potencial (10 competências).',
  ], 'EBF5FB', BLUE),
  spacer(),

  // ── 10. Exportação ───────────────────────────────────────────────────────
  new Paragraph({ children: [new PageBreak()] }),
  h1('10. Exportação de Resultados'),
  p('O sistema permite exportar avaliações em Excel para análise e arquivamento:'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [3000, 6360],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Opção', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, width: { size: 6360, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'O que exporta', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
      ]}),
      ...([
        ['Exportar Excel',       'Exporta as avaliações filtradas/selecionadas em um único arquivo .xlsx'],
        ['Exportar tudo (.zip)', 'Exporta todas as avaliações, cada uma em um arquivo .xlsx separado, compactados em um .zip'],
        ['Exportar individual',  'No detalhe de uma avaliação, exporta apenas aquele colaborador'],
      ].map(([op, desc], i) => new TableRow({ children: [
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: op, bold: true, size: 22, font: 'Arial', color: DARK })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 6360, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: desc, size: 22, font: 'Arial', color: DARK })] })] }),
      ]}))),
    ],
  }),
  spacer(),

  // ── 11. Matriz 9-Box ─────────────────────────────────────────────────────
  h1('11. Matriz 9-Box — Referência dos Quadrantes'),
  p('O posicionamento na Matriz 9-Box é calculado automaticamente com base nas médias de Desempenho (Eixo X) e Potencial (Eixo Y):'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 2000, 6160],
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Código', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Perfil', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
        new TableCell({ borders: allBorders(RED), shading: { fill: RED, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 6160, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Significado', bold: true, size: 22, color: WHITE, font: 'Arial' })] })] }),
      ]}),
      ...([
        ['E3', 'Talento Top / Estrela',    'Alto potencial + Alto desempenho. Candidato a promoção e sucessão.'],
        ['E2', 'Potencial Forte',          'Alto potencial + Medio desempenho. Investir em desenvolvimento.'],
        ['E1', 'Enigma',                   'Alto potencial + Baixo desempenho. Investigar barreiras.'],
        ['M3', 'Forte Desempenho',         'Medio potencial + Alto desempenho. Reconhecer e reter.'],
        ['M2', 'Mantenedor / Eficaz',      'Medio potencial + Medio desempenho. Perfil estavel e confiavel.'],
        ['M1', 'Questionavel',             'Medio potencial + Baixo desempenho. Acompanhamento proximo.'],
        ['B3', 'Dedicado / Especialista',  'Baixo potencial + Alto desempenho. Especialista tecnico.'],
        ['B2', 'Bom Profissional',         'Baixo potencial + Medio desempenho. Mantem rotina com qualidade.'],
        ['B1', 'Risco / Subpadrao',        'Baixo potencial + Baixo desempenho. Plano de melhoria urgente.'],
      ].map(([cod, perfil, sig], i) => new TableRow({ children: [
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cod, bold: true, size: 24, font: 'Arial', color: RED })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: perfil, bold: true, size: 20, font: 'Arial', color: DARK })] })] }),
        new TableCell({ borders: allBorders('E0E0E0'), shading: { fill: i%2===0?'FDF2F2':WHITE, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, width: { size: 6160, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: sig, size: 20, font: 'Arial', color: GRAY })] })] }),
      ]}))),
    ],
  }),
  spacer(),
  p('Critérios de classificação dos eixos:', { bold: true }),
  bullet('Alto: média >= 3,7'),
  bullet('Médio: média entre 2,7 e 3,69'),
  bullet('Baixo: média < 2,7'),
  spacer(),

  // ── 12. Suporte ──────────────────────────────────────────────────────────
  h1('12. Suporte'),
  infoBox('Contato para suporte tecnico', [
    'Em caso de duvidas ou problemas tecnicos, entre em contato com o time de TI da Rema Tip Top.',
    'E-mail: ti@rematiptop.com.br',
    'Para solicitacoes urgentes de acesso, contate diretamente o Administrador Master do sistema.',
  ], 'EBF5FB', BLUE),
  spacer(),
]

// ─── Build document ───────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: DARK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: RED },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'RTT Talentos ', bold: true, size: 18, color: RED, font: 'Arial' }),
            new TextRun({ text: '— Manual de Utilização do Sistema', size: 18, color: GRAY, font: 'Arial' }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
          spacing: { before: 200 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Rema Tip Top  ·  Confidencial  ·  Página ', size: 18, color: GRAY, font: 'Arial' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY, font: 'Arial' }),
          ],
        })],
      }),
    },
    children,
  }],
})

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Manual_RTT_Talentos.docx', buffer)
  console.log('Manual_RTT_Talentos.docx gerado com sucesso!')
})
