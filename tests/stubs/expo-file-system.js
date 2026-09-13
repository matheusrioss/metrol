export class File { constructor() {} get uri() { return 'file:///stub'; } get exists() { return false; } create() {} write() {} delete() {} async text() { return ''; } }
export class Directory { constructor() {} get exists() { return true; } create() {} }
export const Paths = { document: {}, cache: {} };
