export interface AlertParts {
    title: string;
    body: string;
}
export declare function alertPartsOf(message: string): AlertParts;
export declare function deliverAlert(message: string, notify: (title: string, body: string) => boolean, toast: (title: string, body: string) => void): void;
