import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validates organization admin patient creation scenario.
 *
 * 1. Register as a new organization admin using unique credentials.
 * 2. Log in as the admin, establishing authentication.
 * 3. Create a new patient record with all required attributes.
 * 4. Validate the patient object, check types, and property values.
 * 5. Attempt to create a duplicate patient using the same email to trigger
 *    validation error.
 * 6. Attempt to call the patient creation API unauthenticated (with empty headers)
 *    and expect forbidden/unauthorized error.
 */
export async function test_api_organizationadmin_create_patient_account(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Authenticate (login) as organization admin
  const adminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);

  // 3. Create patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientCreateBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 365 * 30,
    ).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: patientCreateBody,
      },
    );
  typia.assert(patient);
  TestValidator.equals(
    "patient email matches input",
    patient.email,
    patientCreateBody.email,
  );
  TestValidator.equals(
    "patient name matches input",
    patient.full_name,
    patientCreateBody.full_name,
  );
  TestValidator.equals(
    "patient date_of_birth matches input",
    patient.date_of_birth,
    patientCreateBody.date_of_birth,
  );
  TestValidator.equals(
    "patient phone matches input",
    patient.phone,
    patientCreateBody.phone,
  );

  // 4. Try duplicate patient (same email) – expect error
  await TestValidator.error("duplicate patient email should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: patientCreateBody,
      },
    );
  });

  // 5. Try unauthenticated – expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create patient",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.create(
        unauthConn,
        {
          body: patientCreateBody,
        },
      );
    },
  );
}
