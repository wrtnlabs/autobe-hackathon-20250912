import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end test for system admin updating a medical doctor profile.
 *
 * 1. Register and authenticate as system admin.
 * 2. System admin creates a doctor (to obtain medicalDoctorId for update).
 * 3. Update doctor's fields: change email, full_name, specialty, phone.
 * 4. Validate business rules: cannot update to duplicate email, forbidden for
 *    unauthenticated roles, and correct error on invalid doctor id.
 */
export async function test_api_medical_doctor_update_by_system_admin_full_e2e(
  connection: api.IConnection,
) {
  // Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: "passW0rd_!@#",
      },
    });
  typia.assert(adminJoin);

  // Create a medical doctor (to be updated)
  const origDocEmail = typia.random<string & tags.Format<"email">>();
  const origDocNPI = RandomGenerator.alphaNumeric(10);
  const doctor: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: {
          email: origDocEmail,
          full_name: RandomGenerator.name(),
          npi_number: origDocNPI,
          specialty: "General Medicine",
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(doctor);

  // 1. Update doctor fields: email, full_name, specialty, phone
  const updateEmail = typia.random<string & tags.Format<"email">>();
  const updatedSpec = "Cardiology";
  const updateRes: IHealthcarePlatformMedicalDoctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.update(
      connection,
      {
        medicalDoctorId: doctor.id,
        body: {
          email: updateEmail,
          full_name: RandomGenerator.name(),
          specialty: updatedSpec,
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(updateRes);
  TestValidator.equals(
    "update took effect (email)",
    updateRes.email,
    updateEmail,
  );
  TestValidator.equals(
    "update took effect (specialty)",
    updateRes.specialty,
    updatedSpec,
  );

  // 2. Check uniqueness: create another doctor, then try to update first doctor to use same email
  const dupDoc =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          npi_number: RandomGenerator.alphaNumeric(10),
          specialty: "Orthopedics",
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(dupDoc);
  // Try update with duplicate email
  await TestValidator.error("cannot update to duplicate email", async () => {
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.update(
      connection,
      {
        medicalDoctorId: doctor.id,
        body: {
          email: dupDoc.email,
        },
      },
    );
  });
  // [Removed duplicate NPI update test — not in update DTO]

  // 3. Invalid doctorId update
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid doctorId should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.update(
      connection,
      {
        medicalDoctorId: invalidId,
        body: {
          full_name: RandomGenerator.name(),
        },
      },
    );
  });

  // 4. Try update as unauthenticated role (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated role cannot update doctor",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.update(
        unauthConn,
        {
          medicalDoctorId: doctor.id,
          body: {
            phone: RandomGenerator.mobile(),
          },
        },
      );
    },
  );
}
