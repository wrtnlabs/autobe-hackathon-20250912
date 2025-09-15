import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate E2E system admin-initiated soft deletion of a medical doctor record.
 *
 * This test covers onboarding a healthcare platform system admin, creation of a
 * medical doctor, soft-deleting (setting deleted_at), and failure cases for
 * double-deletion and non-existent id.
 *
 * Steps:
 *
 * 1. System admin registration (with random email, full_name, password, provider:
 *    'local')
 * 2. Create a medical doctor (random email, full_name, npi_number, etc)
 * 3. Soft delete (erase) the doctor by ID
 * 4. Confirm double deletion fails (idempotent or error)
 * 5. Attempt to delete non-existent doctor
 */
export async function test_api_medical_doctor_delete_by_system_admin_full_e2e(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a medical doctor
  const doctorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctor: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      { body: doctorCreateBody },
    );
  typia.assert(doctor);
  TestValidator.predicate(
    "doctor not soft deleted on creation",
    !doctor.deleted_at,
  );

  // 3. Delete (soft-delete) the doctor
  await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.erase(
    connection,
    { medicalDoctorId: doctor.id },
  );

  // 4. Attempt to delete again (should be idempotent/succeed or fail gracefully)
  await TestValidator.error(
    "double delete yields error or is idempotent",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.erase(
        connection,
        { medicalDoctorId: doctor.id },
      );
    },
  );

  // 5. Attempt to delete a non-existent doctor
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent medicalDoctorId fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.erase(
        connection,
        { medicalDoctorId: nonExistentId },
      );
    },
  );
}
