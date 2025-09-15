import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";

/**
 * End-to-end workflow for creation of a patient record by an organization
 * admin, testing duplicate and error cases and audit compliance.
 *
 * 1. Register a new organization admin and login.
 * 2. Prepare simulated patient user context and demographic data.
 * 3. Create a new patient record with valid data and validate response.
 * 4. Attempt duplicate creation and verify rejection per uniqueness rule.
 * 5. Audit metadata (created_at/updated_at) is asserted in the returned entity.
 */
export async function test_api_create_patient_record_workflow_and_audit(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "SuperSecret!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  TestValidator.predicate(
    "admin id is uuid",
    typeof adminJoin.id === "string" && adminJoin.id.length > 0,
  );

  // 2. Login as organization admin
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "SuperSecret!123",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);
  TestValidator.equals("admin email matches", adminLogin.email, adminEmail);
  const orgId = adminLogin.id;

  // 3. Simulate onboarding a new patient user (simulate random UUID for existing user)
  const patientUserId: string = typia.random<string & tags.Format<"uuid">>();
  // department_id is optional; occasionally test null, sometimes omit.
  const patientDepartmentId: string | null =
    Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const patientRecordBody = {
    organization_id: orgId,
    department_id: patientDepartmentId,
    patient_user_id: patientUserId,
    external_patient_number: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    dob: new Date(
      1990 + Math.floor(Math.random() * 20),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1,
    ).toISOString(),
    gender: RandomGenerator.pick(["F", "M", "Other"] as const),
    status: RandomGenerator.pick([
      "active",
      "inactive",
      "deceased",
      "transferred",
    ] as const),
    demographics_json: JSON.stringify({
      language: RandomGenerator.pick(["en", "es", "ko"] as const),
      race: "Human",
    }),
  } satisfies IHealthcarePlatformPatientRecord.ICreate;
  // 4. Create patient record
  const record =
    await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
      connection,
      { body: patientRecordBody },
    );
  typia.assert(record);
  TestValidator.equals(
    "created record's patient_user_id matches",
    record.patient_user_id,
    patientUserId,
  );
  TestValidator.equals(
    "created record's organization_id matches",
    record.organization_id,
    orgId,
  );
  TestValidator.equals(
    "created record's department_id matches",
    record.department_id,
    patientDepartmentId,
  );
  TestValidator.equals(
    "created record's status matches",
    record.status,
    patientRecordBody.status,
  );
  TestValidator.predicate(
    "audit created_at present",
    typeof record.created_at === "string" && record.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit updated_at present",
    typeof record.updated_at === "string" && record.updated_at.length > 0,
  );

  // 5. Attempt duplicate record creation with same patient_user_id for this organization (should fail!)
  await TestValidator.error(
    "duplicate patient_user_id + organization_id should be rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.patientRecords.create(
        connection,
        {
          body: patientRecordBody,
        },
      );
    },
  );
}
