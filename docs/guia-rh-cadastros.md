# Guia do RH — administrar cadastros sem depender do TI

Este guia mostra como o RH mantém colaboradores e acessos no sistema. Vale para quem tem perfil **Administrador de RH**, **Administrador de RH / Gestor** ou **Administrador Master**.

> Resumo: **colaborador** é a pessoa que consta na base (cargo, área, gestor, datas). **Usuário** é o *login* de quem acessa o sistema. São cadastros diferentes, ligados por um vínculo.

---

## 1. Colaboradores (a base de pessoas)

Menu **Avaliações → Colaboradores**.

### Cadastrar uma pessoa
1. Clique em **Novo**.
2. Preencha ao menos o **Nome**. Quanto mais completo, melhor: cargo, nível, área, gestor e as datas.
3. **Data de nascimento** e **Data de admissão** alimentam os avisos de aniversário e de tempo de empresa na página inicial. Sem elas, a pessoa não aparece nos avisos.

### Cadastrar ou atualizar várias pessoas (planilha)
1. Clique em **Importar Excel → Baixar modelo**. O arquivo traz a aba **Colaboradores** (para preencher) e a aba **Instruções**.
2. Preencha uma pessoa por linha. **Não mude os títulos** da primeira linha.
3. Volte em **Importar Excel**, escolha o arquivo e confira a **prévia**.
4. Leia os avisos amarelos, se houver (datas inválidas, níveis não reconhecidos). Corrija a planilha e escolha o arquivo de novo.
5. Clique em **Importar**.

Como a importação decide o que fazer:

| Situação | O que acontece |
|---|---|
| O nome já existe na base | Os dados da pessoa são **atualizados** |
| O nome não existe | A pessoa é **criada** |
| Célula em branco | **Não apaga** o que já está no sistema |
| Pessoa que está na base mas não está na planilha | **Nada acontece** com ela |

**Formatos que o sistema aceita**
- Datas: `dd/mm/aaaa` (ex.: `25/03/1990`). Ano com 2 dígitos é recusado, para não gerar data errada.
- Nível: use um dos valores listados na aba **Instruções** (ex.: *Analista Pleno*, *Gerente*).
- Área e gestor: escreva **sempre igual**. "Comercial", "comercial " e "Com." viram áreas diferentes.

### Corrigir a base atual sem refazer ajustes
1. Clique em **Exportar Excel**. Sai a base **completa** (não só o que está filtrado na tela), com as correções já feitas.
2. Ajuste o que precisar no Excel.
3. Importe o mesmo arquivo de volta (passo anterior).

> ⚠️ **Atenção ao nome.** A importação reconhece a pessoa **pelo nome**. Se você corrigir o nome na planilha, o sistema entende como **outra pessoa** e cria um cadastro novo. Para corrigir um nome, edite a pessoa na tela dela.

### Gestor: por que "o gestor não vê a equipe"?
O gestor só enxerga os colaboradores cujo campo **Gestor Imediato** é **igual ao nome do usuário dele** (e, se preenchido, ao e-mail do gestor). Se a equipe não aparece:
- confira se o nome do gestor na planilha está **idêntico** ao do usuário (acentos e espaços contam);
- confira o **e-mail do gestor**, se estiver preenchido.

### Desligamentos
Para tirar alguém da lista, selecione a pessoa e use **Excluir**. Ela é **desativada** (sai das telas e dos avisos), sem apagar o histórico de avaliações.

---

## 2. Usuários (quem acessa o sistema)

Menu **Usuários**. Hoje ele fica dentro do módulo de Avaliações.

### Criar um acesso
Clique em **Novo Usuário** e escolha como a pessoa vai entrar:

**Com e-mail** — preencha o e-mail e deixe a senha em branco.
- A pessoa recebe um **convite por e-mail** para criar a própria senha (vale 7 dias).
- Ela entra com e-mail e senha e confirma um **código enviado por e-mail** (MFA).
- Se o convite não chegar, use o botão de **reenviar convite** (ícone de envio) na lista.

**Só com CPF** — preencha o CPF, deixe o e-mail em branco e **defina uma senha temporária** (mínimo de 8 caracteres).
- Passe o CPF e a senha temporária à pessoa pessoalmente ou por um canal seguro.
- No primeiro acesso o sistema **obriga a trocar** a senha.
- Não há código por e-mail para esses usuários por enquanto.

### Perfis de acesso
| Perfil | O que acessa |
|---|---|
| **Colaborador** | Apenas a Intranet: Minha Visão, Treinamentos, Comunicados e Pesquisas |
| **Gestor** | Intranet e avaliação da própria equipe (exige informar o **departamento**) |
| **Administrador de RH** | Tudo de RH, incluindo cadastros, usuários e calibração |
| **Administrador de RH / Gestor** | Administrador de RH com visão de gestor |
| **Administrador Master** | Tudo, incluindo auditoria |

Para quem vai fazer cursos pelo cargo ou pela área, escolha o **Colaborador vinculado** ao criar ou editar o usuário. Sem o vínculo, os treinamentos por cargo/área não aparecem para ele.

### Rotina do dia a dia
| Preciso... | Como fazer |
|---|---|
| Esqueceu a senha (usuário com e-mail) | A própria pessoa usa **Esqueceu a senha?** na tela de login |
| Esqueceu a senha (usuário só com CPF) | **Editar** o usuário → preencher **Nova senha**. Ela será temporária e a troca é exigida no próximo acesso |
| Bloquear o acesso de alguém | Interruptor **Desativar** na lista |
| Mudar o perfil | **Editar** → Perfil de acesso |
| Adicionar CPF a quem só tem e-mail (ou o contrário) | **Editar** e preencher o campo |

---

## 3. Avisos da página inicial

- **Aniversariantes** e **tempo de empresa** aparecem em *Minha Visão* para os próximos **30 dias**.
- Dependem das datas preenchidas na base. Pessoas sem data não aparecem.
- Tempo de empresa só é avisado a partir de **1 ano**.

---

## 4. Quando acionar o TI

O RH resolve cadastros e acessos sozinho. Chame o TI quando:

- o **e-mail de convite ou o código MFA não chega** para ninguém (pode ser a conta de envio de e-mails do sistema);
- aparecer **erro** ao importar mesmo com a planilha no formato do modelo;
- for preciso **mudar permissões** além dos perfis acima ou recuperar um cadastro excluído por engano.

## 5. Boas práticas

- Faça uma **exportação antes** de qualquer importação grande: ela serve de cópia de segurança.
- Padronize **áreas** e **cargos**. Eles alimentam relatórios, treinamentos por cargo/área e a visibilidade do gestor.
- Mantenha uma **única planilha de referência** (a última exportada) e trabalhe sempre em cima dela.
- Ao desligar alguém: **desative o colaborador** *e* **o usuário** (são cadastros separados).
