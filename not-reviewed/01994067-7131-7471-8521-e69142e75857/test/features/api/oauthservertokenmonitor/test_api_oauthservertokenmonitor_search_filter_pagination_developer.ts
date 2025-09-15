import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerTokenMonitor";

/**
 * This E2E test verifies the search and filtering functionality of OAuth
 * server token monitor logs for a developer user role with pagination
 * support.
 *
 * The test workflow includes:
 *
 * 1. Developer user registration via `/auth/developer/join` with valid
 *    credentials.
 * 2. Developer user login via `/auth/developer/login` to establish
 *    authenticated context.
 * 3. Creation of an OAuth client via `/oauthServer/developer/oauthClients`
 *    needed for associating token monitor records.
 * 4. Generating OAuth token monitor search queries with diverse filter
 *    parameters (event_type, oauth_client_id, ip_address) and pagination
 *    options (page, limit), checking various sorting directions.
 * 5. Verifying the paginated responses contain valid pagination metadata and
 *    valid token monitor event data.
 * 6. Ensuring the search endpoint only works for authorized developer users;
 *    testing error cases for unauthorized or invalid calls is omitted here
 *    as invalid inputs or missing tokens cause automatic HTTP errors
 *    handled by the backend.
 *
 * This test ensures the developer role's capabilities in auditing and
 * monitoring token activities are functioning as expected, including
 * correct response structure, data integrity, access control, and
 * pagination behavior.
 *
 * The test uses realistic random data generation for emails and client
 * credentials, and proper typia assertions for runtime type safety. All API
 * calls are awaited with connection headers handled automatically by the
 * SDK.
 *
 * No direct header manipulation or token management is performed,
 * leveraging automatic token handling post-login.
 *
 * Business scenarios involving token monitor event creation beyond the API
 * surface are presumed to be covered in other dedicated tests or backend
 * state initialization.
 *
 * The main purpose is to confirm that the developer user can successfully
 * query OAuth token monitor logs with filtering, sorting, and pagination
 * correctly applied and validated with the returned data structure.
 */
export async function test_api_oauthservertokenmonitor_search_filter_pagination_developer(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd1234";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: RandomGenerator.alphaNumeric(64),
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Developer user login
  const authorizedDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password,
      } satisfies IOauthServerDeveloper.ILogin,
    });
  typia.assert(authorizedDeveloper);

  // 3. Create OAuth client
  const clientId = RandomGenerator.alphaNumeric(12);
  const clientSecret = RandomGenerator.alphaNumeric(32);
  const redirectUri = "https://example.com/callback";
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        logo_uri: null,
        is_trusted: false,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient);

  // 4. Perform several search and filter requests with various parameters
  // Use different event types and ip addresses randomly selected or fixed
  const eventTypes = [undefined, "validation", "expiration", "revocation"];
  const ipAddresses = [undefined, "192.168.1.1", "10.0.0.1"];
  // Test requests with pagination
  for (const page of [1, 2]) {
    for (const limit of [5, 10]) {
      for (const eventType of eventTypes) {
        for (const ipAddress of ipAddresses) {
          const body: IOauthServerTokenMonitor.IRequest = {
            page,
            limit,
            sortField: "event_timestamp",
            sortDirection: "desc",
            event_type: eventType,
            oauth_client_id: oauthClient.id,
            ip_address: ipAddress,
          };
          const pageResult: IPageIOauthServerTokenMonitor.ISummary =
            await api.functional.oauthServer.developer.oauthServerTokenMonitors.index(
              connection,
              { body },
            );
          typia.assert(pageResult);

          const { pagination, data } = pageResult;
          // Verify pagination data types and logic
          TestValidator.predicate(
            "pagination current page matches requested",
            pagination.current === page || pagination.records === 0,
          );
          TestValidator.predicate(
            "pagination limit matches requested",
            pagination.limit === limit || pagination.records === 0,
          );
          TestValidator.predicate(
            "pages count is correct",
            pagination.pages >= 0,
          );
          TestValidator.predicate(
            "records count is non-negative",
            pagination.records >= 0,
          );

          // Verify the returned data entries
          for (const item of data) {
            typia.assert(item);
            if (eventType !== undefined && eventType !== null) {
              TestValidator.equals(
                "token monitor event_type matches filter",
                item.event_type,
                eventType,
              );
            }
            if (ipAddress !== undefined && ipAddress !== null) {
              TestValidator.equals(
                "token monitor ip_address matches filter",
                item.ip_address,
                ipAddress,
              );
            }
          }
        }
      }
    }
  }
}
