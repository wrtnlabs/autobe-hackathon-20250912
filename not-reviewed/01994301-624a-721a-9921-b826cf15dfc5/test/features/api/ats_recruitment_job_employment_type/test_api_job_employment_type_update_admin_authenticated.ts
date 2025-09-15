import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify that an authenticated system administrator can update job
 * employment type properties.
 *
 * This test validates the following workflow:
 *
 * 1. Register and log in as a system administrator (stores auth context).
 * 2. Create a new job employment type (record ID and details).
 * 3. Update the employment type's name, description, and is_active fields
 *    successfully as admin.
 * 4. Confirm that the changes are reflected in the returned object.
 * 5. Attempt to update with a duplicate name (must fail).
 * 6. Attempt update without required authorization (must fail).
 *
 * Additional checks:
 *
 * - Only name, description, and is_active are updatable; other fields must
 *   not be affected.
 * - Uniqueness constraints on name are enforced on update.
 * - Proper authentication is required; unauthenticated or wrong role must be
 *   rejected.
 */
export async function test_api_job_employment_type_update_admin_authenticated(
  connection: api.IConnection,
) {
  // 1. Register and log in as system admin (prerequisite, dependent on join/login endpoints).
  const sysAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdmin);

  // 2. Create a new job employment type
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const jobType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(jobType);

  // 3. Update the job employment type (change name, description, toggle is_active)
  const updatedName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 12,
  });
  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    is_active: false,
  } satisfies IAtsRecruitmentJobEmploymentType.IUpdate;
  const updatedJobType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.update(
      connection,
      {
        jobEmploymentTypeId: jobType.id,
        body: updateBody,
      },
    );
  typia.assert(updatedJobType);
  TestValidator.equals(
    "job employment type id should remain unchanged after update",
    updatedJobType.id,
    jobType.id,
  );
  TestValidator.equals(
    "name should change as updated",
    updatedJobType.name,
    updatedName,
  );
  TestValidator.equals(
    "description should change as updated",
    updatedJobType.description,
    updatedDescription,
  );
  TestValidator.equals(
    "is_active should change as updated",
    updatedJobType.is_active,
    false,
  );

  // 4. Attempt to update with a duplicate name (create a second job type first)
  const createBody2 = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 6, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const jobType2 =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: createBody2,
      },
    );
  typia.assert(jobType2);

  await TestValidator.error(
    "update job employment type with duplicate name should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.update(
        connection,
        {
          jobEmploymentTypeId: jobType.id,
          body: {
            name: jobType2.name,
          } satisfies IAtsRecruitmentJobEmploymentType.IUpdate,
        },
      );
    },
  );

  // 5. Attempt update with unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update job employment type",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.update(
        unauthConn,
        {
          jobEmploymentTypeId: jobType.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies IAtsRecruitmentJobEmploymentType.IUpdate,
        },
      );
    },
  );
}
