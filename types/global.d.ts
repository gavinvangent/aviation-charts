declare module NodeJS {
    interface Global {
        CONTEXT: { [key: string]: any }
    }
}
