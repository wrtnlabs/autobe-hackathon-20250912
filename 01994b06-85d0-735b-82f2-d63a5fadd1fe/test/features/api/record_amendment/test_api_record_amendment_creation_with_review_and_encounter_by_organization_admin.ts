import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import type { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Organization admin submits a new patient record amendment, linking it to an
 * encounter and reviewer. Steps:
 *
 * 1. Register and authenticate as systemAdmin (for patient record creation)
 * 2. Register and authenticate as organizationAdmin (for amendment creation)
 * 3. Create a patient record (as systemAdmin)
 * 4. Create an EHR encounter (as organizationAdmin, for the patient record)
 * 5. Submit a record amendment (as orgAdmin) linked to the patient record,
 *    reviewer, and encounter
 * 6. Validate correct linkage and audit trail fields on success
 * 7. Test business errors:
 *
 *    - Invalid reviewer (nonexistent user)
 *    - Invalid encounter (nonexistent encounter)
 *    - Duplicate/conflicting amendment (repeat creation)
 *    - Not permitted for non-orgAdmin session (attempt creation as systemAdmin)
 * 8. Validate proper audit and compliance response for each error.
 */
export async function test_api_record_amendment_creation_with_review_and_encounter_by_organization_admin(
  connection: api.IConnection,
) {
  // ---- SystemAdmin registration and login ----
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoinBody = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdmin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // ---- OrganizationAdmin registration and login ----
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: orgAdminPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinBody },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // ---- SystemAdmin patient record creation ----
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  const patientUserId = typia.random<string & tags.Format<"uuid">>();
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const patientRecordBody = {
    organization_id: organizationId,
    patient_user_id: patientUserId,
    full_name: RandomGenerator.name(),
    dob: new Date(1992, 2, 2).toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  const patientRecord =
    await api.functional.healthcarePlatform.systemAdmin.patientRecords.create(
      connection,
      { body: patientRecordBody },
    );
  typia.assert(patientRecord);

  // ---- OrganizationAdmin encounter creation ----
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const providerUserId = typia.random<string & tags.Format<"uuid">>();
  const encounterBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    provider_user_id: providerUserId,
    encounter_type: "office_visit",
    encounter_start_at: new Date().toISOString(),
    status: "active",
  } satisfies IHealthcarePlatformEhrEncounter.ICreate;
  const encounter =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.encounters.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: encounterBody,
      },
    );
  typia.assert(encounter);

  // ---- Submit record amendment as orgAdmin ----
  const amendmentNewName = RandomGenerator.name();
  const amendmentBody = {
    patient_record_id: patientRecord.id as string & tags.Format<"uuid">,
    submitted_by_user_id: orgAdmin.id as string & tags.Format<"uuid">,
    reviewed_by_user_id: orgAdmin.id as string & tags.Format<"uuid">,
    ehr_encounter_id: encounter.id,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ full_name: patientRecord.full_name }),
    new_value_json: JSON.stringify({ full_name: amendmentNewName }),
    rationale: RandomGenerator.paragraph(),
    approval_status: "pending",
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendment =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
        body: amendmentBody,
      },
    );
  typia.assert(amendment);
  TestValidator.equals(
    "amendment links correct patient record",
    amendment.patient_record_id,
    patientRecord.id,
  );
  TestValidator.equals(
    "amendment submitted_by is correct",
    amendment.submitted_by_user_id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "amendment reviewed_by is set",
    amendment.reviewed_by_user_id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "amendment links to encounter",
    amendment.ehr_encounter_id,
    encounter.id,
  );
  TestValidator.equals(
    "amendment type is set",
    amendment.amendment_type,
    "correction",
  );
  TestValidator.equals(
    "amendment approval_status is pending",
    amendment.approval_status,
    "pending",
  );

  // ---- Error: invalid reviewer id ----
  await TestValidator.error(
    "fails for non-existent reviewed_by_user_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ...amendmentBody,
            reviewed_by_user_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // ---- Error: invalid encounter id ----
  await TestValidator.error(
    "fails for non-existent ehr_encounter_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: {
            ...amendmentBody,
            ehr_encounter_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // ---- Error: conflicting/duplicate amendment ----
  await TestValidator.error(
    "fails for duplicate/conflicting amendment",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: amendmentBody,
        },
      );
    },
  );

  // ---- Error: non-orgAdmin session (try as systemAdmin) ----
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  await TestValidator.error(
    "systemAdmin forbidden for record amendment creation",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecord.id as string & tags.Format<"uuid">,
          body: amendmentBody,
        },
      );
    },
  );
}
