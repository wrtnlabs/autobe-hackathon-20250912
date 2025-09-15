import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate creation of patient record amendment by a medical doctor with
 * reviewer and encounter linkage.
 *
 * Covers business workflow:
 *
 * 1. System admin join/login.
 * 2. Register two doctors (submitter, reviewer).
 * 3. Admin creates a patient record (with synthetic patient-user ID).
 * 4. Submitter doctor logs in and creates EHR encounter for this record.
 * 5. Submitter doctor creates a valid record amendment referencing
 *    patientRecordId, encounter, and reviewer doctor.
 * 6. Assert successful creation: audit fields, correct UUID refs, values.
 * 7. Failure: try amendment with invalid patientRecordId, expect 404.
 * 8. Failure: try amendment with invalid encounter ID, expect 404.
 * 9. Failure: try amendment with invalid reviewer ID, expect 404.
 * 10. Failure: create duplicate/conflicting amendment, assert business rule error.
 * 11. Failure: switch to non-medical-doctor context and expect 403 on attempt.
 */
export async function test_api_record_amendment_creation_with_review_and_encounter_by_medical_doctor(
  connection: api.IConnection,
) {
  // 1. Admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: "sysadminpw123",
    },
  });
  typia.assert(adminJoin);

  // 2. Register doctors (submitter, reviewer)
  const doctorAEmail = typia.random<string & tags.Format<"email">>();
  const doctorASignup = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorAEmail,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: "doctorapw123",
      },
    },
  );
  typia.assert(doctorASignup);

  const doctorBEmail = typia.random<string & tags.Format<"email">>();
  const doctorBSignup = await api.functional.auth.medicalDoctor.join(
    connection,
    {
      body: {
        email: doctorBEmail,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: "doctorbpw123",
      },
    },
  );
  typia.assert(doctorBSignup);

  // 3. Admin login for patient record creation
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "sysadminpw123",
    },
  });

  // 4. Admin creates patient record
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const prCreate = {
    organization_id: orgId,
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date("1985-09-14T03:38:03.458Z").toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: prCreate,
      },
    );
  typia.assert(patientRecord);

  // 5. Doctor (submitter) login
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: "doctorapw123",
    },
  });

  // 6. Doctor creates EHR encounter for this patient
  const encounterCreate = {
    patient_record_id: patientRecord.id,
    provider_user_id: doctorASignup.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const ehrEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: encounterCreate,
      },
    );
  typia.assert(ehrEncounter);

  // 7. Amendment create with all links (success path)
  const oldAllergyJson = JSON.stringify({ allergy: "penicillin" });
  const newAllergyJson = JSON.stringify({ allergy: "amoxicillin" });
  const amendmentCreate = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: doctorASignup.id,
    reviewed_by_user_id: doctorBSignup.id,
    ehr_encounter_id: ehrEncounter.id,
    amendment_type: "correction",
    old_value_json: oldAllergyJson,
    new_value_json: newAllergyJson,
    rationale: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: amendmentCreate,
      },
    );
  typia.assert(amendment);
  TestValidator.equals(
    "amendment patient record linkage",
    amendment.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "amendment submitted by",
    amendment.submitted_by_user_id,
    doctorASignup.id,
  );
  TestValidator.equals(
    "amendment reviewer linkage",
    amendment.reviewed_by_user_id,
    doctorBSignup.id,
  );
  TestValidator.equals(
    "amendment encounter linkage",
    amendment.ehr_encounter_id,
    ehrEncounter.id,
  );
  TestValidator.equals(
    "amendment type",
    amendment.amendment_type,
    amendmentCreate.amendment_type,
  );
  TestValidator.equals(
    "audit rationale",
    amendment.rationale,
    amendmentCreate.rationale,
  );
  TestValidator.equals(
    "old value json",
    amendment.old_value_json,
    oldAllergyJson,
  );
  TestValidator.equals(
    "new value json",
    amendment.new_value_json,
    newAllergyJson,
  );

  // 8. Negative: patientRecordId not found
  await TestValidator.error(
    "amendment with non-existent patientRecordId throws 404",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: amendmentCreate,
        },
      );
    },
  );

  // 9. Negative: ehrEncounterId not found
  await TestValidator.error(
    "amendment with non-existent encounter id throws 404",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          body: {
            ...amendmentCreate,
            ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 10. Negative: reviewer user not found
  await TestValidator.error(
    "amendment with invalid reviewer ID throws 404",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          body: {
            ...amendmentCreate,
            reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 11. Negative: duplicate amendment business rule
  await TestValidator.error(
    "duplicate/conflicting amendment is rejected",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          body: amendmentCreate,
        },
      );
    },
  );

  // 12. Negative: try as admin (non-medical-doctor actor)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "sysadminpw123",
    },
  });
  await TestValidator.error(
    "admin cannot create medical doctor amendment, expect 403",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id,
          body: amendmentCreate,
        },
      );
    },
  );
}
