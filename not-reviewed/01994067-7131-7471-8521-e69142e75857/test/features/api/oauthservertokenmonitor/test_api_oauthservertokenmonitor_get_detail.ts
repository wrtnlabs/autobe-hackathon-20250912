import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";

/**
 * This test validates the process of retrieving detailed information about
 * a specific OAuth server token monitor event by its unique ID from the
 * perspective of an administrator with appropriate permissions.
 *
 * The test performs the following key steps:
 *
 * 1. Creates and authenticates an admin user using the join and login API
 *    endpoints.
 * 2. Creates a new OAuth client, which is a prerequisite for the token monitor
 *    event.
 * 3. Attempts to retrieve a token monitor event by a generated random UUID.
 *    (Note: Since no API to create token monitor events, the test covers
 *    retrieval and error handling.)
 * 4. Validates correctness and data format of the returned token monitor
 *    event.
 * 5. Verifies error scenarios such as unauthorized access and retrieval of a
 *    non-existent event.
 *
 * This flow simulates a full real-world admin workflow with proper
 * security, validation, and error management.
 *
 * Steps involving admin authentication focus on using the correct sequence
 * of API calls to establish and validate session tokens.
 *
 * The test thoroughly validates that data returned respects format
 * constraints, business logic, and proper HTTP error responses.
 */
export async function test_api_oauthservertokenmonitor_get_detail(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Login with the created admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;

  const adminLoggedIn = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);

  // 2. Create an OAuth client
  const oauthClientBody = {
    client_id: RandomGenerator.alphaNumeric(16),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: "https://example.com/callback",
    logo_uri: null,
    is_trusted: false,
  } satisfies IOauthServerOauthClient.ICreate;

  const oauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientBody,
    });
  typia.assert(oauthClient);

  // 3. Simulate token monitor event retrieval
  // Generate a random UUID for the token monitor event id
  const tokenMonitorId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the token monitor event by its ID
  const tokenMonitor: IOauthServerTokenMonitor =
    await api.functional.oauthServer.admin.oauthServerTokenMonitors.at(
      connection,
      {
        id: tokenMonitorId,
      },
    );
  typia.assert(tokenMonitor);

  // Validate UUIDs
  typia.assert<string & tags.Format<"uuid">>(tokenMonitor.id);
  typia.assert<string & tags.Format<"uuid">>(tokenMonitor.access_token_id);

  // Validate key property matches created client
  TestValidator.equals(
    "tokenMonitor.oauth_client_id matches created client",
    tokenMonitor.oauth_client_id,
    oauthClient.id,
  );

  TestValidator.predicate(
    "tokenMonitor.event_type is string",
    typeof tokenMonitor.event_type === "string" &&
      tokenMonitor.event_type.length > 0,
  );

  TestValidator.predicate(
    "tokenMonitor.ip_address is string",
    typeof tokenMonitor.ip_address === "string" &&
      tokenMonitor.ip_address.length > 0,
  );

  // User agent is nullable
  TestValidator.predicate(
    "tokenMonitor.user_agent is string or null or undefined",
    tokenMonitor.user_agent === null ||
      tokenMonitor.user_agent === undefined ||
      (typeof tokenMonitor.user_agent === "string" &&
        tokenMonitor.user_agent.length > 0),
  );

  // Validate timestamps follow ISO 8601 date-time format
  const iso8601Regex =
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/i;
  [
    tokenMonitor.event_timestamp,
    tokenMonitor.created_at,
    tokenMonitor.updated_at,
  ].forEach((time, index) => {
    TestValidator.predicate(
      `tokenMonitor.timestamp[${index}] is ISO 8601 date-time`,
      iso8601Regex.test(time),
    );
  });

  // deleted_at can be null or undefined
  TestValidator.predicate(
    "tokenMonitor.deleted_at is null or undefined or ISO 8601",
    tokenMonitor.deleted_at === null ||
      tokenMonitor.deleted_at === undefined ||
      iso8601Regex.test(tokenMonitor.deleted_at!),
  );

  // 5. Test unauthorized access: simulate unauthorized by creating a new connection without auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access returns error", async () => {
    await api.functional.oauthServer.admin.oauthServerTokenMonitors.at(
      unauthenticatedConnection,
      { id: tokenMonitorId },
    );
  });

  // 6. Test not found error for invalid ID
  const invalidUUID = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "not found error with unknown token monitor ID",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.at(
        connection,
        { id: invalidUUID },
      );
    },
  );
}
