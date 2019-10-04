import { Helper } from '../../../src/lib/helpers';

describe('Helper', () => {
    describe('hash', () => {
        const value1 = 'some-value';
        const value2 = 'some-other-value';
        const value3 = 'some-extremely-long-winded-value.with@extraFuNNYCH4RACT3R5';

        it('should create an md5|hex hash of any value supplied using the defaults', () => {
            Helper.hash(value1).should.be.equal('8c561147ab3ce19bb8e73db4a47cc6ac');
            Helper.hash(value2).should.be.equal('e5e2edf47fbd08fe4044959e9fa3b53b');
            Helper.hash(value3).should.be.equal('5822163293e5b17a46898d9af0fdd79d');
        });

        it('should create an sha256|hex hash of any value supplied when specifing sha256', () => {
            Helper.hash(value1, 'sha256').should.be.equal('700f3c597d9a0db5fc2dcc41c8d9b650d64ba0ed979dc00f1e3dea17fca07a1f');
            Helper.hash(value2, 'sha256').should.be.equal('0f2025781edcb4642f53d3370db301618a1e6f36b40daa3c9b6f23d779fbdbfb');
            Helper.hash(value3, 'sha256').should.be.equal('a1f71ac00beb2f04f66f280e91d9e03a91c9919f5b7708b50722b746ed7ff015');
        });

        it('should create an md5|base64 hash of any value supplied using the arguments supplied', () => {
            Helper.hash(value1, 'md5', 'base64').should.be.equal('jFYRR6s84Zu45z20pHzGrA==');
            Helper.hash(value2, 'md5', 'base64').should.be.equal('5eLt9H+9CP5ARJWen6O1Ow==');
            Helper.hash(value3, 'md5', 'base64').should.be.equal('WCIWMpPlsXpGiY2a8P3XnQ==');
        });

        it('should create an sha256|base64 hash of any value supplied using the arguments supplied', () => {
            Helper.hash(value1, 'sha256', 'base64').should.be.equal('cA88WX2aDbX8LcxByNm2UNZLoO2XncAPHj3qF/ygeh8=');
            Helper.hash(value2, 'sha256', 'base64').should.be.equal('DyAleB7ctGQvU9M3DbMBYYoebza0Dao8m28j13n72/s=');
            Helper.hash(value3, 'sha256', 'base64').should.be.equal('ofcawAvrLwT2bygOkdngOpHJkZ9bdwi1ByK3Ru1/8BU=');
        });
    });
});
