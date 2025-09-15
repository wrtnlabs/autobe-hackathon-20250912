import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate organization admin workflow for updating a patient's profile,
 * including error scenarios.
 *
 * 1. Organization admin registers and logs in for authenticated context.
 * 2. Organization admin creates a patient account for update scenarios.
 * 3. Successfully updates patient profile fields (email, full_name, date_of_birth,
 *    phone), verifying persisted changes.
 * 4. Attempts update with invalid email and date_of_birth formats, expecting
 *    validation errors.
 * 5. Attempts to update a non-existent patient ID, confirming error handling.
 *
 * Negative scenario for deleted patients is skipped since no delete endpoint is
 * available. All data is randomly (but legally) generated, and assertions are
 * made for success and error paths.
 */
export async function test_api_organization_admin_patient_profile_update_workflow(
  connection: api.IConnection,
) {
  // 1. Register (join) organization admin and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Create patient to update
  const patientCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-06-15").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientCreateBody },
    );
  typia.assert(patient);

  // 3. Update patient profile - success
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1992-04-01").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IUpdate;
  const updatedPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.update(
      connection,
      {
        patientId: patient.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPatient);
  TestValidator.equals(
    "patient email updated",
    updatedPatient.email,
    updateBody.email!,
  );
  TestValidator.equals(
    "patient full_name updated",
    updatedPatient.full_name,
    updateBody.full_name!,
  );
  TestValidator.equals(
    "patient date_of_birth updated",
    updatedPatient.date_of_birth,
    updateBody.date_of_birth!,
  );
  TestValidator.equals(
    "patient phone updated",
    updatedPatient.phone,
    updateBody.phone!,
  );

  // 4. Error: Update with invalid email
  await TestValidator.error(
    "invalid email format triggers validation error (PUT)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.update(
        connection,
        {
          patientId: patient.id,
          body: {
            email: "invalid_email_format",
          } satisfies IHealthcarePlatformPatient.IUpdate,
        },
      );
    },
  );

  // 5. Error: Update with invalid date_of_birth
  await TestValidator.error(
    "invalid date_of_birth format triggers validation error (PUT)",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.update(
        connection,
        {
          patientId: patient.id,
          body: {
            date_of_birth: "not-a-date",
          } satisfies IHealthcarePlatformPatient.IUpdate,
        },
      );
    },
  );

  // 6. Error: Update non-existent patient ID
  await TestValidator.error(
    "update to non-existent patient should raise error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patients.update(
        connection,
        {
          patientId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
