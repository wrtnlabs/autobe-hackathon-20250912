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
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";

/**
 * Validates nurse's ability to delete a vital sign entry for a patient
 * encounter, enforcing RBAC, audit, and data scope. Scenario creates nurse,
 * system admin, organization admin accounts; then an organization, department,
 * patient record, and encounter. Nurse creates a vital, then deletes it. Test
 * validates permission, effect of delete, rejection of repeated/non-existent
 * vital deletion, and correct role/context switching. All dependencies created
 * programmatically for isolation and repeatability.
 */
export async function test_api_vital_delete_by_nurse_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminCred = {
    email: `sysadmin.${RandomGenerator.alphaNumeric(8)}@company.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: "local",
    password: "password",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminCred,
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminCred.email,
      provider: "local",
      provider_key: "local",
      password: "password",
    },
  });

  // 2. System admin creates organization
  const orgInput = {
    code: `ORG${RandomGenerator.alphaNumeric(6)}`,
    name: `${RandomGenerator.name()} Medical Center`,
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(org);

  // 3. Register and login as organization admin
  const orgAdminCred = {
    email: `orgadmin.${RandomGenerator.alphaNumeric(8)}@company.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "password",
    provider: "local",
    provider_key: "local",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  await api.functional.auth.organizationAdmin.join(connection, {
    body: orgAdminCred,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCred.email,
      password: "password",
      provider: "local",
      provider_key: "local",
    },
  });

  // 4. Organization admin creates department
  const deptInput = {
    healthcare_platform_organization_id: org.id,
    code: `DPT${RandomGenerator.alphaNumeric(4)}`,
    name: `${RandomGenerator.name()} Ward`,
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const dept =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      { organizationId: org.id, body: deptInput },
    );
  typia.assert(dept);

  // 5. Create nurse account and login as nurse
  const nurseCred = {
    email: `nurse.${RandomGenerator.alphaNumeric(8)}@company.com`,
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(8),
    specialty: RandomGenerator.paragraph({ sentences: 1 }),
    phone: RandomGenerator.mobile(),
    password: "password",
  } satisfies IHealthcarePlatformNurse.IJoin;
  await api.functional.auth.nurse.join(connection, { body: nurseCred });
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseCred.email, password: "password" },
  });

  // 6. Organization admin creates patient record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminCred.email,
      password: "password",
      provider: "local",
      provider_key: "local",
    },
  });
  const patientUserId = typia.random<string>(); // Simulate unique patient user id
  const patientInput = {
    organization_id: org.id,
    department_id: dept.id,
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date("1985-01-01T00:00:00.000Z").toISOString(),
    gender: "female",
    status: "active",
    demographics_json: JSON.stringify({ language: "en", ethnicity: "Other" }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientInput },
    );
  typia.assert(patientRecord);

  // 7. Login as nurse for encounter/vital creation
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseCred.email, password: "password" },
  });
  // 8. Nurse creates encounter for patient record
  const encounterInput = {
    patient_record_id: patientRecord.id,
    provider_user_id: typia.random<string & tags.Format<"uuid">>(),
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      { patientRecordId: patientRecord.id, body: encounterInput },
    );
  typia.assert(encounter);

  // 9. Create vital sign for this encounter
  const vitalInput = {
    ehr_encounter_id: encounter.id,
    vital_type: RandomGenerator.pick([
      "heart_rate",
      "temp_c",
      "bp_systolic",
      "bp_diastolic",
    ]),
    vital_value: 120,
    unit: RandomGenerator.pick(["bpm", "C", "mmHg"]),
    measured_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformVital.ICreate;
  const vital =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        encounterId: encounter.id,
        body: vitalInput,
      },
    );
  typia.assert(vital);

  // 10. Delete vital as nurse
  await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.erase(
    connection,
    {
      patientRecordId: patientRecord.id,
      encounterId: encounter.id,
      vitalId: vital.id,
    },
  );

  // 11. Try deleting again: should fail (already deleted)
  await TestValidator.error(
    "attempt to delete already deleted vital should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.erase(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          vitalId: vital.id,
        },
      );
    },
  );

  // 12. Try deleting non-existent vital
  await TestValidator.error(
    "attempt to delete non-existent vital should fail",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.erase(
        connection,
        {
          patientRecordId: patientRecord.id,
          encounterId: encounter.id,
          vitalId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
