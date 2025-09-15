import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin's ability to fetch a medical doctor's detailed profile
 * by id.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin (superuser).
 * 2. Create a new medical doctor with unique credentials.
 * 3. Retrieve the doctor's detailed profile using their id as an authenticated
 *    admin.
 * 4. Validate that all retrieved profile fields match the original creation
 *    request and returned doctor.
 * 5. Attempt retrieval with a non-existent UUID, expecting error.
 * 6. Try fetching as unauthenticated user, expecting authorization error.
 */
export async function test_api_medicaldoctor_detail_view_as_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a system administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinReq = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: "SuperSecurePassword1!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinReq,
    });
  typia.assert(admin);

  // 2. Create a new medical doctor profile
  const doctorCreateReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const createdDoctor: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorCreateReq,
      },
    );
  typia.assert(createdDoctor);

  // 3. Retrieve doctor detailed profile as system admin
  const fetchedDoctor: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.at(
      connection,
      {
        medicalDoctorId: createdDoctor.id,
      },
    );
  typia.assert(fetchedDoctor);
  TestValidator.equals("doctor id matches", fetchedDoctor.id, createdDoctor.id);
  TestValidator.equals(
    "doctor email matches",
    fetchedDoctor.email,
    doctorCreateReq.email,
  );
  TestValidator.equals(
    "doctor full_name matches",
    fetchedDoctor.full_name,
    doctorCreateReq.full_name,
  );
  TestValidator.equals(
    "doctor npi_number matches",
    fetchedDoctor.npi_number,
    doctorCreateReq.npi_number,
  );
  TestValidator.equals(
    "doctor specialty matches",
    fetchedDoctor.specialty,
    doctorCreateReq.specialty,
  );
  TestValidator.equals(
    "doctor phone matches",
    fetchedDoctor.phone,
    doctorCreateReq.phone,
  );
  TestValidator.predicate(
    "doctor created_at exists",
    typeof fetchedDoctor.created_at === "string" &&
      fetchedDoctor.created_at.length > 0,
  );
  TestValidator.predicate(
    "doctor updated_at exists",
    typeof fetchedDoctor.updated_at === "string" &&
      fetchedDoctor.updated_at.length > 0,
  );
  TestValidator.equals("doctor not deleted", fetchedDoctor.deleted_at, null);

  // 4. Negative test: try non-existent doctor id (random UUID)
  await TestValidator.error(
    "error on fetching non-existent doctor",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.at(
        connection,
        {
          medicalDoctorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Negative test: unauthenticated access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch medical doctor",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.at(
        unauthConn,
        {
          medicalDoctorId: createdDoctor.id,
        },
      );
    },
  );
}
