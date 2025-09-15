import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate security and filtering for organization admin notification detail
 * retrieval.
 *
 * This test verifies that an organization admin can perform notification detail
 * queries only with proper context:
 *
 * 1. Register an organization admin (using the join API).
 * 2. Login as the same organization admin (refresh authentication token).
 * 3. Validate error response for fetching a non-existent notification (random
 *    uuid).
 *
 * There is no notification-creation API; the test cannot positively verify
 * retrieval of a real notification, so it only asserts proper error handling on
 * invalid fetch.
 */
export async function test_api_orgadmin_notification_detail_security_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const joinRes = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: RandomGenerator.mobile(),
      password: "Password!23",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinRes);
  // 2. Login as organization admin
  const loginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "Password!23",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginRes);
  // 3. Negative test - random notificationId (non-existent)
  const randomNotiId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "organization admin cannot fetch non-existent notificationId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.notifications.at(
        connection,
        {
          notificationId: randomNotiId,
        },
      );
    },
  );
}
