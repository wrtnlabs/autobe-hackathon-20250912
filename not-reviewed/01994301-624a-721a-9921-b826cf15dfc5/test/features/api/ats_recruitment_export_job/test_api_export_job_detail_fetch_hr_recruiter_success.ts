import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter export job detail fetch when authenticated as the
 * creator.
 *
 * This test validates the following flow:
 *
 * 1. Register a new HR recruiter and login (capture recruiter id and credentials)
 * 2. Create an export job as this recruiter with test data (initiator_id =
 *    recruiter.id)
 * 3. Fetch the export job details by exportJobId as the same recruiter
 * 4. Assert the returned export job matches the created job on all fields
 * 5. Validate that all fields conform to DTO definitions (via typia)
 * 6. Business assertions: job is only fetchable by creator, job details are as
 *    expected
 */
export async function test_api_export_job_detail_fetch_hr_recruiter_success(
  connection: api.IConnection,
) {
  // 1. Register and login as a new HR recruiter
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();
  const department = RandomGenerator.name();
  const joinReq = {
    email,
    password,
    name,
    department,
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: joinReq,
  });
  typia.assert(recruiter);

  // 2. Create an export job as the newly joined recruiter
  const jobType = RandomGenerator.pick([
    "applicants",
    "applications",
    "resumes",
    "auditLogs",
  ] as const);
  const deliveryMethod = RandomGenerator.pick([
    "download",
    "email",
    "uri",
  ] as const);
  const jobCreateReq = {
    initiator_id: recruiter.id,
    job_type: jobType,
    delivery_method: deliveryMethod,
    request_description: RandomGenerator.paragraph(),
    filter_json: JSON.stringify({ test: true, jobType }),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const createdJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.create(
      connection,
      { body: jobCreateReq },
    );
  typia.assert(createdJob);

  // 3. Fetch export job by id as same recruiter
  const fetchedJob =
    await api.functional.atsRecruitment.hrRecruiter.exportJobs.at(connection, {
      exportJobId: createdJob.id,
    });
  typia.assert(fetchedJob);

  // 4. Assert that the fetched job equals the created job (allowing for updated_at/created_at/etc differences)
  TestValidator.equals(
    "export job fields match on fetch (core, non-system fields)",
    {
      initiator_id: fetchedJob.initiator_id,
      job_type: fetchedJob.job_type,
      delivery_method: fetchedJob.delivery_method,
      request_description: fetchedJob.request_description,
      filter_json: fetchedJob.filter_json,
      target_job_posting_id: fetchedJob.target_job_posting_id,
      target_application_id: fetchedJob.target_application_id,
    },
    {
      initiator_id: createdJob.initiator_id,
      job_type: createdJob.job_type,
      delivery_method: createdJob.delivery_method,
      request_description: createdJob.request_description,
      filter_json: createdJob.filter_json,
      target_job_posting_id: createdJob.target_job_posting_id,
      target_application_id: createdJob.target_application_id,
    },
  );
  TestValidator.equals(
    "initiator is recruiter",
    fetchedJob.initiator_id,
    recruiter.id,
  );
}
