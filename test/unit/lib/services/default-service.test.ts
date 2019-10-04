import { DefaultService } from '../../../../src/lib/services/default-service';

import { AppError, InputInvalidError, NotImplementedError } from '../../../../src/lib/errors';

describe('DefaultService', () => {
    let service: DefaultService = undefined;

    beforeEach(() => {
        service = new DefaultService();
    });

    describe('Constructor', () => {
        it('should construct the instance as expected', () => {
            service.should.be.deep.equal({ });
        });
    });

    describe('default', () => {
        it('should reject with an InputInvalidError if no id is supplied', () => {
            return service.default(undefined)
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    err.should.be.an.instanceOf(AppError);
                    err.should.be.an.instanceOf(InputInvalidError);
                });
        });

        it('should reject with a NotImplementedError if id is supplied', () => {
            return service.default('some-id')
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    err.should.be.an.instanceOf(AppError);
                    err.should.be.an.instanceOf(NotImplementedError);
                });
        });
    });
});
