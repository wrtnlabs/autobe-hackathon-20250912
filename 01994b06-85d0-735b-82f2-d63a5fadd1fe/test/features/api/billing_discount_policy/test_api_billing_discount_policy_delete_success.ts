import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate soft-deletion of a billing discount policy by an organization
 * admin.
 *
 * 1. Register as an organization admin using random but valid join data.
 * 2. Log in as the newly created admin to ensure authorization headers are set
 *    for further actions.
 * 3. Create a random billing discount policy belonging to the registered
 *    admin's organization (organization_id from join response).
 * 4. Soft-delete the newly created billing discount policy by its ID.
 * 5. Confirm the operation completes without errors (no return means success
 *    for DELETE).
 * 6. Attempt to delete the same policy a second time and expect an error,
 *    confirming it's already deleted.
 * 7. Create another policy as a final check that session/authorization remains
 *    active after deletion.
 */
export async function test_api_billing_discount_policy_delete_success(
  connection: api.IConnection,
) {
  // 1. Register as an organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const joined = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2. Log in as the same admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);
  TestValidator.equals("login ID matches join ID", loggedIn.id, joined.id);

  // 3. Create a billing discount policy
  const createPolicyBody = {
    organization_id: joined.id,
    policy_name: RandomGenerator.paragraph({ sentences: 3 }),
    discount_type: RandomGenerator.pick([
      "percentage",
      "fixed",
      "sliding_scale",
      "custom",
    ] as const),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_active: true,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: createPolicyBody },
    );
  typia.assert(policy);
  TestValidator.equals(
    "policy organization matches admin",
    policy.organization_id,
    joined.id,
  );

  // 4. Soft-delete the billing discount policy
  await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.erase(
    connection,
    { billingDiscountPolicyId: policy.id as string & tags.Format<"uuid"> },
  );
  // Success is absence of errors; erase returns void

  // 5. Attempt to delete it again, expect an error (already deleted)
  await TestValidator.error(
    "cannot delete already soft-deleted policy",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.erase(
        connection,
        { billingDiscountPolicyId: policy.id as string & tags.Format<"uuid"> },
      );
    },
  );

  // 6. Ensure session remains active by creating another policy
  const newPolicyBody = {
    organization_id: joined.id,
    policy_name: RandomGenerator.paragraph({ sentences: 4 }),
    discount_type: RandomGenerator.pick([
      "percentage",
      "fixed",
      "sliding_scale",
      "custom",
    ] as const),
    is_active: true,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const newPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: newPolicyBody },
    );
  typia.assert(newPolicy);
}
