import { should } from 'chai';
import { stubInterface } from 'ts-sinon';

import { DefaultHandler } from '../../../../src/functions/default/handler';
import { ILogger } from '../../../../src/lib/logger';
import { IMetric } from '../../../../src/lib/metric';
import { SinonSandbox, createSandbox } from 'sinon';
import { NotImplementedError } from '../../../../src/lib/errors';
import { DefaultService } from '../../../../src/lib/services/default-service';
import { SQSEvent, SQSRecord } from 'aws-lambda';

describe('DefaultHandler', () => {
    let sandbox: SinonSandbox = null;

    let logger = null;
    let metric = null;
    let defaultService = null;
    let handler: DefaultHandler = null;

    beforeEach(() => {
        sandbox = createSandbox();

        logger = stubInterface<ILogger>();
        metric = stubInterface<IMetric>();
        defaultService = stubInterface<DefaultService>();
        handler = new DefaultHandler(defaultService, logger, metric);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Constructor', () => {
        it('should construct an instance as expected', () => {
            handler.should.be.deep.equal({
                defaultService,
                logger,
                metric
            });
        });
    });

    describe('default', () => {
        it('should reject with a NotImplementedError if invoked by a resource that is not supported', () => {
            const event = {};

            const detectEventSourceStub = sandbox.stub(handler, 'detectEventSource');
            detectEventSourceStub.returns(undefined);

            return handler.default(event)
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    detectEventSourceStub.should.have.been.calledOnce;
                    detectEventSourceStub.should.have.been.calledWithExactly(event);

                    defaultService.captureIssue.should.not.have.been.called;

                    err.should.be.an.instanceOf(NotImplementedError);
                    err.message.should.be.equal('No handling implemented to handle this request');
                });
        });

        describe('SQS', () => {
            let message: any;
            let event: SQSEvent;

            beforeEach(() => {
                message = { id: 'test' };
                event = wrapMessageAsSQSEvent(message);
            });

            const wrapMessageAsSQSEvent = (message: any): SQSEvent => {
                return {
                    Records: [{
                        eventSource: 'aws:sqs',
                        body: JSON.stringify({
                            Message: JSON.stringify(message)
                        })
                    } as SQSRecord]
                };
            };

            it('should reject with any error thrown by defaultService', () => {
                const error = new Error('Some fake error');

                const detectEventSourceStub = sandbox.stub(handler, 'detectEventSource');
                detectEventSourceStub.callThrough();

                defaultService.default.rejects(error);

                return handler.default(event)
                    .then(() => {
                        throw new Error('Expected an error to be thrown but got success');
                    }, err => {
                        detectEventSourceStub.should.have.been.calledOnce;
                        detectEventSourceStub.should.have.been.calledWithExactly(event);

                        defaultService.default.should.have.been.calledOnce;
                        defaultService.default.should.have.been.calledWithExactly(message.id);

                        err.should.be.equal(error);
                    });
            });

            it('should resolve void if no errors are thrown', () => {
                const detectEventSourceStub = sandbox.stub(handler, 'detectEventSource');
                detectEventSourceStub.callThrough();

                defaultService.default.resolves();

                return handler.default(event)
                    .then(result => {
                        detectEventSourceStub.should.have.been.calledOnce;
                        detectEventSourceStub.should.have.been.calledWithExactly(event);

                        defaultService.default.should.have.been.calledOnce;
                        defaultService.default.should.have.been.calledWithExactly(message.id);

                        should().not.exist(result);
                    });
            });
        });
    });
});
