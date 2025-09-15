import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeSystemAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemAlerts";

/**
 * Validate retrieval of detailed system alert information by admin users.
 *
 * This test covers the entire flow of creating and authenticating an admin
 * user, then retrieving a system alert by its unique UUID, verifying the
 * integrity and presence of all relevant fields. It also tests unauthorized
 * access and retrieval of non-existent alert IDs, ensuring the API behaves
 * correctly.
 *
 * Test steps:
 *
 * 1. Create and authenticate a new admin user via admin join API
 * 2. Retrieve a system alert with a randomly generated UUID (may not exist)
 * 3. Validate the response structure with typia.assert ensuring type
 *    correctness
 * 4. Test unauthorized access by calling the system alert API with no auth
 * 5. Test retrieval with a random non-existent UUID to verify error handling
 */
export async function test_api_system_alert_detail_retrieval_admin_access(
  connection: api.IConnection,
) {
  // 1. Admin join with random email and static password
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "adminPass123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const authorizedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(authorizedAdmin);

  // 2. Use a random UUID for system alert retrieval
  const alertId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve system alert using authorized connection
  const systemAlert: IFlexOfficeSystemAlerts =
    await api.functional.flexOffice.admin.systemAlerts.at(connection, {
      id: alertId,
    });
  typia.assert(systemAlert);

  // 4. Unauthorized access: try with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to system alert detail should fail",
    async () => {
      await api.functional.flexOffice.admin.systemAlerts.at(unauthConn, {
        id: alertId,
      });
    },
  );

  // 5. Access non-existent system alert UUID, expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent system alert should fail",
    async () => {
      await api.functional.flexOffice.admin.systemAlerts.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
