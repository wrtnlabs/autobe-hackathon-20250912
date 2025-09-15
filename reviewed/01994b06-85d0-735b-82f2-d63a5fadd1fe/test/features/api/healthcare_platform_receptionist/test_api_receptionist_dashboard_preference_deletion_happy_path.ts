import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Test deleting an existing analytics dashboard preference as a receptionist.
 *
 * 1. Register a new receptionist and log in for authentication
 * 2. (Placeholder step; no API for dashboard or preference creation) Generate
 *    random UUIDs for dashboard and preference
 * 3. Perform the preference deletion call
 * 4. Confirm the erase completes with no error (void response)
 * 5. Attempt deleting a non-existent preference (should succeed idempotently)
 * 6. Try deletion with an unauthenticated connection (should error)
 */
export async function test_api_receptionist_dashboard_preference_deletion_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and log in as receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();

  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
        phone: receptionistPhone,
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);

  // 2. Generate dashboardId and preferenceId (since there are no APIs for actual creation)
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the preference
  await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId,
      preferenceId,
    },
  );
  // No error = success (erase returns void)

  // 4. Try to delete the same preference again (should succeed, idempotent)
  await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId,
      preferenceId,
    },
  );

  // 5. Try deleting with unauthenticated connection (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated deletion fails", async () => {
    await api.functional.healthcarePlatform.receptionist.analyticsDashboards.preferences.erase(
      unauthConn,
      {
        dashboardId: typia.random<string & tags.Format<"uuid">>(),
        preferenceId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
