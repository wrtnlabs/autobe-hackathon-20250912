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
 * E2E test for updating a patient record amendment by an organization
 * admin, with business rule validation and negative scenarios.
 *
 * Flow:
 *
 * 1. Register a system admin and log in to create an organization (only system
 *    admin can create an organization).
 * 2. Register organization admin A (who will own/admin the org) and log in as
 *    them.
 * 3. Create a department in this organization.
 * 4. Register a patient and create a patient record in the organization.
 * 5. Create an EHR encounter (provider = org admin A).
 * 6. Register org admin B (who will be the reviewer for the amendment).
 * 7. Create a record amendment for the patient record, using admin B as
 *    reviewer.
 * 8. Update the record amendment to switch the reviewer to admin A, update
 *    rationale, approval_status, and type.
 * 9. Validate the amendment reflects the field changes, and the business logic
 *    for allowed/denied field changes is enforced.
 * 10. Negative tests: (a) attempt update with random/non-existent amendment id,
 *     (b) attempt update with invalid reviewer.
 */
export async function test_api_patient_record_amendment_update_by_organization_admin_e2e(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "sysAdminPass123",
    },
  });
  typia.assert(systemAdmin);

  // 2. Create organization
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(3),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 3. Register org admin A and login
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "adminAPass123",
      },
    },
  );
  typia.assert(orgAdminA);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password: "adminAPass123",
    },
  });

  // 4. Create department
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: organization.id,
        body: {
          healthcare_platform_organization_id: organization.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        },
      },
    );
  typia.assert(department);

  // 5. Register patient
  const patientEmail = typia.random<string & tags.Format<"email">>();
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientEmail,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1980-01-01T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patient);

  // 6. Create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          department_id: department.id,
          patient_user_id: patient.id,
          external_patient_number: null,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: null,
          status: "active",
          demographics_json: null,
        },
      },
    );
  typia.assert(patientRecord);

  // 7. Create EHR encounter (provider = org admin A, ensure tagged ids)
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: typia.assert<string & tags.Format<"uuid">>(
          patientRecord.id!,
        ),
        body: {
          patient_record_id: typia.assert<string & tags.Format<"uuid">>(
            patientRecord.id!,
          ),
          provider_user_id: typia.assert<string & tags.Format<"uuid">>(
            orgAdminA.id!,
          ),
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString(),
          encounter_end_at: null,
          status: "active",
          notes: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(encounter);

  // 8. Register org admin B (reviewer)
  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "adminBPass123",
      },
    },
  );
  typia.assert(orgAdminB);

  // 9. Create record amendment with org admin B as reviewer
  const recordAmendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: typia.assert<string & tags.Format<"uuid">>(
          patientRecord.id!,
        ),
        body: {
          patient_record_id: typia.assert<string & tags.Format<"uuid">>(
            patientRecord.id!,
          ),
          submitted_by_user_id: typia.assert<string & tags.Format<"uuid">>(
            orgAdminA.id!,
          ),
          reviewed_by_user_id: typia.assert<string & tags.Format<"uuid">>(
            orgAdminB.id!,
          ),
          ehr_encounter_id: typia.assert<string & tags.Format<"uuid">>(
            encounter.id!,
          ),
          amendment_type: "correction",
          old_value_json: JSON.stringify({ diagnosis: "old" }),
          new_value_json: JSON.stringify({ diagnosis: "new" }),
          rationale: RandomGenerator.paragraph(),
          approval_status: "pending",
        },
      },
    );
  typia.assert(recordAmendment);

  // 10. Update record amendment: switch reviewer to admin A, change approval, update rationale and type
  const updateBody = {
    reviewed_by_user_id: typia.assert<string & tags.Format<"uuid">>(
      orgAdminA.id!,
    ),
    approval_status: "approved",
    rationale: RandomGenerator.paragraph({ sentences: 2 }),
    amendment_type: "regulatory",
  } satisfies IHealthcarePlatformRecordAmendment.IUpdate;

  const updatedAmendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.update(
      connection,
      {
        patientRecordId: typia.assert<string & tags.Format<"uuid">>(
          patientRecord.id!,
        ),
        recordAmendmentId: typia.assert<string & tags.Format<"uuid">>(
          recordAmendment.id!,
        ),
        body: updateBody,
      },
    );
  typia.assert(updatedAmendment);
  TestValidator.equals(
    "reviewed_by_user_id updated",
    updatedAmendment.reviewed_by_user_id,
    updateBody.reviewed_by_user_id,
  );
  TestValidator.equals(
    "approval_status updated",
    updatedAmendment.approval_status,
    updateBody.approval_status,
  );
  TestValidator.equals(
    "rationale updated",
    updatedAmendment.rationale,
    updateBody.rationale,
  );
  TestValidator.equals(
    "amendment_type updated",
    updatedAmendment.amendment_type,
    updateBody.amendment_type,
  );

  // 11. Negative: update with invalid amendmentId
  await TestValidator.error(
    "invalid recordAmendmentId should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: typia.assert<string & tags.Format<"uuid">>(
            patientRecord.id!,
          ),
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 12. Negative: update with invalid reviewer
  await TestValidator.error("invalid reviewer should error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.update(
      connection,
      {
        patientRecordId: typia.assert<string & tags.Format<"uuid">>(
          patientRecord.id!,
        ),
        recordAmendmentId: typia.assert<string & tags.Format<"uuid">>(
          recordAmendment.id!,
        ),
        body: {
          ...updateBody,
          reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
}
