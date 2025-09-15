import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJobDetail";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentExportJobDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentExportJobDetail";

/**
 * E2E scenario: system admin paginates and filters export job details
 *
 * This end-to-end test verifies the ability of a system administrator to
 * retrieve a paginated and filtered list of detail records for a specific
 * export job.
 *
 * Steps:
 *
 * 1. Register a new system administrator with super admin privileges
 * 2. Create an export job using this admin's credentials
 * 3. Query the export job details using PATCH
 *    /atsRecruitment/systemAdmin/exportJobs/{exportJobId}/details with a filter
 *    and pagination
 * 4. Check paginated and filtered result basics
 * 5. Edge: paging beyond last page returns zero results
 * 6. Edge: using an invalid exportJobId returns an error
 * 7. Edge: attempting to list job details as non-admin (unauthenticated) returns a
 *    permission error
 */
export async function test_api_system_admin_exportjob_details_search(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.predicate("super admin is active", admin.is_active === true);

  // 2. Create a new export job as admin
  const createJobBody = {
    initiator_id: admin.id,
    job_type: RandomGenerator.pick([
      "applicants",
      "applications",
      "auditLogs",
      "resumes",
    ] as const),
    delivery_method: RandomGenerator.pick([
      "download",
      "email",
      "uri",
    ] as const),
    request_description: RandomGenerator.paragraph(),
    filter_json: JSON.stringify({ test: "this-is-a-filter" }),
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      { body: createJobBody },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "initiator matches admin",
    exportJob.initiator_id,
    admin.id,
  );

  // 3. Query export job details with paging and filter
  const filter: IAtsRecruitmentExportJobDetail.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 5 as number & tags.Type<"int32">,
    row_summary_json: undefined,
    included_at_from: undefined,
    included_at_to: undefined,
  };
  const detailPage: IPageIAtsRecruitmentExportJobDetail.ISummary =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.details.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: filter,
      },
    );
  typia.assert(detailPage);
  TestValidator.equals(
    "export job details: export_job_id matches",
    detailPage.data.length ? detailPage.data[0].export_job_id : exportJob.id,
    exportJob.id,
  );

  // 4. Edge: page past last page should return empty array
  const overPage: IPageIAtsRecruitmentExportJobDetail.ISummary =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.details.index(
      connection,
      {
        exportJobId: exportJob.id,
        body: {
          ...filter,
          page: (detailPage.pagination.pages + 10) as number &
            tags.Type<"int32">,
        },
      },
    );
  typia.assert(overPage);
  TestValidator.equals(
    "page past last returns zero results",
    overPage.data.length,
    0,
  );

  // 5. Edge: invalid exportJobId (random uuid) returns error
  await TestValidator.error("invalid export job id should error", async () => {
    await api.functional.atsRecruitment.systemAdmin.exportJobs.details.index(
      connection,
      {
        exportJobId: typia.random<string & tags.Format<"uuid">>(),
        body: filter,
      },
    );
  });

  // 6. Edge: non-admin (simulate unauthenticated user) access denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized non-admin should not access export job details",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.exportJobs.details.index(
        unauthConn,
        {
          exportJobId: exportJob.id,
          body: filter,
        },
      );
    },
  );
}
