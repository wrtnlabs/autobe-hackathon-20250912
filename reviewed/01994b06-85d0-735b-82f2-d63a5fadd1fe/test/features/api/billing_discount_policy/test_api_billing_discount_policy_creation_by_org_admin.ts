import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for billing discount policy creation by organization admin:
 *
 * - Success case: Create a new billing discount policy with valid data
 * - Duplicate: Fail when attempting to create duplicate (same policy_name/type)
 * - Organization scoping: Fail when using unauthorized/nonexistent org id
 * - Security: Fail without authentication
 * - Business: Validate that the created policy fields match the schema and input
 */
export async function test_api_billing_discount_policy_creation_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Setup: Register and login organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Success: Create a valid billing discount policy
  const policyBody = {
    organization_id: admin.id,
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    discount_type: RandomGenerator.pick([
      "percentage",
      "fixed",
      "sliding_scale",
    ] as const),
    is_active: true,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const createdPolicy =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert(createdPolicy);
  TestValidator.equals(
    "policy org id matches admin org",
    createdPolicy.organization_id,
    policyBody.organization_id,
  );
  TestValidator.equals(
    "policy name matches input",
    createdPolicy.policy_name,
    policyBody.policy_name,
  );
  TestValidator.equals(
    "discount type matches input",
    createdPolicy.discount_type,
    policyBody.discount_type,
  );
  TestValidator.equals(
    "is_active flag matches",
    createdPolicy.is_active,
    policyBody.is_active,
  );
  TestValidator.equals(
    "description matches",
    createdPolicy.description,
    policyBody.description,
  );

  // 3. Duplicate: Attempt to create duplicate
  await TestValidator.error("duplicate name/type should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: policyBody },
    );
  });

  // 4. Unauthorized org id
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "using wrong org id should fail (org scoping)",
    async () => {
      const fakeBody = { ...policyBody, organization_id: fakeOrgId };
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
        connection,
        { body: fakeBody },
      );
    },
  );

  // 5. Security: Unauthenticated creation attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      unauthConn,
      { body: policyBody },
    );
  });
}
