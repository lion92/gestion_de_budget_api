const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Landscape A4
const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true });
const output = path.join(__dirname, 'schema-base-de-donnees.pdf');
doc.pipe(fs.createWriteStream(output));

// ── Couleurs ──────────────────────────────────────────────────────────────────
const C = {
  bg:        '#f0f4f8',
  header:    '#1e3a5f',
  tblHead:   '#2c5282',
  tblHeadTx: '#ffffff',
  pkRow:     '#fff5f5',
  fkRow:     '#f0fff4',
  normalRow: '#ffffff',
  altRow:    '#f7fafc',
  pk:        '#c53030',
  fk:        '#276749',
  col:       '#2d3748',
  type:      '#718096',
  border:    '#a0aec0',
  arrow:     '#4a5568',
  label:     '#2b6cb0',
  note:      '#553c9a',
};

// ── Dimensions page ───────────────────────────────────────────────────────────
const W = 841.89, H = 595.28;

// ── Background ────────────────────────────────────────────────────────────────
doc.rect(0, 0, W, H).fill(C.bg);

// ── Titre ─────────────────────────────────────────────────────────────────────
doc.rect(0, 0, W, 34).fill(C.header);
doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
   .text('Schéma de la base de données — crud_nest', 20, 10);
doc.fontSize(8).font('Helvetica').fillColor('#a0c4ff')
   .text(`10 tables  |  TypeORM + MySQL 8  |  ${new Date().toLocaleDateString('fr-FR')}`, 600, 13);

// ── Helpers ───────────────────────────────────────────────────────────────────

function tableHeight(nCols) {
  return 22 + nCols * 15 + 5;
}

function drawTable(name, cols, x, y, w) {
  const h = tableHeight(cols.length);
  // Ombre
  doc.rect(x + 2, y + 2, w, h).fill('#c8d6e5');
  // Fond blanc
  doc.rect(x, y, w, h).fill('#ffffff').lineWidth(0.8).stroke(C.border);
  // En-tête
  doc.rect(x, y, w, 22).fill(C.tblHead);
  doc.fillColor(C.tblHeadTx).fontSize(9).font('Helvetica-Bold')
     .text(name, x + 7, y + 7, { width: w - 14 });

  cols.forEach((col, i) => {
    const cy = y + 22 + i * 15;
    // Fond alterné
    let bg = i % 2 === 0 ? C.normalRow : C.altRow;
    if (col.pk) bg = C.pkRow;
    if (col.fk) bg = C.fkRow;
    doc.rect(x, cy, w, 15).fill(bg);

    const prefix = col.pk ? '🔑' : col.fk ? '→ ' : '   ';
    const txtColor = col.pk ? C.pk : col.fk ? C.fk : C.col;

    doc.fillColor(txtColor).fontSize(7.5)
       .font(col.pk || col.fk ? 'Helvetica-Bold' : 'Helvetica')
       .text(prefix + ' ' + col.name, x + 5, cy + 3, { width: w * 0.52, ellipsis: true });
    doc.fillColor(C.type).fontSize(6.8).font('Helvetica')
       .text(col.type, x + w * 0.55, cy + 4, { width: w * 0.42, ellipsis: true });
  });

  // Contour final
  doc.rect(x, y, w, h).lineWidth(0.8).stroke(C.border);

  return { x, y, w, h };
}

// Flèche orthogonale (avec étiquette)
function arrow(x1, y1, x2, y2, label, color) {
  color = color || C.arrow;
  const mx = (x1 + x2) / 2;

  doc.save()
     .moveTo(x1, y1)
     .lineTo(mx, y1)
     .lineTo(mx, y2)
     .lineTo(x2, y2)
     .lineWidth(1.1)
     .strokeColor(color)
     .stroke()
     .restore();

  // Pointe de flèche
  const dx = x2 > mx ? 5 : -5;
  doc.save()
     .polygon([x2, y2], [x2 - dx, y2 - 3], [x2 - dx, y2 + 3])
     .fillColor(color).fill()
     .restore();

  // Étiquette
  if (label) {
    const lx = mx - 14, ly = (y1 + y2) / 2 - 7;
    doc.save()
       .rect(lx, ly, 28, 10).fill('#ebf8ff').stroke('#bee3f8')
       .fillColor(C.label).fontSize(6).font('Helvetica-Bold')
       .text(label, lx, ly + 2, { width: 28, align: 'center' })
       .restore();
  }
}

