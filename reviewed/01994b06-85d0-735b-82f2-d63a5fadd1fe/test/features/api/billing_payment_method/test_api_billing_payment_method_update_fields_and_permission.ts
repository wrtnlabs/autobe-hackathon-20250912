import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Tests update on billing payment method for mutable fields and permission
 * boundaries
 *
 * 1. Register (join) and login as Organization Admin 1
 * 2. Create a billing payment method for Org1
 * 3. Update provider_name and is_active (allowed fields) using PUT
 * 4. Get payment method and validate that updates persisted
 * 5. Attempt to update non-existent payment method (error expected)
 * 6. Register (join) Org Admin 2 and create a method for Org2
 * 7. Attempt to update Org2's method using Org1's credentials (should error for
 *    permission)
 */
export async function test_api_billing_payment_method_update_fields_and_permission(
  connection: api.IConnection,
) {
  // Step 1: Register Org Admin 1
  const admin1_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "org1pass",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1_join);
  // Step 2: Login as Org Admin 1
  const admin1_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: admin1_join.email,
        password: "org1pass",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(admin1_login);
  // Step 3: Create billing payment method (Org1)
  const paymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: admin1_join.id, // For test, we use admin's id as organization_id
          method_type: "credit_card",
          provider_name: "Visa",
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);
  // Step 4: Update mutable fields (provider_name, is_active)
  const updateBody = {
    provider_name: "Visa UPDATED",
    is_active: false,
  } satisfies IHealthcarePlatformBillingPaymentMethod.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.update(
      connection,
      {
        billingPaymentMethodId: paymentMethod.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "provider_name is updated",
    updated.provider_name,
    "Visa UPDATED",
  );
  TestValidator.equals("is_active is updated", updated.is_active, false);
  // Step 5: Confirm persisted via GET
  const paymentAfterUpdate =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.at(
      connection,
      {
        billingPaymentMethodId: paymentMethod.id,
      },
    );
  typia.assert(paymentAfterUpdate);
  TestValidator.equals(
    "GET reflects provider_name",
    paymentAfterUpdate.provider_name,
    "Visa UPDATED",
  );
  TestValidator.equals(
    "GET reflects is_active",
    paymentAfterUpdate.is_active,
    false,
  );
  // Step 6: Attempt to update non-existent ID
  await TestValidator.error("update on non-existent ID fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.update(
      connection,
      {
        billingPaymentMethodId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });
  // Step 7: Register Org Admin 2 and create method for Org2
  const admin2_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "org2pass",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2_join);
  // Step 8: Create method in Org2
  const org2_method =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: admin2_join.id,
          method_type: "insurance",
          provider_name: "Aetna",
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(org2_method);
  // Step 9: Switch to Org Admin 1 (login again)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1_join.email,
      password: "org1pass",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Step 10: Attempt by admin1 to update org2_method (should error)
  await TestValidator.error("update by other org's admin fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.update(
      connection,
      {
        billingPaymentMethodId: org2_method.id,
        body: {
          provider_name: "ill-advised switch",
        } satisfies IHealthcarePlatformBillingPaymentMethod.IUpdate,
      },
    );
  });
}
