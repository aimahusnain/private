export interface Rate {
    id: string;
    date: Date;
    clientName: string;
    rate: number;
  }
  
  export interface RateFormData {
    clientName: string;
    rate: string | number;
    date: string;
  }