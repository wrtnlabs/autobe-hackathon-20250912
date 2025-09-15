import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabIntegration";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * Validate medical doctor's ability to access a single lab result for a patient
 * encounter, and block access if not their assignment.
 *
 * Steps:
 *
 * 1. Register and login org admin.
 * 2. Register and login medical doctor A.
 * 3. Org admin creates a new patient record (with random info and
 *    patient_user_id).
 * 4. Org admin creates a clinical encounter for patient, assigned to doctor A.
 * 5. Org admin creates a lab integration for the organization.
 * 6. Doctor A creates a lab result for the patient/encounter/lab integration.
 * 7. Doctor A GETs the created lab result via API using all three UUIDs; check all
 *    fields match and permission is correct.
 * 8. Register and login a second medical doctor B.
 * 9. Doctor B attempts to GET the same lab result; expect error (forbidden or
 *    unauthorized).
 */
export async function test_api_medical_doctor_lab_result_view_single_entry(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Register and login as doctor (A)
  const doctorAEmail = typia.random<string & tags.Format<"email">>();
  const doctorAPassword = RandomGenerator.alphaNumeric(12);
  const doctorANpi = RandomGenerator.alphaNumeric(10);
  const doctorAJoin = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorAEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorANpi,
      password: doctorAPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctorAJoin);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: doctorAPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 3. Org admin creates patient record, then login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          patient_user_id: patientUserId,
          full_name: RandomGenerator.name(),
          dob: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Org admin creates EHR encounter for patient, assigned to doctor
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: doctorAJoin.id as string & tags.Format<"uuid">,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "admission",
            "emergency",
          ]) as string,
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 5. Org admin creates lab integration
  const labIntegration =
    await api.functional.healthcarePlatform.organizationAdmin.labIntegrations.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: adminJoin.id as string &
            tags.Format<"uuid">,
          lab_vendor_code: RandomGenerator.name(1),
          connection_uri: "https://lab.example.com/api",
          supported_message_format: "HL7 V2",
          status: "active",
        } satisfies IHealthcarePlatformLabIntegration.ICreate,
      },
    );
  typia.assert(labIntegration);

  // 6. Login back as doctor A, create lab result
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorAEmail,
      password: doctorAPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const labResult =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: labIntegration.id as string & tags.Format<"uuid">,
          test_name: RandomGenerator.paragraph({ sentences: 2 }),
          test_result_value_json: JSON.stringify({
            summary: RandomGenerator.paragraph(),
          }),
          result_flag: RandomGenerator.pick(["normal", "abnormal", "critical"]),
          resulted_at: new Date().toISOString(),
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );
  typia.assert(labResult);

  // 7. Doctor A gets the created lab result by GET API
  const resultFetched =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: labResult.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(resultFetched);
  TestValidator.equals("labResult.id matches", resultFetched.id, labResult.id);
  TestValidator.equals(
    "labResult.encounter id matches",
    resultFetched.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "labResult.lab_integration_id matches",
    resultFetched.lab_integration_id,
    labIntegration.id,
  );
  TestValidator.equals(
    "labResult.test_name matches",
    resultFetched.test_name,
    labResult.test_name,
  );
  TestValidator.equals(
    "labResult.status matches",
    resultFetched.status,
    "completed",
  );

  // 8. Register and login a second doctor B
  const doctorBEmail = typia.random<string & tags.Format<"email">>();
  const doctorBPassword = RandomGenerator.alphaNumeric(12);
  const doctorBNpi = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorBEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorBNpi,
      password: doctorBPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorBEmail,
      password: doctorBPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 9. Doctor B attempts to GET the same lab result: expect error
  await TestValidator.error(
    "Doctor B forbidden from accessing doctor A's lab result",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: labResult.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
