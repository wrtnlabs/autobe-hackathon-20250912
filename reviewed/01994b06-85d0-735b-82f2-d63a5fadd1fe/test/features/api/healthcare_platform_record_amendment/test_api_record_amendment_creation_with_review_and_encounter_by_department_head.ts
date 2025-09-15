import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the creation of a record amendment by a department head,
 * referencing a specific encounter and reviewer.
 *
 * 1. Register and log in as System Admin to create a base PatientRecord with
 *    valid organization/patient linkage.
 * 2. Register and log in as Department Head (reviewer) and another Department
 *    Head (submitter).
 * 3. As system admin, create the PatientRecord (for controlled setup).
 * 4. As department head (submitter), create an EHR encounter for the patient
 *    record, assigned to themselves.
 * 5. As department head (submitter), submit a new record amendment referencing
 *    the patient record, the EHR encounter, and designating the other
 *    department head as the reviewer.
 * 6. Success path: Assert amendment creation, amendment references
 *    (patientRecordId, ehr_encounter_id, reviewed_by_user_id), and that
 *    associations are set correctly. (Business logic: The amendment is
 *    present in system, reviewer is correct, links, etc.)
 * 7. Negative path: Attempt the amendment with invalid references (e.g.,
 *    non-existent patientRecordId, bad reviewer user id, invalid encounter
 *    id) and assert failure.
 * 8. Business rule: Attempt a duplicate/conflicting amendment (same data,
 *    encounter, type) and expect error.
 * 9. Authorization: Switch role (e.g., as system admin, as
 *    unauthenticated/empty connection) and attempt amendment
 *    submission—expect authorization error.
 */
export async function test_api_record_amendment_creation_with_review_and_encounter_by_department_head(
  connection: api.IConnection,
) {
  // Step 1: Register and log in as system admin
  const saEmail = typia.random<string & tags.Format<"email">>();
  const saPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: saEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    },
  });
  typia.assert(systemAdmin);

  // Step 2: Register & log in as DEPARTMENT HEADs (reviewer and submitter)
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const reviewer = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: reviewerEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: reviewerPassword,
    },
  });
  typia.assert(reviewer);

  const submitterEmail = typia.random<string & tags.Format<"email">>();
  const submitterPassword = RandomGenerator.alphaNumeric(12);
  const submitter = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: submitterEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: submitterPassword,
    },
  });
  typia.assert(submitter);

  // Log in as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    },
  });

  // Step 3: Create patient record as system admin
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const patientRecordInput = {
    organization_id: typia.random<string>(),
    department_id: null,
    patient_user_id: patientUserId,
    external_patient_number: null,
    full_name: RandomGenerator.name(),
    dob: new Date().toISOString(),
    gender: null,
    status: "active",
    demographics_json: null,
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: patientRecordInput },
    );
  typia.assert(patientRecord);

  // Step 4: Log in as submitter DH and create an EHR encounter
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: submitterEmail,
      password: submitterPassword,
    },
  });
  const encounterInput = {
    patient_record_id: patientRecord.id,
    provider_user_id: submitter.id,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    encounter_end_at: null,
    status: "active",
    notes: RandomGenerator.paragraph(),
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterInput,
      },
    );
  typia.assert(encounter);

  // Step 5: Submit record amendment referencing patientRecord, encounter, reviewer
  const amendmentInput = {
    patient_record_id: patientRecord.id,
    submitted_by_user_id: submitter.id,
    reviewed_by_user_id: reviewer.id,
    ehr_encounter_id: encounter.id,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ medication: "Aspirin" }),
    new_value_json: JSON.stringify({ medication: "Ibuprofen" }),
    rationale: RandomGenerator.paragraph(),
    approval_status: "pending",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: amendmentInput,
      },
    );
  typia.assert(amendment);
  TestValidator.equals(
    "amendment must reference correct patient record",
    amendment.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "amendment must reference correct encounter",
    amendment.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "amendment must have reviewer",
    amendment.reviewed_by_user_id,
    reviewer.id,
  );
  TestValidator.equals(
    "amendment must have correct approval status",
    amendment.approval_status,
    "pending",
  );
  TestValidator.equals(
    "amendment must link to submitter",
    amendment.submitted_by_user_id,
    submitter.id,
  );

  // Step 7: Negative – invalid references (bad patientRecordId/reviewer/encounter)
  await TestValidator.error(
    "should fail on invalid patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: amendmentInput,
        },
      );
    },
  );
  await TestValidator.error("should fail on invalid reviewer id", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ...amendmentInput,
          reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });
  await TestValidator.error("should fail on invalid encounter id", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          ...amendmentInput,
          ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  });

  // Step 8: Business rule – duplicate/conflicting amendment
  await TestValidator.error(
    "should fail on duplicate/conflicting amendment",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: amendmentInput,
        },
      );
    },
  );

  // Step 9: Auth error – try as non-departmentHead (e.g., as system admin)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: saEmail,
      provider: "local",
      provider_key: saEmail,
      password: saPassword,
    },
  });
  await TestValidator.error(
    "should fail as system admin (not department head)",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: amendmentInput,
        },
      );
    },
  );
  // Try with "unauthenticated" connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("should fail as unauthenticated user", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
      unauthConn,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: amendmentInput,
      },
    );
  });
}
