import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * This test validates organization admin can create legal holds with full
 * metadata, proper ownership, and audit fields filled.
 *
 * 1. Organization admin account is registered (join), capturing admin ID and
 *    orgId.
 * 2. Log in as the new admin.
 * 3. Prepare a legal hold creation body, selecting subject_type as 'patient_data',
 *    assigning subject_id (random uuid), method 'manual', reason 'Litigation
 *    request', and status 'active'.
 * 4. Call legal hold creation API and validate all metadata fields are present,
 *    plus audit info (created_at, updated_at, imposed_by, org_id, etc).
 * 5. Negative case: attempt to create a legal hold with invalid/unauthenticated
 *    context is denied (simulate by clearing headers and retrying).
 * 6. Negative case: attempt to create duplicate hold (same org/subject/type) gives
 *    error.
 * 7. (No search/list API, so will document that one would check for created record
 *    in list/RBAC context if API were available.)
 */
export async function test_api_legal_hold_creation_with_scopes_and_compliance_audit(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "StrongP@ssword23!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinReq,
  });
  typia.assert(admin);

  // 2. Login as organization admin to be sure of session
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: joinReq.email, password: joinReq.password },
  });

  // 3. Prepare input for legal hold creation
  const subject_id = typia.random<string & tags.Format<"uuid">>();
  const legalHoldInput = {
    organization_id: admin.id, // Use admin's id as org_id for this test
    imposed_by_id: admin.id,
    subject_type: "patient_data",
    subject_id,
    reason: "Litigation request freeze for patient record",
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;

  // 4. Create legal hold (happy path)
  const hold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: legalHoldInput,
      },
    );
  typia.assert(hold);
  TestValidator.equals(
    "legal hold organization_id matches",
    hold.organization_id,
    legalHoldInput.organization_id,
  );
  TestValidator.equals(
    "legal hold imposed_by matches",
    hold.imposed_by_id,
    legalHoldInput.imposed_by_id,
  );
  TestValidator.equals(
    "legal hold subject type matches",
    hold.subject_type,
    legalHoldInput.subject_type,
  );
  TestValidator.equals("legal hold status is active", hold.status, "active");
  TestValidator.predicate(
    "legal hold id is uuid",
    typeof hold.id === "string" && hold.id.length > 0,
  );
  TestValidator.predicate(
    "legal hold timestamps present",
    typeof hold.created_at === "string" && typeof hold.updated_at === "string",
  );

  // 5. Negative: not logged in (simulate by empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated legal hold create fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
        unauthConn,
        {
          body: legalHoldInput,
        },
      );
    },
  );

  // 6. Negative: Duplicate legal hold (same org/subject/type) should fail
  await TestValidator.error("duplicate legal hold insert fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: legalHoldInput,
      },
    );
  });

  // 7. (Skipped: There is no read/list endpoint to check for RBAC/visibility. If present, would call and check list/read).
}
