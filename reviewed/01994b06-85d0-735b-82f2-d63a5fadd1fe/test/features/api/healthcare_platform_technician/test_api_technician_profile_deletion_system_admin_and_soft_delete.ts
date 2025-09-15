import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Validate soft deletion (logical removal) of technician profiles by system
 * admin.
 *
 * The process is as follows:
 *
 * 1. System admin joins (registers) with unique credentials.
 * 2. System admin logs in for session and token.
 * 3. System admin creates a new technician profile.
 * 4. System admin deletes (soft-deletes) the technician profile.
 * 5. Confirm deleted_at timestamp is set and profile can no longer be used
 *    (retrieval reflects deletion).
 * 6. Attempt to delete a non-existent technician and expect error.
 * 7. Attempt to delete already deleted technician and expect error.
 */
export async function test_api_technician_profile_deletion_system_admin_and_soft_delete(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminProvider = "local";
  const adminProviderKey = adminEmail;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminFullName,
        phone: RandomGenerator.mobile(),
        provider: adminProvider,
        provider_key: adminProviderKey,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(adminAuthorized);

  // 2. System admin login (token is auto-managed)
  const loginAuthorized = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        provider: adminProvider,
        provider_key: adminProviderKey,
        password: adminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(loginAuthorized);

  // 3. Create technician
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techProfile =
    await api.functional.healthcarePlatform.systemAdmin.technicians.create(
      connection,
      {
        body: {
          email: techEmail,
          full_name: RandomGenerator.name(),
          license_number: RandomGenerator.alphaNumeric(8),
          specialty: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformTechnician.ICreate,
      },
    );
  typia.assert(techProfile);
  TestValidator.predicate(
    "created technician has deleted_at unset",
    techProfile.deleted_at === null || techProfile.deleted_at === undefined,
  );

  // 4. Delete (soft-delete) technician
  await api.functional.healthcarePlatform.systemAdmin.technicians.erase(
    connection,
    {
      technicianId: techProfile.id,
    },
  );

  // 5. Retrieve technician and verify soft-delete (deleted_at is set)
  const deletedTech =
    await api.functional.healthcarePlatform.systemAdmin.technicians.at(
      connection,
      {
        technicianId: techProfile.id,
      },
    );
  typia.assert(deletedTech);
  TestValidator.predicate(
    "deleted_at timestamp is set after technician deletion",
    typeof deletedTech.deleted_at === "string" &&
      deletedTech.deleted_at.length > 0,
  );

  // 6. Attempt to delete a non-existent technician (expect error)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent technician should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.technicians.erase(
        connection,
        {
          technicianId: fakeId,
        },
      );
    },
  );

  // 7. Attempt to delete the already deleted technician (expect error)
  await TestValidator.error(
    "delete already-soft-deleted technician should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.technicians.erase(
        connection,
        {
          technicianId: techProfile.id,
        },
      );
    },
  );
}
