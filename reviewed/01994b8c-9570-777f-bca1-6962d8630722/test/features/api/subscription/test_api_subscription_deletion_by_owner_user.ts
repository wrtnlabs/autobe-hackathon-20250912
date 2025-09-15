import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";

/**
 * Validate subscription deletion by the owning user and forbid deletion by
 * others.
 *
 * This test covers the complete workflow of registering two users (owner
 * and non-owner), simulating subscription creation with a subscription ID,
 * deletion by the owner user, and ensuring the non-owner user cannot delete
 * the subscription.
 *
 * Steps:
 *
 * 1. Register and authenticate an owner user.
 * 2. Register and authenticate another (non-owner) user.
 * 3. Simulate subscription creation with a new UUID (as no creation API
 *    exists).
 * 4. Owner user deletes the subscription successfully.
 * 5. Non-owner user attempts deletion and gets a forbidden error.
 *
 * Validations:
 *
 * - Join API responses are asserted for type correctness.
 * - Deletion by owner user completes without error.
 * - Deletion by non-owner user throws error as expected.
 *
 * Business Logic:
 *
 * - Only the owner user can delete their subscription.
 * - Unauthorized deletion attempts are forbidden.
 */
export async function test_api_subscription_deletion_by_owner_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the owner user
  const ownerUserCreate = {
    email: `owner_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
    password_hash: "hashed_password_owner",
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  const ownerUser: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: ownerUserCreate });
  typia.assert(ownerUser);

  // 2. Register and authenticate the non-owner user on a fresh connection
  const otherUserCreate = {
    email: `other_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
    password_hash: "hashed_password_other",
  } satisfies ISubscriptionRenewalGuardianUser.ICreate;

  // Clone connection and clear headers properly to create a clean connection
  const otherUserConnection: api.IConnection = { ...connection, headers: {} };
  const otherUser: ISubscriptionRenewalGuardianUser.IAuthorized =
    await api.functional.auth.user.join(otherUserConnection, {
      body: otherUserCreate,
    });
  typia.assert(otherUser);

  // 3. Simulate subscription creation by generating a UUID subscriptionId
  const subscriptionId = typia.random<string & tags.Format<"uuid">>();

  // 4. Owner user deletes the subscription successfully
  await api.functional.subscriptionRenewalGuardian.user.subscriptions.erase(
    connection,
    { subscriptionId },
  );

  // 5. Non-owner user attempts to delete the subscription and should fail
  await TestValidator.error(
    "non-owner user cannot delete subscription",
    async () => {
      await api.functional.subscriptionRenewalGuardian.user.subscriptions.erase(
        otherUserConnection,
        { subscriptionId },
      );
    },
  );
}
