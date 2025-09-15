import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * E2E test for technician updating lab result information in the healthcare
 * platform.
 *
 * 1. Register/login as technician.
 * 2. Register/login as organization admin (create patient record).
 * 3. Register/login as medical doctor (create clinical encounter).
 * 4. Register patient profile.
 * 5. Organization admin creates patient record for patient.
 * 6. Medical doctor creates EHR encounter for patient record.
 * 7. Technician logs in.
 * 8. Technician creates initial lab result.
 * 9. Technician updates lab result (fields in IUpdate).
 * 10. Validate update takes effect.
 * 11. Attempt update with non-existent labResultId (expect error).
 * 12. Confirm audit fields present.
 */
export async function test_api_technician_lab_result_update_e2e_flow(
  connection: api.IConnection,
) {
  // 1. Technician registration + login
  const techEmail = typia.random<string & tags.Format<"email">>();
  const techPwd = RandomGenerator.alphaNumeric(10);
  const technician = await api.functional.auth.technician.join(connection, {
    body: {
      email: techEmail,
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(8),
    } satisfies IHealthcarePlatformTechnician.IJoin,
  });
  typia.assert(technician);
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techEmail,
      password: techPwd,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  // 2. Organization admin registration/login
  const orgEmail = typia.random<string & tags.Format<"email">>();
  const orgPwd = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgEmail,
        full_name: RandomGenerator.name(),
        password: orgPwd,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgEmail,
      password: orgPwd,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // 3. Medical doctor registration/login
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPwd = RandomGenerator.alphaNumeric(12);
  const doctorNpi = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNpi,
      password: doctorPwd,
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPwd,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  // 4. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 1, 20).toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);
  // 5. Organization admin creates patient record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgEmail,
      password: orgPwd,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);
  // 6. Medical doctor creates EHR encounter
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPwd,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: doctor.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);
  // 7. Technician logs in before lab result creation
  await api.functional.auth.technician.login(connection, {
    body: {
      email: techEmail,
      password: techPwd,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  // 8. Create initial lab result
  const initialLabResult =
    await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: "Complete Blood Count",
          test_result_value_json: JSON.stringify({ WBC: 5.2, RBC: 4.8 }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );
  typia.assert(initialLabResult);
  // 9. Update fields in lab result
  const updateFields = {
    test_name: "CBC with Differential",
    result_flag: "abnormal",
    status: "revised",
    test_result_value_json: JSON.stringify({ WBC: 3.4, RBC: 4.1 }),
    resulted_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformLabResult.IUpdate;
  const updatedLabResult =
    await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        labResultId: initialLabResult.id,
        body: updateFields,
      },
    );
  typia.assert(updatedLabResult);
  // 10. Validate update
  TestValidator.equals(
    "test_name updated",
    updatedLabResult.test_name,
    updateFields.test_name,
  );
  TestValidator.equals(
    "flag updated",
    updatedLabResult.result_flag,
    updateFields.result_flag,
  );
  TestValidator.equals(
    "status updated",
    updatedLabResult.status,
    updateFields.status,
  );
  TestValidator.equals(
    "test_result_value_json updated",
    updatedLabResult.test_result_value_json,
    updateFields.test_result_value_json,
  );
  // 11. Confirm audit fields (created_at exists)
  TestValidator.predicate(
    "audit: created_at exists",
    typeof updatedLabResult.created_at === "string" &&
      !!updatedLabResult.created_at,
  );
  // 12. Error: update with non-existent labResultId
  await TestValidator.error(
    "non-existent labResultId should fail",
    async () => {
      await api.functional.healthcarePlatform.technician.patientRecords.encounters.labResults.update(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          labResultId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            test_name: "Fake Test Update",
          } satisfies IHealthcarePlatformLabResult.IUpdate,
        },
      );
    },
  );
}
