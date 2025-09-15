import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the system administrator join API for the healthcare platform:
 *
 * 1. Attempt registration with a unique business email, valid password, legal
 *    name, and provider info:
 *
 *    - Provider: 'local', provider_key: email
 *    - Password meets expected complexity (random alphanumeric, min 12 chars)
 *    - Full_name randomly generated
 *    - Phone is optional: test both omission and inclusion
 * 2. Upon success, confirm IHealthcarePlatformSystemAdmin.IAuthorized type and JWT
 *    token presence
 *
 *    - Typia.assert() result
 *    - Returned email, name match input
 *    - Returned phone matches or is omitted/null appropriately
 *    - Password must NOT be present in response
 *    - Token must be present and valid
 * 3. Re-attempt join with duplicate email, expect a business error/refusal
 * 4. Try with phone field set
 * 5. (Business constraints on allowed/blocked emails are assumed present; one
 *    successful and one failure case suffice; do not test allowed-list
 *    enforcement in code)
 */
export async function test_api_system_admin_join_and_authenticate_unique_email_password_onsuccess_and_duplicate_email_onfail(
  connection: api.IConnection,
) {
  // Generate unique admin email (simulate business domain)
  const adminEmail: string & tags.Format<"email"> = (`admin_` +
    RandomGenerator.alphaNumeric(6) +
    `@example-corp.com`) as string & tags.Format<"email">;
  const complexPassword = RandomGenerator.alphaNumeric(16) + "A1!";

  // 1. Successful join with required fields only
  const joinRequest = {
    email: adminEmail,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: adminEmail,
    password: complexPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert(admin);
  TestValidator.equals("email matches", admin.email, joinRequest.email);
  TestValidator.equals(
    "full name matches",
    admin.full_name,
    joinRequest.full_name,
  );
  TestValidator.equals(
    "phone should be undefined/null",
    admin.phone,
    undefined,
  );
  TestValidator.predicate(
    "token exists",
    !!admin.token.access && !!admin.token.refresh,
  );
  TestValidator.equals(
    "password never in response",
    (admin as any).password,
    undefined,
  );

  // 2. Join with phone as well
  const phone = "+821055512345";
  const joinRequestWithPhone = {
    ...joinRequest,
    phone,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminWithPhone = await api.functional.auth.systemAdmin.join(
    connection,
    { body: joinRequestWithPhone },
  );
  typia.assert(adminWithPhone);
  TestValidator.equals(
    "phone is echoed in response",
    adminWithPhone.phone,
    phone,
  );

  // 3. Attempt duplicate join (should error)
  await TestValidator.error("duplicate email is rejected", async () => {
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinRequest,
    });
  });
}
