/**
 * Copyright (c) 2012-2014 Netflix, Inc.  All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * <p>MSL encryption envelopes contain all of the information necessary for
 * decrypting and verifying the integrity of its data payload.</p>
 *
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
var MslCiphertextEnvelope;
var MslCiphertextEnvelope$create;
var MslCiphertextEnvelope$parse;
var MslCiphertextEnvelope$Version;

(function() {
    /**
     * JSON key version.
     * @const
     * @type {string}
     */
    var KEY_VERSION = "version";
    /**
     * JSON key key ID.
     * @const
     * @type {string}
     */
    var KEY_KEY_ID = "keyid";
    /**
     * JSON key cipherspec.
     * @const
     * @type {string}
     */
    var KEY_CIPHERSPEC = "cipherspec";
    /**
     * JSON key initialization vector.
     * @const
     * @type {string}
     */
    var KEY_IV = "iv";
    /**
     * JSON key ciphertext.
     * @const
     * @type {string}
     */
    var KEY_CIPHERTEXT = "ciphertext";
    /**
     * JSON key SHA-256.
     * @const
     * @type {string} 
     */
    var KEY_SHA256 = "sha256";

    /** Versions. */
    var Version = MslCiphertextEnvelope$Version = {
        /**
         * <p>Version 1.</p>
         * 
         * {@code {
         *   "#mandatory" : [ "keyid", "iv", "ciphertext", "sha256" ],
         *   "keyid" : "string",
         *   "iv" : "base64",
         *   "ciphertext" : "base64",
         *   "sha256" : "base64",
         * }} where:
         * <ul>
         * <li>{@code keyid} is the encryption key ID</li>
         * <li>{@code iv} is the Base64-encoded initialization vector</li>
         * <li>{@code ciphertext} is the Base64-encoded ciphertext</li>
         * <li>{@code sha256} is the Base64-encoded SHA-256 of the encryption envelope</li>
         * </ul>
         * 
         * <p>The SHA-256 is computed over the concatenation of {@code key ID ||
         * IV || ciphertext}.</p>
         */
        V1 : 1,
        /**
         * <p>Version 2.</p>
         * 
         * {@code {
         *   "#mandatory" : [ "version", "cipherspec", "ciphertext" ],
         *   "version" : "number",
         *   "cipherspec" : "string",
         *   "iv" : "base64",
         *   "ciphertext" : "base64",
         * }} where:
         * <ul>
         * <li>{@code version} is the number '2'</li>
         * <li>{@code cipherspec} is one of the recognized cipher specifications</li>
         * <li>{@code iv} is the optional Base64-encoded initialization vector</li>
         * <li>{@code ciphertext} is the Base64-encoded ciphertext</li>
         * </ul>
         * 
         * <p>Supported cipher specifications:
         * <table>
         * <tr><th>Cipher Spec</th><th>Description</th></tr>
         * <tr><td>AES/CBC/PKCS5Padding</td><td>AES CBC w/PKCS#5 Padding</td></tr>
         * </table></p>
         */
        V2 : 2
    };
    
    MslCiphertextEnvelope = util.Class.create({
        /**
         * <p>Create a new encryption envelope with the provided details.</p>
         *
         * @param {string|MslConstants$CipherSpec} keyIdOrSpec the key
         *        identifier or cipher specification.
         * @param {?Uint8Array} iv the initialization vector. May be null.
         * @param {Uint8Array} ciphertext the ciphertext.
         * @param {{result: function(MslCiphertextEnvelope), error: function(Error)}}
         *        callback the callback functions that will receive the envelope
         *        or any thrown exceptions.
         * @constructor
         */
        init: function init(keyIdOrSpec, iv, ciphertext, callback) {
            AsyncExecutor(callback, function() {
                // Determine envelope version from first parameter.
                var version = Version.V1,
                    keyId   = keyIdOrSpec,
                    cipherSpec = null;
                for (var key in MslConstants$CipherSpec) {
                    if (MslConstants$CipherSpec[key] == keyIdOrSpec) {
                        version = Version.V2;
                        keyId = null;
                        cipherSpec = keyIdOrSpec;
                        break;
                    }
                }
                
                // The properties.
                var props = {
                    version: { value: version, writable: false, enumerable: false, configurable: false },
                    keyId: { value: keyId, writable: false, configurable: false },
                    cipherSpec: { value: cipherSpec, writable: false, configurable: false },
                    iv: { value: iv, writable: false, configurable: false },
                    ciphertext: { value: ciphertext, writable: false, configurable: false },
                };
                Object.defineProperties(this, props);
                return this;
            }, this);
        },

        /** @inheritDoc */
        toJSON: function toJSON() {
            // Construct the JSON.
            var result = {};
            switch (this.version) {
                case Version.V1:
                    result[KEY_KEY_ID] = this.keyId;
                    if (this.iv)
                        result[KEY_IV] = base64$encode(this.iv);
                    result[KEY_CIPHERTEXT] = base64$encode(this.ciphertext);
                    result[KEY_SHA256] = "AA==";
                    break;
                case Version.V2:
                    result[KEY_VERSION] = this.version;
                    result[KEY_CIPHERSPEC] = this.cipherSpec;
                    if (this.iv)
                        result[KEY_IV] = base64$encode(this.iv);
                    result[KEY_CIPHERTEXT] = base64$encode(this.ciphertext);
                    break;
                default:
                    throw new MslInternalException("Ciphertext envelope version " + this.version + " encoding unsupported.");
            }
            return result;
        }
    });

    /**
     * <p>Create a new encryption envelope with the provided details.</p>
     *
     * @param {string|CipherSpec} keyIdOrSpec the key identifier or cipher
     *        specification.
     * @param {Uint8Array} iv the initialization vector. May be null.
     * @param {Uint8Array} ciphertext the ciphertext.
     * @param {{result: function(MslCiphertextEnvelope), error: function(Error)}}
     *        callback the callback functions that will receive the envelope
     *        or any thrown exceptions.
     */
    MslCiphertextEnvelope$create = function MslCiphertextEnvelope$create(keyIdOrCipherSpec, iv, ciphertext, callback) {
        new MslCiphertextEnvelope(keyIdOrCipherSpec, iv, ciphertext, callback);
    };

    /**
     * Create a new encryption envelope from the provided JSON object. If an
     * envelope version is provided then the JSON object is parsed accordingly.
     *
     * @param {Object} jsonObj the JSON object.
     * @param {?MslCiphertextEnvelope$Version} version the envelope version.
     *        May be null.
     * @param {{result: function(MslCiphertextEnvelope), error: function(Error)}}
     *        callback the callback functions that will receive the envelope
     *        or any thrown exceptions.
     * @throws MslCryptoException if there is an error processing the
     *         encryption envelope.
     * @throws MslEncodingException if there is an error parsing the JSON.
     */
    MslCiphertextEnvelope$parse = function MslCiphertextEnvelope$parse(jsonObj, version, callback) {
        AsyncExecutor(callback, function() {
            // Extract values.
            var keyId        = jsonObj[KEY_KEY_ID],
                cipherSpec   = jsonObj[KEY_CIPHERSPEC],
                iv           = jsonObj[KEY_IV],
                ciphertext   = jsonObj[KEY_CIPHERTEXT],
                sha256       = jsonObj[KEY_SHA256];
            
            // If a version was not specified, determine the envelope version.
            if (!version) {
                version = jsonObj[KEY_VERSION];
                if (!version || typeof version !== 'number' || version !== version) {
                    // If anything fails to parse, treat this as a version 1 envelope.
                    version = Version.V1;
                } else {
                    var identified = false;
                    for (var v in Version) {
                        if (Version[v] == version) {
                            identified = true;
                            break;
                        }
                    }
                    if (!identified)
                        throw new MslCryptoException(MslError.UNIDENTIFIED_CIPHERTEXT_ENVELOPE, "ciphertext envelope " + JSON.stringify(jsonObj));
                }
            }
            
            // Parse envelope.
            var keyIdOrSpec;
            switch (version) {
                case Version.V1:
                    // Verify values.
                    if (typeof keyId !== 'string' ||
                        (iv && typeof iv !== 'string') ||
                        typeof ciphertext !== 'string' ||
                        typeof sha256 !== 'string')
                    {
                        throw new MslEncodingException(MslError.JSON_PARSE_ERROR, "ciphertext envelope " + JSON.stringify(jsonObj));
                    }
                    
                    // Version 1 envelopes use the key ID.
                    keyIdOrSpec = keyId;
                    break;
                case Version.V2:
                    // Verify values.
                    var v = jsonObj[KEY_VERSION];
                    if (v != Version.V2)
                        throw new MslCryptoException(MslError.UNIDENTIFIED_CIPHERTEXT_ENVELOPE, "ciphertext envelope " + JSON.stringify(jsonObj));
                    if (typeof cipherSpec !== 'string' ||
                        (iv && typeof iv !== 'string') ||
                        typeof ciphertext !== 'string')
                    {
                        throw new MslEncodingException(MslError.JSON_PARSE_ERROR, "ciphertext envelope " + JSON.stringify(jsonObj));
                    }
                    
                    // Version 2 envelopes use the cipher specification.
                    cipherSpec = MslConstants$CipherSpec$fromString(cipherSpec);
                    if (!cipherSpec)
                        throw new MslCryptoException(MslError.UNIDENTIFIED_CIPHERSPEC, "ciphertext envelope " + JSON.stringify(jsonObj));
                    keyIdOrSpec = cipherSpec;
                    break;
                default:
                    throw new MslCryptoException(MslError.UNSUPPORTED_CIPHERTEXT_ENVELOPE, "ciphertext envelope " + JSON.stringify(jsonObj));
            }
            
            // Convert Base64-encoded values to Uint8Array.
            try {
                if (iv)
                    iv = base64$decode(iv);
                ciphertext = base64$decode(ciphertext);
            } catch (e) {
                throw new MslCryptoException(MslError.CIPHERTEXT_ENVELOPE_PARSE_ERROR, "encryption envelope " + JSON.stringify(jsonObj), e);
            }
            
            // Return envelope.
            new MslCiphertextEnvelope(keyIdOrSpec, iv, ciphertext, callback);
        });
    };
})();

