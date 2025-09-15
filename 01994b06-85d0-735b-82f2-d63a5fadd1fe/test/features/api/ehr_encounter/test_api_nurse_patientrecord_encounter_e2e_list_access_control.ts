import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";

/**
 * Validates end-to-end cross-role nurse access control for encounter listing on
 * EHR platform.
 *
 * Covers full workflow:
 *
 * 1. Organization admin registration & login
 * 2. Nurse registration & login
 * 3. Medical doctor registration & login
 * 4. Patient registration
 * 5. Admin creates a patient record for the patient
 * 6. Medical doctor creates an encounter for the patient record
 * 7. Nurse lists encounters for the patient record and verifies visibility
 * 8. Negative: Nurse attempts to list encounters with an invalid patientRecordId
 *    (should error)
 *
 * Validates role-based access, business rules, and response correctness.
 */
export async function test_api_nurse_patientrecord_encounter_e2e_list_access_control(
  connection: api.IConnection,
) {
  // 1. Organization admin signup & login
  const admin_email = typia.random<string & tags.Format<"email">>();
  const admin_password = RandomGenerator.alphaNumeric(10);
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: admin_email,
        password: admin_password,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Nurse signup & login
  const nurse_email = typia.random<string & tags.Format<"email">>();
  const nurse_password = RandomGenerator.alphaNumeric(12);
  const nurse_license = RandomGenerator.alphaNumeric(8);
  const nurse: IHealthcarePlatformNurse.IAuthorized =
    await api.functional.auth.nurse.join(connection, {
      body: {
        email: nurse_email,
        full_name: RandomGenerator.name(),
        license_number: nurse_license,
        password: nurse_password,
        phone: RandomGenerator.mobile(),
        specialty: RandomGenerator.pick(["ICU", "Med/Surg", "ER"] as const),
      } satisfies IHealthcarePlatformNurse.IJoin,
    });
  typia.assert(nurse);

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 3. Medical doctor signup & login
  const doctor_email = typia.random<string & tags.Format<"email">>();
  const doctor_password = RandomGenerator.alphaNumeric(14);
  const doctor: IHealthcarePlatformMedicalDoctor.IAuthorized =
    await api.functional.auth.medicalDoctor.join(connection, {
      body: {
        email: doctor_email,
        full_name: RandomGenerator.name(),
        npi_number: RandomGenerator.alphaNumeric(10),
        password: doctor_password as string & tags.Format<"password">,
        phone: RandomGenerator.mobile(),
        specialty: RandomGenerator.pick([
          "cardiology",
          "general",
          "internal medicine",
        ] as const),
      } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
    });
  typia.assert(doctor);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor_email,
      password: doctor_password as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 4. Patient signup
  const patient_email = typia.random<string & tags.Format<"email">>();
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patient_email,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date("1990-01-01").toISOString() as string &
          tags.Format<"date-time">,
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(15),
      } satisfies IHealthcarePlatformPatient.IJoin,
    });
  typia.assert(patient);

  // 5. Org admin creates patient record for patient
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin_email,
      password: admin_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: admin.id,
          department_id: null,
          patient_user_id: patient.id,
          external_patient_number: null,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Medical doctor creates an encounter for the patient
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctor_email,
      password: doctor_password as string & tags.Format<"password">,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: doctor.id,
          encounter_type: RandomGenerator.pick([
            "office_visit",
            "inpatient_admission",
          ] as const),
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          status: "active",
          notes: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 7. Switch to nurse; nurse requests encounter list for the patient record
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  const encounterList =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {} satisfies IHealthcarePlatformEhrEncounter.IRequest,
      },
    );
  typia.assert(encounterList);
  TestValidator.predicate(
    "encounter list contains the newly created encounter",
    encounterList.data.some(
      (e) => e.id === encounter.id && e.patient_record_id === patientRecord.id,
    ),
  );

  // 8. Negative access: nurse tries accessing a random (non-existent) patientRecordId
  const randomPatientRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "accessing non-existent patient record should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.index(
        connection,
        {
          patientRecordId: randomPatientRecordId,
          body: {} satisfies IHealthcarePlatformEhrEncounter.IRequest,
        },
      );
    },
  );
}
