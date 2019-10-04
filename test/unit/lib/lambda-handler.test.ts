import MockDate from 'mockdate';

import { Context } from 'aws-lambda';
import { SinonSandbox, createSandbox } from 'sinon';
import { stubInterface } from 'ts-sinon';

import { AwsLambdaHandler, AwsLambdaInvoker } from '../../../src/lib/lambda-handler';
import { ILogger } from '../../../src/lib/logger';
import { IMetric } from '../../../src/lib/metric';
import { AppError } from '../../../src/lib/errors';

describe('AwsLambdaHandler', () => {
    let sandbox: SinonSandbox = null;

    let logger = null;
    let metric = null;
    let handler: MockAwsLambdaHandler = null;

    beforeEach(() => {
        MockDate.set('2019-08-25T13:25:56.878Z');
        sandbox = createSandbox();

        logger = stubInterface<ILogger>();
        metric = stubInterface<IMetric>();
        handler = new MockAwsLambdaHandler(logger, metric);
    });

    afterEach(() => {
        sandbox.restore();
        MockDate.reset();
    });

    describe('Constructor', () => {
        it('should construct the instance as expected', () => {
            handler.should.be.deep.equal({
                logger,
                metric
            });
        });
    });

    describe('decorate', () => {
        it('should wrap the lambda function in a promise that will handle failure logging and metrics and return an AppError if not an AppError', () => {
            const name = 'getId';
            const fn = handler.decorate(name);

            const event = {};
            const context = {} as Context;

            const errorMessage = 'Some fake error';
            const error = new Error(errorMessage);
            const getIdStub = sandbox.stub(handler, 'getId');
            getIdStub.throws(error);

            return fn(event, context)
                .then(() => {
                    throw new Error('Expected an erorr to be thrown but got success');
                }, err => {
                    logger.trace.should.have.been.calledOnce;
                    logger.trace.should.have.been.calledWithExactly(`${name} - Start`, { data: { event, context } });

                    logger.debug.should.not.have.been.called;

                    logger.error.should.have.been.calledOnce;
                    logger.error.should.have.been.calledWithExactly(`${name} - Error`, { error, data: { event, context } });

                    metric.gauge.should.have.been.calledTwice;
                    metric.gauge.firstCall.should.have.been.calledWithExactly(name, 'start', 1);
                    metric.gauge.secondCall.should.have.been.calledWithExactly(name, 'failure', 1);

                    metric.timer.should.have.been.calledOnce;
                    metric.timer.should.have.been.calledWithExactly(name, 'latency', new Date());

                    getIdStub.should.have.been.calledOnce;
                    getIdStub.should.have.been.calledWithExactly(event, context);

                    err.should.be.an.instanceOf(AppError);
                    err.message.should.be.equal('An unexpected error occurred');
                    err.error.should.be.equal(errorMessage);
                });
        });

        it('should wrap the lambda function in a promise that will handle failure logging and metrics and return any AppError as is', () => {
            const name = 'getId';
            const fn = handler.decorate(name);

            const event = {};
            const context = {} as Context;

            const error = new AppError('Some fake error');
            const getIdStub = sandbox.stub(handler, 'getId');
            getIdStub.throws(error);

            return fn(event, context)
                .then(() => {
                    throw new Error('Expected an erorr to be thrown but got success');
                }, err => {
                    logger.trace.should.have.been.calledOnce;
                    logger.trace.should.have.been.calledWithExactly(`${name} - Start`, { data: { event, context } });

                    logger.debug.should.not.have.been.called;

                    logger.error.should.have.been.calledOnce;
                    logger.error.should.have.been.calledWithExactly(`${name} - Error`, { error, data: { event, context } });

                    metric.gauge.should.have.been.calledTwice;
                    metric.gauge.firstCall.should.have.been.calledWithExactly(name, 'start', 1);
                    metric.gauge.secondCall.should.have.been.calledWithExactly(name, 'failure', 1);

                    metric.timer.should.have.been.calledOnce;
                    metric.timer.should.have.been.calledWithExactly(name, 'latency', new Date());

                    getIdStub.should.have.been.calledOnce;
                    getIdStub.should.have.been.calledWithExactly(event, context);

                    err.should.be.equal(error);
                });
        });

        it('should wrap the lambda function in a promise that will handle success logging and metrics', () => {
            const name = 'getId';
            const fn = handler.decorate(name);

            const event = {};
            const context = {} as Context;

            const value = 'some-value';
            const getIdStub = sandbox.stub(handler, 'getId');
            getIdStub.returns(value);

            return fn(event, context)
                .then(result => {
                    logger.trace.should.have.been.calledOnce;
                    logger.trace.should.have.been.calledWithExactly(`${name} - Start`, { data: { event, context } });

                    logger.debug.should.have.been.calledOnce;
                    logger.debug.should.have.been.calledWithExactly(`${name} - Complete`, { data: { result, event, context } });

                    logger.error.should.not.have.been.calledOnce;

                    metric.gauge.should.have.been.calledTwice;
                    metric.gauge.firstCall.should.have.been.calledWithExactly(name, 'start', 1);
                    metric.gauge.secondCall.should.have.been.calledWithExactly(name, 'success', 1);

                    metric.timer.should.have.been.calledOnce;
                    metric.timer.should.have.been.calledWithExactly(name, 'latency', new Date());

                    getIdStub.should.have.been.calledOnce;
                    getIdStub.should.have.been.calledWithExactly(event, context);

                    result.should.be.equal(value);
                });
        });
    });

    describe('detectEventSource', () => {
        it('should return AwsLambdaInvoker.CLOUDFRONT when record has a cf property', () => {
            const event = {
                Records: [{
                    cf: {}
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.CLOUDFRONT);
        });

        it('should return AwsLambdaInvoker.CODE_COMMIT when record has eventSource = aws:codecommit', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:codecommit'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.CODE_COMMIT);
        });

        it('should return AwsLambdaInvoker.SQS when record has eventSource = aws:sqs', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:sqs'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.SQS);
        });

        it('should return AwsLambdaInvoker.SES when record eventSource = aws:ses', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:ses'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.SES);
        });

        it('should return AwsLambdaInvoker.SNS when record has eventSource = aws:sns', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:sns'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.SNS);
        });

        it('should return AwsLambdaInvoker.DDB when record has eventSource = aws:dynamodb', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:dynamodb'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.DDB);
        });

        it('should return AwsLambdaInvoker.KINESIS when record has eventSource = aws:kinesis', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:kinesis'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.KINESIS);
        });

        it('should return AwsLambdaInvoker.S3 when record has eventSource = aws:s3', () => {
            const event = {
                Records: [{
                    eventSource: 'aws:s3'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.S3);
        });

        it('should return AwsLambdaInvoker.KINESIS_FIREHOSE when record has approximateArrivalTimestamp', () => {
            const event = {
                records: [{
                    approximateArrivalTimestamp: 'some-timestamp'
                }]
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.KINESIS_FIREHOSE);
        });

        it('should return AwsLambdaInvoker.KINESIS_FIREHOSE when record has deliveryStreamArn starting with "arn:aws:kinesis"', () => {
            const event = {
                records: [{
                }],
                deliveryStreamArn: 'arn:aws:kinesis:xxxxxxxx'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.KINESIS_FIREHOSE);
        });

        it('should return AwsLambdaInvoker.UNKNOWN when record has deliveryStreamArn not starting with "arn:aws:kinesis"', () => {
            const event = {
                records: [{
                }],
                deliveryStreamArn: 'blah:xxxxxxxx'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.UNKNOWN);
        });

        it('should return AwsLambdaInvoker.AWS_CONFIG when the event has properties configRuleId, configRuleName and configRuleArn', () => {
            const event = {
                configRuleId: 'some-id',
                configRuleName: 'some-name',
                configRuleArn: 'some-arn'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.AWS_CONFIG);
        });

        it('should return AwsLambdaInvoker.API_GATEWAY_AUTHORIZER when the event has property authorizationToken = "incoming-client-token"', () => {
            const event = {
                authorizationToken: 'incoming-client-token'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.API_GATEWAY_AUTHORIZER);
        });

        it('should return AwsLambdaInvoker.CLOUDFORMATION when the event has properties StackId, RequestType and ResourceType', () => {
            const event = {
                StackId: 'some-stack-id',
                RequestType: 'some-request-type',
                ResourceType: 'some-resource-type'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.CLOUDFORMATION);
        });

        it('should return AwsLambdaInvoker.API_GATEWAY_PROXY when the event has property pathParameters.proxy', () => {
            const event = {
                pathParameters: {
                    proxy: 'some-proxy'
                }
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.API_GATEWAY_PROXY);
        });

        it('should return AwsLambdaInvoker.SCHEDULED when the event has property source = "aws.events"', () => {
            const event = {
                source: 'aws.events'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.SCHEDULED);
        });

        it('should return AwsLambdaInvoker.CLOUDWATCH_LOGS when the event has property awslogs.data', () => {
            const event = {
                awslogs: {
                    data: 'some-data'
                }
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.CLOUDWATCH_LOGS);
        });

        it('should return AwsLambdaInvoker.COGNITO_SYNC_TRIGGER when the event has properties eventType = "SyncTrigger", event.identityId and event.identityPoolId', () => {
            const event = {
                eventType: 'SyncTrigger',
                identityId: 'some-identity-id',
                identityPoolId: 'some-identity-pool-id'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.COGNITO_SYNC_TRIGGER);
        });

        it('should return AwsLambdaInvoker.MOBILE_BACKEND when the event has properties operation and message', () => {
            const event = {
                operation: 'some-operation',
                message: 'some-message'
            };
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.MOBILE_BACKEND);
        });

        it('should return AwsLambdaInvoker.UNKNOWN when no match is found', () => {
            const event = {};
            const eventSource = handler.detectEventSource(event);

            eventSource.should.be.equal(AwsLambdaInvoker.UNKNOWN);
        });
    });
});

class MockAwsLambdaHandler extends AwsLambdaHandler {
    getId(): string {
        return 'some-id';
    }
}
