import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate error handling when updating an existing billing discount policy
 * with business-logic-invalid (but type-compatible) data.
 *
 * Steps:
 *
 * 1. Register (join) as a new organization admin
 * 2. Log in as that admin
 * 3. Create a valid billing discount policy for the org
 * 4. Attempt to update that policy with invalid data: empty string for policy_name
 *    and unknown value for discount_type
 * 5. The system should reject these updates with validation errors (business
 *    logic; not type errors)
 */
export async function test_api_billing_discount_policy_update_invalid_input(
  connection: api.IConnection,
) {
  // 1. Join as new admin
  const adminJoin = typia.random<IHealthcarePlatformOrganizationAdmin.IJoin>();
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);
  // 2. Log in
  const adminLogin = {
    email: adminJoin.email,
    password: adminJoin.password ?? "1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  await api.functional.auth.organizationAdmin.login(connection, {
    body: adminLogin,
  });
  // 3. Create a valid billing discount policy
  const validPolicyBody = {
    organization_id: admin.id,
    policy_name: RandomGenerator.name(),
    discount_type: "percentage",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      {
        body: validPolicyBody,
      },
    );
  typia.assert(policy);

  // 4. Attempt update with empty string policy_name (still string, but business invalid)
  await TestValidator.error(
    "should reject update with empty policy_name",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.update(
        connection,
        {
          billingDiscountPolicyId: typia.assert<string & tags.Format<"uuid">>(
            policy.id!,
          ),
          body: {
            policy_name: "",
          } satisfies IHealthcarePlatformBillingDiscountPolicy.IUpdate,
        },
      );
    },
  );

  // 5. Attempt update with invalid discount_type (assume allowed discount_type values: 'percentage', 'fixed', etc.; try 'invalid_type')
  await TestValidator.error(
    "should reject update with invalid discount_type",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.update(
        connection,
        {
          billingDiscountPolicyId: typia.assert<string & tags.Format<"uuid">>(
            policy.id!,
          ),
          body: {
            discount_type: "invalid_type",
          } satisfies IHealthcarePlatformBillingDiscountPolicy.IUpdate,
        },
      );
    },
  );
}
