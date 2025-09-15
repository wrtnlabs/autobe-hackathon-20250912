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
 * E2E scenario for nurse creating a new patient record amendment and
 * validating business, edge, and RBAC logic.
 *
 * Steps:
 *
 * 1. Register and login as first organization admin (orgA).
 * 2. Register and login as nurse for orgA.
 * 3. OrgA admin creates a patient and patient record.
 * 4. Switch to nurse (login) and create valid amendment for patient record
 *    (orgA).
 * 5. Validate all fields on amendment, including relationships and meta.
 * 6. Negative test: 404 error when nurse tries to amend non-existent record.
 * 7. Multi-tenant RBAC: Register second admin (orgB), nurse for orgB, create
 *    patient/record in orgB.
 * 8. Switch to orgA nurse and attempt to amend orgB patient record → expect
 *    403 error.
 * 9. All logins use actual password, all type safety is preserved (no as any),
 *    and proper context switching is performed via correct login
 *    endpoints.
 */
export async function test_api_nurse_patientrecord_recordamendment_creation_and_validation(
  connection: api.IConnection,
) {
  // STEP 1: Register and login as orgA admin
  const orgAdminA_pw = RandomGenerator.alphaNumeric(12);
  const orgAdminA_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminA_pw,
      },
    },
  );
  typia.assert(orgAdminA_join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminA_join.email,
      password: orgAdminA_pw,
    },
  });

  // STEP 2: Register and login as nurse for orgA
  const nurseA_pw = RandomGenerator.alphaNumeric(10);
  const nurseA_join = await api.functional.auth.nurse.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      password: nurseA_pw,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(nurseA_join);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseA_join.email,
      password: nurseA_pw,
    },
  });

  // STEP 3: OrgA admin creates patient and record
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminA_join.email,
      password: orgAdminA_pw,
    },
  });
  const patientA =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            Date.now() - 25 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patientA);
  const patientRecordA =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdminA_join.id,
          patient_user_id: patientA.id,
          full_name: patientA.full_name,
          dob: patientA.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecordA);

  // STEP 4: Switch to nurseA, create amendment for patientRecordA
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseA_join.email,
      password: nurseA_pw,
    },
  });

  const amendmentPayloadA = {
    patient_record_id: patientRecordA.id,
    submitted_by_user_id: nurseA_join.id,
    reviewed_by_user_id: null, // no reviewer in this test
    ehr_encounter_id: null,
    amendment_type: "correction",
    old_value_json: JSON.stringify({ allergy: "none" }),
    new_value_json: JSON.stringify({ allergy: "latex" }),
    rationale: RandomGenerator.paragraph({ sentences: 5 }),
    approval_status: null,
  } satisfies IHealthcarePlatformRecordAmendment.ICreate;
  const amendmentA =
    await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.create(
      connection,
      {
        patientRecordId: patientRecordA.id,
        body: amendmentPayloadA,
      },
    );
  typia.assert(amendmentA);
  // Main assertions
  TestValidator.equals(
    "amendment is linked to correct patientRecord",
    amendmentA.patient_record_id,
    patientRecordA.id,
  );
  TestValidator.equals(
    "submitted_by_user_id is nurse id",
    amendmentA.submitted_by_user_id,
    nurseA_join.id,
  );
  TestValidator.equals(
    "reviewed_by_user_id is null",
    amendmentA.reviewed_by_user_id,
    null,
  );
  TestValidator.equals(
    "amendment_type is correct",
    amendmentA.amendment_type,
    amendmentPayloadA.amendment_type,
  );
  TestValidator.equals(
    "old_value_json matches",
    amendmentA.old_value_json,
    amendmentPayloadA.old_value_json,
  );
  TestValidator.equals(
    "new_value_json matches",
    amendmentA.new_value_json,
    amendmentPayloadA.new_value_json,
  );
  TestValidator.equals(
    "rationale matches",
    amendmentA.rationale,
    amendmentPayloadA.rationale,
  );
  TestValidator.equals(
    "approval_status is null",
    amendmentA.approval_status,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(amendmentA.created_at),
  );

  // STEP 5: Error test – 404 when nurse attempts to amend non-existent record
  await TestValidator.error(
    "404 error for non-existent patientRecordId",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ...amendmentPayloadA,
            patient_record_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // STEP 6: Setup orgB (second organization), nurseB, patient/record
  const orgAdminB_pw = RandomGenerator.alphaNumeric(12);
  const orgAdminB_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminB_pw,
      },
    },
  );
  typia.assert(orgAdminB_join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminB_join.email,
      password: orgAdminB_pw,
    },
  });
  const nurseB_pw = RandomGenerator.alphaNumeric(10);
  const nurseB_join = await api.functional.auth.nurse.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      license_number: RandomGenerator.alphaNumeric(10),
      password: nurseB_pw,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(nurseB_join);
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseB_join.email,
      password: nurseB_pw,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminB_join.email,
      password: orgAdminB_pw,
    },
  });
  const patientB =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(
            Date.now() - 35 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          phone: RandomGenerator.mobile(),
        },
      },
    );
  typia.assert(patientB);
  const patientRecordB =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      {
        body: {
          organization_id: orgAdminB_join.id,
          patient_user_id: patientB.id,
          full_name: patientB.full_name,
          dob: patientB.date_of_birth,
          status: "active",
        },
      },
    );
  typia.assert(patientRecordB);

  // STEP 7: Switch back to orgA nurse (simulate that nurseA is trying to amend patientRecordB in orgB)
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurseA_join.email,
      password: nurseA_pw,
    },
  });

  // STEP 8: RBAC – nurseA cannot create amendment for patientRecordB → 403
  await TestValidator.error(
    "403 error when nurseA attempts to amend orgB record",
    async () => {
      await api.functional.healthcarePlatform.nurse.patientRecords.recordAmendments.create(
        connection,
        {
          patientRecordId: patientRecordB.id,
          body: {
            ...amendmentPayloadA,
            patient_record_id: patientRecordB.id,
          },
        },
      );
    },
  );
}
