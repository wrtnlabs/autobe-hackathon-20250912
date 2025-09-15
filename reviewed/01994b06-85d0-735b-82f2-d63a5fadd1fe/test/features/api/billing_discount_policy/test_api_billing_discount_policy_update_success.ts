import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test that an organization admin can update a billing discount policy
 * successfully.
 *
 * This test covers registration and login flows for an organization admin,
 * creation of a billing discount policy, updating that policy with new details,
 * and validates the response.
 *
 * Steps:
 *
 * 1. Register a new organization admin.
 * 2. Login as the organization admin.
 * 3. Create a new billing discount policy.
 * 4. Update the created billing discount policy with new valid data.
 * 5. Verify the updated fields are reflected and the id/organization_id are
 *    unchanged.
 */
export async function test_api_billing_discount_policy_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(10);
  const joinOutput = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email,
        full_name,
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(joinOutput);

  // 2. Login as the organization admin
  const loginOutput = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);

  // 3. Create a billing discount policy
  const policyCreateBody = {
    organization_id: loginOutput.id,
    policy_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
    discount_type: RandomGenerator.pick([
      "percentage",
      "fixed",
      "sliding_scale",
      RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    ] as const),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    is_active: true,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;

  const createdPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(createdPolicy);

  // 4. Update the policy with new data
  const updateBody = {
    policy_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 10,
    }),
    discount_type: RandomGenerator.pick([
      "percentage",
      "fixed",
      "sliding_scale",
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 11 }),
    ] as const),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 9,
    }),
    is_active: false,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.IUpdate;

  const updatedPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.update(
      connection,
      {
        billingDiscountPolicyId: typia.assert<string & tags.Format<"uuid">>(
          createdPolicy.id,
        ),
        body: updateBody,
      },
    );
  typia.assert(updatedPolicy);

  // 5. Assert that fields are updated and identity/ownership is unchanged
  TestValidator.equals(
    "Updated billing discount policy id is unchanged",
    updatedPolicy.id,
    createdPolicy.id,
  );
  TestValidator.equals(
    "organization_id is unchanged",
    updatedPolicy.organization_id,
    createdPolicy.organization_id,
  );
  TestValidator.equals(
    "policy_name updated correctly",
    updatedPolicy.policy_name,
    updateBody.policy_name,
  );
  TestValidator.equals(
    "discount_type updated correctly",
    updatedPolicy.discount_type,
    updateBody.discount_type,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedPolicy.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_active updated correctly",
    updatedPolicy.is_active,
    updateBody.is_active,
  );
}
