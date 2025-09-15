import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate soft-delete (organization admin deletes a doctor in their own org).
 *
 * Test steps:
 *
 * 1. Join as a new organization admin
 * 2. Log in as the new organization admin
 * 3. Create a new medical doctor profile
 * 4. Delete (soft-delete) the doctor by id
 * 5. (Negative) Try to delete a non-existent doctor
 * 6. (Negative) Try to delete already deleted doctor (should error or be
 *    idempotent)
 */
export async function test_api_medical_doctor_delete_by_org_admin_full_e2e(
  connection: api.IConnection,
) {
  // 1. Join as organization admin
  const orgAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "Password123$",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminJoinBody,
    });
  typia.assert(orgAdmin);
  TestValidator.equals(
    "admin join returns correct email",
    orgAdmin.email,
    orgAdminJoinBody.email,
  );

  // 2. Log in as the org admin (optional if join already logs in, but ensure login call OK)
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminJoinBody.email,
        password: orgAdminJoinBody.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);
  TestValidator.equals(
    "admin login returns same id as join",
    orgAdminLogin.id,
    orgAdmin.id,
  );

  // 3. Create new doctor
  const doctorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctorRecord: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorCreateBody,
      },
    );
  typia.assert(doctorRecord);
  TestValidator.equals(
    "doctor email matches input",
    doctorRecord.email,
    doctorCreateBody.email,
  );
  TestValidator.equals(
    "doctor not deleted (deleted_at null)",
    doctorRecord.deleted_at,
    null,
  );

  // 4. Delete doctor
  await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.erase(
    connection,
    {
      medicalDoctorId: doctorRecord.id,
    },
  );
  // No output; to confirm deletion, attempt to delete again or rely on subsequent error

  // 5. Deleting a non-existent doctor should error
  await TestValidator.error(
    "deleting non-existent doctor should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.erase(
        connection,
        {
          medicalDoctorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Deleting already deleted doctor -- should error or be idempotent
  await TestValidator.error(
    "deleting already deleted doctor should fail or be idempotent",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.erase(
        connection,
        {
          medicalDoctorId: doctorRecord.id,
        },
      );
    },
  );
}
