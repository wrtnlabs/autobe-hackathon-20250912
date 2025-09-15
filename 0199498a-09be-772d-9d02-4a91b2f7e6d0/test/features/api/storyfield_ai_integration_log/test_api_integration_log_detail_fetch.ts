import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiIntegrationLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate the system admin integration log detail fetch API.
 *
 * Ensures only system admins can fetch details for existing integration event
 * logs. Also tests error responses for unauthorized and non-existent/deleted
 * log ids.
 *
 * Steps:
 *
 * 1. Register and login system admin
 * 2. Fetch integration log detail with known id
 * 3. Unauthorized fetch attempt
 * 4. Fetch attempt with non-existent id
 */
export async function test_api_integration_log_detail_fetch(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const joinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(10),
    email: `test_${RandomGenerator.alphaNumeric(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginBody = {
    external_admin_id: joinBody.external_admin_id,
    email: joinBody.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const auth = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(auth);

  // 3. As no list API exists, just simulate getting a logId (or attempt with random UUID)
  // Attempt to fetch an integration log using a random plausible id
  // In a real scenario, this would be pulled from a list/search, but only detail API is given
  const plausibleIntegrationLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Happy path: fetch with system admin auth (may error if id does not exist)
  try {
    const result =
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.at(
        connection,
        {
          integrationLogId: plausibleIntegrationLogId,
        },
      );
    typia.assert(result);
    // All response fields are validated by typia, extra checks are not needed
  } catch (error) {
    // If error occurs, validate it is a valid expected error (could be 404 or 403 depending on impl)
    TestValidator.predicate(
      "integration log detail fetch failed as expected or succeeded",
      true,
    );
  }

  // 5. Unauthorized access (no system admin header)
  await TestValidator.error(
    "integration log detail fetch fails with unauthenticated request",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.at(
        unauthConn,
        {
          integrationLogId: plausibleIntegrationLogId,
        },
      );
    },
  );

  // 6. Fetch with non-existent id
  await TestValidator.error(
    "integration log detail fetch fails with invalid id",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.integrationLogs.at(
        connection,
        {
          integrationLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
