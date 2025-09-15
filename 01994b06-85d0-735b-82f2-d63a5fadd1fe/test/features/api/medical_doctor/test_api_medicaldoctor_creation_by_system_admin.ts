import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate direct medical doctor creation by system administrator.
 *
 * This test performs a full workflow:
 *
 * 1. Registers a new system admin account (superuser)
 * 2. Creates a unique medical doctor via platform (org-agnostic)
 * 3. Verifies all returned fields match request, and server-side fields are
 *    present
 * 4. Attempts duplicate email (should fail)
 * 5. Attempts duplicate NPI (should fail)
 * 6. Attempts invalid email and NPI format (should fail)
 */
export async function test_api_medicaldoctor_creation_by_system_admin(
  connection: api.IConnection,
) {
  // Register system admin (superuser)
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(10)}@corp.com`;
  const adminBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const superuser = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(superuser);
  TestValidator.equals("admin email matches", superuser.email, adminEmail);

  // Compose doctor input
  const doctorEmail = `dr+${RandomGenerator.alphaNumeric(10)}@hospital.org`;
  const npiNumber = `NPI${RandomGenerator.alphaNumeric(8)}`;
  const doctorCreateBody = {
    email: doctorEmail,
    full_name: RandomGenerator.name(),
    npi_number: npiNumber,
    specialty: "Cardiology",
    phone: "+12125551212",
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  // Create doctor
  const doctor =
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorCreateBody,
      },
    );
  typia.assert(doctor);
  // Validate returned fields (business, not schema)
  TestValidator.equals(
    "doctor email matches",
    doctor.email,
    doctorCreateBody.email,
  );
  TestValidator.equals(
    "doctor NPI number matches",
    doctor.npi_number,
    doctorCreateBody.npi_number,
  );
  TestValidator.equals(
    "doctor specialty matches",
    doctor.specialty,
    doctorCreateBody.specialty,
  );
  TestValidator.equals(
    "doctor phone matches",
    doctor.phone,
    doctorCreateBody.phone,
  );
  TestValidator.equals(
    "doctor full_name matches",
    doctor.full_name,
    doctorCreateBody.full_name,
  );
  TestValidator.equals("doctor is not deleted", doctor.deleted_at, null);

  // Attempt duplicate email
  const doctorCreateBodyDupEmail = {
    ...doctorCreateBody,
    npi_number: `NPI${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  await TestValidator.error("duplicate doctor email should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorCreateBodyDupEmail,
      },
    );
  });
  // Attempt duplicate NPI
  const doctorCreateBodyDupNPI = {
    ...doctorCreateBody,
    email: `dr+dup+${RandomGenerator.alphaNumeric(10)}@hospital.org`,
    npi_number: doctorCreateBody.npi_number,
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  await TestValidator.error("duplicate doctor NPI should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
      connection,
      {
        body: doctorCreateBodyDupNPI,
      },
    );
  });
  // Attempt invalid email
  const doctorCreateBodyBadEmail = {
    ...doctorCreateBody,
    email: "invalid-email-format",
    npi_number: `NPI${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  await TestValidator.error(
    "invalid email format on doctor should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
        connection,
        {
          body: doctorCreateBodyBadEmail,
        },
      );
    },
  );
  // Attempt invalid NPI (empty string)
  const doctorCreateBodyBadNPI = {
    ...doctorCreateBody,
    npi_number: "",
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  await TestValidator.error(
    "invalid NPI format on doctor should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.medicaldoctors.create(
        connection,
        {
          body: doctorCreateBodyBadNPI,
        },
      );
    },
  );
}
