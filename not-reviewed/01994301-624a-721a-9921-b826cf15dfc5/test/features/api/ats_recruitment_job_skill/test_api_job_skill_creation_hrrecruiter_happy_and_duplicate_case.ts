import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test HR recruiter job skill creation and uniqueness enforcement.
 *
 * 1. Register a new HR recruiter. Department is omitted (optional path).
 * 2. Log in using the new recruiter's credentials.
 * 3. Create a unique job skill (happy path, description provided, is_active=true).
 *
 *    - Assert on presence of job skill fields, active status, and audit trail
 *         fields.
 * 4. Attempt duplicate job skill creation (same name, different description,
 *    is_active false).
 *
 *    - Expect business error due to duplicate name.
 *    - Assert response does not include a new job skill.
 * 5. Optionally: Try creating a skill with different name and no description to
 *    cover optional field omission.
 */
export async function test_api_job_skill_creation_hrrecruiter_happy_and_duplicate_case(
  connection: api.IConnection,
) {
  // Step 1: Register HR recruiter (department omitted)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const name = RandomGenerator.name();
  const joinResponse = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email,
      password,
      name,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinResponse);
  TestValidator.predicate("new recruiter is active", joinResponse.is_active);
  TestValidator.equals(
    "department field omitted, should be null|undefined",
    joinResponse.department,
    undefined,
  );

  // Step 2: HR recruiter login
  const loginResponse = await api.functional.auth.hrRecruiter.login(
    connection,
    {
      body: {
        email,
        password,
      } satisfies IAtsRecruitmentHrRecruiter.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals("login email matches", loginResponse.email, email);

  // Step 3: Create job skill (happy path, unique name)
  const skillName = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.paragraph({ sentences: 4 });
  const createResponse =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
      connection,
      {
        body: {
          name: skillName,
          description,
          is_active: true,
        } satisfies IAtsRecruitmentJobSkill.ICreate,
      },
    );
  typia.assert(createResponse);
  TestValidator.equals(
    "created skill name matches",
    createResponse.name,
    skillName,
  );
  TestValidator.equals(
    "created skill is_active",
    createResponse.is_active,
    true,
  );
  TestValidator.predicate(
    "created_at has ISO 8601 format",
    typeof createResponse.created_at === "string" &&
      createResponse.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at has ISO 8601 format",
    typeof createResponse.updated_at === "string" &&
      createResponse.updated_at.includes("T"),
  );
  TestValidator.equals(
    "description matches",
    createResponse.description,
    description,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    createResponse.deleted_at,
    null,
  );

  // Step 4: Attempt to create duplicate job skill (expect error)
  await TestValidator.error(
    "creating job skill with duplicate name fails",
    async () =>
      await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
        connection,
        {
          body: {
            name: skillName,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: false,
          } satisfies IAtsRecruitmentJobSkill.ICreate,
        },
      ),
  );

  // Step 5: Create job skill with different unique name (without description)
  const otherSkillName = RandomGenerator.paragraph({ sentences: 3 });
  const otherSkill =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
      connection,
      {
        body: {
          name: otherSkillName,
          is_active: false,
        } satisfies IAtsRecruitmentJobSkill.ICreate,
      },
    );
  typia.assert(otherSkill);
  TestValidator.equals("2nd skill name", otherSkill.name, otherSkillName);
  TestValidator.equals(
    "2nd skill is_active false",
    otherSkill.is_active,
    false,
  );
  TestValidator.equals(
    "2nd skill description omitted is null or undefined",
    otherSkill.description,
    undefined,
  );
}
