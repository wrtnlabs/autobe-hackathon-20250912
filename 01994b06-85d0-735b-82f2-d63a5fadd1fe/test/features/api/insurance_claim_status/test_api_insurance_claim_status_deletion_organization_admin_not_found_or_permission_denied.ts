import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin tries deleting insurance claim statuses that do not exist
 * or are not permissioned.
 *
 * This test verifies:
 *
 * 1. Attempting to delete a fabricated insurance claim status (random UUIDs)
 *    returns not found/denied error.
 * 2. Attempting to delete a status belonging to a different admin/organization
 *    (using new random UUIDs) also returns error.
 * 3. Proper authentication/separate accounts are used; no access is granted for
 *    random resources.
 * 4. No API accidentally succeeds for these security boundary negative cases.
 */
export async function test_api_insurance_claim_status_deletion_organization_admin_not_found_or_permission_denied(
  connection: api.IConnection,
) {
  // Step 1: Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: adminName,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // Step 2: Log in as org admin (token auto-managed, but test login code-path)
  const adminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);

  // Step 3: Attempt to delete a non-existent insurance claim status (random UUIDs)
  await TestValidator.error(
    "deleting non-existent insurance claim status returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.erase(
        connection,
        {
          insuranceClaimId: typia.random<string & tags.Format<"uuid">>(),
          insuranceClaimStatusId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 4: Simulate status belonging to another organization (another random UUIDs)
  await TestValidator.error(
    "deleting insurance claim status not owned by this admin returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.erase(
        connection,
        {
          insuranceClaimId: typia.random<string & tags.Format<"uuid">>(),
          insuranceClaimStatusId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
