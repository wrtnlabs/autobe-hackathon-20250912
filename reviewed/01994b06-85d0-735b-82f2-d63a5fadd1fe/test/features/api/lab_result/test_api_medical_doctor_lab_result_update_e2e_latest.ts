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

/**
 * End-to-end scenario for lab result update as a medical doctor:
 *
 * - Register/login org admin to create a patient record
 * - Register/login doctor
 * - Register patient
 * - As admin, create patient profile and record
 * - As doctor, create encounter and lab result
 * - As doctor, update lab result and validate persistence
 * - Confirm only doctor can update; patient cannot
 * - Test error for non-existent labResultId
 * - Confirm finalized status blocks updates
 */
export async function test_api_medical_doctor_lab_result_update_e2e_latest(
  connection: api.IConnection,
) {
  // 1. Create and login as organization admin (needed to create patient record)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "Password1!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 2. Register/login as medical doctor
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = "DrPassw0rd!";
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
      specialty: "family medicine",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);

  // 3. Register patient account
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1985-02-25T00:00:00Z").toISOString(),
      password: "patPASSw0rd!",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 4. As admin, create patient profile in platform
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Password1!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const patientProfile =
    await api.functional.healthcarePlatform.patient.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
          phone: patient.phone ?? undefined,
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientProfile);

  // 5. As admin, create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdmin.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Login as doctor
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 7. Create encounter
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: doctor.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 8. Create lab result for the encounter
  const labResult =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        body: {
          ehr_encounter_id: encounter.id as string & tags.Format<"uuid">,
          lab_integration_id: typia.random<string & tags.Format<"uuid">>(),
          test_name: "Glucose",
          test_result_value_json: JSON.stringify({ value: 85, units: "mg/dL" }),
          result_flag: "normal",
          resulted_at: new Date().toISOString(),
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.ICreate,
      },
    );
  typia.assert(labResult);

  // 9. Update lab result as doctor
  const labResultUpdate = {
    test_name: "Glucose Revised",
    test_result_value_json: JSON.stringify({ value: 90, units: "mg/dL" }),
    result_flag: "abnormal",
    status: "revised",
  } satisfies IHealthcarePlatformLabResult.IUpdate;
  const updatedLabResult =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: labResult.id as string & tags.Format<"uuid">,
        body: labResultUpdate,
      },
    );
  typia.assert(updatedLabResult);
  TestValidator.equals(
    "lab result name updated",
    updatedLabResult.test_name,
    labResultUpdate.test_name,
  );
  TestValidator.equals(
    "lab value updated",
    updatedLabResult.test_result_value_json,
    labResultUpdate.test_result_value_json,
  );
  TestValidator.equals(
    "result flag updated",
    updatedLabResult.result_flag,
    labResultUpdate.result_flag,
  );
  TestValidator.equals(
    "result status updated",
    updatedLabResult.status,
    labResultUpdate.status,
  );

  // 10. Try updating as patient (permission check)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientEmail,
      password: "patPASSw0rd!",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error("patient cannot update lab result", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: labResult.id as string & tags.Format<"uuid">,
        body: {
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.IUpdate,
      },
    );
  });

  // 11. Try updating with invalid labResultId
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });
  await TestValidator.error(
    "update with missing labResultId fails",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.update(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          encounterId: encounter.id as string & tags.Format<"uuid">,
          labResultId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "revised",
          } satisfies IHealthcarePlatformLabResult.IUpdate,
        },
      );
    },
  );

  // 12. Mark result finalized, then try update again (should fail)
  const finalizedResult =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: labResult.id as string & tags.Format<"uuid">,
        body: {
          status: "finalized",
        } satisfies IHealthcarePlatformLabResult.IUpdate,
      },
    );
  typia.assert(finalizedResult);
  await TestValidator.error("update after finalization fails", async () => {
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.labResults.update(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id as string & tags.Format<"uuid">,
        labResultId: labResult.id as string & tags.Format<"uuid">,
        body: {
          status: "completed",
        } satisfies IHealthcarePlatformLabResult.IUpdate,
      },
    );
  });
}