// Flèche directe (diagonale) pour relations proches
function arrowDirect(x1, y1, x2, y2, label, color) {
  color = color || C.arrow;
  doc.save()
     .moveTo(x1, y1).lineTo(x2, y2)
     .lineWidth(1.1).strokeColor(color).stroke()
     .restore();

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const sz = 5;
  doc.save()
     .polygon(
       [x2, y2],
       [x2 - sz * Math.cos(angle - 0.4), y2 - sz * Math.sin(angle - 0.4)],
       [x2 - sz * Math.cos(angle + 0.4), y2 - sz * Math.sin(angle + 0.4)]
     ).fillColor(color).fill().restore();

  if (label) {
    const mx = (x1 + x2) / 2 - 14, my = (y1 + y2) / 2 - 7;
    doc.save()
       .rect(mx, my, 28, 10).fill('#fffbeb').stroke('#fbd38d')
       .fillColor('#c05621').fontSize(6).font('Helvetica-Bold')
       .text(label, mx, my + 2, { width: 28, align: 'center' })
       .restore();
  }
}

// ── Définition des tables ─────────────────────────────────────────────────────

// Colonne A (x=18, w=150)
const colA = 18, wA = 150;
// Colonne B (x=182, w=198)
const colB = 182, wB = 198;
// Colonne C (x=396, w=165)
const colC = 396, wC = 165;
// Colonne D (x=578, w=152)
const colD = 578, wD = 152;
// Colonne E (x=745, w=80) — pour category_image seulement
const colE = 745, wE = 82;

const tbls = {};

// ── user ──────────────────────────────────────────────────────────────────────
tbls.user = drawTable('user', [
  { name: 'id',            type: 'INT — PK',       pk: true },
  { name: 'email',         type: 'VARCHAR unique' },
  { name: 'nom',           type: 'VARCHAR' },
  { name: 'prenom',        type: 'VARCHAR' },
  { name: 'password',      type: 'VARCHAR nullable' },
  { name: 'googleId',      type: 'VARCHAR nullable' },
  { name: 'isEmailVerified', type: 'BOOLEAN default:false' },
  { name: 'profilePicture', type: 'VARCHAR nullable' },
  { name: 'resetPasswordToken', type: 'VARCHAR nullable' },
], colB, 42, wB);

// ── revenue ───────────────────────────────────────────────────────────────────
tbls.revenue = drawTable('revenue', [
  { name: 'id',     type: 'INT — PK',  pk: true },
  { name: 'name',   type: 'VARCHAR' },
  { name: 'amount', type: 'INT' },
  { name: 'date',   type: 'DATE' },
  { name: 'userId', type: 'FK → user', fk: true },
], colA, 42, wA);

// ── envelope ──────────────────────────────────────────────────────────────────
const envY = 42 + tableHeight(5) + 14;
tbls.envelope = drawTable('envelope', [
  { name: 'id',     type: 'UUID — PK', pk: true },
  { name: 'name',   type: 'VARCHAR' },
  { name: 'month',  type: 'INT (1-12)' },
  { name: 'year',   type: 'INT' },
  { name: 'amount', type: 'DECIMAL(10,2)' },
  { name: 'icone',  type: 'VARCHAR' },
  { name: 'userId', type: 'FK → user', fk: true },
], colA, envY, wA);

// ── transaction ───────────────────────────────────────────────────────────────
const trxY = envY + tableHeight(7) + 14;
tbls.transaction = drawTable('transaction', [
  { name: 'id',          type: 'UUID — PK', pk: true },
  { name: 'description', type: 'VARCHAR' },
  { name: 'amount',      type: 'DECIMAL(10,2)' },
  { name: 'date',        type: 'DATE' },
  { name: 'envelopeId',  type: 'FK → envelope', fk: true },
], colA, trxY, wA);

