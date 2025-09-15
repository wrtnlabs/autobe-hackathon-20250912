import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";

export async function test_api_subscriptionrenewalguardian_admin_registration_success(
  connection: api.IConnection,
) {
  // 1. Generate random email and password hash
  const email = `${RandomGenerator.name(2).toLowerCase()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // assuming sha256 represented in hex

  // 2. Prepare the request body as per ISubscriptionRenewalGuardianAdmin.ICreate
  const body = {
    email,
    password_hash: passwordHash,
  } satisfies ISubscriptionRenewalGuardianAdmin.ICreate;

  // 3. Call the join API
  const result: ISubscriptionRenewalGuardianAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body });

  // 4. Validate response structure
  typia.assert(result);

  // 5. Validate business logic related fields
  TestValidator.predicate(
    "response has UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.equals("email is registered email", result.email, email);
  TestValidator.equals(
    "password_hash is returned",
    result.password_hash,
    passwordHash,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !Number.isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !Number.isNaN(Date.parse(result.updated_at)),
  );

  // 6. Validate token presence and subfields
  TestValidator.predicate(
    "token.access exists",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is valid ISO date",
    !Number.isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid ISO date",
    !Number.isNaN(Date.parse(result.token.refreshable_until)),
  );
}
