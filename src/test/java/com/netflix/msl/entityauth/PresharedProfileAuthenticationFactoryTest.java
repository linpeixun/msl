/**
 * Copyright (c) 2014 Netflix, Inc.  All rights reserved.
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
package com.netflix.msl.entityauth;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;

import com.netflix.msl.MslCryptoException;
import com.netflix.msl.MslEncodingException;
import com.netflix.msl.MslEntityAuthException;
import com.netflix.msl.MslError;
import com.netflix.msl.crypto.ICryptoContext;
import com.netflix.msl.test.ExpectedMslException;
import com.netflix.msl.util.JsonUtils;
import com.netflix.msl.util.MockAuthenticationUtils;
import com.netflix.msl.util.MockMslContext;

/**
 * Pre-shared keys profile entity authentication factory unit tests.
 *
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
public class PresharedProfileAuthenticationFactoryTest {
    /** JSON key entity preshared keys identity. */
    private static final String KEY_PSKID = "pskid";
    
    @Rule
    public ExpectedMslException thrown = ExpectedMslException.none();

    /** Authentication utilities. */
    private static MockAuthenticationUtils authutils;
    
    @BeforeClass
    public static void setup() throws MslEncodingException, MslCryptoException {
        ctx = new MockMslContext(EntityAuthenticationScheme.PSK, false);
        final MockPresharedKeyStore store = new MockPresharedKeyStore();
        store.addKeys(MockPresharedProfileAuthenticationFactory.PSK_ESN, MockPresharedProfileAuthenticationFactory.KPE, MockPresharedProfileAuthenticationFactory.KPH, MockPresharedProfileAuthenticationFactory.KPW);
        authutils = new MockAuthenticationUtils();
        factory = new PresharedProfileAuthenticationFactory(store, authutils);
        ctx.addEntityAuthenticationFactory(factory);
    }

    @AfterClass
    public static void teardown() {
        factory = null;
        authutils = null;
        ctx = null;
    }
    
    @After
    public void reset() {
        authutils.reset();
    }

    @Test
    public void createData() throws MslCryptoException, MslEncodingException, MslEntityAuthException, JSONException {
        final PresharedProfileAuthenticationData data = new PresharedProfileAuthenticationData(MockPresharedProfileAuthenticationFactory.PSK_ESN, MockPresharedProfileAuthenticationFactory.PROFILE);
        final JSONObject entityAuthJO = data.getAuthData();

        final EntityAuthenticationData authdata = factory.createData(ctx, entityAuthJO);
        assertNotNull(authdata);
        assertTrue(authdata instanceof PresharedProfileAuthenticationData);

        final JSONObject dataJo = new JSONObject(data.toJSONString());
        final JSONObject authdataJo = new JSONObject(authdata.toJSONString());
        assertTrue(JsonUtils.equals(dataJo, authdataJo));
    }

    @Test
    public void encodeException() throws MslCryptoException, MslEncodingException, MslEntityAuthException {
        thrown.expect(MslEncodingException.class);
        thrown.expectMslError(MslError.JSON_PARSE_ERROR);

        final PresharedProfileAuthenticationData data = new PresharedProfileAuthenticationData(MockPresharedProfileAuthenticationFactory.PSK_ESN, MockPresharedProfileAuthenticationFactory.PROFILE);
        final JSONObject entityAuthJO = data.getAuthData();
        entityAuthJO.remove(KEY_PSKID);
        factory.createData(ctx, entityAuthJO);
    }

    @Test
    public void cryptoContext() throws MslCryptoException, MslEntityAuthException {
        final PresharedProfileAuthenticationData data = new PresharedProfileAuthenticationData(MockPresharedProfileAuthenticationFactory.PSK_ESN, MockPresharedProfileAuthenticationFactory.PROFILE);
        final ICryptoContext cryptoContext = factory.getCryptoContext(ctx, data);
        assertNotNull(cryptoContext);
    }

    @Test
    public void unknownEsn() throws MslCryptoException, MslEntityAuthException {
        thrown.expect(MslEntityAuthException.class);
        thrown.expectMslError(MslError.ENTITY_NOT_FOUND);

        final PresharedProfileAuthenticationData data = new PresharedProfileAuthenticationData(MockPresharedProfileAuthenticationFactory.PSK_ESN2, MockPresharedProfileAuthenticationFactory.PROFILE);
        factory.getCryptoContext(ctx, data);
    }
    
    @Test
    public void revoked() throws MslCryptoException, MslEntityAuthException {
        thrown.expect(MslEntityAuthException.class);
        thrown.expectMslError(MslError.ENTITY_REVOKED);

        authutils.revokeEntity(MockPresharedProfileAuthenticationFactory.PSK_ESN);
        final PresharedProfileAuthenticationData data = new PresharedProfileAuthenticationData(MockPresharedProfileAuthenticationFactory.PSK_ESN, MockPresharedProfileAuthenticationFactory.PROFILE);
        factory.getCryptoContext(ctx, data);
    }

    /** MSL context. */
    private static MockMslContext ctx;
    /** Entity authentication factory. */
    private static EntityAuthenticationFactory factory;
}