// ── todo ──────────────────────────────────────────────────────────────────────
const todoY = trxY + tableHeight(5) + 14;
tbls.todo = drawTable('todo', [
  { name: 'id',          type: 'INT — PK', pk: true },
  { name: 'title',       type: 'VARCHAR' },
  { name: 'description', type: 'VARCHAR' },
  { name: 'createdAt',   type: 'TIMESTAMP auto' },
  { name: 'userId',      type: 'FK → user', fk: true },
], colA, todoY, wA);

// ── action ────────────────────────────────────────────────────────────────────
tbls.action = drawTable('action', [
  { name: 'id',              type: 'INT — PK',    pk: true },
  { name: 'description',     type: 'VARCHAR' },
  { name: 'montant',         type: 'DECIMAL(10,2)' },
  { name: 'dateAjout',       type: 'DATETIME default:NOW()' },
  { name: 'dateTransaction', type: 'DATETIME nullable' },
  { name: 'categorieId',     type: 'FK → categorie', fk: true },
  { name: 'userId',          type: 'FK → user',     fk: true },
  { name: 'ticketId',        type: 'FK → tickets nullable', fk: true },
], colC, 42, wC);

// ── categorie ─────────────────────────────────────────────────────────────────
const catY = 42 + tableHeight(8) + 14;
tbls.categorie = drawTable('categorie', [
  { name: 'id',              type: 'INT — PK',   pk: true },
  { name: 'categorie',       type: 'VARCHAR' },
  { name: 'color',           type: 'VARCHAR' },
  { name: 'budgetDebutMois', type: 'INT' },
  { name: 'month',           type: 'TEXT (enum Month)' },
  { name: 'annee',           type: 'INT' },
  { name: 'userId',          type: 'FK → user', fk: true },
], colC, catY, wC);

// ── category_image ────────────────────────────────────────────────────────────
const catImgY = catY + tableHeight(7) + 14;
tbls.categoryImage = drawTable('category_image', [
  { name: 'id',          type: 'INT — PK',       pk: true },
  { name: 'iconName',    type: 'VARCHAR' },
  { name: 'categorieId', type: 'FK → categorie', fk: true },
], colC, catImgY, wC);

// ── tickets ───────────────────────────────────────────────────────────────────
tbls.tickets = drawTable('tickets', [
  { name: 'id',           type: 'INT — PK', pk: true },
  { name: 'texte',        type: 'TEXT' },
  { name: 'dateAjout',    type: 'DATETIME auto' },
  { name: 'totalExtrait', type: 'DECIMAL(10,2) nullable' },
  { name: 'commercant',   type: 'VARCHAR nullable' },
  { name: 'articlesJson', type: 'TEXT/JSON nullable' },
  { name: 'confianceOCR', type: 'DECIMAL(5,2) nullable' },
  { name: 'imagePath',    type: 'VARCHAR nullable' },
  { name: 'userId',       type: 'FK → user', fk: true },
], colD, 42, wD);

// ── ticket_expense ────────────────────────────────────────────────────────────
const txExpY = 42 + tableHeight(9) + 14;
tbls.ticketExpense = drawTable('ticket_expense', [
  { name: 'id',            type: 'INT — PK',    pk: true },
  { name: 'ticket_id',     type: 'INT' },
  { name: 'extractedData', type: 'JSON nullable' },
  { name: 'created_at',    type: 'DATETIME auto' },
  { name: 'expenseId',     type: 'FK → action (unique)', fk: true },
  { name: 'userId',        type: 'FK → user', fk: true },
], colD, txExpY, wD);

// ── Relations (flèches) ───────────────────────────────────────────────────────
// Points de connexion : right(t) = x+w, left(t) = x, centerY(t) = y + h/2

function right(t)   { return t.x + t.w; }
function left(t)    { return t.x; }
function top(t)     { return t.y; }
function bottom(t)  { return t.y + t.h; }
function midY(t)    { return t.y + t.h / 2; }
function midX(t)    { return t.x + t.w / 2; }

const u = tbls.user;
const r = tbls.revenue;
const en = tbls.envelope;
const tr = tbls.transaction;
const td = tbls.todo;
const ac = tbls.action;
const ca = tbls.categorie;
const ci = tbls.categoryImage;
const tk = tbls.tickets;
const te = tbls.ticketExpense;

// user → revenue (1:N) — horizontal gauche
arrowDirect(left(u), u.y + 25, right(r), r.y + 25, '1 : N', '#2b6cb0');

