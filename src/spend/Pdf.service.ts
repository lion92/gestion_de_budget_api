import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit-table';
import * as fs from 'fs';
import { SpendService } from './Spend.service';

@Injectable()
export class PdfService {
  constructor(private actionService: SpendService) {
  }

  async generatePdf(id: number): Promise<fs.ReadStream> {
    const doc = new PDFDocument();
    const rowsToPdf = [];
    const newVar1 = await this.actionService.findByUser(id);

    doc.fill('red').text('Bilan');

    newVar1.forEach((value) =>
      rowsToPdf.push([
        value?.montant.toString(),
        value?.description.toString(),
        value?.categorie.toString(),
        value?.dateTransaction.toString(),
      ]),
    );
    const table = {
      headers: ['montant', 'description', 'categorie', 'date'],
      rows: rowsToPdf,
    };

    await doc
      .fill('blue')
      .moveDown()
      .table(table, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8)
        ,
      });

    const fileName = 'bilan.pdf';
    doc.pipe(fs.createWriteStream(fileName));
    doc.end();
    return fs.createReadStream(fileName);

  }

  async generatePdfSumAll(id: number): Promise<fs.ReadStream> {
    const doc = new PDFDocument();
    const rowsToPdf = [];
    const newVar1 = await this.actionService.findCategorieSumAll(id);

    doc.fill('red').text('Bilan');

    newVar1.forEach((value) =>
      rowsToPdf.push([
        value?.montant.toString(),
        value?.categorie.toString(),
        value?.dateTransaction.toString(),
      ]),
    );
    const table = {
      headers: ['montant', 'categorie', 'date'],
      rows: rowsToPdf,
    };

    await doc
      .fill('blue')
      .moveDown()
      .table(table, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8)
        ,
      });
    const fileName = 'bilan.pdf';
    doc.pipe(fs.createWriteStream(fileName));
    doc.end();
    return fs.createReadStream(fileName);
  }
}
