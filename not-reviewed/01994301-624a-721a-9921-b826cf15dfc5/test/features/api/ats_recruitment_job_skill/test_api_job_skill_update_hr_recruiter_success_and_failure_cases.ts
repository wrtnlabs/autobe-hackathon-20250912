import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates HR recruiter's ability to update job skills (success and
 * failure scenarios).
 *
 * 1. Register and authenticate as an HR recruiter.
 * 2. Create two job skills (skillA, skillB) with unique names.
 * 3. Update skillA with new name, description, and activation status; confirm
 *    via GET and TestValidator.
 * 4. Try updating skillB with skillA's new name (should receive duplicate name
 *    validation error).
 * 5. Try updating skillA with empty string name (should fail validation).
 * 6. Try updating a disabled skill (simulate deletion with is_active=false)
 *    and expect forbidden update.
 * 7. After each valid update, confirm audit persistence by fetching updated
 *    skill via GET and comparing to update input.
 */
export async function test_api_job_skill_update_hr_recruiter_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter and log in
  const recruiterJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: recruiterJoin,
  });
  typia.assert(recruiter);

  // 2. Create two job skills: skillA and skillB
  const skillCreateA = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobSkill.ICreate;
  const skillA =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
      connection,
      { body: skillCreateA },
    );
  typia.assert(skillA);

  const skillCreateB = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobSkill.ICreate;
  const skillB =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
      connection,
      { body: skillCreateB },
    );
  typia.assert(skillB);

  // 3. Update skillA's name, description, and status (success)
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const updateA = {
    name: newName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: false,
  } satisfies IAtsRecruitmentJobSkill.IUpdate;
  const updatedA =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.update(
      connection,
      { jobSkillId: skillA.id, body: updateA },
    );
  typia.assert(updatedA);
  TestValidator.equals("skillA name updated", updatedA.name, newName);
  TestValidator.equals("skillA is_active updated", updatedA.is_active, false);
  // Confirm persistence via GET
  const reloadedA =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.at(connection, {
      jobSkillId: skillA.id,
    });
  typia.assert(reloadedA);
  TestValidator.equals("GET reflects updated name", reloadedA.name, newName);

  // 4. Try updating skillB's name to skillA's (should fail for duplicate name)
  await TestValidator.error("duplicate skill name should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.update(
      connection,
      {
        jobSkillId: skillB.id,
        body: { name: newName } satisfies IAtsRecruitmentJobSkill.IUpdate,
      },
    );
  });
  // Confirm skillB still has original name
  const reloadB = await api.functional.atsRecruitment.hrRecruiter.jobSkills.at(
    connection,
    { jobSkillId: skillB.id },
  );
  typia.assert(reloadB);
  TestValidator.equals(
    "skillB name unchanged after duplicate attempt",
    reloadB.name,
    skillB.name,
  );

  // 5. Try updating skillA with empty string name (should fail validation)
  await TestValidator.error("empty skill name not allowed", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.update(
      connection,
      {
        jobSkillId: skillA.id,
        body: { name: "" } satisfies IAtsRecruitmentJobSkill.IUpdate,
      },
    );
  });

  // 6. Try updating disabled (is_active=false) skill (simulate as deleted)
  // Consider: Use skillA which is now is_active=false
  await TestValidator.error(
    "cannot update disabled (deleted) skill",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobSkills.update(
        connection,
        {
          jobSkillId: skillA.id,
          body: {
            description: "Should not work",
          } satisfies IAtsRecruitmentJobSkill.IUpdate,
        },
      );
    },
  );
}
