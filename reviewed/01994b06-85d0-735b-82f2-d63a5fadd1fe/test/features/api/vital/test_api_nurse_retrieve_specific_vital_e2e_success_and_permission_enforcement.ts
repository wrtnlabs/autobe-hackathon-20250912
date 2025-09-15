import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * Validate nurse ability to retrieve a specific vital entry from a patient
 * encounter, and test permission enforcement and boundaries.
 *
 * Scenario steps:
 *
 * 1. System admin joins and logs in
 * 2. Organization admin joins and logs in
 * 3. System admin creates organization
 * 4. Organization admin creates department
 * 5. Nurse joins and logs in
 * 6. Patient joins (creates patient auth user) and organization admin registers
 *    the patient
 * 7. Organization admin creates patient record for the patient
 *    (organization/department assigned)
 * 8. Nurse creates an encounter for the patient record
 * 9. Nurse creates a vital in the encounter
 * 10. Nurse GETs the vital by id and validates data
 * 11. Negative: new nurse in another dept tries same GET and gets forbidden
 * 12. Negative: GET with random vitalId not found
 */
export async function test_api_nurse_retrieve_specific_vital_e2e_success_and_permission_enforcement(
  connection: api.IConnection,
) {
  // (1) SYSADMIN JOIN & LOGIN
  const sysadmin_email = typia.random<string & tags.Format<"email">>();
  const sysadmin_pw = RandomGenerator.alphaNumeric(10);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadmin_email,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_pw,
    },
  });
  typia.assert(sysadmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_pw,
    },
  });

  // (2) ORG ADMIN JOIN & LOGIN
  const orgadmin_email = typia.random<string & tags.Format<"email">>();
  const orgadmin_pw = RandomGenerator.alphaNumeric(10);
  const orgadmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgadmin_email,
        full_name: RandomGenerator.name(),
        password: orgadmin_pw,
      },
    },
  );
  typia.assert(orgadmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_pw,
    },
  });

  // (3) CREATE ORGANIZATION (SYSADMIN)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadmin_email,
      provider: "local",
      provider_key: sysadmin_email,
      password: sysadmin_pw,
    },
  });
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(2),
          status: "active",
        },
      },
    );
  typia.assert(org);

  // (4) ORG ADMIN CREATES DEPARTMENT
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_pw,
    },
  });
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphabets(3).toUpperCase(),
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // (5) NURSE JOIN & LOGIN
  const nurse_email = typia.random<string & tags.Format<"email">>();
  const nurse_pw = RandomGenerator.alphaNumeric(10);
  const nurse_license = RandomGenerator.alphaNumeric(10).toUpperCase();
  const nurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurse_email,
      full_name: RandomGenerator.name(),
      license_number: nurse_license,
      password: nurse_pw,
    },
  });
  typia.assert(nurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_pw,
    },
  });

  // (6) PATIENT JOIN & REGISTERED BY ORG ADMIN
  const patient_email = typia.random<string & tags.Format<"email">>();
  const patient_pw = RandomGenerator.alphaNumeric(10);
  const patient_dob = new Date(1990, 1, 2).toISOString();
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patient_email,
      full_name: RandomGenerator.name(),
      date_of_birth: patient_dob,
      password: patient_pw,
    },
  });
  typia.assert(patient);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_pw,
    },
  });
  const registeredPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patient.email as string & tags.Format<"email">,
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
          phone: patient.phone,
        },
      },
    );
  typia.assert(registeredPatient);

  // (7) ORG ADMIN CREATES PATIENT RECORD
  const record =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: org.id,
          department_id: department.id,
          patient_user_id: patient.id as string,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(record);

  // (8) NURSE LOGIN AND CREATES ENCOUNTER
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse_email,
      password: nurse_pw,
    },
  });
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: record.id as string & tags.Format<"uuid">,
          provider_user_id: nurse.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // (9) NURSE CREATES VITAL
  const vitalType = RandomGenerator.pick([
    "heart_rate",
    "bp_systolic",
    "bp_diastolic",
    "respiratory_rate",
    "temp_c",
    "spo2",
  ] as const);
  const vitalUnits: Record<string, string> = {
    heart_rate: "bpm",
    bp_systolic: "mmHg",
    bp_diastolic: "mmHg",
    respiratory_rate: "bpm",
    temp_c: "C",
    spo2: "%",
  };
  const vitalValue = RandomGenerator.pick([60, 70, 80, 120, 37, 98]);
  const vitalCreate = {
    ehr_encounter_id: encounter.id,
    vital_type: vitalType,
    vital_value: vitalValue,
    unit: vitalUnits[vitalType],
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: vitalCreate,
      },
    );
  typia.assert(vital);

  // (10) NURSE RETRIEVES THE VITAL BY ID
  const vitalFetched =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.at(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        vitalId: vital.id,
      },
    );
  typia.assert(vitalFetched);
  TestValidator.equals(
    "vital fetched matches created vital",
    vitalFetched.id,
    vital.id,
  );
  TestValidator.equals(
    "vital type matches",
    vitalFetched.vital_type,
    vitalType,
  );
  TestValidator.equals(
    "vital value matches",
    vitalFetched.vital_value,
    vitalValue,
  );
  TestValidator.equals(
    "vital units match",
    vitalFetched.unit,
    vitalUnits[vitalType],
  );
  TestValidator.equals(
    "encounter association matches",
    vitalFetched.ehr_encounter_id,
    encounter.id,
  );

  // (11) PERMISSION NEGATIVE: nurse from another department cannot access the vital
  // Create new nurse and department
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgadmin_email,
      password: orgadmin_pw,
    },
  });
  const anotherDept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: org.id,
        body: {
          healthcare_platform_organization_id: org.id,
          code: RandomGenerator.alphabets(3),
          name: RandomGenerator.name(1),
          status: "active",
        },
      },
    );
  typia.assert(anotherDept);

  const otherNurseEmail = typia.random<string & tags.Format<"email">>();
  const otherNursePw = RandomGenerator.alphaNumeric(10);
  const otherNurseLicense = RandomGenerator.alphaNumeric(10).toUpperCase();
  const otherNurse = await api.functional.auth.nurse.join(connection, {
    body: {
      email: otherNurseEmail,
      full_name: RandomGenerator.name(),
      license_number: otherNurseLicense,
      password: otherNursePw,
    },
  });
  typia.assert(otherNurse);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: otherNurseEmail,
      password: otherNursePw,
    },
  });
  await TestValidator.error(
    "access forbidden for nurse from a different department",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.at(
        connection,
        {
          patientRecordId: record.id as string & tags.Format<"uuid">,
          encounterId: encounter.id,
          vitalId: vital.id,
        },
      );
    },
  );

  // (12) NEGATIVE: GET with random vitalId returns not-found
  await TestValidator.error("not found for invalid vitalId", async () => {
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.at(
      connection,
      {
        patientRecordId: record.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        vitalId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
