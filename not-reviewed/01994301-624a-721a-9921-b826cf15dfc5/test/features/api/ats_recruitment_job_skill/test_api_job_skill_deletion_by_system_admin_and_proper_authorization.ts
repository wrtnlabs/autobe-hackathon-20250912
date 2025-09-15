import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the permanent deletion of a job skill by a system administrator,
 * ensuring proper authorization and post-deletion accessibility rules.
 *
 * Steps:
 *
 * 1. Register a system administrator (setup authentication context).
 * 2. Create a new, active job skill as the admin (get jobSkillId).
 * 3. Confirm skill is accessible via GET before deletion.
 * 4. Delete the skill (hard delete) as the admin.
 * 5. Attempt to GET the deleted skill and expect error.
 * 6. Attempt to delete the already deleted skill and expect error.
 * 7. Attempt to delete a random non-existent skill id and expect error.
 * 8. (Simulate improper auth) Re-register with a new admin account and confirm
 *    authorized deletion still works. (Optional HR recruiter role setting
 *    skipped since no function present.)
 */
export async function test_api_job_skill_deletion_by_system_admin_and_proper_authorization(
  connection: api.IConnection,
) {
  // 1. Register a system administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create a new job skill
  const skillInput = {
    name: `Skill-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobSkill.ICreate;
  const created =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      { body: skillInput },
    );
  typia.assert(created);
  TestValidator.equals("created skill name", created.name, skillInput.name);
  const skillId = created.id;

  // 3. Confirm skill accessible via GET before deletion
  const fetched = await api.functional.atsRecruitment.systemAdmin.jobSkills.at(
    connection,
    { jobSkillId: skillId },
  );
  typia.assert(fetched);
  TestValidator.equals("job skill fetched (pre-delete)", fetched.id, skillId);

  // 4. Delete the skill as admin
  await api.functional.atsRecruitment.systemAdmin.jobSkills.erase(connection, {
    jobSkillId: skillId,
  });

  // 5. Attempt to GET the deleted skill -> expect error
  await TestValidator.error("cannot fetch skill after deletion", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.at(connection, {
      jobSkillId: skillId,
    });
  });

  // 6. Attempt to delete the already deleted skill again -> expect error
  await TestValidator.error("cannot delete skill twice", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.erase(
      connection,
      { jobSkillId: skillId },
    );
  });

  // 7. Attempt to delete a truly non-existent skill id (random uuid) -> expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot delete non-existent skill", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.erase(
      connection,
      { jobSkillId: nonExistentId },
    );
  });

  // 8. Create a second admin and check successful deletion with that admin (auth confirmed by join call)
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const adminAuth2 = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody2,
  });
  typia.assert(adminAuth2);
  // Create skill again to ensure ID guaranteed present
  const created2 =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      { body: skillInput },
    );
  typia.assert(created2);
  await api.functional.atsRecruitment.systemAdmin.jobSkills.erase(connection, {
    jobSkillId: created2.id,
  });
}
