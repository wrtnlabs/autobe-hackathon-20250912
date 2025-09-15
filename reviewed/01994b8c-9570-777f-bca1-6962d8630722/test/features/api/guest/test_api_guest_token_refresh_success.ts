import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianGuest";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a guest user using /auth/guest/join
  // Generate a random email for the guest
  const guestEmail = `${RandomGenerator.name(1)
    .replace(/\s/g, "")
    .toLowerCase()}@guest.example.com`;
  const createBody = {
    email: guestEmail,
  } satisfies ISubscriptionRenewalGuardianGuest.ICreate;

  const createdGuest = await api.functional.auth.guest.join(connection, {
    body: createBody,
  });
  typia.assert(createdGuest);

  // 2. Use the issued refresh token to call /auth/guest/refresh
  const refreshBody = {
    refresh_token: createdGuest.refresh_token,
  } satisfies ISubscriptionRenewalGuardianGuest.IRefreshRequest;
  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshedGuest);

  // 3. Verify that new temporary tokens are issued and differ from originals
  TestValidator.predicate(
    "access tokens differ",
    refreshedGuest.access_token !== createdGuest.access_token,
  );
  TestValidator.predicate(
    "refresh tokens are present",
    typeof refreshedGuest.refresh_token === "string" &&
      refreshedGuest.refresh_token.length > 0,
  );
  TestValidator.equals("user ID matches", refreshedGuest.id, createdGuest.id);

  // 4. Test invalid refresh token triggers error
  await TestValidator.error("invalid refresh token should fail", async () => {
    const invalidRefreshBody = {
      refresh_token: "invalid-refresh-token",
    } satisfies ISubscriptionRenewalGuardianGuest.IRefreshRequest;
    await api.functional.auth.guest.refresh(connection, {
      body: invalidRefreshBody,
    });
  });

  // 5. Confirm role claims remain as guest by checking token object properties
  // Here, we only check that token object exists with access and refresh properties
  TestValidator.predicate(
    "token object contains access property",
    typeof refreshedGuest.token.access === "string",
  );
  TestValidator.predicate(
    "token object contains refresh property",
    typeof refreshedGuest.token.refresh === "string",
  );
  TestValidator.predicate(
    "token expired_at is a valid date-time string",
    !isNaN(Date.parse(refreshedGuest.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is a valid date-time string",
    !isNaN(Date.parse(refreshedGuest.token.refreshable_until)),
  );
}
