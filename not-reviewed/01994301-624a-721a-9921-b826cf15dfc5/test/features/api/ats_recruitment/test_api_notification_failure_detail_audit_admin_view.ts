import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationFailure";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify system admin retrieval of a notification failure log by failureId,
 * audit privilege, and not-found error handling.
 *
 * 1. Register a system admin (unique email, super_admin: true).
 * 2. Login as the admin to obtain token privilege.
 * 3. Try to retrieve a valid notification failure log (simulation only).
 * 4. Attempt to fetch a non-existent failureId (random UUID) and confirm error is
 *    handled.
 */
export async function test_api_notification_failure_detail_audit_admin_view(
  connection: api.IConnection,
) {
  // Step 1: Register a new super_admin
  const admin_email: string = typia.random<string & tags.Format<"email">>();
  const admin_password: string = RandomGenerator.alphaNumeric(12);
  const admin_name: string = RandomGenerator.name();
  const join_result: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: admin_email,
        password: admin_password,
        name: admin_name,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(join_result);

  // Step 2: Login as the system admin (should set session for privileged access)
  const login_result: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: admin_email,
        password: admin_password,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(login_result);
  TestValidator.equals(
    "login email matches join email",
    login_result.email,
    admin_email,
  );

  // Step 3: Happy path is not directly testable due to no creation API for notification failure, so we skip successful GET.

  // Step 4: Not-found case validation (error check)
  await TestValidator.error(
    "not found error with random failureId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationFailures.at(
        connection,
        {
          failureId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
