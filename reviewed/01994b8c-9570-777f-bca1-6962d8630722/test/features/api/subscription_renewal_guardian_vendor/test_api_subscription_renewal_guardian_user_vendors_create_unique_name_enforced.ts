import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import type { ISubscriptionRenewalGuardianVendor } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianVendor";

/**
 * This E2E test verifies the subscriptionRenewalGuardian user vendor creation
 * flow with unique name enforcement.
 *
 * It authenticates a user, creates a vendor with a unique name, confirms UUID
 * and timestamps are properly generated, rejects duplicate vendor names, and
 * checks unauthorized creation rejection.
 */
export async function test_api_subscription_renewal_guardian_user_vendors_create_unique_name_enforced(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(20);

  const user: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password_hash: passwordHash,
      } satisfies ISubscriptionRenewalGuardianUser.ICreate,
    });
  typia.assert(user);
  TestValidator.predicate(
    "user token is set",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );

  // 2. Unique vendor name generation
  const vendorName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

  // 3. Create the first vendor with the unique name
  const vendor1: ISubscriptionRenewalGuardianVendor =
    await api.functional.subscriptionRenewalGuardian.user.vendors.create(
      connection,
      {
        body: {
          name: vendorName,
        } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
      },
    );
  typia.assert(vendor1);
  TestValidator.equals("created vendor name matches", vendor1.name, vendorName);
  TestValidator.predicate(
    "created vendor id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      vendor1.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date",
    !isNaN(Date.parse(vendor1.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date",
    !isNaN(Date.parse(vendor1.updated_at)),
  );

  // 4. Attempt to create second vendor with the same name should fail
  await TestValidator.error(
    "duplicate vendor name creation is rejected",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.vendors.create(
        connection,
        {
          body: {
            name: vendorName,
          } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
        },
      );
    },
  );

  // 5. Test unauthorized vendor creation attempts
  // Create unauthenticated connection (headers empty)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized vendor creation fails with 401",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.vendors.create(
        unauthConnection,
        {
          body: {
            name: `${vendorName}-unauth`,
          } satisfies ISubscriptionRenewalGuardianVendor.ICreate,
        },
      );
    },
  );
}
