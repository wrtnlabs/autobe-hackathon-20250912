import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates the full lifecycle of creating and removing an organization's
 * billing payment method by an organization administrator, with negative test
 * cases.
 *
 * 1. Register (join) as a new organization administrator (acquires authenticated
 *    context).
 * 2. Create a new billing payment method for the authenticated admin's
 *    organization.
 * 3. Delete the billing payment method using the erase endpoint.
 * 4. Attempt to delete again (should error: already deleted/nonexistent).
 * 5. Attempt the same deletion as an unauthenticated/anonymous connection (should
 *    error: permission denied).
 * 6. Optionally, check that business rules (audit mechanics, soft-deletion) apply
 *    (to the degree the SDK surface allows).
 * 7. All steps validate correct authentication handling, business rule
 *    enforcement, and proper soft-deletion semantics.
 */
export async function test_api_billing_payment_method_removal_complete_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register new org admin (with random values)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "Password123!@#",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a billing payment method for this organization
  const billingMethodBody = {
    organization_id: admin.id,
    method_type: RandomGenerator.pick([
      "credit_card",
      "ach",
      "insurance",
      "check",
      "cash",
      "bank_transfer",
      "external_service",
      "other",
    ] as const),
    provider_name: "TestProvider",
    details_json: '{ "accountId": "abc123" }',
    is_active: true,
  } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate;
  const billingPaymentMethod: IHealthcarePlatformBillingPaymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: billingMethodBody,
      },
    );
  typia.assert(billingPaymentMethod);

  // 3. Delete the billing payment method by id (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.erase(
    connection,
    {
      billingPaymentMethodId: billingPaymentMethod.id,
    },
  );

  // 4. Attempt to delete the same method again (should error: already deleted)
  await TestValidator.error(
    "deleting already deleted/nonexistent billing method must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.erase(
        connection,
        {
          billingPaymentMethodId: billingPaymentMethod.id,
        },
      );
    },
  );

  // 5. Attempt to erase with unauthenticated/blank connection (should error: permission denied)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection cannot erase payment method",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.erase(
        unauthConn,
        {
          billingPaymentMethodId: billingPaymentMethod.id,
        },
      );
    },
  );
}
