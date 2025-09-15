import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieving detailed information for a single job skill in the HR
 * recruiter system.
 *
 * Steps:
 *
 * 1. Register a new HR recruiter (POST /auth/hrRecruiter/join).
 * 2. Login as that recruiter to ensure correct authentication (POST
 *    /auth/hrRecruiter/login).
 * 3. Create a new job skill (POST /atsRecruitment/hrRecruiter/jobSkills) with a
 *    random unique name; capture the returned jobSkillId.
 * 4. Retrieve the job skill by its ID (GET
 *    /atsRecruitment/hrRecruiter/jobSkills/{jobSkillId}) and verify all
 *    returned fields for accuracy and matching.
 * 5. Attempt to retrieve a random non-existent jobSkillId (should expect error).
 * 6. Simulate a soft-delete scenario by creating another job skill, and then
 *    (simulating delete by direct mutation isn't possible, so we skip actual
 *    deletion), and attempt retrieval (should expect error if delete is
 *    possible on API; otherwise, document skip).
 *
 * Business validation: Skill name must be unique; activation status is
 * respected; error responses for not-found/soft-deleted records are enforced;
 * only authorized HR recruiters can access details.
 */
export async function test_api_hrrecruiter_job_skill_detail_success_and_error_cases(
  connection: api.IConnection,
) {
  // Step 1: Register a new HR recruiter
  const recruiterEmail: string = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterName: string = RandomGenerator.name();
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: recruiterName,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);
  TestValidator.equals(
    "recruiter email matches",
    recruiterJoin.email,
    recruiterEmail,
  );
  TestValidator.equals(
    "recruiter name matches",
    recruiterJoin.name,
    recruiterName,
  );

  // Step 2: Login as HR recruiter
  const loginResult = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "login email matches",
    loginResult.email,
    recruiterEmail,
  );

  // Step 3: Create a new job skill
  const newSkillName = `${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}-${RandomGenerator.alphaNumeric(6)}`;
  const skillDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const createSkillResult =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.create(
      connection,
      {
        body: {
          name: newSkillName,
          description: skillDescription,
          is_active: true,
        } satisfies IAtsRecruitmentJobSkill.ICreate,
      },
    );
  typia.assert(createSkillResult);
  TestValidator.equals(
    "job skill name matches",
    createSkillResult.name,
    newSkillName,
  );
  TestValidator.equals(
    "job skill description matches",
    createSkillResult.description,
    skillDescription,
  );
  TestValidator.predicate("job skill is active", createSkillResult.is_active);
  const skillId = createSkillResult.id;

  // Step 4: Retrieve the skill by its ID and verify contents
  const retrievedSkill =
    await api.functional.atsRecruitment.hrRecruiter.jobSkills.at(connection, {
      jobSkillId: skillId,
    });
  typia.assert(retrievedSkill);
  TestValidator.equals(
    "retrieved skill id matches created",
    retrievedSkill.id,
    skillId,
  );
  TestValidator.equals(
    "retrieved skill name matches",
    retrievedSkill.name,
    newSkillName,
  );
  TestValidator.equals(
    "retrieved skill is_active is true",
    retrievedSkill.is_active,
    true,
  );
  TestValidator.equals(
    "retrieved skill description",
    retrievedSkill.description,
    skillDescription,
  );
  TestValidator.predicate(
    "retrieved skill not soft deleted",
    !retrievedSkill.deleted_at && retrievedSkill.is_active,
  );

  // Step 5: Attempt to retrieve a random non-existent job skill ID -- must receive error
  const randomFakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent job skill throws error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.jobSkills.at(connection, {
        jobSkillId: randomFakeId,
      });
    },
  );

  // Step 6: Simulate soft-deleted skill retrieval (not possible with only create/at endpoints)
  // Document as skipped if no API to soft-delete and test only valid and invalid/unknown detail retrieval.
}
