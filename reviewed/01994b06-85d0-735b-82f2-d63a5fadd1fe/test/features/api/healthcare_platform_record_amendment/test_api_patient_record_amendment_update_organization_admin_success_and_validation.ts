import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";

/**
 * Test filtering and retrieval of patient record amendments as an
 * organization admin, verifying search and audit trace logic.
 *
 * 1. Organization admin authentication (join).
 * 2. Create a patient.
 * 3. Create a patient record for that patient.
 * 4. Create one or more record amendments for that patient record.
 * 5. Use PATCH (index/filter) with approval_status and reviewed_by_user_id as
 *    filters to confirm proper search and pagination. (This API does not
 *    update records, but supports advanced filtering for
 *    audit/compliance.)
 * 6. Confirm filtered results contain (or do not contain) amendments as
 *    expected.
 * 7. Negative: PATCH with a non-existent reviewed_by_user_id UUID -- expect
 *    empty array, not error.
 * 8. Negative: PATCH with approval_status not matching any amendment -- expect
 *    empty array, not error.
 * 9. Perform general audit search with no filter and verify all amendments are
 *    present.
 */
export async function test_api_patient_record_amendment_update_organization_admin_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Authenticate as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      password: "Str0ng!Pa55w0rd",
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(admin);

  // 2. Create a patient
  const patientReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(1980, 4, 15).toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientReq },
    );
  typia.assert(patient);

  // 3. Create a patient record
  const recordReq = {
    organization_id: admin.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: recordReq },
    );
  typia.assert(patientRecord);

  // 4. Create record amendments
  const amendment1Req = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: admin.id,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ full_name: patient.full_name }),
    new_value_json: JSON.stringify({ full_name: RandomGenerator.name() }),
    rationale: "Correction to full name.",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment1 =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      { patientRecordId: patientRecord.id, body: amendment1Req },
    );
  typia.assert(amendment1);

  const amendment2Req = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: admin.id,
    amendment_type: "regulatory",
    old_value_json: JSON.stringify({ dob: patient.date_of_birth }),
    new_value_json: JSON.stringify({
      dob: new Date(1981, 1, 20).toISOString(),
    }),
    rationale: "Correction to date of birth per external regulator.",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment2 =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      { patientRecordId: patientRecord.id, body: amendment2Req },
    );
  typia.assert(amendment2);

  // 5. Use PATCH as index with reviewer filter (no reviewer yet, so expect empty)
  const reviewerFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          reviewed_by_user_id: admin.id,
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(reviewerFilter);
  TestValidator.equals(
    "no amendments reviewed by admin yet",
    reviewerFilter.data.length,
    0,
  );

  // 6. Use PATCH with approval_status filter (none set on creation, expect empty)
  const approvalFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          approval_status: "approved",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(approvalFilter);
  TestValidator.equals(
    "no amendments approved yet",
    approvalFilter.data.length,
    0,
  );

  // 7. Negative: Filter with non-existent reviewer UUID
  const bogusReviewerId = typia.random<string & tags.Format<"uuid">>();
  const bogusReviewerFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          reviewed_by_user_id: bogusReviewerId,
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(bogusReviewerFilter);
  TestValidator.equals(
    "no amendments for bogus reviewer",
    bogusReviewerFilter.data.length,
    0,
  );

  // 8. Negative: Filter for approval_status that does not exist
  const bogusApprovalStatusFilter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {
          approval_status: "bogus-status-value",
        } satisfies IHealthcarePlatformRecordAmendment.IRequest,
      },
    );
  typia.assert(bogusApprovalStatusFilter);
  TestValidator.equals(
    "no amendments for bogus status",
    bogusApprovalStatusFilter.data.length,
    0,
  );

  // 9. General audit search (all amendments present)
  const allAmendments =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.index(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: {},
      },
    );
  typia.assert(allAmendments);
  TestValidator.predicate(
    "both amendments present in audit trail",
    allAmendments.data.some((a) => a.id === amendment1.id) &&
      allAmendments.data.some((a) => a.id === amendment2.id),
  );
}
