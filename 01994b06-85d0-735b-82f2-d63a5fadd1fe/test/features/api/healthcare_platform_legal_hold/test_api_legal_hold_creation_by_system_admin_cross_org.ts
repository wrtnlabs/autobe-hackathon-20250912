import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Tests that a system admin (platform superuser) can create legal holds across
 * organizations at both the organization and patient levels, receiving full
 * metadata in the response and triggering audit logic. Includes negative cases
 * for protected subject_type, invalid org ID, and validates return fields for
 * proper compliance fields and metadata.
 *
 * Business scenario:
 *
 * 1. Register and log in as a healthcare platform system admin (local provider).
 * 2. Issue a legal hold at the organization level (subject_type: org_data, null
 *    department and subject_id).
 * 3. Issue a legal hold at the patient subject level, for another organization.
 * 4. Assert that the returned records reflect all inputs and capture required
 *    audit fields.
 * 5. Negative: Attempt to create a hold for a protected entity (subject_type:
 *    system_core), expecting rejection.
 * 6. Negative: Attempt to create a hold with invalid organization_id format,
 *    expecting error.
 * 7. All fields and responses are validated for presence and correctness of audit
 *    metadata.
 *
 * Limitations:
 *
 * - No restriction-listing or search API is present for post-hold listing
 *   verification.
 * - No direct audit log fetch is available; indirect audit can only be confirmed
 *   via audit fields on hold records.
 */
export async function test_api_legal_hold_creation_by_system_admin_cross_org(
  connection: api.IConnection,
) {
  // Step 1: Join as platform system admin
  const email: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: email,
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Step 2: Login as system admin
  const loginBody = {
    email,
    provider: "local",
    provider_key: email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Prepare two org IDs and a patient UUID
  const orgId1 = typia.random<string & tags.Format<"uuid">>();
  const orgId2 = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Org-level legal hold (no department, no subject_id)
  const orgHoldBody = {
    organization_id: orgId1,
    imposed_by_id: admin.id,
    department_id: null,
    subject_type: "org_data",
    subject_id: null,
    reason: RandomGenerator.paragraph(),
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const orgHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: orgHoldBody,
      },
    );
  typia.assert(orgHold);
  TestValidator.equals(
    "org hold org_id matches",
    orgHold.organization_id,
    orgId1,
  );
  TestValidator.equals(
    "org hold subject_type",
    orgHold.subject_type,
    "org_data",
  );
  TestValidator.equals("org hold subject_id is null", orgHold.subject_id, null);
  TestValidator.equals(
    "org hold imposed_by_id",
    orgHold.imposed_by_id,
    admin.id,
  );
  TestValidator.equals(
    "org hold reason matches",
    orgHold.reason,
    orgHoldBody.reason,
  );
  TestValidator.equals("org hold status active", orgHold.status, "active");
  TestValidator.predicate(
    "org hold created_at is string",
    typeof orgHold.created_at === "string",
  );
  TestValidator.predicate(
    "org hold id is uuid",
    typeof orgHold.id === "string",
  );

  // Step 4: Patient-level hold (subject_id and subject_type)
  const patientHoldBody = {
    organization_id: orgId2,
    imposed_by_id: admin.id,
    department_id: null,
    subject_type: "patient_data",
    subject_id: patientId,
    reason: RandomGenerator.paragraph(),
    method: "legal_request",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const patientHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: patientHoldBody,
      },
    );
  typia.assert(patientHold);
  TestValidator.equals(
    "patient hold org_id matches",
    patientHold.organization_id,
    orgId2,
  );
  TestValidator.equals(
    "patient hold subject_type",
    patientHold.subject_type,
    "patient_data",
  );
  TestValidator.equals(
    "patient hold subject_id matches",
    patientHold.subject_id,
    patientId,
  );
  TestValidator.equals(
    "patient hold status active",
    patientHold.status,
    "active",
  );

  // Step 5: Error - protected subject_type
  const protectedBody = {
    organization_id: orgId1,
    imposed_by_id: admin.id,
    department_id: null,
    subject_type: "system_core",
    subject_id: null,
    reason: RandomGenerator.paragraph(),
    method: "system",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  await TestValidator.error("protected entity rejected", async () => {
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: protectedBody,
      },
    );
  });

  // Step 6: Error - invalid organization_id format
  const invalidOrgBody = {
    organization_id: "not-a-uuid",
    imposed_by_id: admin.id,
    department_id: null,
    subject_type: "org_data",
    subject_id: null,
    reason: RandomGenerator.paragraph(),
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  await TestValidator.error("invalid org id format rejected", async () => {
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: invalidOrgBody,
      },
    );
  });
}
