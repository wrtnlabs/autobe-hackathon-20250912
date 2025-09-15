import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for the hard deletion of an appointment status by a system
 * administrator.
 *
 * 1. Register a new system admin account using /auth/systemAdmin/join.
 * 2. Generate a random UUID for statusId (since appointment status creation is not
 *    possible).
 * 3. Attempt to hard delete the appointment status (expected successful or error,
 *    depending on backend state).
 * 4. Attempt to delete the same statusId again (should yield an expected error—404
 *    not found, etc).
 *
 * Limitations: Retrieval or creation/verification of appointment statuses, and
 * test for in-use/prevent errors, are not supported by available SDK/DTO/API.
 */
export async function test_api_appointment_status_hard_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register as system admin and authenticate
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinInput });
  typia.assert(admin);

  // 2. Prepare a random statusId UUID (simulate a status to delete)
  const statusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete the appointment status
  await api.functional.healthcarePlatform.systemAdmin.appointmentStatuses.erase(
    connection,
    { statusId },
  );

  // 4. Attempt to delete again, should yield error (ideally 404)
  await TestValidator.error(
    "deleting nonexistent status should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.appointmentStatuses.erase(
        connection,
        { statusId },
      );
    },
  );
}
