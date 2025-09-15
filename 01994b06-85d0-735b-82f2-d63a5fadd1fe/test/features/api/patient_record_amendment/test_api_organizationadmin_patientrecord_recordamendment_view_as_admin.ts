import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";

/**
 * Validate organization admin can view a patient record amendment, and proper
 * error handling.
 *
 * Steps:
 *
 * 1. Register and login as organization admin
 * 2. Register a patient
 * 3. Create patient record
 * 4. Add a record amendment for the record
 * 5. Retrieve the amendment and validate the returned record
 * 6. Try to retrieve with a random (non-existent) amendment ID and expect error
 *    response
 * 7. Try with a random (non-existent) patientRecordId and expect error response
 */
export async function test_api_organizationadmin_patientrecord_recordamendment_view_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "passw0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 2: Register a patient
  const patientBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-01-01").toISOString(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.ICreate;
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      { body: patientBody },
    );
  typia.assert(patient);

  // Step 3: Create patient record
  const recordBody = {
    organization_id: admin.id, // Use admin's organization for RBAC
    patient_user_id: patient.id,
    full_name: patient.full_name,
    dob: patient.date_of_birth,
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const record =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: recordBody },
    );
  typia.assert(record);

  // Step 4: Add a record amendment for the record
  const amendmentBody = {
    patient_record_id: record.id,
    submitted_by_user_id: admin.id,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ some: "oldValue" }),
    new_value_json: JSON.stringify({ some: "newValue" }),
    rationale: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      { patientRecordId: record.id, body: amendmentBody },
    );
  typia.assert(amendment);

  // Step 5: Retrieve the amendment by admin
  const output =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.at(
      connection,
      { patientRecordId: record.id, recordAmendmentId: amendment.id },
    );
  typia.assert(output);
  TestValidator.equals(
    "retrieved amendment matches created amendment",
    output,
    amendment,
    (key) => key === "created_at",
  );

  // Step 6: Try with a random (non-existent) amendment ID
  await TestValidator.error(
    "retrieving with nonexistent recordAmendmentId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: record.id,
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 7: Try with a random (non-existent) patientRecordId
  await TestValidator.error(
    "retrieving with nonexistent patientRecordId returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.at(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          recordAmendmentId: amendment.id,
        },
      );
    },
  );
}
