export type ErrorFields = Record<string, string>;

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly fields?: ErrorFields;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number,
        code: string,
        fields?: ErrorFields,
    ) {
        super(message);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.fields = fields;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}