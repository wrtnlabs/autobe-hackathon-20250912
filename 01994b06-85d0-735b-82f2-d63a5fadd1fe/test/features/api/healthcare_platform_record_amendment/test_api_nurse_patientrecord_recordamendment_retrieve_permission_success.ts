import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";

/**
 * Validate nurse RBAC access to a patient record amendment for which the
 * nurse is assigned.
 *
 * Flow:
 *
 * 1. Register nurse and login.
 * 2. Register organization admin and login.
 * 3. As admin, create a patient.
 * 4. As admin, create a patient record for this patient.
 * 5. As nurse, create a record amendment on the patient record (with correct
 *    nurse associations).
 * 6. As nurse, use the nurse-facing API to retrieve the amendment record by
 *    patientRecordId and recordAmendmentId.
 * 7. Validate that the response has all expected amendment fields (assignment,
 *    record linkage, submitted/reviewed-by-user-ids, JSON blobs, rationale,
 *    etc).
 * 8. Confirm all PHI is delivered and RBAC has allowed access (no error,
 *    correct attributes).
 */
export async function test_api_nurse_patientrecord_recordamendment_retrieve_permission_success(
  connection: api.IConnection,
) {
  // 1. Register nurse
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nursePassword = RandomGenerator.alphaNumeric(10);
  const nurseLicense = RandomGenerator.alphaNumeric(8);
  const nurseJoinBody = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    password: nursePassword,
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurseAuth = await api.functional.auth.nurse.join(connection, {
    body: nurseJoinBody,
  });
  typia.assert(nurseAuth);

  // Switch to admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuth);

  // 3. As admin, add patient
  const patientCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date(2000, 0, 1).toISOString(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: patientCreateBody,
      },
    );
  typia.assert(patient);

  // 4. As admin, create patient record
  const patientRecordCreateBody = {
    organization_id: adminAuth.id,
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: patientRecordCreateBody,
      },
    );
  typia.assert(patientRecord);

  // Switch to nurse context (login)
  await api.functional.auth.nurse.login(connection, {
    body: { email: nurseEmail, password: nursePassword },
  });

  // 5. As nurse, create record amendment on the given record (nurse is submitter and reviewer)
  const recAmendmentCreateBody = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: nurseAuth.id,
    reviewed_by_user_id: nurseAuth.id,
    amendment_type: "correction",
    old_value_json: JSON.stringify({
      field: "name",
      value: patientRecord.full_name,
    }),
    new_value_json: JSON.stringify({
      field: "name",
      value: RandomGenerator.name(),
    }),
    rationale: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const recordAmendment =
    await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id,
        body: recAmendmentCreateBody,
      },
    );
  typia.assert(recordAmendment);

  // 6. As nurse, retrieve the record amendment
  const retrieved =
    await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.at(
      connection,
      {
        patientRecordId: patientRecord.id,
        recordAmendmentId: recordAmendment.id,
      },
    );
  typia.assert(retrieved);

  // 7. Validate linkage and PHI fields assignment
  TestValidator.equals(
    "Amendment ID matches",
    retrieved.id,
    recordAmendment.id,
  );
  TestValidator.equals(
    "Patient record association",
    retrieved.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "Submitter nurse relationship",
    retrieved.submitted_by_user_id,
    nurseAuth.id,
  );
  TestValidator.equals(
    "Reviewer nurse relationship",
    retrieved.reviewed_by_user_id,
    nurseAuth.id,
  );
  TestValidator.equals(
    "Rationale matches",
    retrieved.rationale,
    recAmendmentCreateBody.rationale,
  );
  TestValidator.equals(
    "Amendment type matches",
    retrieved.amendment_type,
    recAmendmentCreateBody.amendment_type,
  );
  TestValidator.equals(
    "Old value JSON matches",
    retrieved.old_value_json,
    recAmendmentCreateBody.old_value_json,
  );
  TestValidator.equals(
    "New value JSON matches",
    retrieved.new_value_json,
    recAmendmentCreateBody.new_value_json,
  );
}
