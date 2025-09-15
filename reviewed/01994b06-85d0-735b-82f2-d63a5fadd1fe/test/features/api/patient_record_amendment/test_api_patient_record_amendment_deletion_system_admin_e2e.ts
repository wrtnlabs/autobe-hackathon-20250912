import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin deletion of a patient record amendment.
 *
 * Steps:
 *
 * 1. System admin registration & login.
 * 2. Org admin registration & login.
 * 3. System admin creates org; org admin creates dept.
 * 4. Org admin registers patient and patient record.
 * 5. Org admin registers an EHR encounter.
 * 6. Org admin creates amendment referencing encounter, patient record, self as
 *    submitter.
 * 7. System admin logs in and deletes the amendment.
 * 8. Try to delete again (edge: already deleted).
 */
export async function test_api_patient_record_amendment_deletion_system_admin_e2e(
  connection: api.IConnection,
) {
  // 1. System admin registration/login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "P@ssw0rd!",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdminJoin);

  // 2. Organization admin registration/login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: "Admin123!",
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: orgAdminEmail,
      },
    },
  );
  typia.assert(orgAdminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "P@ssw0rd!",
    },
  });

  // 3. System admin creates organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 4. Org admin login (context switch)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: "Admin123!",
    },
  });

  // 5. Org admin creates department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 6. Register patient, record
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            1980 + Math.floor(Math.random() * 40),
            0,
            1,
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          department_id: department.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: null,
          status: "active",
        },
      },
    );
  typia.assert(patientRecord);

  // 7. Register EHR encounter
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          provider_user_id: orgAdminJoin.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          status: "active",
        },
      },
    );
  typia.assert(encounter);

  // 8. Org admin creates record amendment
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          submitted_by_user_id: orgAdminJoin.id,
          ehr_encounter_id: encounter.id,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ prev: "A" }),
          new_value_json: JSON.stringify({ prev: "B" }),
          rationale: RandomGenerator.paragraph(),
          reviewed_by_user_id: null,
        },
      },
    );
  typia.assert(amendment);

  // 9. System admin logs in again
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: "P@ssw0rd!",
    },
  });

  // 10. System admin deletes the amendment
  await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.erase(
    connection,
    {
      patientRecordId: patientRecord.id,
      recordAmendmentId: amendment.id,
    },
  );

  // 11. Attempt to delete again (should error)
  await TestValidator.error(
    "deleting already deleted amendment returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.erase(
        connection,
        {
          patientRecordId: patientRecord.id,
          recordAmendmentId: amendment.id,
        },
      );
    },
  );
}
