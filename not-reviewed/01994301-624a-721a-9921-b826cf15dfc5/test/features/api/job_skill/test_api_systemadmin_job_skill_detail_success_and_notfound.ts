import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobSkill } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobSkill";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate system administrator's ability to retrieve job skill detail
 * including both success and not-found cases.
 *
 * Steps:
 *
 * 1. Register a new system administrator (unique email, password, name).
 * 2. Log in as the system admin (even though join provides a token, this ensures
 *    login is tested).
 * 3. Create a new job skill (unique name, valid/optional description, active
 *    flag).
 * 4. Retrieve newly created job skill by its ID, verify all critical fields.
 * 5. Attempt to retrieve a non-existent job skill using a random UUID, ensure API
 *    throws error (not-found/business logic error).
 *
 * Validates: registration, authentication, job skill CRUD, schema, business
 * logic, error handling, and access control.
 */
export async function test_api_systemadmin_job_skill_detail_success_and_notfound(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
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

  // 2. Log in as system admin (to ensure login flow)
  const auth: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(auth);

  // 3. Create a new job skill
  const createBody = {
    name: `Skill ${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobSkill.ICreate;
  const createdSkill: IAtsRecruitmentJobSkill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdSkill);
  TestValidator.equals(
    "created skill name matches",
    createdSkill.name,
    createBody.name,
  );
  TestValidator.equals(
    "created skill description matches",
    createdSkill.description,
    createBody.description,
  );
  TestValidator.equals(
    "created skill is_active matches",
    createdSkill.is_active,
    createBody.is_active,
  );

  // 4. Retrieve the created job skill by ID
  const jobSkill: IAtsRecruitmentJobSkill =
    await api.functional.atsRecruitment.systemAdmin.jobSkills.at(connection, {
      jobSkillId: createdSkill.id,
    });
  typia.assert(jobSkill);
  TestValidator.equals(
    "retrieved skill id matches",
    jobSkill.id,
    createdSkill.id,
  );
  TestValidator.equals(
    "retrieved skill name matches",
    jobSkill.name,
    createBody.name,
  );
  TestValidator.equals(
    "retrieved skill description matches",
    jobSkill.description,
    createBody.description,
  );
  TestValidator.equals(
    "retrieved skill is_active matches",
    jobSkill.is_active,
    createBody.is_active,
  );

  // 5. Attempt to retrieve a non-existent job skill (random UUID)
  await TestValidator.error(
    "retrieving non-existent jobSkillId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobSkills.at(connection, {
        jobSkillId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
