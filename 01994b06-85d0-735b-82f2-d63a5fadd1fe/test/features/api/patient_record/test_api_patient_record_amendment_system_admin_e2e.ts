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
 * E2E test: Update patient record amendment by system admin, including
 * audit/business rule validation.
 *
 * Steps:
 *
 * 1. Register and authenticate as system administrator
 * 2. Create new organization and department
 * 3. Register and login as organization administrator
 * 4. Register new patient and patient record under organization
 * 5. Create a new EHR encounter for this patient record
 * 6. Register secondary system admin for use as a reviewer
 * 7. Create a record amendment (assigning reviewer)
 * 8. Switch back to main sysadmin and update the amendment (change reviewer id,
 *    rationale, status)
 * 9. Assert amendment updates took effect
 * 10. Attempt invalid updates for negative scenarios: invalid patientRecordId,
 *     invalid recordAmendmentId, non-existent reviewer id
 */
export async function test_api_patient_record_amendment_system_admin_e2e(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const joinedSysadmin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: sysadminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(joinedSysadmin);

  const loggedSysadmin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysadminEmail,
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(loggedSysadmin);

  // 2. Create organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(organization);

  // 3. Register and login as organization admin (for resource creation)
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);
  const loggedOrgAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loggedOrgAdmin);

  // 4. Create department
  const departmentInput = {
    healthcare_platform_organization_id: organization.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: departmentInput,
      },
    );
  typia.assert(department);

  // 5. Register a patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patientInput = {
    email: patientEmail,
    full_name: RandomGenerator.name(2),
    date_of_birth: new Date("1984-06-22T00:00:00.000Z").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientInput },
    );
  typia.assert(patient);

  // 6. Create patient record
  const recordInput = {
    organization_id: organization.id,
    department_id: department.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: recordInput },
    );
  typia.assert(patientRecord);

  // 7. Create EHR encounter
  const encounterInput = {
    patient_record_id: patientRecord.id,
    provider_user_id: loggedOrgAdmin.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: encounterInput,
      },
    );
  typia.assert(encounter);

  // 8. Register secondary sysadmin for reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(10);
  const reviewerSysadmin = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: reviewerEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: reviewerEmail,
        password: reviewerPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(reviewerSysadmin);

  // 9. Create record amendment with reviewer
  const amendmentInput = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: loggedOrgAdmin.id,
    reviewed_by_user_id: reviewerSysadmin.id,
    ehr_encounter_id: encounter.id,
    amendment_type: "correction",
    old_value_json: '{"field":"old value"}',
    new_value_json: '{"field":"new value"}',
    rationale: RandomGenerator.paragraph(),
    approval_status: "pending",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: amendmentInput,
      },
    );
  typia.assert(amendment);

  // 10. Switch back to sysadmin and update amendment
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const updateInput = {
    reviewed_by_user_id: joinedSysadmin.id,
    rationale: RandomGenerator.paragraph(),
    approval_status: "approved",
  } satisfies IHealthcarePlatformRecordAmendment.IUpdate;
  const updatedAmendment =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.update(
      connection,
      {
        patientRecordId: patientRecord.id,
        recordAmendmentId: amendment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAmendment);
  TestValidator.equals(
    "reviewer id should be updated",
    updatedAmendment.reviewed_by_user_id,
    joinedSysadmin.id,
  );
  TestValidator.equals(
    "approval status should be updated",
    updatedAmendment.approval_status,
    "approved",
  );

  // 11. Negative cases: invalid IDs and non-existent reviewer
  await TestValidator.error(
    "invalid patientRecordId triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          recordAmendmentId: amendment.id,
          body: updateInput,
        },
      );
    },
  );
  await TestValidator.error(
    "invalid recordAmendmentId triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: patientRecord.id,
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );
  await TestValidator.error(
    "non-existent reviewer triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: patientRecord.id,
          recordAmendmentId: amendment.id,
          body: {
            ...updateInput,
            reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
