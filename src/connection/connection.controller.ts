import {Body, Controller, Post} from '@nestjs/common';
import {ConnectionService} from "./connection.service";
import {UserDTO} from "../dto/UserDTO";

@Controller('connection')
export class ConnectionController {
    constructor(private readonly connectionService: ConnectionService) {
    }

    @Post()
    async signup(@Body() user: UserDTO) {
        await this.connectionService.signup(user).catch(reason => reason)
        return 'ok'
    }
}
