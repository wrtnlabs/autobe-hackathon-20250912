import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBillingPaymentMethod";

/**
 * Test creation and business validation for billing payment methods on the
 * healthcare platform.
 *
 * 1. Register an organization admin and authenticate, capture org UUID.
 * 2. Create a valid payment method (with all required fields).
 * 3. Assert returned record fields match input, and payment method is retrievable
 *    via index API with org_id filter.
 * 4. Attempt to create a duplicate payment method (identical organization_id,
 *    method_type, and provider_name) and assert business validation error
 *    occurs.
 */
export async function test_api_billing_payment_method_create_success_and_input_validation(
  connection: api.IConnection,
) {
  // Step 1: Register an org admin and authenticate
  const joinAdminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "securePass123",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinAdminInput,
  });
  typia.assert(admin);
  const orgAdminId = admin.id;
  // Step 2: Login with credentials
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinAdminInput.email,
      password: joinAdminInput.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // Step 3: Create a valid payment method for this org
  const paymentMethodInput = {
    organization_id: orgAdminId,
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
    provider_name: RandomGenerator.name(1),
    details_json: JSON.stringify({ account: RandomGenerator.alphaNumeric(12) }),
    is_active: true,
  } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: paymentMethodInput,
      },
    );
  typia.assert(paymentMethod);
  TestValidator.equals(
    "organization_id matches input",
    paymentMethod.organization_id,
    paymentMethodInput.organization_id,
  );
  TestValidator.equals(
    "provider name matches",
    paymentMethod.provider_name,
    paymentMethodInput.provider_name,
  );
  TestValidator.equals("is_active true", paymentMethod.is_active, true);
  // Step 4: Should be found in index API for this org
  const paymentList =
    await api.functional.healthcarePlatform.billingPaymentMethods.index(
      connection,
      {
        body: {
          organization_id: orgAdminId,
        } satisfies IHealthcarePlatformBillingPaymentMethod.IRequest,
      },
    );
  typia.assert(paymentList);
  TestValidator.predicate(
    "created payment method found in index",
    paymentList.data.some((m) => m.id === paymentMethod.id),
  );
  // Step 5: Attempt duplicate create (should trigger duplicate business validation error)
  await TestValidator.error(
    "duplicate payment method triggers business validation error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
        connection,
        {
          body: paymentMethodInput,
        },
      );
    },
  );
}
