import { createHash, HexBase64Latin1Encoding } from 'crypto'

export class Helper {
  static hash(value: string, algorithm: string = 'md5', encoding: HexBase64Latin1Encoding = 'hex'): string {
    return createHash(algorithm).update(value).digest(encoding)
  }
}
