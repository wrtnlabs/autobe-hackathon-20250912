import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingDiscountPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingDiscountPolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates accessing billing discount policy details by organization admin
 * including all relevant auth and permission scenarios.
 *
 * Steps:
 *
 * 1. Create two different organization admins (orgA, orgB) via join.
 * 2. Log in as orgA admin, create billing discount policy A (assign to orgA).
 * 3. Log in as orgB admin, create billing discount policy B (assign to orgB).
 * 4. Log in as orgA admin: a. Retrieve policy A by id (should succeed, happy
 *    path). b. Attempt to retrieve policy B (should fail with 403/404 security
 *    error). c. Attempt to retrieve random/nonexistent id (should fail with
 *    404).
 * 5. Attempt to retrieve policy A with unauthenticated connection (should fail
 *    unauthorized).
 */
export async function test_api_billing_discount_policy_detail_access_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Create two different organization admins (orgA, orgB)
  const emailA = typia.random<string & tags.Format<"email">>();
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordA = "TestPassword1!";
  const passwordB = "TestPassword2!";
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: emailA,
        full_name: RandomGenerator.name(),
        password: passwordA,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);

  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: emailB,
        full_name: RandomGenerator.name(),
        password: passwordB,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);

  // 2. Log in as orgA admin, create billing discount policy A
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const policyCreateA = {
    organization_id: orgAdminA.id,
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    discount_type: "percentage",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const policyA =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: policyCreateA },
    );
  typia.assert(policyA);

  // 3. Log in as orgB admin, create billing discount policy B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const policyCreateB = {
    organization_id: orgAdminB.id,
    policy_name: RandomGenerator.paragraph({ sentences: 2 }),
    discount_type: "fixed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: false,
  } satisfies IHealthcarePlatformBillingDiscountPolicy.ICreate;
  const policyB =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.create(
      connection,
      { body: policyCreateB },
    );
  typia.assert(policyB);

  // 4a. Log in as orgA admin: retrieve policy A by id (happy path)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const policyA_fetched =
    await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.at(
      connection,
      { billingDiscountPolicyId: policyA.id as string & tags.Format<"uuid"> },
    );
  typia.assert(policyA_fetched);
  TestValidator.equals(
    "policyA fields match",
    policyA_fetched,
    policyA,
    (key) => key === "created_at" || key === "updated_at",
  );

  // 4b. Attempt to retrieve policy B with orgA admin (should fail: security)
  await TestValidator.error(
    "cannot retrieve other organization's policy",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.at(
        connection,
        { billingDiscountPolicyId: policyB.id as string & tags.Format<"uuid"> },
      );
    },
  );

  // 4c. Attempt to retrieve random/nonexistent id (should fail: not found)
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "getting non-existent policy id fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.at(
        connection,
        { billingDiscountPolicyId: nonexistentId },
      );
    },
  );

  // 5. Attempt to retrieve policy A without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access as unauthenticated user fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingDiscountPolicies.at(
        unauthConn,
        { billingDiscountPolicyId: policyA.id as string & tags.Format<"uuid"> },
      );
    },
  );
}
