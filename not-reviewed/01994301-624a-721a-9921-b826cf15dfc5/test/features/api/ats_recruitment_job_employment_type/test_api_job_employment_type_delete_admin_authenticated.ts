import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate soft-delete of a job employment type by an authenticated system
 * administrator.
 *
 * Steps:
 *
 * 1. Register a system admin
 * 2. Login as system admin
 * 3. Create a new job employment type
 * 4. Delete (soft-delete) the employment type as admin
 * 5. (No list/search endpoint, so verify via deletion and error scenarios only)
 * 6. Attempt to delete the same employment type again and validate error
 * 7. Attempt to delete a non-existent employment type and validate error
 * 8. Attempt to delete as an unauthenticated user and validate error
 */
export async function test_api_job_employment_type_delete_admin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Login as system admin
  const loginResponse: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAtsRecruitmentSystemAdmin.ILogin,
    });
  typia.assert(loginResponse);
  TestValidator.equals(
    "admin login should succeed",
    loginResponse.email,
    adminEmail,
  );

  // 3. Create a new job employment type
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const created: IAtsRecruitmentJobEmploymentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "employment type name should match",
    created.name,
    createBody.name,
  );
  TestValidator.predicate(
    "employment type should be active",
    created.is_active === true,
  );
  TestValidator.equals(
    "employment type description should match",
    created.description,
    createBody.description,
  );
  TestValidator.predicate("employment type not deleted", !created.deleted_at);

  // 4. Delete (soft-delete) the employment type as admin
  await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.erase(
    connection,
    {
      jobEmploymentTypeId: created.id,
    },
  );

  // 5. Try reading the employment type again (no GET endpoint, but if present, would check deleted_at or list)
  // Since there is no listing, we cannot validate list. So focus on error conditions and status.

  // 6. Attempt to delete the same type again and expect error
  await TestValidator.error(
    "double deletion should result in error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.erase(
        connection,
        {
          jobEmploymentTypeId: created.id,
        },
      );
    },
  );

  // 7. Attempt to delete a non-existent employment type (random UUID)
  await TestValidator.error(
    "deleting non-existent employment type should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.erase(
        connection,
        {
          jobEmploymentTypeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Attempt to delete as unauthenticated user (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.erase(
        unauthConn,
        {
          jobEmploymentTypeId: created.id,
        },
      );
    },
  );
}
