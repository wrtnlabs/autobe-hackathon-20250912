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
 * This end-to-end test verifies the creation of OAuth server token monitor
 * events by a developer user, including all prerequisite user
 * registrations, logins, and resource creations needed to establish valid
 * OAuth client and access token linkages.
 *
 * The test performs multi-role setup with a developer and admin user,
 * ensuring proper authentication flows. It tests successful token monitor
 * event creation with valid tokens and clients, and failure scenarios
 * involving unauthorized access or invalid foreign key references.
 *
 * This comprehensive scenario covers business logic validation for
 * authorization, resource permissions, data integrity, and error handling
 * in the OAuth token monitor domain.
 */
export async function test_api_oauth_server_token_monitor_creation_as_developer(
  connection: api.IConnection,
) {
  // 1. Developer account creation and authentication
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "securePassword123";
  const developerCreateBody = {
    email: developerEmail,
    email_verified: true,
    password_hash: developerPassword,
  } satisfies IOauthServerDeveloper.ICreate;
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerCreateBody,
    });
  typia.assert(developer);

  // 2. Admin account creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongAdminPass456";
  const adminCreateBody = {
    email: adminEmail,
    email_verified: true,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 3. Developer login to confirm session token for developer
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies IOauthServerDeveloper.ILogin;
  const developerLoggedIn: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: developerLoginBody,
    });
  typia.assert(developerLoggedIn);

  // 4. Admin login to confirm session token for admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IOauthServerAdmin.ILogin;
  const adminLoggedIn: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Developer creates an OAuth client
  const clientId = RandomGenerator.alphaNumeric(10);
  const clientSecret = RandomGenerator.alphaNumeric(20);
  const redirectUri = "https://client.app/callback";
  const oauthClientCreateBody = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 6. Create authorization code linked to the client
  const authCodeString = RandomGenerator.alphaNumeric(15);
  const redirectUriConfig = redirectUri;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 mins from now
  const authorizationCodeCreateBody = {
    oauth_client_id: oauthClient.id,
    code: authCodeString,
    data: JSON.stringify({ scope: "read write", state: "xyz" }),
    redirect_uri: redirectUriConfig,
    expires_at: expiresAt,
  } satisfies IOauthServerAuthorizationCode.ICreate;
  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: authorizationCodeCreateBody,
      },
    );
  typia.assert(authorizationCode);

  // 7. Admin creates an access token with links to client and authorization code
  const tokenString = RandomGenerator.alphaNumeric(30);
  const tokenExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
  const accessTokenCreateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: authorizationCode.id,
    token: tokenString,
    scope: "read write",
    expires_at: tokenExpiresAt,
  } satisfies IOauthServerAccessToken.ICreate;
  const accessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: accessTokenCreateBody,
    });
  typia.assert(accessToken);

  // 8. Developer (logged in) creates a new OAuth server token monitor event
  const eventType = "validation";
  const eventTimestamp = new Date().toISOString();
  const ipAddress = "192.168.1.100";
  const userAgent = "Mozilla/5.0 (TestAgent)";
  const tokenMonitorCreateBody = {
    access_token_id: accessToken.id,
    oauth_client_id: oauthClient.id,
    event_type: eventType,
    event_timestamp: eventTimestamp,
    ip_address: ipAddress,
    user_agent: userAgent,
  } satisfies IOauthServerTokenMonitor.ICreate;
  const tokenMonitor: IOauthServerTokenMonitor =
    await api.functional.oauthServer.developer.oauthServerTokenMonitors.create(
      connection,
      {
        body: tokenMonitorCreateBody,
      },
    );
  typia.assert(tokenMonitor);

  // 9. Validate that all linked IDs match and event_type is correct
  TestValidator.equals(
    "access token ID matches",
    tokenMonitor.access_token_id,
    accessToken.id,
  );
  TestValidator.equals(
    "OAuth client ID matches",
    tokenMonitor.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "event type matches",
    tokenMonitor.event_type,
    eventType,
  );
  TestValidator.equals(
    "IP address matches",
    tokenMonitor.ip_address,
    ipAddress,
  );
  TestValidator.equals(
    "user agent matches",
    tokenMonitor.user_agent,
    userAgent,
  );

  // 10. Failure tests - try creating token monitor without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "creating token monitor without auth fails",
    async () => {
      await api.functional.oauthServer.developer.oauthServerTokenMonitors.create(
        unauthConn,
        {
          body: tokenMonitorCreateBody,
        },
      );
    },
  );

  // 11: Failure test - invalid access_token_id
  const invalidTokenMonitorBody1 = {
    ...tokenMonitorCreateBody,
    access_token_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IOauthServerTokenMonitor.ICreate;
  await TestValidator.error(
    "invalid access_token_id causes error",
    async () => {
      await api.functional.oauthServer.developer.oauthServerTokenMonitors.create(
        connection,
        {
          body: invalidTokenMonitorBody1,
        },
      );
    },
  );

  // 12: Failure test - invalid oauth_client_id
  const invalidTokenMonitorBody2 = {
    ...tokenMonitorCreateBody,
    oauth_client_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IOauthServerTokenMonitor.ICreate;
  await TestValidator.error(
    "invalid oauth_client_id causes error",
    async () => {
      await api.functional.oauthServer.developer.oauthServerTokenMonitors.create(
        connection,
        {
          body: invalidTokenMonitorBody2,
        },
      );
    },
  );
}
