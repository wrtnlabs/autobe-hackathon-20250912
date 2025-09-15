import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin ability to fetch medical doctor profile details
 * for a doctor within their organization, and reject out-of-scope/nonexistent
 * IDs.
 *
 * 1. Join as organization admin (obtain tokens and set context)
 * 2. As that admin, create a new medical doctor (record medicalDoctorId)
 * 3. Fetch details for the created doctor using the org admin session
 * 4. Assert details returned match created doctor profile
 * 5. Attempt to fetch a doctor profile using a valid, random UUID not associated
 *    to any doctor in org (should error)
 */
export async function test_api_medicaldoctor_detail_view_as_organization_admin(
  connection: api.IConnection,
) {
  // 1. Join as org admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(orgAdmin);
  TestValidator.equals("admin email matches", orgAdmin.email, joinInput.email);
  TestValidator.equals(
    "admin full name matches",
    orgAdmin.full_name,
    joinInput.full_name,
  );

  // 2. Create doctor as this org admin
  const doctorInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    specialty: RandomGenerator.pick([
      "Cardiology",
      "Pediatrics",
      "Emergency Medicine",
      null,
    ]),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.ICreate;
  const doctor =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.create(
      connection,
      { body: doctorInput },
    );
  typia.assert(doctor);
  TestValidator.equals(
    "doctor email matches input",
    doctor.email,
    doctorInput.email,
  );
  TestValidator.equals(
    "doctor npi matches input",
    doctor.npi_number,
    doctorInput.npi_number,
  );

  // 3. Fetch doctor details
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.at(
      connection,
      { medicalDoctorId: doctor.id },
    );
  typia.assert(fetched);
  TestValidator.equals("fetched doctor id matches", fetched.id, doctor.id);
  TestValidator.equals(
    "fetched doctor email matches",
    fetched.email,
    doctor.email,
  );
  TestValidator.equals(
    "fetched doctor full name matches",
    fetched.full_name,
    doctor.full_name,
  );
  TestValidator.equals(
    "fetched doctor npi matches",
    fetched.npi_number,
    doctor.npi_number,
  );
  TestValidator.equals(
    "fetched doctor specialty matches",
    fetched.specialty,
    doctor.specialty,
  );
  TestValidator.equals(
    "fetched doctor phone matches",
    fetched.phone,
    doctor.phone,
  );

  // 4. Try fetching with a random, valid UUID that does not exist (should error)
  await TestValidator.error(
    "non-existent valid uuid medicalDoctorId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.medicaldoctors.at(
        connection,
        {
          medicalDoctorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
