import { Body, Controller, Delete, Get, Param, Post, Put, Res, UnauthorizedException } from '@nestjs/common';
import { ActionService } from './Action.service';
import { ActionDTO } from '../dto/ActionDTO';
import { CategorieDTO } from '../dto/CategorieDTO';
import { JwtService } from '@nestjs/jwt';

@Controller('action')
export class ActionController {

  constructor(private readonly actionService: ActionService, private jwtService: JwtService) {
  }

  @Get()
  async findAll(): Promise<ActionDTO[]> {
    return await this.actionService.findAll();
  }

  @Get('/categorie/sum/byuser/:user/:month/:year')
  async findCategorieSum(@Param('user') user, @Param('month') month, @Param('year') year): Promise<ActionDTO[]> {
    return await this.actionService.findCategorieSum(user, month, year).then(value => value);
  }

  @Get('/export/:id')
  async export(@Res() res, @Param('id') id) {
    const excel = require('node-excel-export');
    let listMontants = await this.actionService.findByUser(id);
    console.log(listMontants.map(value => {
      return { montant: value.montant };
    }));
// You can define styles as json object
    const styles = {
      headerDark: {
        fill: {
          fgColor: {
            rgb: 'FF000000',
          },
        },
        font: {
          color: {
            rgb: 'FFFFFFFF',
          },
          sz: 14,
          bold: true,
          underline: true,
        },
      },
      cellPink: {
        fill: {
          fgColor: {
            rgb: 'FFFFCCFF',
          },
        },
      },
      cellGreen: {
        fill: {
          fgColor: {
            rgb: 'FF00FF00',
          },
        },
      },
    };

//Array of objects representing heading rows (very top)
    const heading = [];

//Here you specify the export structure
    const specification = {
      montant: { // <- the key should match the actual data key
        displayName: 'montant', // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        cellStyle: function(value, row) { // <- style renderer function
          // if the status is 1 then color in green else color in red
          // Notice how we use another cell value to style the current one
          return (row.status_id == 1) ? styles.cellGreen : { fill: { fgColor: { rgb: 'FFFF0000' } } }; // <- Inline cell style is possible
        },
        width: 120, // <- width in pixels
      },
      description: { // <- the key should match the actual data key
        displayName: 'description', // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        cellStyle: function(value, row) { // <- style renderer function
          // if the status is 1 then color in green else color in red
          // Notice how we use another cell value to style the current one
          return (row.status_id == 1) ? styles.cellGreen : { fill: { fgColor: { rgb: 'FFFF0000' } } }; // <- Inline cell style is possible
        },
        width: 120, // <- width in pixels
      },
    };

// The data set should have the following shape (Array of Objects)
// The order of the keys is irrelevant, it is also irrelevant if the
// dataset contains more fields as the report is build based on the
// specification provided above. But you should have all the fields
// that are listed in the report specification
    const dataset = listMontants.map(value => {
      return { montant: value.montant, description: value.description };
    });

// Define an array of merges. 1-1 = A:1
// The merges are independent of the data.
// A merge will overwrite all data _not_ in the top-left cell.

    console.log(dataset);
// Create the excel report.
// This function will return Buffer
    const report = excel.buildExport(
      [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: 'Report', // <- Specify sheet name (optional)
          heading: heading,
          specification: specification,// <- Raw heading array (optional)// <- Merge cell ranges// <- Report specification
          data: dataset, // <-- Report data
        },
      ],
    );

// You can then return this straight
    res.attachment('report.xlsx'); // This is sails.js specific (in general you need to set headers)
    return res.send(report);
  }


  @Get(':id')
  async findOne(@Param('id') id): Promise<ActionDTO | void> {
    return await this.actionService.findOneBy(id).then(value => value).catch(reason => console.log(reason));
  }

  @Get('/byuser/:user')
  async findAllByUser(@Param('user') userId): Promise<CategorieDTO[] | string> {
    return await this.actionService.findByUser(userId);
  }

  @Delete(':id')
  async remove(@Param('id') id, @Body() jwt: { jwt: string }): Promise<string> {
    const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: 'Je veux pas donner mon mot de passe' });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.actionService.delete(id);
    return 'ok';
  }

  @Put(':id')
  async update(@Param('id') id, @Body() actinDTO: ActionDTO): Promise<string> {
    const data = await this.jwtService.verifyAsync(actinDTO.jwt, { secret: 'Je veux pas donner mon mot de passe' });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.actionService.update(id, actinDTO);
    return 'ok';
  }

  @Post()
  async create(@Body() actionDTO: ActionDTO) {
    const data = await this.jwtService.verifyAsync(actionDTO.jwt, { secret: 'Je veux pas donner mon mot de passe' });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.actionService.create(actionDTO);
  }
}