// user → envelope (1:N)
arrowDirect(left(u), u.y + 50, right(en), midY(en), '1 : N', '#2b6cb0');

// user → todo (1:N)
arrowDirect(left(u), u.y + 75, right(td), midY(td), '1 : N', '#2b6cb0');

// user → transaction (indirect via envelope) — NOT drawn, done via envelope→transaction

// envelope → transaction (1:N)
arrowDirect(midX(en), bottom(en), midX(tr), top(tr), '1 : N', '#6b46c1');

// user → action (1:N) — horizontal droite
arrowDirect(right(u), u.y + 25, left(ac), ac.y + 25, '1 : N', '#2b6cb0');

// user → categorie (1:N)
arrowDirect(right(u), u.y + 50, left(ca), midY(ca), '1 : N', '#2b6cb0');

// user → tickets (1:N)
arrowDirect(right(u), u.y + 75, left(tk), midY(tk), '1 : N', '#2b6cb0');

// user → ticket_expense (1:N)
arrowDirect(right(u), u.y + 100, left(te), midY(te), '1 : N', '#2b6cb0');

// action → categorie (N:1)
arrowDirect(midX(ac), bottom(ac), midX(ca), top(ca), 'N : 1', '#c05621');

// action → tickets (N:1 nullable)
arrowDirect(right(ac), ac.y + 30, left(tk), tk.y + 30, 'N : 1', '#c05621');

// categorie → category_image (1:1)
arrowDirect(midX(ca), bottom(ca), midX(ci), top(ci), '1 : 1', '#276749');

// ticket_expense → action (N:1)
arrowDirect(left(te), te.y + 30, right(ac), ac.y + 60, 'N : 1', '#c05621');

// ── Légende ───────────────────────────────────────────────────────────────────
const lx = colE, ly = 42;
doc.rect(lx, ly, wE + 5, 160).fill('#ffffff').lineWidth(0.7).stroke(C.border);
doc.rect(lx, ly, wE + 5, 16).fill(C.header);
doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold').text('LÉGENDE', lx + 5, ly + 4);

const items = [
  { color: C.pk,      label: '🔑 Clé primaire (PK)' },
  { color: C.fk,      label: '→  Clé étrangère (FK)' },
  { color: '#2b6cb0', label: 'user → table  (1:N)' },
  { color: '#c05621', label: 'action → N:1' },
  { color: '#276749', label: 'categorie 1:1' },
  { color: '#6b46c1', label: 'envelope → 1:N' },
];
items.forEach((it, i) => {
  const iy = ly + 22 + i * 22;
  doc.moveTo(lx + 8, iy + 7).lineTo(lx + 22, iy + 7)
     .lineWidth(1.5).strokeColor(it.color).stroke();
  doc.polygon([lx + 22, iy + 7], [lx + 17, iy + 4], [lx + 17, iy + 10])
     .fillColor(it.color).fill();
  doc.fillColor(C.col).fontSize(7).font('Helvetica')
     .text(it.label, lx + 26, iy + 3, { width: wE - 22 });
});

// Note CASCADE
const ny = ly + 168;
doc.rect(lx, ny, wE + 5, 100).fill('#fff5f5').lineWidth(0.7).stroke('#fc8181');
doc.rect(lx, ny, wE + 5, 14).fill('#c53030');
doc.fillColor('#fff').fontSize(7).font('Helvetica-Bold').text('CASCADE', lx + 5, ny + 3);
const cascades = [
  'user → revenue',
  'user → tickets',
  'user → categorie',
  'envelope → transaction',
  'action → ticket_expense',
  'ticketId : SET NULL',
];
cascades.forEach((c, i) => {
  doc.fillColor(C.col).fontSize(6.5).font('Helvetica')
     .text('• ' + c, lx + 5, ny + 18 + i * 13);
});

// ── Footer ────────────────────────────────────────────────────────────────────
doc.rect(0, H - 18, W, 18).fill(C.header);
doc.fillColor('#a0c4ff').fontSize(7).font('Helvetica')
   .text('crud_nest — Diagramme ERD — Généré automatiquement depuis les entités TypeORM', 20, H - 13);

doc.flushPages();
doc.end();
console.log('PDF généré :', output);
