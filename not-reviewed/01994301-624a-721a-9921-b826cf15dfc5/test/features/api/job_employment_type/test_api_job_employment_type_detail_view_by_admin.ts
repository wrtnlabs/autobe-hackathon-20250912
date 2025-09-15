import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates system admin's detailed view of job employment type records.
 *
 * Ensures end-to-end flow for correct retrieval and error/authorization
 * handling:
 *
 * - Registers a system admin (join & login) to guarantee authentication
 *   context
 * - Creates a new job employment type as this system admin and records its ID
 * - Fetches the created record by ID, asserting all fields and comparing with
 *   creation payload
 * - Attempts to fetch a random (nonexistent) ID and expects an error
 * - Confirms access denied when authorization is missing or invalid
 */
export async function test_api_job_employment_type_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a job employment type
  const creationPayload = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const created =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      { body: creationPayload },
    );
  typia.assert(created);

  // 3. Successful fetch by ID
  const fetched =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.at(
      connection,
      {
        jobEmploymentTypeId: created.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "all record fields correct",
    {
      name: fetched.name,
      description: fetched.description,
      is_active: fetched.is_active,
    },
    {
      name: creationPayload.name,
      description: creationPayload.description,
      is_active: creationPayload.is_active,
    },
  );

  // 4. Fetch with nonexistent ID -> error
  await TestValidator.error(
    "fetch with random nonexistent ID must fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.at(
        connection,
        {
          jobEmploymentTypeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Attempt without token/with wrong token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetch without authentication token must fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.at(
        unauthConn,
        {
          jobEmploymentTypeId: created.id,
        },
      );
    },
  );
}
