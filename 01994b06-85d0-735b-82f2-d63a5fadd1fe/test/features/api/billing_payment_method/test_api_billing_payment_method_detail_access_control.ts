import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingPaymentMethod";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates organization admin's access control to billing payment method
 * details; ensures admin can only access payment methods belonging to their own
 * organization and not others, plus handling for non-existent records.
 *
 * 1. Register OrgA admin
 * 2. Register OrgB admin
 * 3. OrgA admin login & create billing payment method (methodA)
 * 4. OrgB admin login & create billing payment method (methodB)
 * 5. OrgA admin retrieves methodA (should succeed)
 * 6. OrgB admin tries to access methodA (should fail w/ 403 or 404)
 * 7. OrgA admin tries to access methodB (should fail w/ 403 or 404)
 * 8. OrgA admin attempts to access random non-existent UUID (should fail w/ 404)
 */
export async function test_api_billing_payment_method_detail_access_control(
  connection: api.IConnection,
) {
  // Register OrgA admin
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAFName = RandomGenerator.name();
  const orgAPassword = RandomGenerator.alphaNumeric(12);
  const orgAAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAEmail,
        full_name: orgAFName,
        password: orgAPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAAdmin);

  // Register OrgB admin
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBFName = RandomGenerator.name();
  const orgBPassword = RandomGenerator.alphaNumeric(12);
  const orgBAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgBEmail,
        full_name: orgBFName,
        password: orgBPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgBAdmin);

  // OrgA admin login & create payment method
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const methodA =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: orgAAdmin.id,
          method_type: "credit_card",
          provider_name: RandomGenerator.name(1),
          details_json: JSON.stringify({
            key: RandomGenerator.alphaNumeric(10),
          }),
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(methodA);

  // OrgB admin login & create payment method
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgBEmail,
      password: orgBPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const methodB =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.create(
      connection,
      {
        body: {
          organization_id: orgBAdmin.id,
          method_type: "ach",
          provider_name: RandomGenerator.name(1),
          details_json: JSON.stringify({
            key: RandomGenerator.alphaNumeric(10),
          }),
          is_active: true,
        } satisfies IHealthcarePlatformBillingPaymentMethod.ICreate,
      },
    );
  typia.assert(methodB);

  // 1. OrgA admin retrieves its method (should succeed)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    },
  });
  const ownA =
    await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.at(
      connection,
      {
        billingPaymentMethodId: methodA.id,
      },
    );
  typia.assert(ownA);
  TestValidator.equals(
    "OrgA can access its own payment method",
    ownA.id,
    methodA.id,
  );
  TestValidator.equals(
    "OrgA sees correct organization_id",
    ownA.organization_id,
    orgAAdmin.id,
  );

  // 2. OrgB admin tries to access methodA
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgBEmail,
      password: orgBPassword,
    },
  });
  await TestValidator.error(
    "OrgB admin denied access to OrgA payment method",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.at(
        connection,
        {
          billingPaymentMethodId: methodA.id,
        },
      );
    },
  );

  // 3. OrgA admin tries to access methodB
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    },
  });
  await TestValidator.error(
    "OrgA admin denied access to OrgB payment method",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.at(
        connection,
        {
          billingPaymentMethodId: methodB.id,
        },
      );
    },
  );

  // 4. OrgA admin tries to access random UUID
  await TestValidator.error(
    "OrgA admin denied access to non-existent payment method",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingPaymentMethods.at(
        connection,
        {
          billingPaymentMethodId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
