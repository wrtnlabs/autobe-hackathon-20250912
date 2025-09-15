import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test creation of job skills by a system administrator, including uniqueness
 * enforcement on name.
 *
 * 1. Register a new system administrator
 * 2. Login as this admin
 * 3. Create a job skill and verify detail/audit fields
 * 4. Attempt to create another skill with the same name to test duplicate
 *    prevention
 *
 * - Use both filled and null description in skill body
 * - Validate is_active population and uniqueness ban on name
 *
 * 5. Confirm all DTO fields are validated by typia.assert()
 */
export async function test_api_systemadmin_job_skill_creation_with_uniqueness_validation(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.predicate(
    "admin has super_admin flag",
    admin.super_admin === true,
  );
  TestValidator.predicate("admin is active", admin.is_active === true);
  TestValidator.predicate(
    "admin has access token",
    typeof admin.token.access === "string",
  );

  // 2. Login as system admin (token is already set from join, but exercise login flow)
  const loggedIn: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(loggedIn);
  TestValidator.equals("login email matches", loggedIn.email, adminEmail);
  TestValidator.equals("login name matches", loggedIn.name, adminName);

  // 3. Create job skill (with filled description)
  const skillName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const skillDescription = RandomGenerator.paragraph({ sentences: 2 });
  const isActive = true;
  const skillBody = {
    name: skillName,
    description: skillDescription,
    is_active: isActive,
  } satisfies IAtsRecruitmentJobSkill.ICreate;

  const skill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      {
        body: skillBody,
      },
    );
  typia.assert(skill);
  TestValidator.equals("skill name matches", skill.name, skillName);
  TestValidator.equals(
    "skill description matches",
    skill.description,
    skillDescription,
  );
  TestValidator.equals("skill activation preserved", skill.is_active, isActive);
  TestValidator.predicate(
    "skill id is uuid string",
    typeof skill.id === "string" && skill.id.length >= 36,
  );
  TestValidator.predicate("created_at present", !!skill.created_at);
  TestValidator.predicate("updated_at present", !!skill.updated_at);
  TestValidator.equals(
    "deleted_at not set for live skill",
    skill.deleted_at,
    null,
  );

  // 4. Attempt to create duplicate skill with same name and null description
  await TestValidator.error("duplicate skill name rejected", async () => {
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      {
        body: {
          name: skillName,
          description: null,
          is_active: isActive,
        } satisfies IAtsRecruitmentJobSkill.ICreate,
      },
    );
  });
}
