import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";

/**
 * Validate RBAC and data boundaries for department head viewing record
 * amendments.
 *
 * Scenario steps:
 *
 * 1. Organization admin joins and logs in (creates org scope).
 * 2. Department head joins and logs in (same org/department as admin, if
 *    possible).
 * 3. Org admin creates a patient.
 * 4. Org admin creates a patient record for that patient.
 * 5. Org admin creates a record amendment on the patient record.
 * 6. Department head logs in (role switch), retrieves the record amendment via
 *    departmentHead endpoint.
 * 7. Validate that the returned amendment matches the one created (id,
 *    patientRecordId, content match, etc).
 * 8. Test error: use wrong patientRecordId (random unrelated uuid) -> expect
 *    error.
 * 9. Test error: use wrong amendmentId (random unrelated uuid) -> expect
 *    error.
 * 10. Test RBAC: department head tries viewing amendment for a record that is
 *     outside their department (if org structure supports, else skip).
 * 11. (if business rules allow) Finalize/archive the amendment and check that
 *     department head can still view, or confirm access is properly
 *     restricted.
 * 12. Optionally validate that audit logging is triggered (purely
 *     comment/placeholder as audit trail may not be directly visible).
 */
export async function test_api_department_head_record_amendment_view_permissions_and_data(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Register and login as department head
  const headEmail = typia.random<string & tags.Format<"email">>();
  const headPassword = RandomGenerator.alphaNumeric(12);
  const headJoin = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: headEmail,
      full_name: RandomGenerator.name(),
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(headJoin);

  // 3. Login as org admin (role switch for API session)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create patient as org admin
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-06-15").toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // 5. Create patient record as org admin
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 6. Create record amendment as org admin
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          submitted_by_user_id: adminJoin.id as string & tags.Format<"uuid">,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ field: "old value" }),
          new_value_json: JSON.stringify({ field: "new value" }),
          rationale: RandomGenerator.paragraph(),
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(amendment);

  // 7. Login as department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 8. Retrieve the amendment as department head
  const got =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.at(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(got);
  TestValidator.equals("amendment id matches", got.id, amendment.id);
  TestValidator.equals(
    "patientRecordId matches",
    got.patient_record_id,
    amendment.patient_record_id,
  );
  TestValidator.equals("rationale matches", got.rationale, amendment.rationale);

  // 9. Error: Not found with wrong patientRecordId
  await TestValidator.error(
    "invalid patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 10. Error: Not found with wrong recordAmendmentId
  await TestValidator.error(
    "invalid recordAmendmentId returns error",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 11. RBAC: attempt viewing amendment for unrelated record
  const unrelatedRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: adminJoin.id,
          patient_user_id: typia.random<string & tags.Format<"uuid">>(),
          full_name: RandomGenerator.name(),
          dob: new Date("1985-10-24").toISOString(),
          status: "active",
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );

  await TestValidator.error(
    "department head forbidden to view unrelated recordAmendment",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: unrelatedRecord.id as string & tags.Format<"uuid">,
          recordAmendmentId: amendment.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
  // 12. (if record amendment can be finalized/archived, would test view; omitted as no such API in DTO)
  // 13. (audit log: assumed system handles this, cannot verify from test directly)
}
