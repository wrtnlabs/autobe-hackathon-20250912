import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * This test validates that unauthorized calls to retrieve OAuth server
 * developer details are rejected by the server. It attempts to call GET
 * /oauthServer/admin/oauthServerDevelopers/{id} without authentication and
 * expects failure. This ensures the endpoint is protected from unauthorized
 * access.
 */
export async function test_api_oauth_server_admin_oauth_server_developer_get_unauthorized(
  connection: api.IConnection,
) {
  // Prepare a random UUID as developer ID to test unauthorized access
  const developerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create an unauthorized connection by clearing all headers (no token)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to retrieve developer details without authentication - expecting HTTP error
  await TestValidator.httpError(
    "unauthorized access should be rejected with HTTP error",
    [401, 403],
    async () => {
      await api.functional.oauthServer.admin.oauthServerDevelopers.at(
        unauthorizedConnection,
        { id: developerId },
      );
    },
  );
}
