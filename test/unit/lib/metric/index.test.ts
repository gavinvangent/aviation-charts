import { should } from 'chai';
import { NoopMetric } from '../../../../src/lib/metric';

describe('NoopMetric', () => {
    let metric: NoopMetric = null;

    beforeEach(() => {
        metric = new NoopMetric();
    });

    describe('Constructor', () => {
        it('should construct an instance as expected', () => {
            metric.should.be.deep.equal({});
        });
    });

    describe('gauge', () => {
        it('should return void without having done anything', () => {
            const result = metric.gauge();
            should().not.exist(result);
        });
    });

    describe('timer', () => {
        it('should return void without having done anything', () => {
            const result = metric.timer();
            should().not.exist(result);
        });
    });
});
