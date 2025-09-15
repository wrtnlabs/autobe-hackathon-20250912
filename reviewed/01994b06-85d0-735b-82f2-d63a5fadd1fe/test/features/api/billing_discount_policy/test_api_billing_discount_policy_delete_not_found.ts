import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate error when deleting a non-existent billing discount policy as an
 * organization admin.
 *
 * 1. Organization admin registration (join)
 * 2. Organization admin login to acquire access token
 * 3. Attempt to delete a billing discount policy using a random, non-existent UUID
 * 4. Expect an error to be thrown (not-found)
 */
export async function test_api_billing_discount_policy_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Organization admin registration (join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Organization admin login
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const authed = await api.functional.auth.organizationAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(authed);

  // 3. Attempt to delete a billing discount policy with a random, non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Validate that a not-found error is thrown
  await TestValidator.error(
    "delete of non-existent billing discount policy should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.erase(
        connection,
        {
          billingDiscountPolicyId: nonExistentId,
        },
      );
    },
  );
}
