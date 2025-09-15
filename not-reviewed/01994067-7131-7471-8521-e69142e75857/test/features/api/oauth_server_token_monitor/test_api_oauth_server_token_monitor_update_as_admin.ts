import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";

/**
 * Test updating an OAuth server token monitor event by an authenticated
 * admin user.
 *
 * This test covers the full workflow:
 *
 * 1. Create and authenticate a new admin user.
 * 2. Create OAuth client, authorization code, and access token entities
 *    required for the token monitor foreign keys.
 * 3. Create an initial token monitor record for update testing.
 * 4. Update the created token monitor event with new event details.
 * 5. Validate the update result properly reflects changed fields.
 * 6. Test error handling for update with invalid token monitor ID.
 * 7. Test authorization enforcement by attempting update as unauthorized
 *    users.
 *
 * The test uses role switching between admin and developer users to
 * simulate multiple actors and validate authorization boundaries. All
 * responses are rigorously type asserted with typia.assert. Business
 * validations use TestValidator with descriptive assertions.
 */
export async function test_api_oauth_server_token_monitor_update_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      email_verified: true,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 1.1: Login as admin (role switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ILogin,
  });

  // Step 2: Create OAuth client
  const oauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(16),
        client_secret: RandomGenerator.alphaNumeric(32),
        redirect_uri: `https://example.com/oauth/callback/${RandomGenerator.alphaNumeric(
          8,
        )}`,
        logo_uri: null,
        is_trusted: true,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient);

  // Step 3: Create authorization code
  const authCodeInput = {
    oauth_client_id: oauthClient.id,
    code: RandomGenerator.alphaNumeric(32),
    data: JSON.stringify({
      redirect_uri: oauthClient.redirect_uri,
      scope: "read write",
      response_type: "code",
    }),
    redirect_uri: oauthClient.redirect_uri,
    expires_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes later
  } satisfies IOauthServerAuthorizationCode.ICreate;
  const authCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: authCodeInput,
      },
    );
  typia.assert(authCode);

  // Step 4: Create access token linked to client and authorization code
  const accessTokenInput = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authCode.id,
    token: RandomGenerator.alphaNumeric(64),
    scope: "read write",
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
  } satisfies IOauthServerAccessToken.ICreate;
  const accessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: accessTokenInput,
    });
  typia.assert(accessToken);

  // Step 5: Create initial token monitor event
  const tokenMonitorCreate = {
    access_token_id: accessToken.id,
    oauth_client_id: oauthClient.id,
    event_type: "validation",
    event_timestamp: new Date(Date.now() - 5000).toISOString(), // 5 sec ago
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  } satisfies IOauthServerTokenMonitor.ICreate;
  const tokenMonitor =
    await api.functional.oauthServer.admin.oauthServerTokenMonitors.create(
      connection,
      {
        body: tokenMonitorCreate,
      },
    );
  typia.assert(tokenMonitor);

  // Step 6: Update the token monitor record
  const updateFields = {
    event_type: "expiration",
    event_timestamp: new Date().toISOString(),
    ip_address: "10.0.0.1",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  } satisfies IOauthServerTokenMonitor.IUpdate;
  const updatedTokenMonitor =
    await api.functional.oauthServer.admin.oauthServerTokenMonitors.update(
      connection,
      {
        id: tokenMonitor.id,
        body: updateFields,
      },
    );
  typia.assert(updatedTokenMonitor);

  // Verify updated fields match
  TestValidator.equals(
    "token monitor id remains unchanged",
    updatedTokenMonitor.id,
    tokenMonitor.id,
  );
  TestValidator.equals(
    "event_type updated correctly",
    updatedTokenMonitor.event_type,
    updateFields.event_type,
  );
  TestValidator.equals(
    "event_timestamp updated correctly",
    updatedTokenMonitor.event_timestamp,
    updateFields.event_timestamp,
  );
  TestValidator.equals(
    "ip_address updated correctly",
    updatedTokenMonitor.ip_address,
    updateFields.ip_address,
  );
  TestValidator.equals(
    "user_agent updated correctly",
    updatedTokenMonitor.user_agent,
    updateFields.user_agent,
  );

  // Step 7: Test update failure with non-existent id
  await TestValidator.error(
    "update fails for non-existent token monitor ID",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            event_type: "revocation",
          } satisfies IOauthServerTokenMonitor.IUpdate,
        },
      );
    },
  );

  // Step 8: Setup developer user and test authorization
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = RandomGenerator.alphaNumeric(12) + "!";
  const developer = await api.functional.auth.developer.join(connection, {
    body: {
      email: developerEmail,
      email_verified: true,
      password_hash: developerPassword,
    } satisfies IOauthServerDeveloper.ICreate,
  });
  typia.assert(developer);

  // Developer login (role switch)
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  // Developer tries to update token monitor (should fail authorization)
  await TestValidator.error(
    "developer cannot update admin token monitor",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.update(
        connection,
        {
          id: tokenMonitor.id,
          body: {
            event_type: "expiration",
          } satisfies IOauthServerTokenMonitor.IUpdate,
        },
      );
    },
  );

  // Admin login back (restore role)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IOauthServerAdmin.ILogin,
  });
}
