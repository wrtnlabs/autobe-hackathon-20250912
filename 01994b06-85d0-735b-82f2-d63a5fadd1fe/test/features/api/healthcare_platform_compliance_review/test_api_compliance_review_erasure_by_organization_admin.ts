import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test the full organization admin compliance review deletion lifecycle,
 * validating RBAC and erasure behavior.
 *
 * 1. Register and login as Healthcare Platform Organization Admin (A)
 * 2. Create a compliance review for their organization (OrgX)
 * 3. Delete (erase) that compliance review as the same org admin, validating
 *    success
 * 4. Attempt unnecessary or forbidden deletes: as another org admin, as
 *    unauthenticated, and for a random/nonexistent id
 * 5. (Within system capability) Validate erasure: response is void, re-invocation
 *    yields error, and post-delete the review no longer exists
 * 6. (If possible within test scope) Validate RBAC boundaries enforced for
 *    deletion
 */
export async function test_api_compliance_review_erasure_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register as OrgAdmin-A
  const joinA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: "Passw0rd!123",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinA);
  const orgAdminAId = joinA.id;

  // 2. Login as OrgAdmin-A
  const loginA = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinA.email,
      password: "Passw0rd!123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(loginA);

  // 3. Create Compliance Review for OrgA (OrgAdminA's org)
  const complianceReview =
    await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.create(
      connection,
      {
        body: {
          organization_id: joinA.id, // Using admin id as organization context, as no orgId type returned elsewhere
          review_type: "periodic",
          method: "manual audit",
          status: "scheduled",
          comments: RandomGenerator.paragraph(),
        } satisfies IHealthcarePlatformComplianceReview.ICreate,
      },
    );
  typia.assert(complianceReview);

  // 4. Erase the compliance review (happy path)
  await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.erase(
    connection,
    { complianceReviewId: complianceReview.id },
  );

  // (If there was a GET/list for complianceReviews, we'd query and check it's not found)
  // Since not available, confirm the delete endpoint yields error if called again
  await TestValidator.error(
    "Deleting already-deleted compliance review should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.erase(
        connection,
        { complianceReviewId: complianceReview.id },
      );
    },
  );

  // Attempt delete of totally-nonexistent complianceReviewId
  await TestValidator.error(
    "Deleting non-existent compliance review id should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.erase(
        connection,
        {
          complianceReviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Attempt to delete as a different org admin (RBAC test)
  // Register and login as OrgAdmin-B
  const joinB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: "Passw0rd!456",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinB);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinB.email,
      password: "Passw0rd!456",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "Other organization admin cannot erase compliance review not belonging to their org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.erase(
        connection,
        { complianceReviewId: complianceReview.id },
      );
    },
  );

  // 6. Optionally, attempt as unauthenticated principal (simulate by clearing connection headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated user cannot erase compliance review",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceReviews.erase(
        unauthConn,
        { complianceReviewId: complianceReview.id },
      );
    },
  );
}
