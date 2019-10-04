import { should } from 'chai';
import { SinonSandbox, createSandbox } from 'sinon';
import { AppError, NotFoundError, NotImplementedError, NotSupportedError, ForbiddenError, InputInvalidError } from '../../../../src/lib/errors';

describe('Errors', () => {
    let sandbox: SinonSandbox = null;

    beforeEach(() => {
        sandbox = createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('AppError', () => {
        describe('Constructor', () => {
            it('should construct as expected, with the expected properties when hasStackTrace is supported', () => {
                const technicalErrorMessage = 'Area 51 was just raided by aliens';
                const readableErrorMessage = 'Men wearing tinfoil hats believe aliens attacked USA';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(true);

                const error = new AppError(technicalErrorMessage, readableErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(readableErrorMessage);
                error.error.should.be.equal(technicalErrorMessage);

                const regex = /AppError: Men wearing tinfoil hats believe aliens attacked USA/;
                regex.test(error.stack).should.be.true;
            });

            it('should construct as expected, with the expected properties when hasStackTrace is not supported', () => {
                const technicalErrorMessage = 'Area 51 was just raided by aliens';
                const readableErrorMessage = 'Men wearing tinfoil hats believe aliens attacked USA';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(false);

                const error = new AppError(technicalErrorMessage, readableErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(readableErrorMessage);
                error.error.should.be.equal(technicalErrorMessage);

                const regex = /Error: Men wearing tinfoil hats believe aliens attacked USA/;
                regex.test(error.stack).should.be.true;
            });

            it('should construct as expected, when hasStackTrace is supported amd only a message is supplied', () => {
                const technicalErrorMessage = 'Area 51 was just raided by aliens';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(true);

                const error = new AppError(technicalErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(technicalErrorMessage);
                error.error.should.be.equal(technicalErrorMessage);

                const regex = /AppError: Area 51 was just raided by aliens/;
                regex.test(error.stack).should.be.true;
            });

            it('should construct as expected, when hasStackTrace is not supported amd only a message is supplied', () => {
                const technicalErrorMessage = 'Area 51 was just raided by aliens';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(false);

                const error = new AppError(technicalErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(technicalErrorMessage);
                error.error.should.be.equal(technicalErrorMessage);

                const regex = /Error: Area 51 was just raided by aliens/;
                regex.test(error.stack).should.be.true;
            });

            it('should construct as expected, with the expected properties when no message is supplied and hasStackTrace is supported', () => {
                const readableErrorMessage = 'Men wearing tinfoil hats believe aliens attacked USA';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(true);

                const error = new AppError(null, readableErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(readableErrorMessage);
                error.error.should.be.equal(readableErrorMessage);

                const regex = /AppError: Men wearing tinfoil hats believe aliens attacked USA/;
                regex.test(error.stack).should.be.true;
            });

            it('should construct as expected, with the expected properties when no message is supplied and hasStackTrace is not supported', () => {
                const readableErrorMessage = 'Men wearing tinfoil hats believe aliens attacked USA';

                const supportsCaptureStackTraceStub = sandbox.stub(AppError, 'supportsCaptureStackTrace');
                supportsCaptureStackTraceStub.returns(false);

                const error = new AppError(null, readableErrorMessage);

                supportsCaptureStackTraceStub.should.have.been.calledOnce;
                supportsCaptureStackTraceStub.should.have.been.calledWithExactly();

                error.should.be.instanceOf(AppError);

                error.name.should.be.equal('AppError');
                error.message.should.be.equal(readableErrorMessage);
                error.error.should.be.equal(readableErrorMessage);

                const regex = /Error: Men wearing tinfoil hats believe aliens attacked USA/;
                regex.test(error.stack).should.be.true;
            });
        });

        describe('hasStackTrace', () => {
            it('should return true if Error.captureStackTrace is a function', () => {
                // this method purely depends on the version of node, no real test can be applied
                const result = AppError.supportsCaptureStackTrace();

                if (result) {
                    Error.captureStackTrace.should.be.a('function');
                } else {
                    should().not.exist(Error.captureStackTrace);
                }
            });
        });

        describe('convert', () => {
            it('should consume any non-AppError, returning an AppError with details of the original error', () => {
                const error = new Error('Some fake error');
                error.should.not.be.an.instanceOf(AppError);

                const appError = AppError.convert(error);

                appError.should.be.an.instanceOf(AppError);
                appError.message.should.be.equal('An unexpected error occurred.');
                appError.error.should.be.equal(error.message);
            });

            it('should return the error as is when the error is an instance of AppError', () => {
                const error = new AppError('Some app error');
                error.should.be.an.instanceOf(AppError);

                const appError = AppError.convert(error);

                appError.should.be.equal(error);
            });

            it('should return the error as is when the error is a derived instance of AppError', () => {
                const error = new NotFoundError('Some derived app error');
                error.should.be.an.instanceOf(AppError);

                const appError = AppError.convert(error);

                appError.should.be.equal(error);
            });
        });
    });

    describe('NotFoundError', () => {
        it('should construct as expected using defaults', () => {
            const error = new NotFoundError();

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotFoundError);

            error.name.should.be.equal('NotFoundError');
            error.message.should.be.equal('Not found');
            error.error.should.be.equal('Not found');

            const regex = /NotFoundError: Not found/;
            regex.test(error.stack).should.be.true;
        });

        it('should construct as expected using custom arguments', () => {
            const errMessage = 'Could not find the aliens';
            const error = new NotFoundError(errMessage);

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotFoundError);

            error.name.should.be.equal('NotFoundError');
            error.message.should.be.equal(errMessage);
            error.error.should.be.equal(errMessage);

            const regex = /NotFoundError: Could not find the aliens/;
            regex.test(error.stack).should.be.true;
        });
    });

    describe('ForbiddenError', () => {
        it('should construct as expected using defaults', () => {
            const error = new ForbiddenError();

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(ForbiddenError);

            error.name.should.be.equal('ForbiddenError');
            error.message.should.be.equal('Forbidden');
            error.error.should.be.equal('Forbidden');

            const regex = /ForbiddenError: Forbidden/;
            regex.test(error.stack).should.be.true;
        });

        it('should construct as expected using custom arguments', () => {
            const errMessage = 'You have to be an FBI agent to contact the aliens';
            const error = new ForbiddenError(errMessage);

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(ForbiddenError);

            error.name.should.be.equal('ForbiddenError');
            error.message.should.be.equal(errMessage);
            error.error.should.be.equal(errMessage);

            const regex = /ForbiddenError: You have to be an FBI agent to contact the aliens/;
            regex.test(error.stack).should.be.true;
        });
    });

    describe('NotImplementedError', () => {
        it('should construct as expected using defaults', () => {
            const error = new NotImplementedError();

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotImplementedError);

            error.name.should.be.equal('NotImplementedError');
            error.message.should.be.equal('Not yet implemented');
            error.error.should.be.equal('Not yet implemented');

            const regex = /NotImplementedError: Not yet implemented/;
            regex.test(error.stack).should.be.true;
        });

        it('should construct as expected using custom arguments', () => {
            const errMessage = 'Could not brainwash tinfoil hat wearers';
            const error = new NotImplementedError(errMessage);

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotImplementedError);

            error.name.should.be.equal('NotImplementedError');
            error.message.should.be.equal(errMessage);
            error.error.should.be.equal(errMessage);

            const regex = /NotImplementedError: Could not brainwash tinfoil hat wearers/;
            regex.test(error.stack).should.be.true;
        });
    });

    describe('NotSupportedError', () => {
        it('should construct as expected using defaults', () => {
            const error = new NotSupportedError();

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotSupportedError);

            error.name.should.be.equal('NotSupportedError');
            error.message.should.be.equal('Not supported');
            error.error.should.be.equal('Not supported');

            const regex = /NotSupportedError: Not supported/;
            regex.test(error.stack).should.be.true;
        });

        it('should construct as expected using custom arguments', () => {
            const errMessage = 'Only tinfoil-heads allowed';
            const error = new NotSupportedError(errMessage);

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(NotSupportedError);

            error.name.should.be.equal('NotSupportedError');
            error.message.should.be.equal(errMessage);
            error.error.should.be.equal(errMessage);

            const regex = /NotSupportedError: Only tinfoil-heads allowed/;
            regex.test(error.stack).should.be.true;
        });
    });

    describe('InputInvalidError', () => {
        it('should construct as expected using defaults', () => {
            const error = new InputInvalidError();

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(InputInvalidError);

            error.name.should.be.equal('InputInvalidError');
            error.message.should.be.equal('The input data supplied is invalid and/or does not meet expectation');
            error.error.should.be.equal('The input data supplied is invalid and/or does not meet expectation');

            const regex = /InputInvalidError: The input data supplied is invalid and\/or does not meet expectation/;
            regex.test(error.stack).should.be.true;
        });

        it('should construct as expected using custom arguments', () => {
            const errMessage = 'Expected an alien to be provided as proof of existence but got a mummy';
            const error = new InputInvalidError(errMessage);

            error.should.be.instanceOf(AppError);
            error.should.be.instanceOf(InputInvalidError);

            error.name.should.be.equal('InputInvalidError');
            error.message.should.be.equal(errMessage);
            error.error.should.be.equal(errMessage);

            const regex = /InputInvalidError: Expected an alien to be provided as proof of existence but got a mummy/;
            regex.test(error.stack).should.be.true;
        });
    });
});
