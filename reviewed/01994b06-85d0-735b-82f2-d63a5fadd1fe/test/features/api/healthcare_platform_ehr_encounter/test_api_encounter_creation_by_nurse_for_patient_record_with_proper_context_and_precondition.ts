import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates nurse creation of EHR encounter for a patient record.
 *
 * 1. Register and login a system admin to create a patient record
 * 2. Create a patient record as system admin
 * 3. Register and login a nurse account
 * 4. As nurse, create an EHR encounter for the patient record
 * 5. Validate encounter's patient_record_id and provider_user_id
 * 6. Attempt creation with invalid patientRecordId (should fail)
 * 7. Attempt creation with missing fields (should fail)
 * 8. Attempt creation as unprivileged user (should fail)
 */
export async function test_api_encounter_creation_by_nurse_for_patient_record_with_proper_context_and_precondition(
  connection: api.IConnection,
) {
  // 1. Register and login system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: "TestAdminPassword123!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create patient record as system admin
  const patientFullName = RandomGenerator.name();
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: typia.random<string>(),
          external_patient_number: null,
          full_name: patientFullName,
          dob: new Date(1990, 5, 1).toISOString(),
          gender: "female",
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 3. Register and login nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseLicense = RandomGenerator.alphaNumeric(8);
  const nurseJoin = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      specialty: "med/surg",
      phone: RandomGenerator.mobile(),
      password: "NursePassw0rd!",
    } satisfies IHealthcarePlatformNurse.IJoin,
  });
  typia.assert(nurseJoin);

  // 4. Login as nurse
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseEmail,
      password: "NursePassw0rd!",
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 5. As nurse, create encounter for the target patient record
  const now = new Date();
  const encounterCreate = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: nurseJoin.id as string & tags.Format<"uuid">,
    encounter_type: "office_visit",
    encounter_start_at: now.toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreate,
      },
    );
  typia.assert(encounter);
  TestValidator.equals(
    "patient_record_id matches",
    encounter.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "provider_user_id is nurse",
    encounter.provider_user_id,
    nurseJoin.id,
  );
  TestValidator.equals(
    "encounter_type is correct",
    encounter.encounter_type,
    "office_visit",
  );
  TestValidator.equals("status is active", encounter.status, "active");
  TestValidator.equals("notes content", encounter.notes, encounterCreate.notes);

  // 6. Attempt to create encounter with invalid patientRecordId
  await TestValidator.error(
    "fail if patient record does not exist",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ...encounterCreate,
            patient_record_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 7. Attempt to create with missing required value (encounter_type empty)
  await TestValidator.error("fail if encounter_type is missing", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: { ...encounterCreate, encounter_type: "" },
      },
    );
  });

  // 8. Attempt to create as unprivileged user (system admin, not nurse)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "TestAdminPassword123!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error("fail if not nurse role", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterCreate,
      },
    );
  });
}
