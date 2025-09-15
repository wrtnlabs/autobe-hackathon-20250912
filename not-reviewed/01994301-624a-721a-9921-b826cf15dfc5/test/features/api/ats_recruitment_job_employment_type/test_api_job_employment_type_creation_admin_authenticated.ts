import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate end-to-end creation of job employment types by an authenticated
 * system admin.
 *
 * 1. Register a new system admin account (unique email, password, name).
 * 2. Login as that admin to set authorization context.
 * 3. Successfully create a new job employment type with a unique name and
 *    description; validate returned fields.
 * 4. Attempt duplicate creation with the same name (should fail, expect error).
 * 5. Attempt unauthenticated creation (should fail, expect error). Never test type
 *    errors or missing required fields.
 */
export async function test_api_job_employment_type_creation_admin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminReg: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(adminReg);
  TestValidator.equals("admin email is correct", adminReg.email, adminEmail);
  TestValidator.predicate(
    "admin is active after registration",
    adminReg.is_active === true,
  );

  // 2. Login as admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "login returns same email",
    adminLogin.email,
    adminEmail,
  );
  TestValidator.equals("login returns same name", adminLogin.name, adminName);
  TestValidator.predicate(
    "admin login yields token",
    typeof adminLogin.token.access === "string" &&
      adminLogin.token.access.length > 0,
  );

  // 3. Create new job employment type (success case)
  const baseTypeName = RandomGenerator.paragraph({ sentences: 3, wordMin: 5 });
  const employmentTypeBody = {
    name: baseTypeName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const created: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      { body: employmentTypeBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "employment type name matches",
    created.name,
    employmentTypeBody.name,
  );
  TestValidator.equals("employment type is active", created.is_active, true);
  TestValidator.equals(
    "employment type description matches",
    created.description,
    employmentTypeBody.description,
  );
  TestValidator.predicate(
    "employment type id is a nonempty uuid",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "employment type created_at is valid date-time",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );

  // 4. Attempt duplicate creation (should fail)
  await TestValidator.error(
    "cannot create job employment type with duplicate name",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
        connection,
        { body: { ...employmentTypeBody } },
      );
    },
  );

  // 5. Attempt unauthenticated creation (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "cannot create job employment type when not authenticated",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
        unauthConn,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: true,
          } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
        },
      );
    },
  );
}
