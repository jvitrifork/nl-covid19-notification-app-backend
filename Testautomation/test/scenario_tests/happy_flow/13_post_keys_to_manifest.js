const chai = require("chai");
const expect = chai.expect;
const dataprovider = require("../../data/dataprovider");
const app_register = require("../../behaviours/app_register_behaviour");
const post_keys = require("../../behaviours/post_keys_behaviour");
const testsSig = require("../../../util/sig_encoding");
const lab_confirm = require("../../behaviours/labconfirm_behaviour");
const lab_verify = require("../../behaviours/labverify_behaviour");
const manifest = require("../../behaviours/manifest_behaviour");
const exposure_key_set = require("../../behaviours/exposure_keys_set_behaviour");
const decode_protobuf = require("../../../util/protobuff_decoding");
const formatter = require("../../../util/format_strings");

describe("Validate push of my exposure key into manifest - #13_post_keys_to_manifest #scenario #regression", function () {
  this.timeout(3000 * 60 * 30);

  // console.log("Scenario: Register > Post keys > Lab Confirm > wait (x min.) > Lab verify > Manifest > EKS")

  let app_register_response,
    postkeys_response,
    lab_confirm_response,
    labConfirmationId,
    pollToken,
    lab_verify_response,
    manifest_response,
    exposure_keyset_response,
    exposure_keyset_decoded,
    formated_bucket_id,
    exposureKeySet,
    exposure_keyset_decoded_set = [],
    currentVersion = "v1",
    nextVersion = "v2",
    delayInMilliseconds = 1000; // delay should be minimal 6 min.

  beforeEach(done => setTimeout(done, 2000));

  before(function () {
    return app_register(currentVersion)
      .then(function (register) {
        app_register_response = register;
        labConfirmationId = register.data.labConfirmationId;
      })
      .then(function () {
        let map = new Map();
        map.set("LABCONFIRMATIONID", formatter.format_remove_dash(labConfirmationId));

        return lab_confirm(
            dataprovider.get_data(
                "lab_confirm_payload", "payload", "valid_dynamic_yesterday", map)
            , currentVersion
        ).then(function (confirm) {
          lab_confirm_response = confirm;
          pollToken = confirm.data.pollToken;
        });
      })
      .then(function (sig) {
        formated_bucket_id = formatter.format_remove_characters(app_register_response.data.bucketId);
        let map = new Map();
        map.set("BUCKETID", formated_bucket_id);

        return testsSig(
          dataprovider.get_data("post_keys_payload", "payload", "valid_dynamic_13_keys", map),
          formatter.format_remove_characters(app_register_response.data.confirmationKey)
        );
      })
      .then(function (sig) {
        let map = new Map();
        map.set("BUCKETID", formated_bucket_id);

        return post_keys(
          dataprovider.get_data(
              "post_keys_payload", "payload", "valid_dynamic_13_keys", map)
            , sig.sig
            , currentVersion
        ).then(function (postkeys) {
          postkeys_response = postkeys;
        });
      })
      .then(function (){
          return lab_verify(pollToken, currentVersion).then(function (response) {
            lab_verify_response = response;
          });
      }).then(function (){
          console.log(`Start delay for ${delayInMilliseconds/1000/60} min.`)
          console.log('started delay at: ' + new Date(Date.now()).toLocaleString());
          return new Promise(function (resolve){
            setTimeout(function() {
              resolve();
            }, delayInMilliseconds);
          })
      })
      .then(function () {
        return manifest(nextVersion).then(function (manifest) {
          manifest_response = manifest;
          exposureKeySet = manifest.content.exposureKeySets;
        });
      })
      .then(async function () {

        function getExposureKeySet(exposureKeySetId){
          return new Promise(function(resolve){
            exposure_key_set(exposureKeySetId, nextVersion).then(function (exposure_keyset) {
              exposure_keyset_response = exposure_keyset;
              return decode_protobuf(exposure_keyset_response)
                  .then(function (EKS) {
                    return resolve(exposure_keyset_decoded = EKS)
                  });
            })
          });
        }

        for(i = 0; i< exposureKeySet.length; i++){
          let eks = await getExposureKeySet(exposureKeySet[i])
          let TemporaryExposureKey = eks.keys
          // decode keydata into readable text
          TemporaryExposureKey.forEach(key => {
            key.keyData = key.keyData.toString("base64");
          })
          let obj = {"exposureKeySet" : exposureKeySet[i],
            "eks":eks
          }
          exposure_keyset_decoded_set.push(obj);
        }
      });
  });

  after(function (){
    dataprovider.clear_saved();
  })

  if("Labverify should be true, so postkey is uploaded to bucket", function (){
    expect(lab_verify_response.data.valid,"postkey is in bucket").to.be.equal("true")
  });

  it("The exposureKey pushed was in the manifest", function () {
    let exposure_key_send = JSON.parse(
      dataprovider.get_data("post_keys_payload", "payload", "valid_dynamic_13_keys", new Map())
    ).keys;

    console.log('Number of exposure_keyset_decoded_set: ' + exposure_keyset_decoded_set.length);

    exposure_keyset_decoded_set.forEach(exposure_keyset_decoded => {
      console.log('Received key set: ' + exposure_keyset_decoded.exposureKeySet);

      exposure_keyset_decoded.eks.keys.forEach(received_keys => {
        exposure_key_send.forEach(send_keys => {
          console.log('Send key:' + send_keys.keyData + ' = ' + received_keys.keyData + '?')
          found = false;
          if (received_keys.keyData == send_keys.keyData){
            found = true;
            // validate transmissionRiskLevel number based on the rollingStartIntervalNumber
            let rollingStartIntervalNumber = key.rollingStartIntervalNumber * 600;
            let DSSO = moment().add(-1, 'days').unix(); // yesterday
            let RSN = moment(rollingStartIntervalNumber);
            let dif = Math.floor((DSSO+RSN) / 86400);
            let expectedRiskLevel;
            // console.log('yesterday:' + moment.unix(x).format('dddd, MMMM Do, YYYY h:mm:ss A'));
            // console.log('rollingStartIntervalNumber: ' + moment.unix(rollingStartIntervalNumber).format('dddd, MMMM Do, YYYY h:mm:ss A'));
            // console.log('dif in days: ' + dif);
            // console.log(key.transmissionRiskLevel);
            switch (parseInt(dif)){
              case -2: case 3: case 4:
                // console.log('case -2, 3, 4')
                expectedRiskLevel = 2;
                break
              case -1: case 0: case 1: case 2:
                // console.log('case -1, 0, 1, 2')
                expectedRiskLevel = 3;
                break;
              case 5: case 6: case 7: case 8: case 9: case 10: case 11:
                // console.log('case 5, 6, 7, 8. 9, 10, 11')
                expectedRiskLevel = 1
                break;
              default:
                // console.log('default case')
                expectedRiskLevel = 6
                break;
            }
            expect(received_keys.transmissionRiskLevel,`key: ${received_keys.keyData}`).to.be.eql(expectedRiskLevel)

            if(found){
              expect(true, `Expected EKS ${send_keys.keyData} is found in the manifest`).to.be.eql(true);
            }
          }
        })
      })

    })

    if(!found){
      let keyArray = []
      exposure_key_send.forEach(keys => keyArray.push(keys.keyData))
      expect(true, `Expected send keys ${keyArray} are found in the manifest`).to.be.eql(false);
    }
  });

});