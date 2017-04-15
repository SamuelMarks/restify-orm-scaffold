export type cb = (err: Error, res?: any) => void;

export interface IncomingMessageError {
    name: string;
    jse_shortmsg: string;
    jse_info: {};
    message: string;
    statusCode: number;
    body: any | {} | { error: string, error_message: string };
    restCode: 'IncomingMessageError';
}
