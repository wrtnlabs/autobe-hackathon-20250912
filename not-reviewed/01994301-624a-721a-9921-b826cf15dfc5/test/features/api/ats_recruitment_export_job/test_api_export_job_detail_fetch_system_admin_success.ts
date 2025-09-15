import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExportJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExportJob";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system admin can fetch export job details by ID.
 *
 * Scenario:
 *
 * 1. Register as a new system administrator with unique credentials
 * 2. Ensure admin is authenticated (implicit from join)
 * 3. Create an export job initiated by the admin
 * 4. Fetch job details using the exportJobId returned from creation
 * 5. Assert all key fields (job_type, delivery_method, initiator_id, etc.) match
 */
export async function test_api_export_job_detail_fetch_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = "test1234!";
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: false,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals("admin super_admin false", admin.super_admin, false);
  TestValidator.predicate("admin is_active true", admin.is_active === true);

  // 2. Create export job
  const createBody = {
    initiator_id: admin.id,
    job_type: "applicants",
    delivery_method: "download",
    target_job_posting_id: null,
    target_application_id: null,
    request_description: RandomGenerator.paragraph({ sentences: 4 }),
    filter_json: null,
  } satisfies IAtsRecruitmentExportJob.ICreate;
  const exportJob: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(exportJob);
  TestValidator.equals(
    "exportJob initiator id equals admin.id",
    exportJob.initiator_id,
    admin.id,
  );
  TestValidator.equals(
    "exportJob job_type equals created",
    exportJob.job_type,
    createBody.job_type,
  );
  TestValidator.equals(
    "exportJob delivery_method equals created",
    exportJob.delivery_method,
    createBody.delivery_method,
  );

  // 3. Fetch export job details as system admin
  const fetched: IAtsRecruitmentExportJob =
    await api.functional.atsRecruitment.systemAdmin.exportJobs.at(connection, {
      exportJobId: exportJob.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "fetched exportJob id equals created",
    fetched.id,
    exportJob.id,
  );
  TestValidator.equals(
    "fetched job_type",
    fetched.job_type,
    createBody.job_type,
  );
  TestValidator.equals(
    "fetched delivery_method",
    fetched.delivery_method,
    createBody.delivery_method,
  );
  TestValidator.equals("fetched initiator_id", fetched.initiator_id, admin.id);
  TestValidator.equals(
    "fetched status equals exportJob.status",
    fetched.status,
    exportJob.status,
  );
  TestValidator.equals(
    "fetched request_description",
    fetched.request_description,
    createBody.request_description,
  );
  TestValidator.equals(
    "fetched filter_json",
    fetched.filter_json,
    createBody.filter_json,
  );
}
