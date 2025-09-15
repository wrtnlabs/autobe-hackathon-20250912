import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validates the update of an EHR encounter record by a medical doctor.
 *
 * 1. Register and login (authenticate) as a medical doctor to obtain a session.
 * 2. Register and login (authenticate) as an organization admin to create a new
 *    patient record (as only admin can create).
 * 3. Return to medical doctor session and create a new encounter for that patient
 *    record.
 * 4. Update the encounter with new data; verify response fields are updated,
 *    including audit fields.
 * 5. As a separate medical doctor not the provider, attempt to update encounter;
 *    confirm error is thrown.
 * 6. Attempt to PATCH with empty body, confirm validation error is thrown.
 */
export async function test_api_encounter_update_success_with_full_auth_e2e(
  connection: api.IConnection,
) {
  // 1. Register and login as medical doctor
  const mdEmail = typia.random<string & tags.Format<"email">>();
  const mdNpi = RandomGenerator.alphaNumeric(10);
  const mdPassword = RandomGenerator.alphaNumeric(12) satisfies string &
    tags.Format<"password">;
  const mdJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: mdEmail,
      full_name: RandomGenerator.name(),
      npi_number: mdNpi,
      password: mdPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(mdJoin);

  // 2. Register and login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14) satisfies string &
    tags.Format<"password">;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create patient record (org admin privilege)
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: typia.random<string>(),
          full_name: RandomGenerator.name(),
          dob: new Date(
            Date.now() - 31 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 31 years ago
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Switch back to MD session
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: mdEmail,
      password: mdPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 5. Create encounter
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: mdJoin.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
          notes: "Initial encounter.",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 6. Update encounter - valid update flow
  const updateBody = {
    encounter_type: "telemedicine",
    status: "completed",
    encounter_end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    notes: "Visit completed via remote consult.",
  } satisfies IHealthcarePlatformEhrEncounter.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "updated_at has changed",
    updated.updated_at,
    encounter.updated_at,
  );
  TestValidator.equals(
    "encounter type updated",
    updated.encounter_type,
    "telemedicine",
  );
  TestValidator.equals("status updated", updated.status, "completed");
  TestValidator.equals(
    "notes updated",
    updated.notes,
    "Visit completed via remote consult.",
  );

  // 7. Negative: Update attempt as non-owning medical doctor (should fail)
  const anotherMdEmail = typia.random<string & tags.Format<"email">>();
  const anotherMdNpi = RandomGenerator.alphaNumeric(10);
  const anotherMdPassword = RandomGenerator.alphaNumeric(10) satisfies string &
    tags.Format<"password">;
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: anotherMdEmail,
      full_name: RandomGenerator.name(),
      npi_number: anotherMdNpi,
      password: anotherMdPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: anotherMdEmail,
      password: anotherMdPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "update should fail as different medical doctor",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: updateBody,
        },
      );
    },
  );

  // 8. Validation error: empty update body
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: mdEmail,
      password: mdPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "update with empty body should fail (validation error)",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: {},
        },
      );
    },
  );
}
