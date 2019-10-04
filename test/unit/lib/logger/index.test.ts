import MockDate from 'mockdate';

import { should } from 'chai';
import { SinonSandbox, createSandbox } from 'sinon';

import { ILoggerOptions, Logger, LogLevels, LogLevelValues } from '../../../../src/lib/logger';

describe('Logger', () => {
    const name = 'some-logger';

    let sandbox: SinonSandbox = null;

    let opts: ILoggerOptions = null;
    let logger: Logger = null;

    beforeEach(() => {
        MockDate.set('2019-08-20T20:12:55.902Z');

        sandbox = createSandbox();

        opts = { name, someProperty: 'some-value' };
        logger = new Logger(opts);
    });

    afterEach(() => {
        sandbox.restore();
        MockDate.reset();
    });

    describe('Constructor', () => {
        it('should throw a TypeError if no arguments are supplied', () => {
            return Promise.resolve()
                .then(() => new Logger())
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    err.should.be.an.instanceOf(TypeError);
                    err.message.should.be.equal('options.name (string) is required');
                });
        });

        it('should throw a TypeError if a name isn\'t supplied', () => {
            return Promise.resolve({})
                .then(opts => new Logger(opts))
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    err.should.be.an.instanceOf(TypeError);
                    err.message.should.be.equal('options.name (string) is required');
                });
        });

        it('should create an instance as expected', () => {
            const opts: ILoggerOptions = { name: 'test-name' };
            logger = new Logger(opts);
            logger.should.be.deep.equal({ fields: opts, level: 'info', name: opts.name });
        });

        it('should create an instance as expected with additional options', () => {
            logger.should.be.deep.equal({ fields: opts, level: 'info', name: opts.name });
        });
    });

    describe('child', () => {
        it('should throw a TypeError if childOpts has a name', () => {
            return Promise.resolve({ name: 'child-logger' })
                .then((opts: ILoggerOptions) => logger.child(opts))
                .then(() => {
                    throw new Error('Expected an error to be thrown but got success');
                }, err => {
                    err.should.be.an.instanceOf(TypeError);
                    err.message.should.be.equal('invalid options.name: child cannot set logger name');
                });
        });

        it('should return a child logger overriding the parent options', () => {
            const childOpts: ILoggerOptions = { childProperty: 'child-value' };
            const childLogger = logger.child(childOpts);
            childLogger.should.be.deep.equal({
                fields: { ...opts, ...childOpts },
                level: 'info',
                name
            });
        });
    });

    describe('prepareLogObject', () => {
        it('should return a json formated string as expected', () => {
            const obj = { hello: 'world' };
            const result = Logger.prepareLogObject(obj);
            result.should.be.equal('{"hello":"world"}\n');
        });

        it('should return a json formated string as expected', () => {
            const obj = { hello: 'world', items: [{ foo: 'bar', value: 1 }] };
            const result = Logger.prepareLogObject(obj);
            result.should.be.equal('{"hello":"world","items":[{"foo":"bar","value":1}]}\n');
        });
    });

    describe('isLoggable', () => {
        it('should return false if the configured loglevel is higher than the loglevel used', () => {
            logger.level.should.be.equal(LogLevels.INFO);

            const isLoggable = logger.isLoggable(LogLevels.TRACE);
            isLoggable.should.be.false;
        });

        it('should return true if the configured loglevel is equal to the loglevel used', () => {
            logger.level.should.be.equal(LogLevels.INFO);

            const isLoggable = logger.isLoggable(LogLevels.INFO);
            isLoggable.should.be.true;
        });

        it('should return true if the configured loglevel is higher than the loglevel used', () => {
            logger.level.should.be.equal(LogLevels.INFO);

            const isLoggable = logger.isLoggable(LogLevels.FATAL);
            isLoggable.should.be.true;
        });
    });

    describe('writeLog', () => {
        it('should not stream the log result if the loglevel is lower than the configured loglevel', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };
            const logLevel = LogLevels.TRACE;

            const isLoggableStub = sandbox.stub(logger, 'isLoggable');
            isLoggableStub.returns(false);

            const stdoutStub = sandbox.stub(process.stdout, 'write');
            stdoutStub.callThrough();

            const result = logger.writeLog(logLevel, msg, data);

            isLoggableStub.should.have.been.calledOnce;
            isLoggableStub.should.have.been.calledWithExactly(LogLevelValues[logLevel]);

            stdoutStub.should.not.have.been.called;
            should().not.exist(result);
        });

        it('should format a message and write to process.stdout when the loglevel is equal to the configured loglevel', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };
            const logLevel = LogLevels.FATAL;

            const isLoggableStub = sandbox.stub(logger, 'isLoggable');
            isLoggableStub.returns(true);

            const stdoutStub = sandbox.stub(process.stdout, 'write');
            stdoutStub.returns(undefined);

            const result = logger.writeLog(logLevel, msg, data);

            isLoggableStub.should.have.been.calledOnce;
            isLoggableStub.should.have.been.calledWithExactly(LogLevelValues[logLevel]);

            stdoutStub.should.have.been.calledOnce;
            stdoutStub.should.have.been.calledWithExactly('{"id":"some-id","name":"some-logger","someProperty":"some-value","v":0,"pid":1,"hostname":"aws-lambda","time":"2019-08-20T20:12:55.902Z","level":60,"msg":"Some event occurred"}\n');
            should().not.exist(result);
        });

        it('should format a message and write to process.stdout when the loglevel is equal to the configured loglevel with rrid', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id', 'x-rrid': 'some-rrid' };
            const logLevel = LogLevels.FATAL;

            const isLoggableStub = sandbox.stub(logger, 'isLoggable');
            isLoggableStub.returns(true);

            const stdoutStub = sandbox.stub(process.stdout, 'write');
            stdoutStub.returns(undefined);

            const result = logger.writeLog(logLevel, msg, data);

            isLoggableStub.should.have.been.calledOnce;
            isLoggableStub.should.have.been.calledWithExactly(LogLevelValues[logLevel]);

            stdoutStub.should.have.been.calledOnce;
            stdoutStub.should.have.been.calledWithExactly('{"id":"some-id","name":"some-logger","someProperty":"some-value","v":0,"pid":1,"hostname":"aws-lambda","time":"2019-08-20T20:12:55.902Z","level":60,"msg":"Some event occurred","rrid":"some-rrid"}\n');
            should().not.exist(result);
        });
    });

    describe('trace', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.trace(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.TRACE, msg, data);
            should().not.exist(result);
        });
    });

    describe('debug', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.debug(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.DEBUG, msg, data);
            should().not.exist(result);
        });
    });

    describe('info', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.info(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.INFO, msg, data);
            should().not.exist(result);
        });
    });

    describe('warn', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.warn(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.WARN, msg, data);
            should().not.exist(result);
        });
    });

    describe('error', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.error(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.ERROR, msg, data);
            should().not.exist(result);
        });
    });

    describe('fatal', () => {
        it('should invoke the writeLog method with the expected arguments', () => {
            const msg = 'Some event occurred';
            const data = { id: 'some-id' };

            const writeLogStub = sandbox.stub(logger, 'writeLog');
            writeLogStub.returns();

            const result = logger.fatal(msg, data);

            writeLogStub.should.have.been.calledOnce;
            writeLogStub.should.have.been.calledWithExactly(LogLevels.FATAL, msg, data);
            should().not.exist(result);
        });
    });
});
