import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter standard export job creation and edge
 * authorization/error scenarios.
 *
 * This test simulates the full workflow: HR recruiter registration, export job
 * creation, schema validation, business linkage, and negative path/edge-case
 * enforcement for invalid filter criteria, duplicate attempts, and
 * unauthenticated access.
 *
 * Steps:
 *
 * 1. Register and authenticate as new HR recruiter.
 * 2. HR recruiter creates standard export job of type 'applicants' (e.g. for
 *    downloading an applicant list).
 * 3. Validate response schema, and that initiator_id is correctly attributed to
 *    recruiter.
 * 4. Negative test: invalid filter_json (random string instead of JSON), expect
 *    error.
 * 5. Negative test: attempt duplicate submission (repeat same job quickly), expect
 *    error.
 * 6. Attempt job creation as unauthenticated user (fresh connection), expect
 *    error.
 */
export async function test_api_export_job_create_hr_recruiter_standard(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const department = RandomGenerator.paragraph({ sentences: 2 });

  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email,
        password,
        name,
        department,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Standard export job creation
  const exportBody = {
    initiator_id: hrRecruiter.id,
    job_type: "applicants",
    delivery_method: "download",
    request_description: RandomGenerator.paragraph(),
    filter_json: JSON.stringify({ active: true }),
  } satisfies IAtsRecruitmentExportJob.ICreate;

  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: exportBody },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "initiator_id matches HR recruiter",
    exportJob.initiator_id,
    hrRecruiter.id,
  );
  TestValidator.equals(
    "job_type assigned correctly",
    exportJob.job_type,
    exportBody.job_type,
  );
  TestValidator.equals(
    "delivery_method assigned",
    exportJob.delivery_method,
    exportBody.delivery_method,
  );

  // 3. Business linkage (initiator_id must match HR recruiter)
  TestValidator.equals(
    "HR recruiter id in export job matches",
    exportJob.initiator_id,
    hrRecruiter.id,
  );

  // 4. Negative: invalid filter_json (not proper JSON)
  const invalidFilter = {
    ...exportBody,
    filter_json: "not_a_json",
  } satisfies IAtsRecruitmentExportJob.ICreate;
  await TestValidator.error(
    "invalid filter_json value should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
        connection,
        { body: invalidFilter },
      );
    },
  );

  // 5. Negative: duplicate export job (simulate by retrying same request)
  await TestValidator.error(
    "duplicate export job submission should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
        connection,
        { body: exportBody },
      );
    },
  );

  // 6. Negative: unauthenticated call
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "export job creation must require authentication",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
        unauthConn,
        { body: exportBody },
      );
    },
  );
}
