import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Full E2E scenario for updating an EHR encounter as a healthcare org
 * admin.
 *
 * 1. Register and login as org admin (orgAdmin1)
 * 2. Create patient record
 * 3. Create new EHR encounter under that record with org admin's own user id
 *    as provider
 * 4. Update the encounter: change status and clinical notes
 * 5. Validate update succeeded and values changed as expected
 * 6. Try updating with invalid business logic (e.g., reverting completed
 *    encounter back to planned) — expect business error (not type error)
 * 7. Register/login as a different org admin (orgAdmin2), attempt updating
 *    encounter — verify forbidden/permission denied
 */
export async function test_api_encounter_update_by_orgadmin_full_journey_e2e(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin (orgAdmin1)
  const adminJoin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin1);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoin1.email,
      password: RandomGenerator.alphaNumeric(12), // simulate login, as password may be needed
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Create patient record -- use the org id from the admin, fake user id
  const patientUserId = typia.random<string>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminJoin1.id,
          department_id: undefined,
          patient_user_id: patientUserId,
          external_patient_number: undefined,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          gender: RandomGenerator.pick(["male", "female", "other"] as const),
          status: "active",
          demographics_json: undefined,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 3. Create encounter under this patient record
  const encounterCreateBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: adminJoin1.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: "Initial notes",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreateBody,
      },
    );
  typia.assert(encounter);

  // 4. Update the encounter: change status and notes
  const newNotes = "Follow-up: patient reported mild headache.";
  const updatedStatus = "completed";
  const updateBody = {
    status: updatedStatus,
    notes: newNotes,
  } satisfies IHealthcarePlatformEhrEncounter.IUpdate;
  const updatedEncounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEncounter);
  TestValidator.equals(
    "status updated",
    updatedEncounter.status,
    updatedStatus,
  );
  TestValidator.equals("notes updated", updatedEncounter.notes, newNotes);

  // 5. Attempt invalid business update: revert completed encounter back to planned (should error)
  await TestValidator.error(
    "cannot revert completed encounter to planned",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: {
            status: "planned",
          } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
        },
      );
    },
  );

  // 6. Register/login as second org admin (different user)
  const adminJoin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
        provider: undefined,
        provider_key: undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin2);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoin2.email,
      password: RandomGenerator.alphaNumeric(12),
      provider: undefined,
      provider_key: undefined,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. Attempt forbidden update on encounter by the second admin
  await TestValidator.error(
    "permission denied for unrelated org admin",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: {
            notes: "Should not be able to update.",
          } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
        },
      );
    },
  );
}
