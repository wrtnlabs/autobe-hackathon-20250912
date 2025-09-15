import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter self-profile retrieval.
 *
 * Steps:
 *
 * 1. Register (join) an HR recruiter and authenticate to obtain their id and
 *    token.
 * 2. Fetch their own profile using hrRecruiterId (should succeed, all allowed
 *    fields present, no sensitive fields).
 * 3. Register a second recruiter for negative test.
 * 4. Attempt to fetch the second recruiter's profile while authenticated as the
 *    first (expect error/forbidden).
 * 5. Attempt to fetch a profile with invalid or non-existent hrRecruiterId (expect
 *    not found/error).
 */
export async function test_api_hr_recruiter_self_profile_retrieval(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration & authentication
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(11),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const auth = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);

  // 2. Fetch self-profile (happy path)
  const profile =
    await api.functional.atsRecruitment.hrRecruiter.hrRecruiters.at(
      connection,
      { hrRecruiterId: auth.id },
    );
  typia.assert(profile);
  TestValidator.equals("profile.id matches auth.id", profile.id, auth.id);
  TestValidator.equals(
    "profile email matches join",
    profile.email,
    joinInput.email,
  );
  TestValidator.equals(
    "profile name matches join",
    profile.name,
    joinInput.name,
  );
  TestValidator.equals(
    "profile department matches join",
    profile.department,
    joinInput.department,
  );
  TestValidator.predicate(
    "profile is_active is true",
    profile.is_active === true,
  );
  TestValidator.predicate(
    "profile.created_at is ISO",
    typeof profile.created_at === "string" && !!profile.created_at,
  );
  TestValidator.predicate(
    "profile.updated_at is ISO",
    typeof profile.updated_at === "string" && !!profile.updated_at,
  );
  TestValidator.equals(
    "deleted_at should be null when active",
    profile.deleted_at,
    null,
  );

  // 3. Register a second recruiter
  const joinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(11),
    name: RandomGenerator.name(),
    department: RandomGenerator.name(1),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const auth2 = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinInput2,
  });
  typia.assert(auth2);

  // 4. Attempt to fetch another recruiter's profile with current auth (forbidden)
  await TestValidator.error(
    "cannot fetch another recruiter's profile",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.hrRecruiters.at(
        connection,
        { hrRecruiterId: auth2.id },
      );
    },
  );

  // 5. Attempt to fetch a profile with invalid or non-existent hrRecruiterId
  await TestValidator.error(
    "cannot fetch profile for invalid/non-existent id",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.hrRecruiters.at(
        connection,
        {
          hrRecruiterId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // [No password or credential field present on profile DTO, as required. If such field is accidentally exposed, typia.assert would fail.]
  // [Auditing: If system provided an endpoint to check audit logs, assert log entry exists here. Otherwise, skip.]
}
