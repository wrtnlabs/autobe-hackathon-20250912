import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentCodingTest";
import { IPageIAtsRecruitmentCodingTest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentCodingTest";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve paginated/searchable lists of coding tests with advanced filtering.
 *
 * This endpoint returns a paginated, filterable list of coding test instances
 * held in the ats_recruitment_coding_tests table. System administrators may
 * filter by provider, status, applicant, job posting (via application join),
 * time windows, and sort order. Supported fields map to audit and workflow
 * management needs in the admin console. Security is enforced by role (admin
 * authentication required).
 *
 * All date/datetime values are flowed and converted as strict ISO8601 strings.
 * Pagination and sorting are supported using typical page/limit/sort query
 * properties. Records are shaped per IAtsRecruitmentCodingTest.ISummary.
 *
 * @param props - Props
 * @param props.systemAdmin - Authenticated system administrator (authorization
 *   enforced)
 * @param props.body - Advanced search/filter/pagination parameters
 * @returns Page of coding test summaries matching the filter/search/sort params
 * @throws {Error} If parameter validation fails or authorization is violated,
 *   or if database error occurs
 */
export async function patchatsRecruitmentSystemAdminCodingTests(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentCodingTest.IRequest;
}): Promise<IPageIAtsRecruitmentCodingTest.ISummary> {
  const { body } = props;

  // Pagination, defaults
  const pageRaw = body.page;
  const limitRaw = body.limit;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? Number(pageRaw) : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw > 0 ? Number(limitRaw) : 20;
  const skip = (page - 1) * limit;

  // Sort
  const sortField =
    (body.sort && body.sort.replace(/^[-+]/, "")) || "scheduled_at";
  const sortOrder = body.sort && body.sort.startsWith("-") ? "desc" : "asc";

  // Filtering
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.test_provider !== undefined &&
      body.test_provider !== null && {
        test_provider: body.test_provider,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.scheduled_from !== undefined &&
      body.scheduled_from !== null && {
        scheduled_at: { gte: body.scheduled_from },
      }),
    ...(body.scheduled_to !== undefined &&
      body.scheduled_to !== null && {
        scheduled_at: Object.assign(
          {},
          body.scheduled_from !== undefined &&
            body.scheduled_from !== null && { gte: body.scheduled_from },
          { lte: body.scheduled_to },
        ),
      }),
    ...(body.applicant_id !== undefined &&
      body.applicant_id !== null && {
        ats_recruitment_applicant_id: body.applicant_id,
      }),
  };

  let filterAppIds: string[] | undefined = undefined;
  if (body.job_posting_id !== undefined && body.job_posting_id !== null) {
    // Find application IDs with job_posting_id == body.job_posting_id
    const apps = await MyGlobal.prisma.ats_recruitment_applications.findMany({
      where: { job_posting_id: body.job_posting_id },
      select: { id: true },
    });
    filterAppIds = apps.map((app) => app.id);
    // Early exit if no match
    if (filterAppIds.length === 0) {
      return {
        pagination: {
          current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
          limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
          records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
          pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        },
        data: [],
      };
    }
    Object.assign(where, {
      ats_recruitment_application_id: { in: filterAppIds },
    });
  }

  // Parallel: get result page + total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ats_recruitment_coding_tests.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ats_recruitment_coding_tests.count({ where }),
  ]);

  const data: IAtsRecruitmentCodingTest.ISummary[] = records.map((row) => ({
    id: row.id,
    ats_recruitment_application_id: row.ats_recruitment_application_id,
    ats_recruitment_applicant_id: row.ats_recruitment_applicant_id,
    ats_recruitment_hrrecruiter_id: row.ats_recruitment_hrrecruiter_id,
    test_provider: row.test_provider,
    test_external_id:
      row.test_external_id !== null ? row.test_external_id : undefined,
    status: row.status,
    scheduled_at: toISOStringSafe(row.scheduled_at),
    expiration_at:
      row.expiration_at !== null && row.expiration_at !== undefined
        ? toISOStringSafe(row.expiration_at)
        : undefined,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
