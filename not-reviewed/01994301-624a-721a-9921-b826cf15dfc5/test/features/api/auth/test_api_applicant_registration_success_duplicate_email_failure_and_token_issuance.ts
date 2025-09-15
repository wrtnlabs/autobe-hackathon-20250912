import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for ATS applicant self-registration and duplicate email
 * validation.
 *
 * 1. Register a new applicant with unique email, password, and name (optionally
 *    phone).
 * 2. Registration must succeed: response includes JWT token and applicant profile,
 *    is_active=true.
 * 3. The response must NOT contain password anywhere.
 * 4. Second registration with the same email must fail (email uniqueness
 *    enforced).
 * 5. Validate correct tokens/profile and error on duplicate registration.
 */
export async function test_api_applicant_registration_success_duplicate_email_failure_and_token_issuance(
  connection: api.IConnection,
) {
  // 1. Generate unique applicant registration input
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  const phone = Math.random() < 0.5 ? RandomGenerator.mobile() : undefined;
  const registration = {
    email,
    password,
    name,
    ...(phone !== undefined ? { phone } : {}),
  } satisfies IAtsRecruitmentApplicant.ICreate;

  // 2. Successful applicant registration
  const authorized = await api.functional.auth.applicant.join(connection, {
    body: registration,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "JWT token is present",
    !!authorized.token &&
      !!authorized.token.access &&
      !!authorized.token.refresh,
  );
  TestValidator.predicate("is_active is true", authorized.is_active === true);
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("name matches", authorized.name, name);
  if (phone !== undefined && phone !== null) {
    TestValidator.equals("phone matches", authorized.phone, phone);
  }
  TestValidator.predicate(
    "password field is NOT present in response",
    !Object.keys(authorized).includes("password"),
  );

  // 3. Try registering with the same email again, must fail
  await TestValidator.error(
    "duplicate registration by email must fail",
    async () => {
      await api.functional.auth.applicant.join(connection, {
        body: registration,
      });
    },
  );
}
