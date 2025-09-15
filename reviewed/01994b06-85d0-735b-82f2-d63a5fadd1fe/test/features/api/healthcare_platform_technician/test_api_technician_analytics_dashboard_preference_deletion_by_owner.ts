import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Delete (erase) a dashboard preference as its owner technician.
 *
 * This test covers registration and authentication of a technician, simulates
 * dashboard and preference resource existence, then performs the DELETE
 * operation as owner, asserting correct behavior when successful, repeated, or
 * unauthorized operations are attempted.
 *
 * Steps:
 *
 * 1. Register & login a technician user (the "owner").
 * 2. Generate random dashboardId and preferenceId (simulate resources).
 * 3. Perform the erase (delete) as owner (should succeed).
 * 4. Attempt erase with wrong IDs as owner (should error).
 * 5. Attempt double deletion (idempotency or error).
 * 6. Register & login another technician and attempt erase on non-owned preference
 *    (should error).
 */
export async function test_api_technician_analytics_dashboard_preference_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register & login the owner technician
  const email =
    RandomGenerator.name().replace(/\s/g, "") +
    `_${RandomGenerator.alphaNumeric(4)}@org.com`;
  const license_number = RandomGenerator.alphaNumeric(8);
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const owner = await api.functional.auth.technician.join(connection, {
    body: {
      email,
      full_name,
      license_number,
      specialty: "Phlebotomy",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(owner);

  // 2. Prepare fake dashboardId/preferenceId
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3. Owner deletes their own preference (should succeed)
  await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId,
      preferenceId,
    },
  );

  // 4. Negative: owner with wrong IDs (should error)
  await TestValidator.error("erase fails with wrong dashboardId", async () => {
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.erase(
      connection,
      {
        dashboardId: typia.random<string & tags.Format<"uuid">>(),
        preferenceId,
      },
    );
  });
  await TestValidator.error("erase fails with wrong preferenceId", async () => {
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.erase(
      connection,
      {
        dashboardId,
        preferenceId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Idempotency/double deletion (should error or succeed, but no resource remains)
  await TestValidator.error(
    "erase fails (is idempotent or errors) on already deleted",
    async () => {
      await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.erase(
        connection,
        {
          dashboardId,
          preferenceId,
        },
      );
    },
  );

  // 6. Register and login a second technician (not owner)
  const otherEmail =
    RandomGenerator.name().replace(/\s/g, "") +
    `_${RandomGenerator.alphaNumeric(4)}@org.com`;
  const otherLicense = RandomGenerator.alphaNumeric(8);
  const otherName = RandomGenerator.name();
  await api.functional.auth.technician.join(connection, {
    body: {
      email: otherEmail,
      full_name: otherName,
      license_number: otherLicense,
      specialty: "Radiology",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  await api.functional.auth.technician.login(connection, {
    body: {
      email: otherEmail,
      password: RandomGenerator.alphaNumeric(12), // Use random, since original password is not returned by join
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });

  await TestValidator.error("erase fails for non-owner", async () => {
    await api.functional.healthcarePlatform.technician.analyticsDashboards.preferences.erase(
      connection,
      {
        dashboardId,
        preferenceId,
      },
    );
  });
}
