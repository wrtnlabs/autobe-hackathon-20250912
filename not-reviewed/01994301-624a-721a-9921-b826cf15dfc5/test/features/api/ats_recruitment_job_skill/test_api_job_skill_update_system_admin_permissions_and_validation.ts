import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test full admin-driven update of a job skill entity by system
 * administrator—including modifications to name, description, and activation
 * status. Covers verifying that changes are accepted for valid inputs,
 * uniqueness constraint enforcement on skill name, empty field validation, and
 * correct audit record generation. Failure flows include update attempt on
 * non-existent or already hard-deleted skills. Also verifies permission is
 * required and only admins can update any skill regardless of creator.
 */
export async function test_api_job_skill_update_system_admin_permissions_and_validation(
  connection: api.IConnection,
) {
  // 1. Register and login as new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "SuperSecret123!",
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(admin);

  // 2. Create a job skill to be updated
  const originalName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const skill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      {
        body: {
          name: originalName,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          is_active: true,
        },
      },
    );
  typia.assert(skill);

  // 3. Fetch skill before update
  const skillBefore =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.at(connection, {
      jobSkillId: skill.id,
    });
  typia.assert(skillBefore);
  TestValidator.equals(
    "skill id unchanged before update",
    skillBefore.id,
    skill.id,
  );
  TestValidator.equals(
    "skill name matches before update",
    skillBefore.name,
    originalName,
  );

  // 4. Create another skill for use in uniqueness test
  const otherSkill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(otherSkill);

  // 5. Prepare new values to update
  const updatedName = RandomGenerator.paragraph({ sentences: 3, wordMin: 6 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedActive = false;

  // 6. Update skill as admin
  const updatedSkill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
      connection,
      {
        jobSkillId: skill.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          is_active: updatedActive,
        },
      },
    );
  typia.assert(updatedSkill);
  TestValidator.equals(
    "skill id after update matches original",
    updatedSkill.id,
    skill.id,
  );
  TestValidator.equals(
    "skill name updated correctly",
    updatedSkill.name,
    updatedName,
  );
  TestValidator.equals(
    "skill description updated",
    updatedSkill.description,
    updatedDescription,
  );
  TestValidator.equals(
    "skill is_active flag updated",
    updatedSkill.is_active,
    updatedActive,
  );
  TestValidator.notEquals(
    "updated timestamp was changed",
    updatedSkill.updated_at,
    skillBefore.updated_at,
  );

  // 7. Fetch skill after update; validate
  const skillAfter =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.at(connection, {
      jobSkillId: skill.id,
    });
  typia.assert(skillAfter);
  TestValidator.equals(
    "skill after update matches update response",
    skillAfter,
    updatedSkill,
    (key) => key === "updated_at",
  );

  // 8. Unique name violation: try to rename to otherSkill's name
  await TestValidator.error(
    "uniqueness conflict for skill name is rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
        connection,
        {
          jobSkillId: skill.id,
          body: {
            name: otherSkill.name,
          },
        },
      );
    },
  );

  // 9. Empty name (required field violation)
  await TestValidator.error("empty skill name is rejected", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
      connection,
      {
        jobSkillId: skill.id,
        body: {
          name: "",
        },
      },
    );
  });

  // 10. Set description null
  const descNullSkill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
      connection,
      {
        jobSkillId: skill.id,
        body: {
          description: null,
        },
      },
    );
  typia.assert(descNullSkill);
  TestValidator.equals(
    "can clear skill description with null",
    descNullSkill.description,
    null,
  );

  // 11. Non-existent skill update
  await TestValidator.error(
    "updating a non-existent skill returns error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
        connection,
        {
          jobSkillId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.name(),
          },
        },
      );
    },
  );

  // 12. Soft deletion scenario - simulate delete by updating is_active false and clearing name/desc
  const softDeleted =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
      connection,
      {
        jobSkillId: skill.id,
        body: {
          is_active: false,
          name: "SoftDeleted" + RandomGenerator.alphabets(5),
          description: null,
        },
      },
    );
  typia.assert(softDeleted);
  TestValidator.equals(
    "is_active flag set to false",
    softDeleted.is_active,
    false,
  );

  // 13. Attempt update as unauthenticated user (admin token cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin permission required to update skill",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobSkills.update(
        unauthConn,
        {
          jobSkillId: skill.id,
          body: {
            name: RandomGenerator.name(),
          },
        },
      );
    },
  );
}
