import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Test deletion access and safety for organization admin deleting patient
 * profiles.
 *
 * 1. Register and login as organization admin 1 (admin1).
 * 2. Create a patient profile as admin1.
 * 3. Delete admin1's patient profile.
 * 4. Attempt to delete the same patient again (expect error: already deleted).
 * 5. Attempt to delete a non-existent patientId (expect error: invalid id).
 * 6. Register another admin (admin2), create a patient, then log back in as admin1
 *    and attempt cross-org delete (should fail with access error).
 *
 * This test ensures organization admins can only delete their own patients,
 * deleted patients cannot be re-deleted, deletion by non-existent id fails, and
 * cross-organization access is blocked.
 */
export async function test_api_organization_admin_patient_profile_deletion_access_and_safety(
  connection: api.IConnection,
) {
  // Register and login as admin1
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin1Email,
        full_name: RandomGenerator.name(),
        password: "adminpass1",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1Email,
      password: "adminpass1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Create patient as admin1
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-02-15T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);
  // Delete patient (success)
  await api.functional.healthcarePlatform.organizationAdmin.patients.erase(
    connection,
    {
      patientId: patient.id,
    },
  );
  // Attempt to delete again (should error)
  await TestValidator.error("deleting a patient twice fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.patients.erase(
      connection,
      {
        patientId: patient.id,
      },
    );
  });
  // Attempt to delete a random non-existent patientId
  await TestValidator.error(
    "delete with non-existent patientId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.erase(
        connection,
        {
          patientId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Admin2 join, login, create patient
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        password: "adminpass2",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin2Email,
      password: "adminpass2",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patient2 =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1982-05-18T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient2);
  // Switch to admin1 again
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1Email,
      password: "adminpass1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Admin1 tries to delete patient2 (belongs to admin2/org2): must fail
  await TestValidator.error(
    "cross-organization patient deletion must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.erase(
        connection,
        {
          patientId: patient2.id,
        },
      );
    },
  );
}
