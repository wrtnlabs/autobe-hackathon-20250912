import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";

/**
 * End-to-end basic encounter creation/query for medical doctor role.
 *
 * 1. Setup an organization admin and login.
 * 2. Use org admin to create a patient record for a new patient.
 * 3. Register and login as a medical doctor.
 * 4. Register a patient.
 * 5. Org admin creates patient record for patient.
 * 6. Medical doctor creates encounter for the patient record.
 * 7. Doctor queries encounters for that patient -- must see created encounter
 *    returned.
 */
export async function test_api_medicaldoctor_patientrecord_encounter_e2e_basic_successful_creation_and_query(
  connection: api.IConnection,
) {
  // 1. Create org admin + login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Register doctor & login
  const doctorEmail = typia.random<string & tags.Format<"email">>();
  const doctorPassword = RandomGenerator.alphaNumeric(10);
  const doctorNPI = RandomGenerator.alphaNumeric(10);
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: {
      email: doctorEmail,
      full_name: RandomGenerator.name(),
      npi_number: doctorNPI,
      password: doctorPassword,
      phone: RandomGenerator.mobile(),
      // specialty omitted
    } satisfies IHealthcarePlatformMedicalDoctor.IJoin,
  });
  typia.assert(doctor);

  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 3. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientPassword = RandomGenerator.alphaNumeric(10);
  const patientDOB = new Date(
    Date.now() - 3600 * 24 * 365 * 30 * 1000,
  ).toISOString();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: patientDOB,
      phone: RandomGenerator.mobile(),
      password: patientPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patient);

  // 4. Switch to org admin & create patient record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const createPatientRecordBody = {
    organization_id: orgAdmin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;

  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: createPatientRecordBody,
      },
    );
  typia.assert(patientRecord);

  // 5. Switch doctor context
  await api.functional.auth.medicalDoctor.login(connection, {
    body: {
      email: doctorEmail,
      password: doctorPassword,
    } satisfies IHealthcarePlatformMedicalDoctor.ILogin,
  });

  // 6. Doctor creates an encounter
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: doctor.id,
    encounter_type: RandomGenerator.pick([
      "office_visit",
      "inpatient_admission",
      "telemedicine",
      "emergency",
      "consultation",
    ] as const),
    encounter_start_at: new Date().toISOString(),
    status: "active",
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);

  // 7. Query encounters with PATCH
  const queryPage =
    await api.functional.healthcarePlatform.medicalDoctor.patientRecords.encounters.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {},
      },
    );
  typia.assert(queryPage);

  const found = queryPage.data.find((e) => e.id === encounter.id);
  TestValidator.predicate(
    "Created encounter appears in encounter index",
    !!found,
  );
}
