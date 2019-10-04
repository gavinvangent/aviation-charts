import { InputInvalidError, NotImplementedError } from '../errors'

export class DefaultService {
  async default (id: string): Promise<void> {
    if (!id) {
      throw new InputInvalidError()
    }

    throw new NotImplementedError()
  }
}
