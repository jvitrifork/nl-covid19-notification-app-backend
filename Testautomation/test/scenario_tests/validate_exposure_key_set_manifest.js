const chai = require("chai");
const expect = chai.expect;
const moment = require("moment");
const manifest = require("../behaviours/manifest_behaviour");
const exposure_key_set = require("../behaviours/exposure_keys_set_behaviour");
const decode_protobuf = require("../../util/protobuff_decoding");

describe("Manifest endpoints tests #multiple_exposure_keys #scenario #regression", function () {
    this.timeout(4000 * 60 * 30);

    let manifest_response,
        exposureKeySet,
        exposure_keyset_response,
        exposure_keyset_decoded,
        exposure_keyset_decoded_set = [];

    before(function () {
        return manifest().then(function (manifest) {
            manifest_response = manifest;
            exposureKeySet = manifest.content.exposureKeySets;
        }).then(async function () {

            function getExposureKeySet(exposureKeySetId){
                return new Promise(function(resolve){
                    exposure_key_set(exposureKeySetId).then(function (exposure_keyset) {
                        exposure_keyset_response = exposure_keyset;
                        return decode_protobuf(exposure_keyset_response)
                            .then(function (EKS) {
                                return resolve(exposure_keyset_decoded = EKS)
                            });
                    })
                });
            }

            for(i = 0; i< exposureKeySet.length; i++){
                let result = await getExposureKeySet(exposureKeySet[i])
                exposure_keyset_decoded_set.push(result);
            }

        })
    });

    it("Exposure Key sets has all needed property keys", function () {
        console.log('Number of exposure_keyset_decoded_set: ' + exposure_keyset_decoded_set.length);

        exposure_keyset_decoded_set.forEach(exposure_keyset_decoded =>{
            let TemporaryExposureKey = exposure_keyset_decoded.keys
            TemporaryExposureKey.forEach(key => {
                key.keyData = key.keyData.toString("base64");
            })
            // console.log(exposure_keyset_decoded.keys);

            expect(exposure_keyset_decoded).to.have.nested.property("startTimestamp");

            // start timestamp is not older then 14 days
            let max_days_old = moment().add(-14,'days').unix();
            let yesterday = moment().add(-1,'days').unix()

            console.log(moment(exposure_keyset_decoded.endTimestamp));

            expect(exposure_keyset_decoded).to.have.nested.property("endTimestamp");
            expect(exposure_keyset_decoded).to.have.nested.property("region");
            expect(exposure_keyset_decoded).to.have.nested.property("batchNum");
            expect(exposure_keyset_decoded).to.have.nested.property("batchSize");
            expect(exposure_keyset_decoded).to.have.nested.property("signatureInfos");
            expect(exposure_keyset_decoded).to.have.nested.property("keys");
            expect(exposure_keyset_decoded).to.have.nested.property("revisedKeys");
            expect(exposure_keyset_decoded.signatureInfos[0]).to.have.nested.property("verificationKeyVersion", "v13");
            expect(exposure_keyset_decoded.signatureInfos[0]).to.have.nested.property("verificationKeyId", "204");
            expect(exposure_keyset_decoded.signatureInfos[0]).to.have.nested.property("signatureAlgorithm", "1.2.840.10045.4.3.2");

            console.log('Number of temp exposure keys: ' + exposure_keyset_decoded.keys.length)
            exposure_keyset_decoded.keys.forEach(key => {
                expect(key).to.have.nested.property("keyData").that.is.not.null;
                expect(key).to.have.nested.property("transmissionRiskLevel").that.is.not.null;
                expect(key).to.have.nested.property("rollingStartIntervalNumber").that.is.not.null;
                expect(key).to.have.nested.property("rollingPeriod").that.is.not.null;
            })
        })
    });

});