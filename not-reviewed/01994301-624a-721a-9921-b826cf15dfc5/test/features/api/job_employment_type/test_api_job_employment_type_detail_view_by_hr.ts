import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter's ability to view job employment type detail.
 *
 * 1. Register and log in as HR recruiter to get authorization
 * 2. Create a job employment type (active)
 * 3. Successfully retrieve detail by ID and validate all fields
 * 4. Attempt to retrieve type with unknown (random) ID - expect failure
 * 5. Remove auth context and check unauthorized access error
 * 6. Create new inactive employment type and validate retrieval
 * 7. (Skipped: test on soft-deleted as API provides no deletion)
 */
export async function test_api_job_employment_type_detail_view_by_hr(
  connection: api.IConnection,
) {
  // 1. HR recruiter join and login to obtain authorization
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrJoin);

  const hrLogin = await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  typia.assert(hrLogin);

  // 2. Create a job employment type (active)
  const empTypeInput = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const createdEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: empTypeInput,
      },
    );
  typia.assert(createdEmpType);

  // 3. Successfully retrieve detail by ID
  const readEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.at(
      connection,
      {
        jobEmploymentTypeId: createdEmpType.id,
      },
    );
  typia.assert(readEmpType);
  TestValidator.equals(
    "employment type fields equal",
    readEmpType.id,
    createdEmpType.id,
  );
  TestValidator.equals(
    "employment type name equal",
    readEmpType.name,
    empTypeInput.name,
  );
  TestValidator.equals(
    "employment type description equal",
    readEmpType.description,
    empTypeInput.description,
  );
  TestValidator.equals("employment type active", readEmpType.is_active, true);
  TestValidator.predicate(
    "created and updated_at are valid ISO time",
    typeof readEmpType.created_at === "string" &&
      typeof readEmpType.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    readEmpType.deleted_at,
    null,
  );

  // 4. Retrieve by non-existent ID
  await TestValidator.error("not found on random UUID", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.at(
      connection,
      {
        jobEmploymentTypeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Unauthorized: remove token and retry
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden if unauthorized", async () => {
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.at(
      unauthConn,
      {
        jobEmploymentTypeId: createdEmpType.id,
      },
    );
  });

  // 6. Create new inactive employment type
  const empTypeInactiveInput = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: false,
  } satisfies IAtsRecruitmentJobEmploymentType.ICreate;
  const createdInactiveEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: empTypeInactiveInput,
      },
    );
  typia.assert(createdInactiveEmpType);
  const readInactiveEmpType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.at(
      connection,
      {
        jobEmploymentTypeId: createdInactiveEmpType.id,
      },
    );
  typia.assert(readInactiveEmpType);
  TestValidator.equals(
    "inactive employment type id",
    readInactiveEmpType.id,
    createdInactiveEmpType.id,
  );
  TestValidator.equals(
    "inactive employment type name",
    readInactiveEmpType.name,
    empTypeInactiveInput.name,
  );
  TestValidator.equals(
    "inactive employment type description",
    readInactiveEmpType.description,
    empTypeInactiveInput.description,
  );
  TestValidator.equals(
    "inactive employment type status",
    readInactiveEmpType.is_active,
    false,
  );
}
