export interface IEvent<T = any> {
    add(listener: (data: T) => void): void;
    addOnce(listener: (data: T) => void): void;
    remove(listener: (data: T) => void): void;
    clear(): void;
    trigger(data: T): void;
    disable(): void;
    enable(): void;
    listenerCount(): number;
}
