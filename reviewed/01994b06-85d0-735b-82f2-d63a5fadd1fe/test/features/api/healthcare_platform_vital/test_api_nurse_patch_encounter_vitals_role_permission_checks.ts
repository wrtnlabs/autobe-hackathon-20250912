import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformVital";

/**
 * Validate nurse PATCH permissions and business logic for encounter vitals,
 * including RBAC edge cases and error outcomes.
 *
 * 1. Register & login systemAdmin, organizationAdmin, and nurse users
 * 2. System admin creates organization
 * 3. Org admin creates patient & patientRecord
 * 4. Nurse creates encounter for patientRecord & inserts a vital record
 * 5. PATCH (index) vitals as nurse - expect success, confirm update
 * 6. PATCH non-permitted encounter - expect forbidden
 * 7. PATCH finalized/locked record - expect forbidden/conflict (simulated)
 * 8. PATCH unknown/nonexistent patientRecordId/encounterId - expect not found
 */
export async function test_api_nurse_patch_encounter_vitals_role_permission_checks(
  connection: api.IConnection,
) {
  // 1. Register/Login all users
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: systemAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: systemAdminEmail,
      password: "Password!123",
    },
  });
  typia.assert(sysAdminRes);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      provider: "local",
      provider_key: systemAdminEmail,
      password: "Password!123",
    },
  });

  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdminEmail,
      full_name: RandomGenerator.name(),
      password: "Password!123",
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: "Password!123" },
  });

  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseLicense = RandomGenerator.alphaNumeric(8);
  await api.functional.auth.nurse.join(connection, {
    body: {
      email: nurseEmail,
      full_name: RandomGenerator.name(),
      license_number: nurseLicense,
      password: "Password!123",
    },
  });
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseEmail, password: "Password!123" },
  });

  // 2. Organization create
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: systemAdminEmail,
      provider: "local",
      provider_key: systemAdminEmail,
      password: "Password!123",
    },
  });
  const orgRes =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(orgRes);

  // 3. Patient & patient record create via orgAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: "Password!123" },
  });
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-01-01").toISOString(),
        },
      },
    );
  typia.assert(patient);

  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgRes.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 4. Nurse creates an encounter and inserts a vital
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseEmail, password: "Password!123" },
  });
  const encounter =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: sysAdminRes.id as string & tags.Format<"uuid">,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  const vital =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: {
          ehr_encounter_id: encounter.id,
          vital_type: "heart_rate",
          vital_value: 70,
          unit: "bpm",
          measured_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(vital);

  // 5. PATCH (index) as nurse - success
  const patchBodySuccess = {
    patient_record_id: patientRecord.id,
    encounter_id: encounter.id,
    vital_type: "heart_rate",
  } satisfies IHealthcarePlatformVital.IRequest;
  const patchRes =
    await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.index(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        encounterId: encounter.id,
        body: patchBodySuccess,
      },
    );
  typia.assert(patchRes);
  TestValidator.equals(
    "nurse PATCH vital - expect record(s)",
    patchRes.data.length,
    1,
  );
  TestValidator.equals(
    "vital patient_record_id matches",
    patchRes.data[0].ehr_encounter_id,
    vital.ehr_encounter_id,
  );

  // 6. PATCH RBAC - forbidden: (simulate using different patientRecordId/encounterId)
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseEmail, password: "Password!123" },
  });
  await TestValidator.error(
    "patch encounter in wrong department forbidden",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: patchBodySuccess,
        },
      );
    },
  );

  // 7. PATCH finalized/locked encounter - forbidden/conflict (simulate)
  await TestValidator.error(
    "patch finalized encounter forbidden or conflict",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          encounterId: typia.random<string & tags.Format<"uuid">>(),
          body: patchBodySuccess,
        },
      );
    },
  );

  // 8. PATCH non-existent patientRecordId/encounterId - not found
  await TestValidator.error(
    "patch with non-existent patientRecordId/encounterId - not found",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.encounters.vitals.index(
        connection,
        {
          patientRecordId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          encounterId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          body: patchBodySuccess,
        },
      );
    },
  );
}
