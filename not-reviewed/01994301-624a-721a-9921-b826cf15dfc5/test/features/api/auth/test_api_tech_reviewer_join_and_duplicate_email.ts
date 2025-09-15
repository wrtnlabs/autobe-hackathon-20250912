import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate technical reviewer registration flow and uniqueness constraints.
 *
 * 1. Register a new tech reviewer using unique random credentials.
 * 2. Confirm response contains all expected fields, including is_active true and
 *    JWT token info, but NOT the password.
 * 3. Attempt to register a second reviewer with the same email and other unique
 *    values.
 * 4. Validate that the second registration fails and a clear error is produced, no
 *    duplicate user created.
 */
export async function test_api_tech_reviewer_join_and_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Generate random, unique registration info
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12);
  const name: string = RandomGenerator.name();
  const specialization: string = RandomGenerator.paragraph({ sentences: 2 });

  const createBody = {
    email,
    password,
    name,
    specialization,
  } satisfies IAtsRecruitmentTechReviewer.ICreate;

  // 2. Register tech reviewer
  const auth: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: createBody,
    });
  typia.assert(auth);

  // 3. Validate output structure and business logic
  TestValidator.equals(
    "tech reviewer email is set correctly",
    auth.email,
    email,
  );
  TestValidator.equals("tech reviewer name is set correctly", auth.name, name);
  TestValidator.equals(
    "tech reviewer specialization is set correctly",
    auth.specialization,
    specialization,
  );
  TestValidator.equals("tech reviewer is_active is true", auth.is_active, true);
  TestValidator.predicate(
    "authorization token access exists",
    typeof auth.token.access === "string" && auth.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh exists",
    typeof auth.token.refresh === "string" && auth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization token expired_at is ISO string",
    typeof auth.token.expired_at === "string" &&
      !isNaN(Date.parse(auth.token.expired_at)),
  );
  TestValidator.predicate(
    "authorization token refreshable_until is ISO string",
    typeof auth.token.refreshable_until === "string" &&
      !isNaN(Date.parse(auth.token.refreshable_until)),
  );
  TestValidator.predicate(
    "password is not returned in output",
    !(auth as any).password,
  );

  // 4. Attempt to register another reviewer with the same email
  const duplicateBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    specialization: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentTechReviewer.ICreate;

  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await api.functional.auth.techReviewer.join(connection, {
        body: duplicateBody,
      });
    },
  );
}
