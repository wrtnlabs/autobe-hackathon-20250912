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
 * E2E test for department head updating and reviewing a patient record
 * amendment. Workflow:
 *
 * 1. Register system admin and login
 * 2. Create a patient record (as admin)
 * 3. Register department head and login
 * 4. Create a patient encounter (as department head)
 * 5. Create an amendment (as department head)
 * 6. Update review status as department head (success: status updates, error: not
 *    reviewer or immutable amendment)
 * 7. Validate success and error conditions (not found, unauthorized, business rule
 *    violations)
 */
export async function test_api_record_amendment_update_review_status_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  // 2. Login as system admin (to ensure session, even if join sets header)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Create patient record as system admin
  const patientRecord: IHealthcarePlatformPatientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: typia.random<string>(),
          department_id: null,
          patient_user_id: typia.random<string>(),
          external_patient_number: RandomGenerator.alphaNumeric(8),
          full_name: RandomGenerator.name(),
          dob: new Date(1980, 4, 5).toISOString() as string &
            tags.Format<"date-time">,
          gender: RandomGenerator.pick(["male", "female", "other"] as const),
          status: "active",
          demographics_json: null,
        } satisfies IHealthcarePlatformPatientRecord.ICreate,
      },
    );
  typia.assert(patientRecord);

  // 4. Register and login department head
  const depHeadEmail = typia.random<string & tags.Format<"email">>();
  const depHeadPassword = RandomGenerator.alphaNumeric(12);
  const depHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: {
        email: depHeadEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: depHeadPassword,
        sso_provider: null,
        sso_provider_key: null,
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    });
  typia.assert(depHead);

  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: depHeadEmail,
      password: depHeadPassword,
      sso_provider: null,
      sso_provider_key: null,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Create encounter for patient
  const encounter: IHealthcarePlatformEhrEncounter =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          provider_user_id: depHead.id,
          encounter_type: "office_visit",
          encounter_start_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          encounter_end_at: null,
          status: "active",
          notes: "Initial encounter for amendment test.",
        } satisfies IHealthcarePlatformEhrEncounter.ICreate,
      },
    );
  typia.assert(encounter);

  // 6. Create amendment (as department head, who is also reviewer on first creation)
  const amendment: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: {
          patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
          submitted_by_user_id: depHead.id,
          reviewed_by_user_id: depHead.id,
          ehr_encounter_id: encounter.id,
          amendment_type: "correction",
          old_value_json: JSON.stringify({ original: "A" }),
          new_value_json: JSON.stringify({ updated: "B" }),
          rationale: "Correct typo in patient allergy record.",
          approval_status: "pending",
        } satisfies IHealthcarePlatformRecordAmendment.ICreate,
      },
    );
  typia.assert(amendment);

  // 7. Update amendment review status (approve it)
  const updatedAmendment: IHealthcarePlatformRecordAmendment =
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.update(
      connection,
      {
        patientRecordId: amendment.patient_record_id,
        recordAmendmentId: amendment.id,
        body: {
          approval_status: "approved",
          rationale: "Verified correction was valid.",
          reviewed_by_user_id: depHead.id,
        } satisfies IHealthcarePlatformRecordAmendment.IUpdate,
      },
    );
  typia.assert(updatedAmendment);
  TestValidator.equals(
    "amendment approval_status updated to approved",
    updatedAmendment.approval_status,
    "approved",
  );
  TestValidator.equals(
    "amendment rationale updated",
    updatedAmendment.rationale,
    "Verified correction was valid.",
  );

  // 8. Error: Not found (invalid patientRecordId or recordAmendmentId)
  await TestValidator.error(
    "returns not found when patientRecordId is bad",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          recordAmendmentId: amendment.id,
          body: {
            approval_status: "rejected",
          } satisfies IHealthcarePlatformRecordAmendment.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "returns not found when recordAmendmentId is bad",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: amendment.patient_record_id,
          recordAmendmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            approval_status: "rejected",
          } satisfies IHealthcarePlatformRecordAmendment.IUpdate,
        },
      );
    },
  );

  // 9. Error: 403 forbidden if not reviewer
  // Create a new department head (not reviewer)
  const otherDepHeadEmail = typia.random<string & tags.Format<"email">>();
  const otherDepHeadPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: otherDepHeadEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: otherDepHeadPassword,
      sso_provider: null,
      sso_provider_key: null,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: otherDepHeadEmail,
      password: otherDepHeadPassword,
      sso_provider: null,
      sso_provider_key: null,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error("returns forbidden when not reviewer", async () => {
    await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.update(
      connection,
      {
        patientRecordId: amendment.patient_record_id,
        recordAmendmentId: amendment.id,
        body: {
          approval_status: "rejected",
        } satisfies IHealthcarePlatformRecordAmendment.IUpdate,
      },
    );
  });

  // 10. Error: 400 if the amendment is already finalized (simulate by passing approved again)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: depHeadEmail,
      password: depHeadPassword,
      sso_provider: null,
      sso_provider_key: null,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });
  await TestValidator.error(
    "returns bad request if amendment is finalized",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.patientRecords.recordAmendments.update(
        connection,
        {
          patientRecordId: amendment.patient_record_id,
          recordAmendmentId: amendment.id,
          body: {
            approval_status: "approved",
          } satisfies IHealthcarePlatformRecordAmendment.IUpdate,
        },
      );
    },
  );
}
