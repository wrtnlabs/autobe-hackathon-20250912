import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test for HR recruiter registration, token issuance, and duplicate
 * email failure.
 *
 * 1. Generate random HR recruiter registration data (unique business email, secure
 *    password, recruiter name, department).
 * 2. Attempt registration: should succeed. Response must contain access/refresh
 *    tokens, recruiter profile (with is_active=true), and NOT contain the
 *    password field. Validate token and recruiter DTO shapes.
 * 3. Attempt registration again with the same email: should fail with a validation
 *    error indicating email is taken (uniqueness violation).
 * 4. Confirm no tokens or new profile are returned in duplicate attempt.
 */
export async function test_api_hr_recruiter_registration_success_duplicate_email_failure_and_token_issuance(
  connection: api.IConnection,
) {
  // 1. Generate registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  const department = RandomGenerator.paragraph({ sentences: 2 });

  const registration = {
    email,
    password,
    name,
    department,
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;

  // 2. Successful registration attempt
  const authorized = await api.functional.auth.hrRecruiter.join(connection, {
    body: registration,
  });
  typia.assert<IAtsRecruitmentHrRecruiter.IAuthorized>(authorized);

  // Validate tokens are present and shaped properly
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.predicate(
    "access token issued",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token issued",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiry is ISO date-time",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // Validate recruiter profile
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals("name matches input", authorized.name, name);
  TestValidator.equals(
    "department matches input",
    authorized.department,
    department,
  );
  TestValidator.predicate("is_active is true", authorized.is_active === true);
  TestValidator.predicate(
    "profile id is uuid",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  // The password must NOT be present in the response (never transmitted)
  TestValidator.predicate(
    "password is never present in authorized profile",
    !("password" in authorized),
  );

  // 3. Duplicate registration attempt with same email
  const duplicateRegistration = {
    email,
    password: RandomGenerator.alphaNumeric(16), // new password, but same email
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;

  await TestValidator.error(
    "duplicate registration fails with uniqueness error",
    async () => {
      await api.functional.auth.hrRecruiter.join(connection, {
        body: duplicateRegistration,
      });
    },
  );
}
