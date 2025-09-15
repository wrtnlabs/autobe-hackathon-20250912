import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * Validate updating a subscription vendor's unique name and enforce
 * uniqueness constraints.
 *
 * This test scenario covers the complete user journey:
 *
 * 1. Register a new user via POST /auth/user/join to obtain authorization.
 * 2. Create two subscription vendors via POST
 *    /subscriptionRenewalGuardian/user/vendors to prepare test data.
 * 3. Update the first vendor with a new unique name and verify the update.
 * 4. Attempt to update the first vendor with the second vendor's name to
 *    validate uniqueness conflict handling.
 * 5. Confirm unauthorized update attempts are rejected.
 *
 * Steps:
 *
 * - Register user and authenticate.
 * - Create vendor1 with a random unique name.
 * - Create vendor2 with a different random unique name.
 * - Update vendor1 with a new unique name and verify response.
 * - Attempt to update vendor1 to vendor2's name, expect error.
 * - Attempt update without authentication, expect error.
 *
 * Validations:
 *
 * - Use typia.assert to validate API response types.
 * - Use TestValidator for business logic assertions and error checking.
 */
export async function test_api_subscription_renewal_guardian_user_vendors_update_unique_name_and_validation(
  connection: api.IConnection,
) {
  // Step 1: User Registration and Authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create two distinct subscription vendors for uniqueness tests
  const vendorName1 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const vendorName2 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });

  const vendor1: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: {
          name: vendorName1,
        } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
      },
    );
  typia.assert(vendor1);

  const vendor2: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: {
          name: vendorName2,
        } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
      },
    );
  typia.assert(vendor2);

  // Step 3: Update vendor1 with a new unique name
  const newUniqueName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 10,
  });

  const updatedVendor1: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.update(
      connection,
      {
        vendorId: vendor1.id,
        body: {
          name: newUniqueName,
        } satisfies ISubscriptionRenewalGuardianVendor.IUpdate,
      },
    );
  typia.assert(updatedVendor1);

  TestValidator.equals(
    "Vendor1 id remains unchanged after update",
    updatedVendor1.id,
    vendor1.id,
  );

  TestValidator.equals(
    "Vendor1 name updated correctly",
    updatedVendor1.name,
    newUniqueName,
  );

  // Step 4: Attempt to update vendor1 to vendor2's name -> expect error due to duplicate name
  await TestValidator.error(
    "update vendor1 with vendor2's name should fail due to duplicate",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.vendors.update(
        connection,
        {
          vendorId: vendor1.id,
          body: {
            name: vendor2.name,
          } satisfies ISubscriptionRenewalGuardianVendor.IUpdate,
        },
      );
    },
  );

  // Step 5: Attempt update without proper authentication by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "update without authentication should fail",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.vendors.update(
        unauthenticatedConnection,
        {
          vendorId: vendor1.id,
          body: {
            name: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 4,
              wordMax: 6,
            }),
          } satisfies ISubscriptionRenewalGuardianVendor.IUpdate,
        },
      );
    },
  );
}
