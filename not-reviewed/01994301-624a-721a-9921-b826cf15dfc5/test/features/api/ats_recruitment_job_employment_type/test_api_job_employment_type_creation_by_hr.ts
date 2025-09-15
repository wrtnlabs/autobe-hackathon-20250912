import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test HR recruiter job employment type creation with full validation and
 * errors.
 *
 * 1. Register and login a random HR recruiter.
 * 2. Create a new employment type with unique random name and is_active=true,
 *    description random or omitted.
 * 3. Validate response is properly structured and typia-asserted,
 *    created_at/updated_at are valid iso dates, id is uuid, deleted_at is
 *    null/undefined.
 * 4. Attempt duplicate name creation, expect business logic error.
 * 5. Attempt creation with name = empty string, expect business error.
 * 6. Only business logic validation is tested, type error scenarios are omitted
 *    (missing required fields or wrong types).
 */
export async function test_api_job_employment_type_creation_by_hr(
  connection: api.IConnection,
) {
  // Step 1. Register HR recruiter and obtain authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email,
      password,
      name,
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr);

  // Step 2. Create a valid job employment type
  const employmentTypeName = RandomGenerator.name(1);
  const description = RandomGenerator.paragraph();
  const createBody = {
    name: employmentTypeName,
    description,
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;

  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: createBody },
    );
  typia.assert(employmentType);
  TestValidator.equals(
    "name matches input",
    employmentType.name,
    employmentTypeName,
  );
  TestValidator.equals(
    "description matches input",
    employmentType.description,
    description,
  );
  TestValidator.equals(
    "is_active matches input",
    employmentType.is_active,
    true,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    employmentType.deleted_at,
    null,
  );

  // Step 3. Attempt duplicate name creation
  await TestValidator.error("duplicate name should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      { body: createBody },
    );
  });

  // Step 4. Invalid name (empty string)
  await TestValidator.error("empty string name should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: "",
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  });
}
