import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerTokenMonitor";

/**
 * This E2E test validates the OAuth server token monitor search API for admin
 * users. It covers the main functionality of searching, filtering, pagination,
 * and sorting. The test also ensures proper admin role authentication and
 * authorization is enforced.
 *
 * The test performs the following main steps:
 *
 * 1. Creates and authenticates an admin user (join and login).
 * 2. Creates an OAuth client entity to associate token monitors.
 * 3. Performs various filtered and paginated search queries on the token monitor
 *    endpoint.
 * 4. Validates returned data is consistent with filters, is well formed, and
 *    paginated.
 * 5. Verifies that only authorized admins can access the endpoint by testing
 *    unauthorized access failure.
 * 6. Tests invalid request parameters result in proper error responses.
 */
export async function test_api_oauthservertokenmonitor_search_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user creation (join)
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "P@ssw0rd123",
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;
  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create OAuth client entity
  const oauthClientBody = {
    client_id: `${RandomGenerator.alphaNumeric(16)}`,
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://${RandomGenerator.alphabets(8)}.com/callback`,
    logo_uri: null,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: oauthClientBody,
    });
  typia.assert(oauthClient);

  // 4. Prepare filter and pagination test cases
  // Define some event types and IP addresses to test filtering
  const eventTypeSamples = ["validation", "expiration", "revocation"] as const;
  const ipSamples = ["192.168.1.1", "10.0.0.2", "172.16.5.4"] as const;

  // Generate several test requests for token monitors with various filters
  const requests: IOauthServerTokenMonitor.IRequest[] = [];

  // Basic pagination request
  requests.push({ page: 1, limit: 10 });

  // Filtering by event_type
  requests.push({
    event_type: RandomGenerator.pick(eventTypeSamples),
    page: 1,
    limit: 5,
  });

  // Filtering by oauth_client_id
  requests.push({ oauth_client_id: oauthClient.id, page: 2, limit: 5 });

  // Filtering by IP address
  requests.push({
    ip_address: RandomGenerator.pick(ipSamples),
    page: 1,
    limit: 5,
  });

  // Sorting ascending by event_timestamp
  requests.push({
    sortField: "event_timestamp",
    sortDirection: "asc",
    page: 1,
    limit: 10,
  });

  // Sorting descending by event_timestamp
  requests.push({
    sortField: "event_timestamp",
    sortDirection: "desc",
    page: 1,
    limit: 10,
  });

  // Combined filters
  requests.push({
    event_type: RandomGenerator.pick(eventTypeSamples),
    oauth_client_id: oauthClient.id,
    ip_address: RandomGenerator.pick(ipSamples),
    sortField: "event_timestamp",
    sortDirection: "asc",
    page: 1,
    limit: 5,
  });

  // 5. Execute searches and verify results
  for (const requestBody of requests) {
    const response: IPageIOauthServerTokenMonitor.ISummary =
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);

    // Validate pagination parameters
    const pagination: IPage.IPagination = response.pagination;
    TestValidator.predicate(
      `pagination.page >= 1 for request ${JSON.stringify(requestBody)}`,
      pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination.limit > 0 for request ${JSON.stringify(requestBody)}`,
      pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination.records >= 0 for request ${JSON.stringify(requestBody)}`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination.pages >= 0 for request ${JSON.stringify(requestBody)}`,
      pagination.pages >= 0,
    );

    // Validate all data entries match filtering criteria
    for (const item of response.data) {
      if (requestBody.event_type !== undefined) {
        TestValidator.equals(
          `event_type filter for event id ${item.id}`,
          item.event_type,
          requestBody.event_type,
        );
      }
      if (requestBody.oauth_client_id !== undefined) {
        // We do not have the oauth_client_id in the summary schema, so skip direct check
        // Cannot test this field in response as it is not present
      }
      if (requestBody.ip_address !== undefined) {
        TestValidator.equals(
          `ip_address filter for event id ${item.id}`,
          item.ip_address,
          requestBody.ip_address,
        );
      }
    }
  }

  // 6. Validate unauthorized access fails
  // We create a new connection without the authentication token to simulate unauthorized
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "access token monitor without auth returns error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.index(
        unauthConnection,
        {
          body: { page: 1, limit: 5 },
        },
      );
    },
  );

  // 7. Validate invalid filters cause errors
  // Event type is string but passing invalid enum-like value to test business logic error
  await TestValidator.error(
    "invalid event_type filter returns error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.index(
        connection,
        {
          body: { event_type: "invalid_event_type", page: 1, limit: 5 },
        },
      );
    },
  );

  // Invalid IP address format - still a string but invalid format for the business logic
  await TestValidator.error(
    "invalid ip_address filter returns error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.index(
        connection,
        {
          body: { ip_address: "999.999.999.999", page: 1, limit: 5 },
        },
      );
    },
  );

  // Invalid pagination parameters
  await TestValidator.error(
    "invalid pagination parameters returns error",
    async () => {
      await api.functional.oauthServer.admin.oauthServerTokenMonitors.index(
        connection,
        {
          body: { page: -1, limit: 0 },
        },
      );
    },
  );
}
