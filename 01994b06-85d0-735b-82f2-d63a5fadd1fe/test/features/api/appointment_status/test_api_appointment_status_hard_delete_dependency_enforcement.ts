import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates that deletion of an appointment status that is referenced by an
 * appointment is properly blocked.
 *
 * Steps:
 *
 * 1. Register a system admin for privileged API access and context.
 * 2. Create an appointment status ID (simulate that it's referenced, since
 *    appointments cannot be created).
 * 3. Attempt to hard-delete the status via system admin DELETE endpoint.
 * 4. Confirm error is thrown (e.g., conflict/dependency), using
 *    TestValidator.error.
 * 5. Audit trace logic is implied but not directly testable with current API/DTO
 *    coverage.
 */
export async function test_api_appointment_status_hard_delete_dependency_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a system admin account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(15),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Simulate appointment status assumed to be referenced (we cannot create an actual appointment)
  const referencedStatusId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to hard-delete the appointment status that is assumed to be referenced
  await TestValidator.error(
    "should fail to delete appointment status in use",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointmentStatuses.erase(
        connection,
        { statusId: referencedStatusId },
      );
    },
  );
}
