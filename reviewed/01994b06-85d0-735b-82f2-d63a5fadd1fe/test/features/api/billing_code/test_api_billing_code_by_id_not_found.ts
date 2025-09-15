import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test that requesting a billing code with a non-existent ID returns an error
 * as expected (404) after authenticating as org admin.
 *
 * 1. Register as an organization admin using /auth/organizationAdmin/join
 * 2. Attempt to retrieve a billing code using a synthesized UUID not present in
 *    the system
 * 3. Confirm that an error is thrown (e.g., not found/404), validating resource
 *    existence logic
 */
export async function test_api_billing_code_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Register as organization admin
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(8),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Try querying a non-existent billing code (random uuid)
  const fakeBillingCodeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "requesting a non-existent billing code returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.at(
        connection,
        {
          billingCodeId: fakeBillingCodeId,
        },
      );
    },
  );
}
