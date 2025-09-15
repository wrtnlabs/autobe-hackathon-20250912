import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";

/**
 * Test PATCH update on patient record amendments as a system admin. This test
 * covers authentication context, creation of all necessary user and patient
 * entities, amendment creation and update workflows, and multiple edge case
 * scenarios involving invalid access and business rule enforcement.
 *
 * Steps:
 *
 * 1. Organization and system admin join workflows and logins for both admin types
 * 2. Organization admin creates a patient, then a record for the patient
 * 3. Organization admin creates an amendment for the patient record
 * 4. System admin triggers PATCH (index) on the amendment (API only supports
 *    index/list, so validate correct authorization/context on search)
 * 5. Golden path: get amendments for patient record as system admin (should
 *    include at least the amendment)
 * 6. Edge 1: Try with missing reviewed_by_user_id in filter (should still be
 *    allowed)
 * 7. Edge 2: Try with invalid patientRecordId
 * 8. Edge 3: Try to filter by a reviewer from an unrelated organization admin
 *    (should return empty or forbidden depending on permissions)
 * 9. Edge 4: Simulate amendment is finalized (approval_status not pending), check
 *    index API still returns correct state ("finalized" is not an allowed
 *    status, so simulate with status=approved and rationale)
 * 10. No direct way to test legal hold without an explicit status/flag property
 * 11. (No API to validate audit/compliance logs, but can check response structure
 *     includes expected fields.)
 */
export async function test_api_patient_record_amendment_update_system_admin_authorization_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Organization and system admin registration
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = "OrgAdmin123!";
  const sysAdminPassword = "SysAdmin123!";

  // Organization admin join/login
  const orgAdminAuth = await api.functional.auth.organizationAdmin.join(
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
  typia.assert(orgAdminAuth);

  // System admin join/login
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminAuth);

  // 2. Create patient & record as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            RandomGenerator.date(
              new Date(1970, 0, 1),
              1000 * 60 * 60 * 24 * 365 * 50,
            ),
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // Create patient record
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdminAuth.id,
          department_id: undefined,
          patient_user_id: patient.id,
          full_name: patient.full_name,
          dob: patient.date_of_birth,
          gender: undefined,
          status: "active",
          demographics_json: undefined,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 3. Create amendment (as org admin)
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          submitted_by_user_id: orgAdminAuth.id,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ data: "before" }),
          new_value_json: JSON.stringify({ data: "after" }),
          rationale: "Initial correction rationale",
          approval_status: "pending",
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(amendment);

  // 4. Golden path as system admin: Login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // List amendments for patient record
  const amendmentPage =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          amendment_type: "correction",
          approval_status: undefined,
          reviewed_by_user_id: undefined,
          page: 0,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(amendmentPage);
  TestValidator.predicate(
    "amendment exists in index, system admin can view",
    amendmentPage.data.some((a) => a.id === amendment.id),
  );

  // 5. Edge: Missing reviewed_by_user_id filter - already done above (should work, as it's optional)
  // 6. Edge: Invalid patientRecordId
  await TestValidator.error("invalid patientRecordId should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: typia.random<string & tags.Format<"uuid">>(), // Random UUID not created
        body: {
          amendment_type: "correction",
          approval_status: undefined,
          reviewed_by_user_id: undefined,
          page: 0,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  });

  // 7. Edge: reviewed_by_user_id set to unrelated admin's id
  // Create another admin in a different org context
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2Password = "OrgAdmin456!";
  const orgAdmin2Auth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdmin2Password,
        provider: "local",
        provider_key: orgAdmin2Email,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2Auth);

  // As system admin, filter by unrelated reviewed_by_user_id
  const unrelatedPage =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          amendment_type: "correction",
          approval_status: undefined,
          reviewed_by_user_id: orgAdmin2Auth.id,
          page: 0,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(unrelatedPage);
  TestValidator.equals(
    "no results for unrelated reviewer filter",
    unrelatedPage.data.length,
    0,
  );

  // 8. Edge: Simulate amendment is finalized (set approval_status as 'approved')
  // (Since amendment creation API allows specifying approval_status, create one as 'approved')
  const amendment2 =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          patient_record_id: patientRecord.id,
          submitted_by_user_id: orgAdminAuth.id,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ data: "abc" }),
          new_value_json: JSON.stringify({ data: "xyz" }),
          rationale: "Finalize amendment",
          approval_status: "approved",
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );

  typia.assert(amendment2);

  // As system admin, list with approval_status=approved
  const finalPage =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          approval_status: "approved",
          page: 0,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(finalPage);
  TestValidator.predicate(
    "finalized (approved) amendment appears in index",
    finalPage.data.some((a) => a.id === amendment2.id),
  );

  // 9. No direct way to simulate legal hold (as no property for that on amendment/record DTO)
  // 10. Check amendment response structure for audit fields
  TestValidator.predicate(
    "amendment record includes audit fields",
    "id" in amendment &&
      "created_at" in amendment &&
      "amendment_type" in amendment &&
      typeof amendment.created_at === "string",
  );
}
