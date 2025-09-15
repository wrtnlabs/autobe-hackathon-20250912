import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";

/**
 * Validate the creation of OAuth server token monitor entry by admin user.
 *
 * This test performs a full E2E workflow:
 *
 * 1. Creates and authenticates as admin.
 * 2. Creates an OAuth client with credentials.
 * 3. Creates an access token linked to the client.
 * 4. Creates a token monitor event with all required fields.
 * 5. Asserts correctness and type safety of all entities.
 *
 * This ensures only authorized admin can create token monitor events,
 * records are properly stored, and all linked foreign keys are correct.
 *
 * It uses valid generated data for all required fields and respects all
 * schema constraints and formats.
 */
export async function test_api_oauth_server_token_monitor_creation_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "Password123!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create an OAuthClient
  const oauthClientCreateBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.name(2).replace(/ /g, "")}.com/callback`,
    is_trusted: true,
    logo_uri: null,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientCreateBody,
    });
  typia.assert(oauthClient);

  // 3. Create an access token linked to the OAuth client
  const tokenString =
    RandomGenerator.alphaNumeric(40) +
    "." +
    RandomGenerator.alphaNumeric(40) +
    "." +
    RandomGenerator.alphaNumeric(40);

  const accessTokenCreateBody = {
    oauth_client_id: oauthClient.id,
    authorization_code_id: null,
    token: tokenString,
    scope: "read write",
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  } satisfies IOauthServerAccessToken.ICreate;

  const accessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: accessTokenCreateBody,
    });
  typia.assert(accessToken);

  // 4. Create OAuth Server Token Monitor event
  const eventTimestamp = new Date().toISOString();

  const tokenMonitorCreateBody = {
    access_token_id: accessToken.id,
    oauth_client_id: oauthClient.id,
    event_type: "validation",
    event_timestamp: eventTimestamp,
    ip_address: `${RandomGenerator.pick(["192", "10", "172"])}.${typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.${typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>
    >()}`,
    user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<80> & tags.Maximum<100>
    >()}.0.0 Safari/537.36`,
    deleted_at: null,
  } satisfies IOauthServerTokenMonitor.ICreate;

  const tokenMonitor: IOauthServerTokenMonitor =
    await api.functional.oauthServer.admin.oauthServerTokenMonitors.create(
      connection,
      {
        body: tokenMonitorCreateBody,
      },
    );
  typia.assert(tokenMonitor);

  // 5. Validation of returned fields matching inputs
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "oauth client ID matches",
    tokenMonitor.oauth_client_id,
    oauthClient.id,
  );
  TestValidator.equals(
    "access token ID matches",
    tokenMonitor.access_token_id,
    accessToken.id,
  );
  TestValidator.equals(
    "event type matches",
    tokenMonitor.event_type,
    tokenMonitorCreateBody.event_type,
  );
  TestValidator.equals(
    "event timestamp matches",
    tokenMonitor.event_timestamp,
    tokenMonitorCreateBody.event_timestamp,
  );
  TestValidator.equals(
    "IP address matches",
    tokenMonitor.ip_address,
    tokenMonitorCreateBody.ip_address,
  );
  TestValidator.equals(
    "user agent matches",
    tokenMonitor.user_agent,
    tokenMonitorCreateBody.user_agent,
  );
  TestValidator.equals("deleted at is null", tokenMonitor.deleted_at, null);
}
