import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Organization admin can view patient profiles: end-to-end test.
 *
 * - Registers and logs in a new org admin
 * - Registers a new patient for the test
 * - Successfully retrieves the registered patient's profile using admin
 *   privileges
 * - Attempts to retrieve a profile of a non-existent patient (should fail)
 * - All type checks and validations performed
 */
export async function test_api_org_admin_view_patient_profile(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const orgEmail = typia.random<string & tags.Format<"email">>();
  const orgJoinBody = {
    email: orgEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "TestPassword1!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgJoinBody },
  );
  typia.assert(orgAdmin);

  // 2. Log in as organization admin
  const orgLoginBody = {
    email: orgEmail,
    password: "TestPassword1!",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const orgSession = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: orgLoginBody },
  );
  typia.assert(orgSession);

  // 3. Register a new patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1985, 4, 10).toISOString(),
    phone: RandomGenerator.mobile(),
    password: "Patient12345",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientAuth = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patientAuth);

  // 4. Fetch the patient profile as org admin (should succeed)
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.patients.at(
      connection,
      { patientId: patientAuth.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched id matches created patient",
    fetched.id,
    patientAuth.id,
  );
  TestValidator.equals("fetched email matches", fetched.email, patientEmail);
  TestValidator.equals(
    "fetched full_name matches",
    fetched.full_name,
    patientJoinBody.full_name,
  );

  // 5. Try fetching profile with non-existent patientId (should fail)
  await TestValidator.error(
    "fetching non-existent patient throws error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.at(
        connection,
        {
          patientId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
