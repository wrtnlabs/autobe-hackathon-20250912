import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

/**
 * E2E test to verify updating OAuth authorization codes by an admin user.
 *
 * This test covers the full business flow:
 *
 * 1. Admin user joins and logs in.
 * 2. An OAuth client is created for association.
 * 3. An authorization code is created (simulated via update call).
 * 4. The authorization code is updated with mutable properties.
 * 5. Validations confirm correct update and immutable fields.
 * 6. Negative tests check update failure with invalid client IDs and missing
 *    fields.
 * 7. Authentication failures are verified.
 *
 * All API responses are asserted for type safety using typia. Business
 * logic is validated with TestValidator. Errors in invalid scenarios are
 * checked with TestValidator.error.
 */
export async function test_api_authorization_code_update_with_valid_oauth_client(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test@1234";
  const adminJoinBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ILogin;

  const adminLoginAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create OAuth client
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(12),
    client_secret: RandomGenerator.alphaNumeric(24),
    redirect_uri: `https://www.example.com/auth/callback/${RandomGenerator.alphaNumeric(8)}`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 4. Create Authorization code (simulate by initial update)
  // Note: No explicit create API, using update with new ID and initial properties simulates creation
  const initialCodeString = RandomGenerator.alphaNumeric(40);
  const initialDataJson = JSON.stringify({
    scope: "read write",
    state: RandomGenerator.alphaNumeric(16),
  });
  const initialRedirectUri = oauthClient.redirect_uri;
  const initialExpiresAt = new Date(Date.now() + 600000).toISOString(); // Expires in 10 min

  const initialUpdateBody = {
    oauth_client_id: oauthClient.id,
    code: initialCodeString,
    data: initialDataJson,
    redirect_uri: initialRedirectUri,
    expires_at: initialExpiresAt,
    deleted_at: null,
  } satisfies IOauthServerAuthorizationCode.IUpdate;

  const authorizationCodeId = typia.random<string & tags.Format<"uuid">>();

  const updatedAuthorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.admin.authorizationCodes.update(
      connection,
      {
        id: authorizationCodeId,
        body: initialUpdateBody,
      },
    );
  typia.assert(updatedAuthorizationCode);

  // 5. Update Authorization code with modified fields
  // code string should remain unchanged (immutable, ignore changes)
  const modifiedRedirectUri = `https://www.example.org/auth/callback/${RandomGenerator.alphaNumeric(8)}`;
  const modifiedDataJson = JSON.stringify({
    scope: "read",
    state: RandomGenerator.alphaNumeric(16),
  });
  const modifiedExpiresAt = new Date(Date.now() + 1200000).toISOString(); // Expires in 20 min

  const updateBody: IOauthServerAuthorizationCode.IUpdate = {
    oauth_client_id: oauthClient.id,
    data: modifiedDataJson,
    redirect_uri: modifiedRedirectUri,
    expires_at: modifiedExpiresAt,
    deleted_at: null,
  };

  const updatedCodeResp: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.admin.authorizationCodes.update(
      connection,
      {
        id: updatedAuthorizationCode.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCodeResp);

  // Validate that immutable code string remains unchanged
  TestValidator.equals(
    "authorization code string remains unchanged",
    updatedCodeResp.code,
    updatedAuthorizationCode.code,
  );

  // Validate mutable fields are updated
  TestValidator.equals(
    "oauth_client_id updated",
    updatedCodeResp.oauth_client_id,
    updateBody.oauth_client_id,
  );
  TestValidator.equals(
    "redirect_uri updated",
    updatedCodeResp.redirect_uri,
    updateBody.redirect_uri,
  );
  TestValidator.equals("data updated", updatedCodeResp.data, updateBody.data);
  TestValidator.equals(
    "expires_at updated",
    updatedCodeResp.expires_at,
    updateBody.expires_at,
  );

  // 6. Negative test: update with invalid OAuth client ID
  const invalidClientId = typia.random<string & tags.Format<"uuid">>();
  const invalidUpdateBody: IOauthServerAuthorizationCode.IUpdate = {
    oauth_client_id: invalidClientId,
    data: modifiedDataJson,
    redirect_uri: modifiedRedirectUri,
    expires_at: modifiedExpiresAt,
  };

  await TestValidator.error(
    "update fails with invalid oauth_client_id",
    async () => {
      await api.functional.oauthServer.admin.authorizationCodes.update(
        connection,
        {
          id: updatedAuthorizationCode.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 7. Negative test: update fails when required fields missing (empty body)
  await TestValidator.error("update fails with empty update body", async () => {
    await api.functional.oauthServer.admin.authorizationCodes.update(
      connection,
      {
        id: updatedAuthorizationCode.id,
        body: {},
      },
    );
  });

  // 8. Negative test: Unauthorized update attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated update attempt fails",
    async () => {
      await api.functional.oauthServer.admin.authorizationCodes.update(
        unauthenticatedConnection,
        {
          id: updatedAuthorizationCode.id,
          body: updateBody,
        },
      );
    },
  );
}
