import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates that an organization admin can fetch details for a legal hold
 * within their organization by ID, and that cross-organization access is
 * forbidden. The test covers onboarding two admins (each in different orgs),
 * creation of a legal hold, correct retrieval and detailed assertion by its
 * creator/admin, and a forbidden access attempt from another organization's
 * admin.
 *
 * 1. Onboard Org Admin A for Organization X.
 * 2. Login as Org Admin A; save session/auth.
 * 3. Create legal hold for Organization X. Save returned legalHoldId and orgId.
 * 4. Retrieve legal hold by ID as Org Admin A. Assert all response fields.
 * 5. Onboard Org Admin B for Organization Y.
 * 6. Login as Org Admin B.
 * 7. Attempt to retrieve Org X's legal hold by its ID; expect forbidden/error.
 */
export async function test_api_legal_hold_retrieve_success_and_forbidden_access(
  connection: api.IConnection,
) {
  // Step 1/2: Onboard and login Org Admin A
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_admin_name = RandomGenerator.name();
  const orgA_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: orgA_admin_name,
        password: "securePa$$w0rd",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_join);

  // Step 3: Create legal hold as Org Admin A
  const legalHoldCreate =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: {
          organization_id: orgA_join.id,
          subject_type: "org_data",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          method: "policy",
          status: "active",
          effective_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformLegalHold.ICreate,
      },
    );
  typia.assert(legalHoldCreate);

  // Step 4: Retrieve by ID (positive case)
  const legalHoldFetch =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.at(
      connection,
      {
        legalHoldId: legalHoldCreate.id,
      },
    );
  typia.assert(legalHoldFetch);
  TestValidator.equals(
    "legal hold id matches",
    legalHoldFetch.id,
    legalHoldCreate.id,
  );
  TestValidator.equals(
    "org id matches",
    legalHoldFetch.organization_id,
    orgA_join.id,
  );
  TestValidator.equals(
    "status matches",
    legalHoldFetch.status,
    legalHoldCreate.status,
  );
  TestValidator.equals(
    "subject type",
    legalHoldFetch.subject_type,
    legalHoldCreate.subject_type,
  );
  TestValidator.equals(
    "reason matches",
    legalHoldFetch.reason,
    legalHoldCreate.reason,
  );

  // Step 5/6: Onboard and login Org Admin B (different org)
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_admin_name = RandomGenerator.name();
  const orgB_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: orgB_admin_name,
        password: "securePa$$w0rd",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_join);

  // Step 7: Attempt forbidden retrieval as unrelated org admin
  await TestValidator.error(
    "cross-org admin cannot access another org's legal hold",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.legalHolds.at(
        connection,
        {
          legalHoldId: legalHoldCreate.id,
        },
      );
    },
  );
}
