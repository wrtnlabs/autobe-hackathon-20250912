import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates creation of an export job for job applications by a system
 * administrator.
 *
 * Business context: System administrators must be able to initiate export jobs
 * to extract job application data, for reporting or compliance. This requires
 * privileged access and correct specification of export parameters. The test
 * covers admin registration, job creation, and validation of permissions and
 * metadata, as well as business logic error cases.
 *
 * Steps:
 *
 * 1. Register a new system administrator via POST /auth/systemAdmin/join
 * 2. Create an export job as that administrator via POST
 *    /atsRecruitment/systemAdmin/exportJobs
 * 3. Validate all mandatory metadata (id, initiator_id, job_type, etc.) in the
 *    export job record
 * 4. Attempt to create an export job with invalid delivery_method (should error)
 * 5. Attempt to create with invalid job_type (should error)
 * 6. Attempt as unauthenticated user (should error)
 */
export async function test_api_export_job_create_system_admin_applications(
  connection: api.IConnection,
) {
  // 1. Register new system admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: false,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Create an export job as admin
  const exportJobInput = {
    initiator_id: admin.id,
    job_type: "applications", // use a plausible value
    delivery_method: "download", // plausible/commonly allowed value
    request_description: "Exporting all recent applications for reporting",
    filter_json: JSON.stringify({ status: ["submitted", "reviewed"] }),
  } satisfies IAtsRecruitmentExportJob.ICreate;

  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      { body: exportJobInput },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "initiator_id matches admin id",
    exportJob.initiator_id,
    admin.id,
  );
  TestValidator.equals(
    "job_type matches request",
    exportJob.job_type,
    exportJobInput.job_type,
  );
  TestValidator.equals(
    "delivery_method matches request",
    exportJob.delivery_method,
    exportJobInput.delivery_method,
  );
  TestValidator.predicate(
    "export job has UUID id",
    typeof exportJob.id === "string" &&
      !!exportJob.id &&
      exportJob.id.length >= 36,
  );

  // 3. Test error: invalid delivery_method
  await TestValidator.error(
    "invalid delivery_method triggers business error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
        connection,
        {
          body: {
            initiator_id: admin.id,
            job_type: "applications",
            delivery_method: "invalid_method",
          } satisfies IAtsRecruitmentExportJob.ICreate,
        },
      );
    },
  );

  // 4. Test error: invalid job_type
  await TestValidator.error(
    "invalid job_type triggers business error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
        connection,
        {
          body: {
            initiator_id: admin.id,
            job_type: "invalid_type",
            delivery_method: "download",
          } satisfies IAtsRecruitmentExportJob.ICreate,
        },
      );
    },
  );

  // 5. Test error: unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create export job",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
        unauthConn,
        { body: exportJobInput },
      );
    },
  );
}
