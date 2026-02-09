export {};

declare global {
  type ServiceResponse = {
    status: number;
    message: string;
    err?: string;
  };
}
