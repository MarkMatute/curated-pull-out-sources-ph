import { BaseModel } from './Base';

export class Vehicle extends BaseModel {
    brand!: string;
    model!: string;
    year!: string;
    mileage!: string;
    color!: string;
    plate!: string;
    price!: string;
    location!: string;
}