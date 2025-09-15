import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * E2E test for updating a patient encounter by a nurse.
 *
 * - Registers & logs in nurse #1.
 * - Registers & logs in as org admin.
 * - Admin creates a patient record.
 * - Nurse #1 creates encounter.
 * - Nurse #1 updates encounter successfully.
 * - Nurse #1 attempts invalid update (e.g. invalid status) to ensure business
 *   rule error.
 * - Nurse #2 (different nurse) register/login and attempts update (should fail
 *   for auth reason).
 */
export async function test_api_encounter_update_by_nurse_full_flow_e2e(
  connection: api.IConnection,
) {
  // Register & login nurse #1
  const nurse1Email = typia.random<string & tags.Format<"email">>();
  const nurse1Password = RandomGenerator.alphaNumeric(12);
  const nurse1: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: nurse1Email,
        full_name: RandomGenerator.name(),
        license_number: RandomGenerator.alphaNumeric(8),
        password: nurse1Password,
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(nurse1);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1Email,
      password: nurse1Password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // Register & login organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Admin creates patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: admin.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date("1995-08-12T00:00:00.000Z").toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // Switch back to nurse #1
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1Email,
      password: nurse1Password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // Nurse #1 creates encounter
  const encounterCreateBody = {
    patient_record_id: patientRecord.id,
    provider_user_id: nurse1.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
    notes: "Initial checkup visit.",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreateBody,
      },
    );
  typia.assert(encounter);

  // Now update encounter successfully
  const updateBody = {
    notes: "Updated notes after patient review.",
    status: "completed",
    encounter_end_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformEhrEncounter.IUpdate;
  const updatedEncounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEncounter);
  TestValidator.equals(
    "updated notes value",
    updatedEncounter.notes,
    updateBody.notes,
  );
  TestValidator.equals(
    "updated status value",
    updatedEncounter.status,
    updateBody.status,
  );

  // Try updating with an invalid status value to check business validation error
  await TestValidator.error(
    "should fail when updating with invalid status value",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: {
            status: "nonexistent_status",
          } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
        },
      );
    },
  );

  // Register and login as nurse #2, then attempt update (should fail - not owner)
  const nurse2Email = typia.random<string & tags.Format<"email">>();
  const nurse2Password = RandomGenerator.alphaNumeric(11);
  const nurse2 = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse2Email,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
      password: nurse2Password,
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurse2);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse2Email,
      password: nurse2Password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  await TestValidator.error(
    "should fail when non-owner nurse tries to update",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          body: {
            notes: "Nurse 2 update attempt should fail.",
          } satisfies IHealthcarePlatformEhrEncounter.IUpdate,
        },
      );
    },
  );
}
